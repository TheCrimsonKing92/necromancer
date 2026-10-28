import { performance } from "node:perf_hooks";
import { createWorstCaseFixtureMatrix } from "./performance-worst-case-fixtures.mjs";

const DEFAULT_SAVE_KEY = "necromancer:save:v4";

const SURFACES = Object.freeze({
  stats: {
    ready: "[data-stats-surface]",
    open: "[data-stats-control]",
    close: "[data-stats-control]",
  },
  inventory: {
    ready: ".inventory-page",
    open: '[data-action="open-inventory"]',
    close: '.site-header [data-action="close-inventory"]',
  },
  journal: {
    ready: ".journal-page",
    open: '[data-action="open-journal"]',
    close: '.site-header [data-action="close-journal"]',
  },
});

const FIXTURE_READY = Object.freeze({
  battle: ".battle-page",
  inventory: ".inventory-page",
  journal: ".journal-page",
  stats: "[data-stats-surface]",
});

const afterPaint = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

const browserSnapshot = (page) =>
  page.evaluate(() => ({
    nodeCount: document.querySelectorAll("*").length,
    documentCount: document.querySelectorAll("html").length,
    usedJsHeapBytes: Number.isFinite(performance.memory?.usedJSHeapSize)
      ? performance.memory.usedJSHeapSize
      : null,
  }));

const retainedSnapshot = async (page) => {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Performance.enable");
    await session.send("HeapProfiler.collectGarbage");
    const [{ metrics }, dom] = await Promise.all([
      session.send("Performance.getMetrics"),
      session.send("Memory.getDOMCounters"),
    ]);
    const byName = Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
    return {
      heapUsedBytes: byName.JSHeapUsedSize ?? null,
      documents: dom.documents ?? null,
      nodes: dom.nodes ?? null,
      jsEventListeners: dom.jsEventListeners ?? null,
    };
  } finally {
    await session.detach();
  }
};

export const prepareWorstCaseBrowserFixture = async ({
  page,
  targetUrl,
  fixture,
  saveKey = DEFAULT_SAVE_KEY,
}) => {
  if (!page?.goto || !page?.evaluate || !page?.locator) {
    throw new TypeError("A Playwright page is required.");
  }
  if (!FIXTURE_READY[fixture?.surface]) {
    throw new TypeError("A known worst-case fixture is required.");
  }

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: saveKey, value: fixture.envelope },
  );
  await page.reload({ waitUntil: "networkidle" });
  const resumeStartedAt = performance.now();
  await page.locator('[data-action="continue"]').click();

  if (fixture.surface === "stats") {
    await page.locator("[data-stats-control]").click();
  }
  await page.locator(FIXTURE_READY[fixture.surface]).waitFor({
    state: "visible",
  });
  await afterPaint(page);

  return {
    id: fixture.id,
    surface: fixture.surface,
    saveKey,
    snapshot: await browserSnapshot(page),
    resumeReadyMs: Number((performance.now() - resumeStartedAt).toFixed(2)),
    renderedWitnessEntries:
      fixture.surface === "battle"
        ? await page.locator(".battle-log .log-entry").count()
        : null,
    unsupportedDimensions: Object.fromEntries(
      Object.entries(fixture.manifest).filter(
        ([, value]) => value?.supported === false,
      ),
    ),
  };
};

export const createRealInteractionSoakPlan = ({
  interactionCount = 600,
} = {}) => {
  if (
    !Number.isInteger(interactionCount) ||
    interactionCount < 500 ||
    interactionCount > 1_000 ||
    interactionCount % 2 !== 0
  ) {
    throw new TypeError(
      "interactionCount must be an even integer from 500 through 1000.",
    );
  }
  const cycleCount = interactionCount / 2;
  const surfaces = Object.keys(SURFACES);
  return {
    interactionCount,
    cycleCount,
    cycles: Array.from({ length: cycleCount }, (_, index) => ({
      index,
      surface: surfaces[index % surfaces.length],
      interactions: ["open", "close"],
    })),
    unsupportedDimensions: {
      campaignRouteNavigation: {
        supported: false,
        reason:
          "The integrated v4 campaign has no reversible 500-step route journey; this soak uses public optional-surface navigation only.",
      },
      domainTransitions: {
        supported: false,
        reason:
          "The soak does not report UI navigation as successful combat, inventory, advancement, or story outcomes.",
      },
    },
  };
};

const rank = (values, fraction) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};

const summarizeDurations = (values) => ({
  count: values.length,
  medianMs: rank(values, 0.5),
  p95Ms: rank(values, 0.95),
  p99Ms: rank(values, 0.99),
  maximumMs: rank(values, 1),
});

/**
 * Exercise only public, reversible controls. The page must begin on a story
 * fixture with Stats, Inventory, and Journal controls available.
 */
