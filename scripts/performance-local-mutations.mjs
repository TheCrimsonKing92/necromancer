import assert from "node:assert/strict";
import { assessStatsOpenCloseRetention } from "./performance-retention-budget.mjs";

const VIEWPORT = { width: 1440, height: 1000 };

const afterPaint = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

const metricMap = (metrics) =>
  Object.fromEntries(metrics.map(({ name, value }) => [name, value]));

const roundedDelta = (after, before, key, scale = 1) =>
  Number((((after[key] ?? 0) - (before[key] ?? 0)) * scale).toFixed(2));

const clearPerformanceCampaign = async (page) => {
  const removed = await page.evaluate(() => {
    const keys = [
      "necromancer:save:v4",
      "necromancer:save:v3",
      "necromancer:save:v2",
      "necromancer:save:v1",
    ];
    const found = keys.some((key) => localStorage.getItem(key) !== null);
    keys.forEach((key) => localStorage.removeItem(key));
    return found;
  });
  if (removed) await page.reload({ waitUntil: "networkidle" });
};

const createCharacter = async (page, targetUrl, tradition, name) => {
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await clearPerformanceCampaign(page);
  await page.locator('[data-action="start-new"]').click();
  await page.locator("#character-name").fill(name);
  await page.locator('input[name="sex"][value="other"]').check();
  await page.locator(`input[name="tradition"][value="${tradition}"]`).check();
  await page.locator('#character-form button[type="submit"]').click();
  await page.locator(".game-layout, .battle-page").first().waitFor();
  await afterPaint(page);
};

export const prepareRepresentativeStatsPage = async (
  page,
  targetUrl,
  name = "Stats Construction",
) => {
  await createCharacter(page, targetUrl, "medium", name);
  await page.locator("[data-stats-control]").click();
  await page.locator("[data-stats-surface]").waitFor();
  await afterPaint(page);
};

const enterFirstBattle = async (page, targetUrl, tradition) => {
  await createCharacter(page, targetUrl, tradition, "Mutation Trace");
  for (let step = 0; step < 16; step += 1) {
    if (await page.locator(".battle-page").count()) return;
    const dismiss = page.locator(
      '[data-action="dismiss-result"]:not([disabled])',
    );
    if (await dismiss.count()) {
      await dismiss.first().click();
      await afterPaint(page);
      continue;
    }
    const choice = page.locator(
      '[data-action="choose-story"]:not([disabled])',
    );
    if (!(await choice.count())) break;
    await choice.first().click();
    await afterPaint(page);
  }
  assert.fail("The local-mutation path did not reach its first battle.");
};

const prepareOptionalStoryChoice = async (page, targetUrl, name) => {
  await createCharacter(page, targetUrl, "medium", name);
  await page
    .locator('[data-action="choose-story"][data-choice-id="burial-cut"]')
    .click();
  await afterPaint(page);
  const choice = page
    .locator('[data-action="choose-story"]')
    .filter({ hasText: "Optional action" })
    .first();
  assert.equal(await choice.count(), 1);
  return choice;
};

