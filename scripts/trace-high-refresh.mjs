import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { preview } from "vite";
import {
  assessHighRefreshCapability,
  summarizeHighRefreshWorkload,
  summarizeRefreshIntervals,
} from "./performance-high-refresh.mjs";
import {
  buildGraphicsCohort,
  collectGraphicsMetadata,
} from "./performance-gpu.mjs";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "output", "playwright-120hz");
const headless = process.argv.includes("--headless");
const frameTraceRequested = process.argv.includes("--frame-trace");
const requireHighRefresh = process.argv.includes("--require-high-refresh");
const quiet = process.argv.includes("--quiet");
const targetFrameDeadlineMs = (1000 / 120) * 1.15;
let browser;
let context;
let server;

const afterNextPaint = () =>
  new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));

const driveToBattle = async (page, targetUrl) => {
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.evaluate(afterNextPaint);
  await page.locator('[data-action="start-new"]').click();
  await page.locator("#character-name").waitFor();
  await page.locator("#character-name").fill("Cadence");
  await page.locator('input[name="sex"][value="other"]').check();
  await page.locator('input[name="tradition"][value="medium"]').check();
  await page.locator('#character-form button[type="submit"]').click();
  for (let step = 0; step < 20; step += 1) {
    if (await page.locator(".battle-page").count()) break;
    const dismiss = page.locator(
      '[data-action="dismiss-result"]:not([disabled])',
    );
    if (await dismiss.count()) {
      await dismiss.first().click();
      continue;
    }
    const choices = page.locator(
      '[data-action="choose-story"]:not([disabled])',
    );
    if (!(await choices.count())) break;
    await choices.first().click();
  }
  await page.locator(".battle-page").waitFor();
  const targets = page.locator(
    '[data-action="select-target"]:not([disabled])',
  );
  if ((await targets.count()) < 2) {
    throw new Error("The high-refresh fixture requires at least two battle targets.");
  }
  await page.bringToFront();
  await page.evaluate(afterNextPaint);
};

const resetTailDiagnostics = (page, phase) =>
  page.evaluate((phaseId) => {
    const store = {
      phase: phaseId,
      phaseStartedAtMs: performance.now(),
      longTasks: [],
      longAnimationFrames: [],
    };
    window.__necromancerHighRefreshTail = store;
    if (window.__necromancerHighRefreshObservers) return;

    const observers = [];
    const observe = (type, collect) => {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
      const observer = new PerformanceObserver((list) => {
        const active = window.__necromancerHighRefreshTail;
        if (!active) return;
        for (const entry of list.getEntries()) collect(active, entry);
      });
      observer.observe({ type, buffered: false });
      observers.push(observer);
    };
    observe("longtask", (active, entry) => {
      if (entry.startTime < active.phaseStartedAtMs) return;
      if (active.longTasks.length >= 24) return;
      active.longTasks.push({
        startTimeMs: Number(entry.startTime.toFixed(2)),
        durationMs: Number(entry.duration.toFixed(2)),
        name: entry.name,
      });
    });
    observe("long-animation-frame", (active, entry) => {
      if (entry.startTime < active.phaseStartedAtMs) return;
      if (active.longAnimationFrames.length >= 24) return;
      active.longAnimationFrames.push({
        startTimeMs: Number(entry.startTime.toFixed(2)),
        durationMs: Number(entry.duration.toFixed(2)),
        blockingDurationMs: Number((entry.blockingDuration ?? 0).toFixed(2)),
        renderStartMs: Number((entry.renderStart ?? 0).toFixed(2)),
        styleAndLayoutStartMs: Number(
          (entry.styleAndLayoutStart ?? 0).toFixed(2),
        ),
        scripts: [...(entry.scripts ?? [])].slice(0, 8).map((script) => ({
          invoker: script.invoker,
          sourceURL: script.sourceURL,
          functionName: script.sourceFunctionName,
          durationMs: Number(script.duration.toFixed(2)),
          forcedStyleAndLayoutDurationMs: Number(
            (script.forcedStyleAndLayoutDuration ?? 0).toFixed(2),
          ),
        })),
      });
    });
    window.__necromancerHighRefreshObservers = observers;
  }, phase);

const collectTailDiagnostics = async (page) => {
  await page.evaluate(afterNextPaint);
  return page.evaluate(() => window.__necromancerHighRefreshTail ?? null);
};

const readPerformanceMetrics = async (session) => {
  const { metrics } = await session.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
};

