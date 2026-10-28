import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { preview } from "vite";
import { captureLocalMutationBenchmark } from "./performance-local-mutations.mjs";
import { STATS_OPEN_CLOSE_RETENTION_BUDGET } from "./performance-retention-budget.mjs";
import {
  buildGraphicsCohort,
  collectGraphicsMetadata,
  sampleGpuProcesses,
  summarizeGpuProcessCpu,
} from "./performance-gpu.mjs";
import {
  addGpuPhaseComparisons,
  captureGpuPhase,
} from "./performance-phase-diagnostics.mjs";
import { buildGpuExperimentPhases, selectGpuExperimentPhases } from "./performance-gpu-experiments.mjs";
import { createLayerTreeObserver } from "./performance-layer-tree.mjs";
import { auditPageSurfaces } from "./performance-surface-audit.mjs";
import { collectPagePerformanceState } from "./performance-page-state.mjs";
import {
  capturePageResourceCheckpoint,
  summarizeResourceGraph,
} from "./performance-resource-graph.mjs";
import { COLD_RESOURCE_STAGE_BUDGETS } from "./performance-cold-resource-budget.mjs";
import { assessDeepPerformanceStress, parsePerformanceDiagnosticOptions, startPerformanceDeepDiagnostics } from "./performance-deep-diagnostics.mjs";
import {
  describePerformanceBrowser,
  hardwareCohortRejection,
  scopeGraphicsCohortToBrowser,
  scopePerformanceCohortToCpu,
  selectPerformanceBrowser,
} from "./performance-browser.mjs";
import {
  correlateGpuProcessContinuity,
  startWindowsGpuDiagnostics,
} from "./windows-gpu-diagnostics.mjs";

const root = resolve(import.meta.dirname, "..");
const hardwareGpuRequested = process.argv.includes("--gpu");
const browserSelection = selectPerformanceBrowser({
  arguments_: process.argv.slice(2),
  hardwareGpuRequested,
  playwrightExecutablePath: chromium.executablePath(),
  cwd: root,
});
const gpuPhasesRequested =
  hardwareGpuRequested && process.argv.includes("--gpu-phases");
const gpuExperimentsRequested =
  gpuPhasesRequested && process.argv.includes("--gpu-experiments");
const gpuExperimentFilterArgument = process.argv.find((argument) =>
  argument.startsWith("--gpu-experiment-filter="),
);
const gpuExperimentFilter =
  gpuExperimentFilterArgument?.slice(
    "--gpu-experiment-filter=".length,
  ) ?? null;
const skipTrace = process.argv.includes("--skip-trace");
const quiet = process.argv.includes("--quiet");
const diagnosticOptions = parsePerformanceDiagnosticOptions(process.argv.slice(2));
const { cpuThrottleRate } = diagnosticOptions;
const outputArgument = process.argv.find((argument) =>
  argument.startsWith("--output="),
);
const output = outputArgument
  ? resolve(outputArgument.slice("--output=".length))
  : resolve(
      root,
      "output",
      hardwareGpuRequested ? "playwright-gpu" : "playwright",
    );
const urlArgument = process.argv.find((argument) =>
  argument.startsWith("--url="),
);
const suppliedUrl = urlArgument?.slice("--url=".length);
const interactions = [];
let server;
let browser;
let context;
let traceStarted = false;

const afterNextPaint = () =>
  new Promise((done) =>
    requestAnimationFrame(() => setTimeout(done, 0)),
  );

const measureClick = async (
  page,
  label,
  selector,
  index = 0,
  measurements = interactions,
) => {
  const measurement = await page.evaluate(
    async ({ targetSelector, targetIndex }) => {
      const element = document.querySelectorAll(targetSelector)[
        targetIndex
      ];
      if (!(element instanceof HTMLElement)) return null;

      const start = performance.now();
      element.click();
      const handlerMs = performance.now() - start;
      await new Promise((done) =>
        requestAnimationFrame(() => setTimeout(done, 0)),
      );
      return {
        handlerMs,
        nextPaintMs: performance.now() - start,
      };
    },
    { targetSelector: selector, targetIndex: index },
  );

  if (measurement !== null && measurements) {
    measurements.push({
      label,
      handlerMs: Number(measurement.handlerMs.toFixed(2)),
      nextPaintMs: Number(measurement.nextPaintMs.toFixed(2)),
    });
  }
  return measurement;
};