const beginMutationProbe = async (page, identitySelectors) => {
  await page.evaluate((selectors) => {
    const root =
      document.querySelector("#app") ??
      document.querySelector(".app-shell") ??
      document.body;
    const identities = Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [
        key,
        document.querySelector(selector),
      ]),
    );
    const mutations = {
      records: 0,
      addedNodes: 0,
      removedNodes: 0,
      addedElements: 0,
      removedElements: 0,
      attributes: 0,
      characterData: 0,
    };
    const countElements = (nodes) =>
      [...nodes].reduce(
        (total, node) =>
          total +
          (node instanceof Element
            ? 1 + node.querySelectorAll("*").length
            : 0),
        0,
      );
    const observer = new MutationObserver((records) => {
      mutations.records += records.length;
      for (const record of records) {
        if (record.type === "childList") {
          mutations.addedNodes += record.addedNodes.length;
          mutations.removedNodes += record.removedNodes.length;
          mutations.addedElements += countElements(record.addedNodes);
          mutations.removedElements += countElements(record.removedNodes);
        } else if (record.type === "attributes") {
          mutations.attributes += 1;
        } else if (record.type === "characterData") {
          mutations.characterData += 1;
        }
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    window.__necromancerLocalMutationProbe = {
      identities,
      mutations,
      observer,
      startedAt: performance.now(),
      resourceNames: new Set(
        performance.getEntriesByType("resource").map((entry) => entry.name),
      ),
      runtimeCosts: Object.fromEntries(
        Object.entries(window.__necromancerPerfCosts).map(([key, value]) => [
          key,
          { ...value },
        ]),
      ),
    };
  }, identitySelectors);
};

const finishMutationProbe = (page, identitySelectors) =>
  page.evaluate((selectors) => {
    const probe = window.__necromancerLocalMutationProbe;
    if (!probe) throw new Error("The local mutation probe was not installed.");
    probe.observer.disconnect();
    const identityRetained = Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [
        key,
        probe.identities[key] === document.querySelector(selector),
      ]),
    );
    const result = {
      mutations: probe.mutations,
      identityRetained,
      settledPaintMs: (probe.settledAt ?? performance.now()) - probe.startedAt,
      loadedResources: performance
        .getEntriesByType("resource")
        .filter((entry) => !probe.resourceNames.has(entry.name))
        .map((entry) => ({
          name: new URL(entry.name).pathname,
          transferBytes: entry.transferSize,
        })),
      runtimeCosts: Object.fromEntries(
        Object.entries(window.__necromancerPerfCosts).map(([key, value]) => [
          key,
          {
            calls: value.calls - probe.runtimeCosts[key].calls,
            totalMs: Number(
              (value.totalMs - probe.runtimeCosts[key].totalMs).toFixed(3),
            ),
            payloadBytes:
              value.payloadBytes - probe.runtimeCosts[key].payloadBytes,
          },
        ]),
      ),
    };
    delete window.__necromancerLocalMutationProbe;
    return result;
  }, identitySelectors);

const measureLocalMutation = async ({
  cdp,
  page,
  label,
  target,
  settle,
  identitySelectors,
}) => {
  await cdp.send("HeapProfiler.collectGarbage");
  const beforeMetrics = metricMap(
    (await cdp.send("Performance.getMetrics")).metrics,
  );
  const beforeDom = await cdp.send("Memory.getDOMCounters");
  await beginMutationProbe(page, identitySelectors);

  const immediate = await target.evaluate(async (element) => {
    const start = performance.now();
    element.click();
    const handlerMs = performance.now() - start;
    await new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );
    return {
      handlerMs,
      immediatePaintMs: performance.now() - start,
    };
  });
  await settle();
  await afterPaint(page);
  await page.evaluate(() => {
    const probe = window.__necromancerLocalMutationProbe;
    if (!probe) throw new Error("The local mutation probe was not installed.");
    probe.settledAt = performance.now();
  });

  const peakMetrics = metricMap(
    (await cdp.send("Performance.getMetrics")).metrics,
  );
  const probe = await finishMutationProbe(page, identitySelectors);
  await cdp.send("HeapProfiler.collectGarbage");
  const retainedMetrics = metricMap(
    (await cdp.send("Performance.getMetrics")).metrics,
  );
  const retainedDom = await cdp.send("Memory.getDOMCounters");

  return {
    label,
    handlerMs: Number(immediate.handlerMs.toFixed(2)),
    immediatePaintMs: Number(immediate.immediatePaintMs.toFixed(2)),
    settledPaintMs: Number(probe.settledPaintMs.toFixed(2)),
    mainThread: {
      taskMs: roundedDelta(peakMetrics, beforeMetrics, "TaskDuration", 1000),
      scriptMs: roundedDelta(peakMetrics, beforeMetrics, "ScriptDuration", 1000),
      layoutMs: roundedDelta(peakMetrics, beforeMetrics, "LayoutDuration", 1000),
      styleMs: roundedDelta(
        peakMetrics,
        beforeMetrics,
        "RecalcStyleDuration",
        1000,
      ),
      layouts: roundedDelta(peakMetrics, beforeMetrics, "LayoutCount"),
      styleRecalcs: roundedDelta(
        peakMetrics,
        beforeMetrics,
        "RecalcStyleCount",
      ),
    },
    heap: {
      allocatedBeforeGcBytes: Math.max(
        0,
        roundedDelta(peakMetrics, beforeMetrics, "JSHeapUsedSize"),
      ),
      retainedAfterGcBytes: roundedDelta(
        retainedMetrics,
        beforeMetrics,
        "JSHeapUsedSize",
      ),
    },
    dom: {
      nodesBefore: beforeDom.nodes,
      nodesAfterGc: retainedDom.nodes,
      retainedNodeDelta: retainedDom.nodes - beforeDom.nodes,
      documentsBefore: beforeDom.documents,
      documentsAfterGc: retainedDom.documents,
    },
    mutations: probe.mutations,
    loadedResources: probe.loadedResources,
    runtimeCosts: probe.runtimeCosts,
    identityRetained: probe.identityRetained,
  };
};