const performanceMetricDelta = (before, after) => {
  const durationNames = [
    "TaskDuration",
    "ScriptDuration",
    "LayoutDuration",
    "RecalcStyleDuration",
  ];
  const countNames = ["LayoutCount", "RecalcStyleCount"];
  return {
    durationsMs: Object.fromEntries(
      durationNames.map((name) => [
        name,
        Number((((after[name] ?? 0) - (before[name] ?? 0)) * 1000).toFixed(2)),
      ]),
    ),
    counts: Object.fromEntries(
      countNames.map((name) => [name, (after[name] ?? 0) - (before[name] ?? 0)]),
    ),
    jsHeapDeltaBytes:
      (after.JSHeapUsedSize ?? 0) - (before.JSHeapUsedSize ?? 0),
  };
};

const sampleIdleCadence = (page, samples = 360, warmupFrames = 30) =>
  page.evaluate(
    ({ count, warmup, deadlineMs }) =>
      new Promise((resolveSample) => {
        const intervals = [];
        const stalls = [];
        let frame = 0;
        let previous = 0;
        const tick = (now) => {
          if (previous > 0 && frame > warmup) {
            const interval = now - previous;
            intervals.push(interval);
            if (interval > deadlineMs && stalls.length < 32) {
              stalls.push({
                frame: intervals.length,
                startTimeMs: Number(previous.toFixed(2)),
                durationMs: Number(interval.toFixed(2)),
              });
            }
          }
          previous = now;
          frame += 1;
          if (intervals.length >= count) resolveSample({ intervals, stalls });
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { count: samples, warmup: warmupFrames, deadlineMs: targetFrameDeadlineMs },
  );

const sampleWorkload = (
  page,
  { mode, samples = 720, warmupFrames = 30 },
) =>
  page.evaluate(
    ({ workloadMode, count, warmup, deadlineMs }) =>
      new Promise((resolveSample) => {
        const targets = [
          ...document.querySelectorAll(
            '[data-action="select-target"]:not([disabled])',
          ),
        ];
        const intervals = [];
        const handlers = [];
        const nextPaints = [];
        const stalls = [];
        let frame = 0;
        let previous = 0;
        let pendingActionStarted = 0;
        let direction = 1;
        let minimumScroll = window.scrollY;
        let maximumScroll = window.scrollY;
        const tick = (now) => {
          const recording = frame >= warmup;
          if (previous > 0 && recording) {
            const interval = now - previous;
            intervals.push(interval);
            if (interval > deadlineMs && stalls.length < 32) {
              stalls.push({
                frame: intervals.length,
                startTimeMs: Number(previous.toFixed(2)),
                durationMs: Number(interval.toFixed(2)),
                nextPaintMs:
                  pendingActionStarted > 0
                    ? Number((now - pendingActionStarted).toFixed(2))
                    : null,
              });
            }
          }
          if (pendingActionStarted > 0 && recording) {
            nextPaints.push(now - pendingActionStarted);
          }
          if (workloadMode === "compound-scroll") {
            const maximum =
              document.documentElement.scrollHeight - window.innerHeight;
            if (window.scrollY >= maximum - 1) direction = -1;
            else if (window.scrollY <= 1) direction = 1;
            window.scrollBy(0, direction * 28);
            minimumScroll = Math.min(minimumScroll, window.scrollY);
            maximumScroll = Math.max(maximumScroll, window.scrollY);
          }
          const actionStarted = performance.now();
          targets[frame % targets.length]?.click();
          const handler = performance.now() - actionStarted;
          if (recording) handlers.push(handler);
          pendingActionStarted = actionStarted;
          previous = now;
          frame += 1;
          if (intervals.length >= count) {
            resolveSample({
              intervals,
              handlers,
              nextPaints,
              stalls,
              scrollRangePx: Math.round(maximumScroll - minimumScroll),
            });
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }),
    {
      workloadMode: mode,
      count: samples,
      warmup: warmupFrames,
      deadlineMs: targetFrameDeadlineMs,
    },
  );

const readTraceStream = async (session, handle) => {
  let json = "";
  try {
    for (;;) {
      const chunk = await session.send("IO.read", { handle });
      json += chunk.data ?? "";
      if (chunk.eof) break;
    }
  } finally {
    await session.send("IO.close", { handle }).catch(() => {});
  }
  return json;
};

const captureFrameTrace = async (session, run) => {
  let completion;
  const completed = new Promise((resolveComplete) => {
    const listener = (event) => {
      session.off("Tracing.tracingComplete", listener);
      resolveComplete(event);
    };
    session.on("Tracing.tracingComplete", listener);
  });
  await session.send("Tracing.start", {
    transferMode: "ReturnAsStream",
    streamFormat: "json",
    streamCompression: "none",
    tracingBackend: "chrome",
    options: "record-as-much-as-possible",
    categories: [
      "benchmark",
      "blink.user_timing",
      "disabled-by-default-devtools.timeline.frame",
    ].join(","),
  });
  try {
    return await run();
  } finally {
    await session.send("Tracing.end");
    completion = await completed;
    if (completion.stream) {
      const trace = await readTraceStream(session, completion.stream);
      await writeFile(resolve(output, "chrome-frame-trace.json"), trace);
    }
  }
};

try {
  await mkdir(output, { recursive: true });
  server = await preview({
    root,
    preview: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      open: false,
    },
  });
  const targetUrl =
    server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
  if (!targetUrl) throw new Error("Vite did not expose a preview URL.");

  browser = await chromium.launch({
    channel: "chrome",
    headless,
    args: ["--window-size=1440,1000"],
  });
  const browserSession = await browser.newBrowserCDPSession();
  const graphicsMetadata = await collectGraphicsMetadata(
    browserSession,
    browser.version(),
  );
  const graphicsCohort = buildGraphicsCohort({
    hardwareGpuRequested: true,
    browserVersion: browser.version(),
    metadata: graphicsMetadata,
  });
  if (graphicsMetadata.renderingClass !== "hardware") {
    throw new Error(
      `The 120 Hz cohort requires hardware rendering; Chrome reported ${graphicsMetadata.renderingClass}.`,
    );
  }

  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await driveToBattle(page, targetUrl);
  const pageSession = await context.newCDPSession(page);
  await pageSession.send("Performance.enable", { timeDomain: "timeTicks" });
  const measurePhase = async (phase, sample) => {
    await resetTailDiagnostics(page, phase);
    const before = await readPerformanceMetrics(pageSession);
    const result = await sample();
    const tail = await collectTailDiagnostics(page);
    const after = await readPerformanceMetrics(pageSession);
    return {
      ...result,
      diagnostics: {
        browserMetrics: performanceMetricDelta(before, after),
        performanceEntries: tail,
      },
    };
  };
  const sampleAll = async () => {
    await page.evaluate(() => performance.mark("necromancer-120-baseline-start"));
    const baselineRaw = await measurePhase("baseline", () =>
      sampleIdleCadence(page),
    );
    await page.evaluate(() => performance.mark("necromancer-120-targeting-start"));
    const targetingRaw = await measurePhase("targeting", () =>
      sampleWorkload(page, { mode: "targeting" }),
    );
    await page.evaluate(() => performance.mark("necromancer-120-compound-start"));
    const compoundScrollRaw = await measurePhase("compound-scroll", () =>
      sampleWorkload(page, { mode: "compound-scroll" }),
    );
    await page.evaluate(() => performance.mark("necromancer-120-end"));
    return { baselineRaw, targetingRaw, compoundScrollRaw };
  };
  const sampled = frameTraceRequested
    ? await captureFrameTrace(pageSession, sampleAll)
    : await sampleAll();
  const baseline = {
    ...summarizeRefreshIntervals(sampled.baselineRaw.intervals),
    stalls: sampled.baselineRaw.stalls,
    diagnostics: sampled.baselineRaw.diagnostics,
  };
  const targeting = summarizeHighRefreshWorkload(sampled.targetingRaw);
  const compoundScroll = summarizeHighRefreshWorkload(
    sampled.compoundScrollRaw,
  );
  const assessment = assessHighRefreshCapability({
    baseline,
    targeting,
    compoundScroll,
  });
  const report = {
    capturedAt: new Date().toISOString(),
    targetHz: 120,
    browser: {
      version: browser.version(),
      channel: "chrome",
      headless,
      frameTrace: frameTraceRequested,
    },
    cohort: {
      ...graphicsCohort,
      id: `${graphicsCohort.id}:channel-chrome:${headless ? "headless" : "active-display"}`,
      browserChannel: "chrome",
      observedRefreshHz: baseline.estimatedHz,
      presentation: headless ? "headless" : "active-display",
      instrumentation: frameTraceRequested ? "narrow-frame-trace" : "gate-clean",
    },
    baseline,
    workloads: { targeting, compoundScroll },
    assessment,
  };
  await writeFile(
    resolve(output, "high-refresh-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (!quiet) console.log(JSON.stringify(report, null, 2));
  if (requireHighRefresh && !assessment.environmentQualified) {
    throw new Error(
      `The active display/browser cadence was ${assessment.observedHz ?? "unavailable"} Hz; at least ${assessment.thresholds.minimumObservedHz} Hz is required.`,
    );
  }
  if (
    !frameTraceRequested &&
    assessment.environmentQualified &&
    !assessment.capabilityPassed
  ) {
    throw new Error(
      `The 120 Hz application-work gate failed: ${assessment.applicationFailures.join(", ")}.`,
    );
  }
} finally {
  await context?.close();
  await browser?.close();
  await server?.close();
}