const metricMap = (metrics) =>
  Object.fromEntries(metrics.map(({ name, value }) => [name, value]));

const measureTargetPaintCadence = async (page, sampleCount = 60) => {
  const samples = await page.evaluate(async (count) => {
    const targets = [
      ...document.querySelectorAll(
        '[data-action="select-target"]:not([disabled])',
      ),
    ];
    if (targets.length < 2) return [];

    const durations = [];
    for (let index = 0; index < count; index += 1) {
      const target = targets[index % 2];
      const start = performance.now();
      target.click();
      await new Promise((done) =>
        requestAnimationFrame(() => setTimeout(done, 0)),
      );
      durations.push(performance.now() - start);
    }
    return durations;
  }, sampleCount);
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (ratio) =>
    sorted[Math.ceil(sorted.length * ratio) - 1] ?? 0;
  const totalMs = samples.reduce(
    (total, duration) => total + duration,
    0,
  );
  const slowPaintThresholdMs = 20;
  return {
    samples: samples.length,
    meanMs: Number((totalMs / samples.length).toFixed(2)),
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    worstMs: Number(sorted.at(-1).toFixed(2)),
    estimatedPaintsPerSecond: Number(
      ((samples.length / totalMs) * 1000).toFixed(1),
    ),
    slowPaintsOver20Ms: samples.filter(
      (duration) => duration > slowPaintThresholdMs,
    ).length,
    within20MsPercent: Number(
      (
        (samples.filter(
          (duration) => duration <= slowPaintThresholdMs,
        ).length /
          samples.length) *
        100
      ).toFixed(1),
    ),
  };
};

const measureScrollInteractionStress = async (
  page,
  wheelPulses = 48,
  pulseWaitMs = 6,
) => {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const sample = {
      active: true,
      intervals: [],
      positions: [window.scrollY],
      lastFrame: 0,
    };
    window.__necromancerScrollStress = sample;
    const recordPosition = () => sample.positions.push(window.scrollY);
    window.addEventListener("scroll", recordPosition, {
      passive: true,
    });
    sample.stop = () => {
      sample.active = false;
      window.removeEventListener("scroll", recordPosition);
    };

    const recordFrame = (now) => {
      if (!sample.active) return;
      if (sample.lastFrame > 0) {
        sample.intervals.push(now - sample.lastFrame);
      }
      sample.lastFrame = now;
      requestAnimationFrame(recordFrame);
    };
    requestAnimationFrame(recordFrame);
  });

  await page.mouse.move(720, 500);
  let interactionCount = 0;
  for (let pulse = 0; pulse < wheelPulses; pulse += 1) {
    const direction =
      Math.floor(pulse / 6) % 2 === 0 ? 1 : -1;
    await page.mouse.wheel(0, direction * 420);
    if (pulse % 2 === 0) {
      await page.evaluate((index) => {
        const targets = document.querySelectorAll(
          '[data-action="select-target"]:not([disabled])',
        );
        targets[index % targets.length]?.click();
      }, pulse / 2);
      interactionCount += 1;
    }
    await page.waitForTimeout(pulseWaitMs);
  }
  await page.waitForTimeout(120);

  const raw = await page.evaluate(() => {
    const sample = window.__necromancerScrollStress;
    sample.stop();
    return {
      intervals: sample.intervals,
      positions: sample.positions,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });
  const sorted = [...raw.intervals].sort(
    (left, right) => left - right,
  );
  const percentile = (ratio) =>
    sorted[Math.ceil(sorted.length * ratio) - 1] ?? 0;
  const totalMs = raw.intervals.reduce(
    (total, duration) => total + duration,
    0,
  );

  return {
    wheelPulses,
    interactions: interactionCount,
    sampledFrames: raw.intervals.length,
    scrollRangePx: Math.round(
      Math.max(...raw.positions) - Math.min(...raw.positions),
    ),
    scrollableDistancePx:
      raw.scrollHeight - raw.viewportHeight,
    meanFrameMs: Number(
      (totalMs / raw.intervals.length).toFixed(2),
    ),
    p50FrameMs: Number(percentile(0.5).toFixed(2)),
    p95FrameMs: Number(percentile(0.95).toFixed(2)),
    worstFrameMs: Number((sorted.at(-1) ?? 0).toFixed(2)),
    estimatedFramesPerSecond: Number(
      ((raw.intervals.length / totalMs) * 1000).toFixed(1),
    ),
    framesOver20Ms: raw.intervals.filter(
      (duration) => duration > 20,
    ).length,
    framesOver33Ms: raw.intervals.filter(
      (duration) => duration > 33.34,
    ).length,
  };
};