const slowestBy = (scenarios, key) => {
  const slowest = scenarios.reduce(
    (candidate, scenario) =>
      scenario[key] > candidate[key] ? scenario : candidate,
    { label: "None", [key]: 0 },
  );
  return { label: slowest.label, [key]: slowest[key] };
};

const largestNestedBy = (scenarios, group, key) => {
  const largest = scenarios.reduce(
    (candidate, scenario) =>
      scenario[group][key] > candidate[group][key] ? scenario : candidate,
    { label: "None", [group]: { [key]: 0 } },
  );
  return { label: largest.label, [key]: largest[group][key] };
};

const scenarioDelta = (variant, baseline) => ({
  handlerMs: Number((variant.handlerMs - baseline.handlerMs).toFixed(2)),
  immediatePaintMs: Number(
    (variant.immediatePaintMs - baseline.immediatePaintMs).toFixed(2),
  ),
  settledPaintMs: Number(
    (variant.settledPaintMs - baseline.settledPaintMs).toFixed(2),
  ),
  taskMs: Number(
    (variant.mainThread.taskMs - baseline.mainThread.taskMs).toFixed(2),
  ),
  layoutMs: Number(
    (variant.mainThread.layoutMs - baseline.mainThread.layoutMs).toFixed(2),
  ),
  allocatedBeforeGcBytes:
    variant.heap.allocatedBeforeGcBytes - baseline.heap.allocatedBeforeGcBytes,
  retainedAfterGcBytes:
    variant.heap.retainedAfterGcBytes - baseline.heap.retainedAfterGcBytes,
});

const measureFreshStoryChoice = async ({
  context,
  targetUrl,
  label,
  installExperiment,
}) => {
  const page = await context.newPage();
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const target = await prepareOptionalStoryChoice(
      page,
      targetUrl,
      `Persistence ${label}`,
    );
    await installExperiment(page);
    return await measureLocalMutation({
      cdp,
      page,
      label,
      target,
      settle: () => page.locator("[data-result-title]").waitFor(),
      identitySelectors: {
        shell: ".app-shell",
        story: ".story-panel",
        dossier: ".dossier",
      },
    });
  } finally {
    await page.close();
  }
};

const measureContainedStatsReopen = async ({ context, targetUrl }) => {
  const page = await context.newPage();
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    await createCharacter(page, targetUrl, "medium", "Contained Stats");
    await page.locator("[data-stats-control]").click();
    await page.locator("[data-stats-surface]").waitFor();
    await page.locator("[data-stats-control]").click();
    await page.locator("[data-stats-surface]").waitFor({ state: "detached" });
    await page.addStyleTag({
      content: `
        .stats-surface > .stats-section,
        .stats-surface > .advancement-panel {
          content-visibility: auto;
          contain-intrinsic-size: auto 20rem;
        }
      `,
    });
    await afterPaint(page);
    return await measureLocalMutation({
      cdp,
      page,
      label: "Reopen Stats (offscreen containment)",
      target: page.locator("[data-stats-control]"),
      settle: () => page.locator("[data-stats-surface]").waitFor(),
      identitySelectors: {
        shell: ".app-shell",
        screen: ".game-layout",
      },
    });
  } finally {
    await page.close();
  }
};