export const runRealInteractionNavigationSoak = async ({
  page,
  plan = createRealInteractionSoakPlan(),
  checkpointAtCycle = null,
  onCheckpoint = null,
}) => {
  const baseline = await browserSnapshot(page);
  const samples = [];
  const startedAt = performance.now();

  for (const cycle of plan.cycles) {
    const contract = SURFACES[cycle.surface];
    const cycleStartedAt = performance.now();
    await page.locator(contract.open).click();
    await page.locator(contract.ready).waitFor({ state: "visible" });
    await page.locator(contract.close).click();
    await page.locator(contract.ready).waitFor({ state: "detached" });
    await afterPaint(page);
    samples.push({
      index: cycle.index,
      surface: cycle.surface,
      durationMs: Number((performance.now() - cycleStartedAt).toFixed(2)),
      snapshot: await browserSnapshot(page),
    });
    if (
      onCheckpoint &&
      checkpointAtCycle !== null &&
      cycle.index + 1 === checkpointAtCycle
    ) {
      await onCheckpoint();
    }
  }

  const final = await browserSnapshot(page);
  const durations = samples.map(({ durationMs }) => durationMs);
  return {
    supported: true,
    interactionCount: plan.interactionCount,
    cycleCount: plan.cycleCount,
    totalDurationMs: Number((performance.now() - startedAt).toFixed(2)),
    medianCycleMs: rank(durations, 0.5),
    p95CycleMs: rank(durations, 0.95),
    p99CycleMs: rank(durations, 0.99),
    maximumCycleMs: rank(durations, 1),
    finalNodeDelta: final.nodeCount - baseline.nodeCount,
    peakNodeDelta: Math.max(
      0,
      ...samples.map(({ snapshot }) => snapshot.nodeCount - baseline.nodeCount),
    ),
    finalDocumentDelta: final.documentCount - baseline.documentCount,
    finalUsedJsHeapDelta:
      final.usedJsHeapBytes === null || baseline.usedJsHeapBytes === null
        ? null
        : final.usedJsHeapBytes - baseline.usedJsHeapBytes,
    surfaceCycles: Object.fromEntries(
      Object.keys(SURFACES).map((surface) => [
        surface,
        samples.filter((sample) => sample.surface === surface).length,
      ]),
    ),
    surfaceDurations: Object.fromEntries(
      Object.keys(SURFACES).map((surface) => [
        surface,
        summarizeDurations(
          samples
            .filter((sample) => sample.surface === surface)
            .map((sample) => sample.durationMs),
        ),
      ]),
    ),
    unsupportedDimensions: plan.unsupportedDimensions,
  };
};

export const captureWorstCaseBrowserMatrix = async ({
  sourcePage,
  targetUrl,
  saveKey = DEFAULT_SAVE_KEY,
  soakInteractions = 1_000,
}) => {
  const rawSave = await sourcePage.evaluate(
    (key) => localStorage.getItem(key),
    saveKey,
  );
  if (!rawSave) {
    return {
      supported: false,
      reason: "A real v4 save is required before worst-case fixtures can be derived.",
    };
  }

  let fixtures;
  try {
    fixtures = createWorstCaseFixtureMatrix(JSON.parse(rawSave));
  } catch (error) {
    return {
      supported: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const context = sourcePage.context();
  const surfaces = [];
  let soak = null;
  try {
    for (const fixture of fixtures) {
      const page = await context.newPage();
      const startedAt = performance.now();
      const prepared = await prepareWorstCaseBrowserFixture({
        page,
        targetUrl,
        fixture,
        saveKey,
      });
      surfaces.push({
        ...prepared,
        readyMs: Number((performance.now() - startedAt).toFixed(2)),
        retained: await retainedSnapshot(page),
      });
      if (fixture.id === "stats-tree") {
        await page.locator("[data-stats-control]").click();
        await page.locator("[data-stats-surface]").waitFor({ state: "detached" });
        for (const contract of Object.values(SURFACES)) {
          await page.locator(contract.open).click();
          await page.locator(contract.ready).waitFor({ state: "visible" });
          await page.locator(contract.close).click();
          await page.locator(contract.ready).waitFor({ state: "detached" });
          await afterPaint(page);
        }
        const retainedBefore = await retainedSnapshot(page);
        let retainedMidpoint = null;
        const soakPlan = createRealInteractionSoakPlan({
          interactionCount: soakInteractions,
        });
        soak = await runRealInteractionNavigationSoak({
          page,
          plan: soakPlan,
          checkpointAtCycle: Math.floor(soakPlan.cycleCount / 2),
          onCheckpoint: async () => {
            retainedMidpoint = await retainedSnapshot(page);
          },
        });
        const retainedAfter = await retainedSnapshot(page);
        soak.retained = {
          before: retainedBefore,
          midpoint: retainedMidpoint,
          after: retainedAfter,
          heapDelta:
            retainedBefore.heapUsedBytes === null || retainedAfter.heapUsedBytes === null
              ? null
              : retainedAfter.heapUsedBytes - retainedBefore.heapUsedBytes,
          nodeDelta:
            retainedBefore.nodes === null || retainedAfter.nodes === null
              ? null
              : retainedAfter.nodes - retainedBefore.nodes,
          documentDelta:
            retainedBefore.documents === null || retainedAfter.documents === null
              ? null
              : retainedAfter.documents - retainedBefore.documents,
          secondHalfHeapDelta:
            retainedMidpoint === null ||
            retainedMidpoint.heapUsedBytes === null ||
            retainedAfter.heapUsedBytes === null
              ? null
              : retainedAfter.heapUsedBytes - retainedMidpoint.heapUsedBytes,
          secondHalfNodeDelta:
            retainedMidpoint === null ||
            retainedMidpoint.nodes === null ||
            retainedAfter.nodes === null
              ? null
              : retainedAfter.nodes - retainedMidpoint.nodes,
          secondHalfDocumentDelta:
            retainedMidpoint === null ||
            retainedMidpoint.documents === null ||
            retainedAfter.documents === null
              ? null
              : retainedAfter.documents - retainedMidpoint.documents,
        };
      }
      await page.close();
    }
  } finally {
    await sourcePage.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: saveKey, value: rawSave },
    );
  }

  return {
    supported: true,
    surfaces,
    soak,
  };
};