const driveRepresentativePath = async (
  page,
  targetUrl,
  measurements,
  {
    beforeCombat = null,
    onResourceCheckpoint = null,
    stopAfterCreation = false,
    stopBeforeCombat = false,
  } = {},
) => {
  const click = (label, selector, index = 0) =>
    measureClick(
      page,
      label,
      selector,
      index,
      measurements,
    );

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  // Navigation readiness and interaction latency are separate budgets.
  // Let the cold document produce its first paint before timing a click;
  // LCP below remains the gate for cold visual readiness.
  await page.evaluate(afterNextPaint);
  await onResourceCheckpoint?.("title");
  await click(
    "Title → character creation",
    '[data-action="start-new"]',
  );
  await page.locator("#character-name").waitFor();
  await onResourceCheckpoint?.("creation");
  await page.locator("#character-name").fill("Trace");
  await page
    .locator('input[name="sex"][value="other"]')
    .check();
  await page
    .locator('input[name="tradition"][value="medium"]')
    .check();
  await click(
    "Create character",
    '#character-form button[type="submit"]',
  );
  await onResourceCheckpoint?.("opening");
  if (stopAfterCreation) {
    return {
      targetPaintCadence: null,
      scrollInteractionStress: null,
    };
  }

  for (let step = 0; step < 16; step += 1) {
    if (await page.locator(".battle-page").count()) break;

    const dismiss = page.locator(
      '[data-action="dismiss-result"]:not([disabled])',
    );
    if (await dismiss.count()) {
      await click(
        "Dismiss featured outcome",
        '[data-action="dismiss-result"]:not([disabled])',
      );
      continue;
    }

    const storyChoices = page.locator(
      '[data-action="choose-story"]:not([disabled])',
    );
    if (!(await storyChoices.count())) break;
    await click(
      `Story transition ${step + 1}`,
      '[data-action="choose-story"]:not([disabled])',
    );
  }

  await onResourceCheckpoint?.(
    (await page.locator(".battle-page").count())
      ? "battle"
      : "story",
  );

  const targetCount = await page
    .locator('[data-action="select-target"]:not([disabled])')
    .count();
  if (targetCount > 1) {
    await click(
      "Change combat target",
      '[data-action="select-target"]:not([disabled])',
      1,
    );
  }
  if (beforeCombat) await beforeCombat(targetCount);
  if (stopBeforeCombat) {
    return {
      targetPaintCadence: null,
      scrollInteractionStress: null,
    };
  }
  const targetPaintCadence =
    targetCount > 1 && measurements
      ? await measureTargetPaintCadence(page)
      : null;
  const scrollInteractionStress =
    targetCount > 1
      ? await measureScrollInteractionStress(page)
      : null;

  for (let turn = 0; turn < 4; turn += 1) {
    const actions = page.locator(
      '[data-action="battle-action"]:not([disabled])',
    );
    if (!(await actions.count())) break;
    await click(
      `Combat transition ${turn + 1}`,
      '[data-action="battle-action"]:not([disabled])',
    );
  }

  await page.evaluate(afterNextPaint);
  await onResourceCheckpoint?.("post-combat");
  return { targetPaintCadence, scrollInteractionStress };
};