const measureStatsOpenCloseStability = async ({ context, targetUrl }) => {
  const page = await context.newPage();
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    await createCharacter(page, targetUrl, "medium", "Stats Stability");
    const control = page.locator("[data-stats-control]");

    await control.click();
    await page.locator("[data-stats-surface]").waitFor();
    await control.click();
    await page
      .locator("[data-stats-surface]")
      .waitFor({ state: "detached" });
    await afterPaint(page);
    await cdp.send("HeapProfiler.collectGarbage");
    const baselineMetrics = metricMap(
      (await cdp.send("Performance.getMetrics")).metrics,
    );
    const baselineDom = await cdp.send("Memory.getDOMCounters");
    const cycles = [];

    for (let cycle = 1; cycle <= 24; cycle += 1) {
      await control.click();
      await page.locator("[data-stats-surface]").waitFor();
      await control.click();
      await page
        .locator("[data-stats-surface]")
        .waitFor({ state: "detached" });
      await afterPaint(page);
      await cdp.send("HeapProfiler.collectGarbage");
      const metrics = metricMap(
        (await cdp.send("Performance.getMetrics")).metrics,
      );
      const dom = await cdp.send("Memory.getDOMCounters");
      cycles.push({
        cycle,
        retainedHeapBytes: roundedDelta(
          metrics,
          baselineMetrics,
          "JSHeapUsedSize",
        ),
        retainedNodeDelta: dom.nodes - baselineDom.nodes,
        documentDelta: dom.documents - baselineDom.documents,
      });
    }

    return {
      cycleCount: cycles.length,
      cycles,
      final: cycles.at(-1),
      peakRetainedHeapBytes: Math.max(
        0,
        ...cycles.map(({ retainedHeapBytes }) => retainedHeapBytes),
      ),
      stableNodeCount: cycles.every(({ retainedNodeDelta }) => retainedNodeDelta === 0),
      stableDocumentCount: cycles.every(({ documentDelta }) => documentDelta === 0),
    };
  } finally {
    await page.close();
  }
};

const summarize = (scenarios, statsOpenCloseStability) => {
  const statsOpen = scenarios.find(({ label }) => label === "Open Stats");
  const statsClose = scenarios.find(({ label }) => label === "Close Stats");
  const openedNodes = Math.max(0, statsOpen?.dom.retainedNodeDelta ?? 0);
  const releasedNodes = Math.max(
    0,
    -(statsClose?.dom.retainedNodeDelta ?? 0),
  );
  return {
    scenarioCount: scenarios.length,
    slowestHandler: slowestBy(scenarios, "handlerMs"),
    slowestImmediatePaint: slowestBy(scenarios, "immediatePaintMs"),
    slowestSettledPaint: slowestBy(scenarios, "settledPaintMs"),
    largestMainThreadTask: largestNestedBy(scenarios, "mainThread", "taskMs"),
    largestRetainedHeap: largestNestedBy(
      scenarios,
      "heap",
      "retainedAfterGcBytes",
    ),
    statsSurfaceNodeReleasePercent:
      openedNodes === 0
        ? 100
        : Number(((releasedNodes / openedNodes) * 100).toFixed(1)),
    statsOpenCloseRetention: assessStatsOpenCloseRetention(
      statsOpenCloseStability,
    ),
    continuityPreserved: scenarios.every((scenario) =>
      Object.values(scenario.identityRetained).every(Boolean),
    ),
  };
};