const launchMeasuredBrowser = () =>
  chromium.launch({
    headless: true,
    ...browserSelection.launchOptions,
  });

const captureIsolatedGpuPhase = async ({
  id,
  comparisonBaselineId = null,
  targetUrl,
  prepare,
  run,
  memoryDecayMs = [],
}) => {
  let phaseBrowser;
  let phaseContext;
  let layerTree;
  try {
    phaseBrowser = await launchMeasuredBrowser();
    const browserSession =
      await phaseBrowser.newBrowserCDPSession();
    phaseContext = await phaseBrowser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await phaseContext.newPage();
    const pageSession =
      await phaseContext.newCDPSession(page);
    layerTree = await createLayerTreeObserver(pageSession);
    await prepare(page, targetUrl);
    await page.waitForTimeout(500);

    const phase = await captureGpuPhase({
      id,
      browserSession,
      layerTree,
      run: run ? () => run(page) : undefined,
      memoryDecayMs,
    });
    return {
      ...phase,
      comparisonBaselineId,
      surfaces: await auditPageSurfaces(page),
    };
  } finally {
    await layerTree?.stop();
    await phaseContext?.close();
    await phaseBrowser?.close();
  }
};

try {
  await mkdir(output, { recursive: true });

  let targetUrl = suppliedUrl;
  if (!targetUrl) {
    server = await preview({
      root,
      preview: {
        host: "127.0.0.1",
        port: 0,
        strictPort: false,
        open: false,
      },
    });
    targetUrl =
      server.resolvedUrls?.local[0] ??
      server.resolvedUrls?.network[0];
  }

  if (!targetUrl) {
    throw new Error("Vite did not expose a preview URL.");
  }

  browser = await launchMeasuredBrowser();
  const browserCdp = await browser.newBrowserCDPSession();
  const browserProtocolVersion = await browserCdp.send("Browser.getVersion");
  const browserIdentity = describePerformanceBrowser({
    selection: browserSelection,
    browserVersion: browser.version(),
    protocolVersion: browserProtocolVersion,
  });
  const graphicsMetadata = await collectGraphicsMetadata(
    browserCdp,
    browser.version(),
  );
  const graphicsCohort = scopeGraphicsCohortToBrowser(
    buildGraphicsCohort({
      hardwareGpuRequested,
      browserVersion: browser.version(),
      metadata: graphicsMetadata,
    }),
    browserIdentity,
  );
  const executionCohort = scopePerformanceCohortToCpu(graphicsCohort, cpuThrottleRate);
  const cohortRejection = hardwareCohortRejection({
    hardwareGpuRequested,
    graphicsMetadata,
  });
  if (cohortRejection) {
    const rejection = {
      capturedAt: new Date().toISOString(),
      accepted: false,
      browser: browserIdentity,
      cohort: executionCohort,
      graphics: { metadata: graphicsMetadata },
      reason: cohortRejection,
    };
    await writeFile(
      resolve(output, "performance-cohort-rejection.json"),
      `${JSON.stringify(rejection, null, 2)}\n`,
    );
    throw new Error(cohortRejection);
  }

  const phaseDiagnostics = [];
  if (gpuPhasesRequested) {
    const prepareBlank = async (page) => {
      await page.goto("about:blank");
      await page.evaluate(afterNextPaint);
    };
    const prepareApp = async (page, url) => {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(afterNextPaint);
    };
    const prepareBattle = async (page, url) => {
      await driveRepresentativePath(page, url, null, {
        stopBeforeCombat: true,
      });
    };
    const prepareStory = async (page, url) => {
      await driveRepresentativePath(page, url, null, {
        stopAfterCreation: true,
      });
    };

    if (!gpuExperimentFilter) {
      phaseDiagnostics.push(
        await captureIsolatedGpuPhase({
          id: "browser-idle",
          targetUrl,
          prepare: prepareBlank,
        }),
        await captureIsolatedGpuPhase({
          id: "app-idle",
          targetUrl,
          prepare: prepareApp,
        }),
        await captureIsolatedGpuPhase({
          id: "battle-idle",
          targetUrl,
          prepare: prepareBattle,
        }),
        await captureIsolatedGpuPhase({
          id: "targeting",
          targetUrl,
          prepare: prepareBattle,
          memoryDecayMs: [2_000, 10_000],
          run: (page) =>
            measureTargetPaintCadence(page, 420),
        }),
        await captureIsolatedGpuPhase({
          id: "compound-scroll",
          targetUrl,
          prepare: prepareBattle,
          memoryDecayMs: [2_000, 10_000],
          run: (page) =>
            measureScrollInteractionStress(page, 180, 16),
        }),
      );
    }
    if (gpuExperimentsRequested) {
      const experiments = selectGpuExperimentPhases(
        buildGpuExperimentPhases({
          prepareBattle,
          prepareStory,
          measureTargetPaintCadence,
        }),
        gpuExperimentFilter,
      );
      for (const experiment of experiments) {
        phaseDiagnostics.push(
          await captureIsolatedGpuPhase({
            ...experiment,
            targetUrl,
          }),
        );
      }
    }
  }

  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    window.__necromancerPerformance = {
      cumulativeLayoutShift: 0,
      largestContentfulPaintMs: 0,
      longTasks: [],
    };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__necromancerPerformance.cumulativeLayoutShift +=
            entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries.at(-1);
      if (latest) {
        window.__necromancerPerformance.largestContentfulPaintMs =
          latest.startTime;
      }
    }).observe({
      type: "largest-contentful-paint",
      buffered: true,
    });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__necromancerPerformance.longTasks.push({
          startMs: entry.startTime,
          durationMs: entry.duration,
        });
      }
    }).observe({ type: "longtask", buffered: true });
  });
  const page = await context.newPage();
  const deepDiagnostics = await startPerformanceDeepDiagnostics({
    page,
    targetUrl,
    options: diagnosticOptions,
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const workloadGpuStart = await sampleGpuProcesses(browserCdp);
  const windowsGpuDiagnosticsPromise =
    startWindowsGpuDiagnostics({
      enabled: hardwareGpuRequested,
      targetProcessIds: workloadGpuStart.processes.map(
        ({ id }) => id,
      ),
    });
  const workloadStartedAt = performance.now();
  const resourceCheckpoints = [];
  const onResourceCheckpoint = async (id) => {
    resourceCheckpoints.push(
      await capturePageResourceCheckpoint(page, id),
    );
  };
  const {
    targetPaintCadence,
    scrollInteractionStress,
  } = await deepDiagnostics.runRepresentative(cdp, () =>
    driveRepresentativePath(page, targetUrl, interactions, {
      onResourceCheckpoint,
    }),
  );
  const workloadWindowMs = performance.now() - workloadStartedAt;
  const workloadGpuEnd = await sampleGpuProcesses(browserCdp);
  const workloadGpuProcessCpu = summarizeGpuProcessCpu(
    workloadGpuStart,
    workloadGpuEnd,
    workloadWindowMs,
  );
  const windowsHardwareDiagnostics =
    correlateGpuProcessContinuity(
      await windowsGpuDiagnosticsPromise,
      workloadGpuProcessCpu,
    );
  const idleWindowMs = 2_000;
  const idleStart = metricMap(
    (await cdp.send("Performance.getMetrics")).metrics,
  );
  const idleGpuStart = await sampleGpuProcesses(browserCdp);
  await page.waitForTimeout(idleWindowMs);
  const idleGpuEnd = await sampleGpuProcesses(browserCdp);
  const idleEnd = metricMap(
    (await cdp.send("Performance.getMetrics")).metrics,
  );
  const browserMetrics = metricMap(
    (await cdp.send("Performance.getMetrics")).metrics,
  );
  const domBeforeGc = await cdp.send("Memory.getDOMCounters");
  await cdp.send("HeapProfiler.collectGarbage");
  const afterGcMetrics = metricMap(
    (await cdp.send("Performance.getMetrics")).metrics,
  );
  const domAfterGc = await cdp.send("Memory.getDOMCounters");
  const pageMetrics = {
    ...(await collectPagePerformanceState(page)),
    requestGraph: summarizeResourceGraph(resourceCheckpoints, {
      stageBudgets: COLD_RESOURCE_STAGE_BUDGETS,
    }),
  };
  const representativeDiagnostics = await deepDiagnostics.captureRepresentative();
  const stressDiagnostics = await deepDiagnostics.captureStress();
  await page.screenshot({
    path: resolve(output, "performance-final.png"),
    fullPage: true,
  });
  await context.close();
  context = null;

  const localMutations =
    !hardwareGpuRequested && !gpuPhasesRequested
      ? await captureLocalMutationBenchmark({ browser, targetUrl })
      : {
          enabled: false,
          isolatedFromBaseline: true,
          reason:
            "Skipped for GPU cohort runs; the default trace owns local-mutation gates.",
        };

  const report = {
    capturedAt: new Date().toISOString(),
    url: targetUrl,
    viewport: { width: 1440, height: 1000 },
    browser: browserIdentity,
    cohort: executionCohort,
    diagnostics: {
      configuration: deepDiagnostics.configuration,
      representative: representativeDiagnostics,
      stress: stressDiagnostics,
    },
    graphics: {
      metadata: graphicsMetadata,
      gpuProcessCpu: {
        diagnosticOnly: true,
        workload: workloadGpuProcessCpu,
        idle: summarizeGpuProcessCpu(
          idleGpuStart,
          idleGpuEnd,
          idleWindowMs,
        ),
      },
      windowsHardwareDiagnostics,
      phaseDiagnostics: {
        enabled: gpuPhasesRequested,
        experimentsEnabled: gpuExperimentsRequested,
        experimentFilter: gpuExperimentFilter,
        diagnosticOnly: true,
        phases: addGpuPhaseComparisons(phaseDiagnostics),
      },
    },
    interactions,
    localMutations,
    targetPaintCadence,
    scrollInteractionStress,
    idleResources: {
      windowMs: idleWindowMs,
      taskMs: Number(
        (
          ((idleEnd.TaskDuration ?? 0) -
            (idleStart.TaskDuration ?? 0)) *
          1000
        ).toFixed(2),
      ),
      scriptMs: Number(
        (
          ((idleEnd.ScriptDuration ?? 0) -
            (idleStart.ScriptDuration ?? 0)) *
          1000
        ).toFixed(2),
      ),
    },
    retainedResources: {
      heapUsedBeforeGcBytes:
        browserMetrics.JSHeapUsedSize ?? 0,
      heapUsedAfterGcBytes:
        afterGcMetrics.JSHeapUsedSize ?? 0,
      heapReclaimedBytes: Math.max(
        0,
        (browserMetrics.JSHeapUsedSize ?? 0) -
          (afterGcMetrics.JSHeapUsedSize ?? 0),
      ),
      domBeforeGc,
      domAfterGc,
    },
    page: pageMetrics,
    chromium: {
      taskDurationMs: Number(
        ((browserMetrics.TaskDuration ?? 0) * 1000).toFixed(2),
      ),
      scriptDurationMs: Number(
        ((browserMetrics.ScriptDuration ?? 0) * 1000).toFixed(2),
      ),
      layoutDurationMs: Number(
        ((browserMetrics.LayoutDuration ?? 0) * 1000).toFixed(2),
      ),
      styleDurationMs: Number(
        (
          (browserMetrics.RecalcStyleDuration ?? 0) * 1000
        ).toFixed(2),
      ),
      layoutCount: browserMetrics.LayoutCount ?? 0,
      styleRecalcCount: browserMetrics.RecalcStyleCount ?? 0,
      jsHeapUsedBytes: browserMetrics.JSHeapUsedSize ?? 0,
      jsHeapTotalBytes: browserMetrics.JSHeapTotalSize ?? 0,
      nodes: browserMetrics.Nodes ?? 0,
      documents: browserMetrics.Documents ?? 0,
    },
  };
  const deepAssessment = assessDeepPerformanceStress(stressDiagnostics);
  const thresholds = {
    largestContentfulPaintMs: 2500,
    cumulativeLayoutShift: 0.1,
    handlerFrameBudgetMs: 1000 / 60,
    interactionNextPaintMs: 34,
    targetPaintCadenceP95Ms: 20,
    targetPaintCadenceHz: 58,
    scrollInteractionP95Ms: 20,
    scrollInteractionHz: 58,
    longTaskMaxMs: 100,
    longTaskTotalMs: 150,
    coldResourceStageBudgets: COLD_RESOURCE_STAGE_BUDGETS,
    jsHeapUsedBytes: 10_000_000,
    retainedHeapBytes: 5_000_000,
    idleTaskMsPerSecond: 5,
    localMutationSettledPaintMs: 100,
    localMutationMainThreadTaskMs: 50,
    localMutationRetainedHeapBytes: 750_000,
    statsSurfaceNodeReleasePercent: 95,
    statsOpenCloseRetainedHeapWarningBytes:
      STATS_OPEN_CLOSE_RETENTION_BUDGET.warningHeapBytes,
    statsOpenCloseRetainedHeapBytes:
      STATS_OPEN_CLOSE_RETENTION_BUDGET.maximumHeapBytes,
    ...deepAssessment.thresholds,
  };
  const slowestInteraction = interactions.reduce(
    (slowest, interaction) =>
      interaction.nextPaintMs > slowest.nextPaintMs
        ? interaction
        : slowest,
    { label: "None", nextPaintMs: 0 },
  );
  const slowestHandler = interactions.reduce(
    (slowest, interaction) =>
      interaction.handlerMs > slowest.handlerMs
        ? interaction
        : slowest,
    { label: "None", handlerMs: 0 },
  );
  report.assessment = {
    thresholds,
    slowestInteraction,
    slowestHandler,
    checks: {
      largestContentfulPaint:
        pageMetrics.observed.largestContentfulPaintMs <=
        thresholds.largestContentfulPaintMs,
      cumulativeLayoutShift:
        pageMetrics.observed.cumulativeLayoutShift <=
        thresholds.cumulativeLayoutShift,
      interactionNextPaint:
        slowestInteraction.nextPaintMs <=
        thresholds.interactionNextPaintMs,
      handlerFrameBudget:
        slowestHandler.handlerMs <=
        thresholds.handlerFrameBudgetMs,
      targetPaintCadence:
        !targetPaintCadence ||
        (targetPaintCadence.p95Ms <=
          thresholds.targetPaintCadenceP95Ms &&
          targetPaintCadence.estimatedPaintsPerSecond >=
            thresholds.targetPaintCadenceHz),
      scrollInteraction:
        !scrollInteractionStress ||
        (scrollInteractionStress.p95FrameMs <=
          thresholds.scrollInteractionP95Ms &&
          scrollInteractionStress.estimatedFramesPerSecond >=
          thresholds.scrollInteractionHz &&
          scrollInteractionStress.framesOver33Ms === 0),
      longTasks:
        pageMetrics.observed.longTasks.every(
          ({ durationMs }) =>
            durationMs <= thresholds.longTaskMaxMs,
        ) &&
        pageMetrics.observed.longTasks.reduce(
          (total, { durationMs }) => total + durationMs,
          0,
        ) <= thresholds.longTaskTotalMs,
      coldResourceTransfer:
        pageMetrics.requestGraph.budget.withinTransferBudget,
      coldResourcePayload:
        pageMetrics.requestGraph.budget.withinEncodedBodyBudget,
      coldResourceRequestCount:
        pageMetrics.requestGraph.budget.withinResourceCountBudget,
      heapUse:
        report.chromium.jsHeapUsedBytes <=
          thresholds.jsHeapUsedBytes,
      retainedHeap:
        report.retainedResources.heapUsedAfterGcBytes <=
        thresholds.retainedHeapBytes,
      idleCpu:
        (report.idleResources.taskMs / idleWindowMs) * 1000 <=
        thresholds.idleTaskMsPerSecond,
      localMutationContinuity:
        !localMutations.enabled || localMutations.summary.continuityPreserved,
      localMutationHandlerFrameBudget:
        !localMutations.enabled ||
        localMutations.summary.slowestHandler.handlerMs <=
          thresholds.handlerFrameBudgetMs,
      localMutationImmediatePaint:
        !localMutations.enabled ||
        localMutations.summary.slowestImmediatePaint.immediatePaintMs <=
          thresholds.interactionNextPaintMs,
      localMutationSettledPaint:
        !localMutations.enabled ||
        localMutations.summary.slowestSettledPaint.settledPaintMs <=
          thresholds.localMutationSettledPaintMs,
      localMutationMainThreadTask:
        !localMutations.enabled ||
        localMutations.summary.largestMainThreadTask.taskMs <=
          thresholds.localMutationMainThreadTaskMs,
      localMutationRetainedHeap:
        !localMutations.enabled ||
        localMutations.summary.largestRetainedHeap.retainedAfterGcBytes <=
          thresholds.localMutationRetainedHeapBytes,
      statsSurfaceNodeRelease:
        !localMutations.enabled ||
        localMutations.summary.statsSurfaceNodeReleasePercent >=
          thresholds.statsSurfaceNodeReleasePercent,
      statsOpenCloseNoRetainedNodes:
        !localMutations.enabled ||
        localMutations.summary.statsOpenCloseRetention.noRetainedNodes,
      statsOpenCloseNoRetainedDocuments:
        !localMutations.enabled ||
        localMutations.summary.statsOpenCloseRetention.noRetainedDocuments,
      statsOpenCloseRetainedHeap:
        !localMutations.enabled ||
        localMutations.summary.statsOpenCloseRetention.peakRetainedHeapBytes <=
          thresholds.statsOpenCloseRetainedHeapBytes,
      ...deepAssessment.checks,
    },
  };
  report.assessment.needsAttention = Object.entries(
    report.assessment.checks,
  )
    .filter(([, passed]) => !passed)
    .map(([check]) => check);
  const advisories =
    localMutations.enabled &&
    localMutations.summary.statsOpenCloseRetention.peakRetainedHeapBytes >
      thresholds.statsOpenCloseRetainedHeapWarningBytes
      ? ["statsOpenCloseRetainedHeapWarning"]
      : [];
  report.assessment.advisories = advisories;
  report.assessment.enforcement =
    cpuThrottleRate > 1
      ? {
          mode: "advisory",
          reason:
            "CPU-throttled diagnostics require a separately calibrated cohort and do not reuse desktop software-rendering gates.",
        }
      : !hardwareGpuRequested &&
    graphicsMetadata.renderingClass === "software"
      ? {
        mode: "enforced",
        reason:
          "The established software-rendering baseline retains its performance gates.",
        }
      : {
          mode: "advisory",
          reason: hardwareGpuRequested
            ? "The hardware-GPU cohort has no calibrated same-cohort thresholds yet."
            : "The established software renderer was not observed, so its thresholds cannot gate this cohort.",
        };

  await writeFile(
    resolve(output, "performance-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  if (!skipTrace) {
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    traceStarted = true;
    const tracePage = await context.newPage();
    await driveRepresentativePath(tracePage, targetUrl, null);
    await context.tracing.stop({
      path: resolve(output, "performance-trace.zip"),
    });
    traceStarted = false;
  }

  if (!quiet) console.log(JSON.stringify(report, null, 2));
  if (
    report.assessment.enforcement.mode === "enforced" &&
    report.assessment.needsAttention.length > 0
  ) {
    throw new Error(
      `Performance budgets failed: ${report.assessment.needsAttention.join(", ")}`,
    );
  }
} finally {
  if (traceStarted && context) {
    await context.tracing.stop({
      path: resolve(output, "performance-trace.zip"),
    });
  }
  await browser?.close();
  await server?.close();
}