export const captureLocalMutationBenchmark = async ({ browser, targetUrl }) => {
  const scenarios = [];
  const context = await browser.newContext({
    viewport: VIEWPORT,
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    const costs = {
      structuredClone: { calls: 0, totalMs: 0, payloadBytes: 0 },
      jsonStringify: { calls: 0, totalMs: 0, payloadBytes: 0 },
      storageSetItem: { calls: 0, totalMs: 0, payloadBytes: 0 },
    };
    window.__necromancerPerfCosts = costs;

    const nativeStructuredClone = window.structuredClone;
    window.structuredClone = function (...arguments_) {
      const startedAt = performance.now();
      try {
        return Reflect.apply(nativeStructuredClone, this, arguments_);
      } finally {
        costs.structuredClone.calls += 1;
        costs.structuredClone.totalMs += performance.now() - startedAt;
      }
    };

    const nativeStringify = JSON.stringify;
    JSON.stringify = function (...arguments_) {
      const startedAt = performance.now();
      try {
        const value = Reflect.apply(nativeStringify, this, arguments_);
        costs.jsonStringify.payloadBytes += value?.length ?? 0;
        return value;
      } finally {
        costs.jsonStringify.calls += 1;
        costs.jsonStringify.totalMs += performance.now() - startedAt;
      }
    };

    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      const startedAt = performance.now();
      try {
        return Reflect.apply(nativeSetItem, this, [key, value]);
      } finally {
        costs.storageSetItem.calls += 1;
        costs.storageSetItem.totalMs += performance.now() - startedAt;
        costs.storageSetItem.payloadBytes += value.length;
      }
    };
  });
  try {
    const storyPage = await context.newPage();
    const storyCdp = await context.newCDPSession(storyPage);
    await storyCdp.send("Performance.enable");
    await createCharacter(storyPage, targetUrl, "medium", "Local Mutation");

    const screenIdentity = {
      shell: ".app-shell",
      screen: ".game-layout",
    };
    scenarios.push(
      await measureLocalMutation({
        cdp: storyCdp,
        page: storyPage,
        label: "Open Stats",
        target: storyPage.locator("[data-stats-control]"),
        settle: () => storyPage.locator("[data-stats-surface]").waitFor(),
        identitySelectors: screenIdentity,
      }),
    );
    scenarios.push(
      await measureLocalMutation({
        cdp: storyCdp,
        page: storyPage,
        label: "Open discipline tree",
        target: storyPage.locator('[data-stats-pane-id="disciplines"]'),
        settle: () => storyPage.locator(".advancement-workspace").waitFor(),
        identitySelectors: {
          ...screenIdentity,
          stats: "[data-stats-surface]",
        },
      }),
    );
    await storyPage.locator('[data-stats-pane-id="character"]').click();
    await storyPage.locator('[data-stats-pane="character"]').waitFor();
    await afterPaint(storyPage);
    scenarios.push(
      await measureLocalMutation({
        cdp: storyCdp,
        page: storyPage,
        label: "Close Stats",
        target: storyPage.locator("[data-stats-control]"),
        settle: () =>
          storyPage.locator("[data-stats-surface]").waitFor({ state: "detached" }),
        identitySelectors: screenIdentity,
      }),
    );
    scenarios.push(
      await measureLocalMutation({
        cdp: storyCdp,
        page: storyPage,
        label: "Reopen Stats (warm)",
        target: storyPage.locator("[data-stats-control]"),
        settle: () => storyPage.locator("[data-stats-surface]").waitFor(),
        identitySelectors: screenIdentity,
      }),
    );
    await storyPage.locator("[data-stats-control]").click();
    await storyPage
      .locator("[data-stats-surface]")
      .waitFor({ state: "detached" });
    await afterPaint(storyPage);

    await storyPage
      .locator('[data-action="choose-story"][data-choice-id="burial-cut"]')
      .click();
    await afterPaint(storyPage);
    const optionalChoice = storyPage
      .locator('[data-action="choose-story"]')
      .filter({ hasText: "Optional action" })
      .first();
    assert.equal(await optionalChoice.count(), 1);
    const storyIdentity = {
      shell: ".app-shell",
      story: ".story-panel",
      dossier: ".dossier",
    };
    scenarios.push(
      await measureLocalMutation({
        cdp: storyCdp,
        page: storyPage,
        label: "Resolve optional story choice",
        target: optionalChoice,
        settle: () => storyPage.locator("[data-result-title]").waitFor(),
        identitySelectors: storyIdentity,
      }),
    );

    const warmStatsBaseline = scenarios.find(
      ({ label }) => label === "Reopen Stats (warm)",
    );
    assert.ok(warmStatsBaseline);

    const containedStats = await measureContainedStatsReopen({
      context,
      targetUrl,
    });
    const statsOpenCloseStability = await measureStatsOpenCloseStability({
      context,
      targetUrl,
    });
    const persistenceBaseline = await measureFreshStoryChoice({
      context,
      targetUrl,
      label: "Story choice (persistence baseline)",
      installExperiment: async () => {},
    });
    const storageWriteBypass = await measureFreshStoryChoice({
      context,
      targetUrl,
      label: "Story choice (storage write bypass)",
      installExperiment: (page) =>
        page.evaluate(() => {
          const originalSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (...arguments_) {
            if (this === localStorage) return;
            return originalSetItem.apply(this, arguments_);
          };
        }),
    });
    const persistenceBypass = await measureFreshStoryChoice({
      context,
      targetUrl,
      label: "Story choice (serialization and storage bypass)",
      installExperiment: (page) =>
        page.evaluate(() => {
          JSON.stringify = () => "{}";
          Storage.prototype.setItem = function () {};
        }),
    });
    scenarios.push(
      await measureLocalMutation({
        cdp: storyCdp,
        page: storyPage,
        label: "Dismiss story outcome",
        target: storyPage.locator(
          '[data-story-outcome-slot] [data-action="dismiss-result"]',
        ),
        settle: () =>
          storyPage.locator("[data-result-title]").waitFor({ state: "detached" }),
        identitySelectors: storyIdentity,
      }),
    );

    await storyPage.locator('[data-action="open-inventory"]').click();
    await storyPage.locator(".inventory-page").waitFor();
    await afterPaint(storyPage);
    const inventoryIdentity = {
      page: ".inventory-page",
      equipment: ".inventory-section--equipment",
      anatomy: ".inventory-section--anatomy",
    };
    scenarios.push(
      await measureLocalMutation({
        cdp: storyCdp,
        page: storyPage,
        label: "Unequip item",
        target: storyPage
          .locator(
            '.inventory-section--equipment [data-action="unequip-item"]',
          )
          .first(),
        settle: () => storyPage.locator(".notice").waitFor(),
        identitySelectors: inventoryIdentity,
      }),
    );

    const battlePage = await context.newPage();
    const battleCdp = await context.newCDPSession(battlePage);
    await battleCdp.send("Performance.enable");
    await enterFirstBattle(battlePage, targetUrl, "summoner");
    const battleIdentity = {
      shell: ".app-shell",
      enemies: ".enemy-section",
      dossier: ".dossier",
    };
    scenarios.push(
      await measureLocalMutation({
        cdp: battleCdp,
        page: battlePage,
        label: "Choose servant direction",
        target: battlePage.locator('[data-command-id="guard"]'),
        settle: () =>
          battlePage
            .locator('[data-command-id="guard"][aria-pressed="true"]')
            .waitFor({ state: "attached" }),
        identitySelectors: battleIdentity,
      }),
    );

    await battlePage
      .locator('[data-action="battle-action"][data-action-id="strike"]')
      .click();
    await afterPaint(battlePage);
    await battlePage.locator(".servant-direction-change > summary").click();
    scenarios.push(
      await measureLocalMutation({
        cdp: battleCdp,
        page: battlePage,
        label: "Replace servant direction",
        target: battlePage.locator('[data-command-id="harry"]'),
        settle: () =>
          battlePage
            .locator('[data-command-id="harry"][aria-pressed="true"]')
            .waitFor({ state: "attached" }),
        identitySelectors: battleIdentity,
      }),
    );

    return {
      enabled: true,
      isolatedFromBaseline: true,
      scenarios,
      summary: summarize(scenarios, statsOpenCloseStability),
      experiments: {
        statsOffscreenContainment: {
          baseline: warmStatsBaseline,
          variant: containedStats,
          delta: scenarioDelta(containedStats, warmStatsBaseline),
        },
        statsOpenCloseStability,
        persistenceAttribution: {
          baseline: persistenceBaseline,
          storageWriteBypass,
          serializationAndStorageBypass: persistenceBypass,
          estimatedStorageWrite: scenarioDelta(
            persistenceBaseline,
            storageWriteBypass,
          ),
          estimatedSerialization: scenarioDelta(
            storageWriteBypass,
            persistenceBypass,
          ),
          estimatedTotalPersistence: scenarioDelta(
            persistenceBaseline,
            persistenceBypass,
          ),
        },
      },
    };
  } finally {
    await context.close();
  }
};
