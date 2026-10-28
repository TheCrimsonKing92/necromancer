const VARIANTS = ["full-template", "direct-fragment", "render-once-keyed"];

const finiteDelta = (after, before) =>
  Number.isFinite(after) && Number.isFinite(before) ? after - before : null;

const metricMap = (response) =>
  new Map(response.metrics.map(({ name, value }) => [name, value]));

const metricDeltaMs = (after, before, name) => {
  const delta = finiteDelta(after.get(name), before.get(name));
  return delta === null ? null : Number((delta * 1_000).toFixed(3));
};

const median = (values) => {
  const finite = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (finite.length === 0) return null;
  const middle = Math.floor(finite.length / 2);
  return finite.length % 2 === 0
    ? (finite[middle - 1] + finite[middle]) / 2
    : finite[middle];
};

const summarizeSamples = (samples) => ({
  sampleCount: samples.length,
  elapsedMs: median(samples.map(({ elapsedMs }) => elapsedMs)),
  taskDurationMs: median(samples.map(({ taskDurationMs }) => taskDurationMs)),
  scriptDurationMs: median(
    samples.map(({ scriptDurationMs }) => scriptDurationMs),
  ),
  layoutDurationMs: median(
    samples.map(({ layoutDurationMs }) => layoutDurationMs),
  ),
  styleDurationMs: median(
    samples.map(({ styleDurationMs }) => styleDurationMs),
  ),
  allocatedHeapBytes: median(
    samples.map(({ allocatedHeapBytes }) => allocatedHeapBytes),
  ),
  retainedHeapBytes: median(
    samples.map(({ retainedHeapBytes }) => retainedHeapBytes),
  ),
  retainedNodeDelta: median(
    samples.map(({ retainedNodeDelta }) => retainedNodeDelta),
  ),
  retainedDocumentDelta: median(
    samples.map(({ retainedDocumentDelta }) => retainedDocumentDelta),
  ),
  semanticsPreserved: samples.every(({ semantics }) =>
    Object.values(semantics).every(Boolean),
  ),
});

const relativeChange = (variant, baseline) =>
  Number.isFinite(variant) && Number.isFinite(baseline) && baseline !== 0
    ? (variant - baseline) / baseline
    : null;

export const assessStatsConstructionExperiment = (summaries) => {
  const baseline = summaries["full-template"];
  if (!baseline) {
    return { recommendation: "inconclusive", reason: "Missing full-template baseline." };
  }
  const assessments = Object.fromEntries(
    VARIANTS.filter((variant) => variant !== "full-template").map((variant) => {
      const result = summaries[variant];
      if (!result) {
        return [variant, { favorable: false, reason: "Variant was not measured." }];
      }
      const taskChange = relativeChange(
        result.taskDurationMs,
        baseline.taskDurationMs,
      );
      const allocationChange = relativeChange(
        result.allocatedHeapBytes,
        baseline.allocatedHeapBytes,
      );
      const layoutChange = relativeChange(
        result.layoutDurationMs,
        baseline.layoutDurationMs,
      );
      const retentionAllowanceBytes = 20 * 1_024;
      const favorable =
        result.semanticsPreserved &&
        taskChange !== null &&
        taskChange <= -0.15 &&
        allocationChange !== null &&
        allocationChange <= -0.2 &&
        (layoutChange === null || layoutChange <= 0.05) &&
        result.retainedHeapBytes <=
          baseline.retainedHeapBytes + retentionAllowanceBytes &&
        result.retainedNodeDelta <= baseline.retainedNodeDelta &&
        result.retainedDocumentDelta <= baseline.retainedDocumentDelta;
      return [
        variant,
        {
          favorable,
          taskChange,
          allocationChange,
          layoutChange,
          retainedHeapDeltaBytes:
            result.retainedHeapBytes - baseline.retainedHeapBytes,
          retainedNodeDelta:
            result.retainedNodeDelta - baseline.retainedNodeDelta,
          reason: favorable
            ? "Clears task, allocation, layout, retention, and semantics thresholds."
            : "Does not clear every task, allocation, layout, retention, and semantics threshold.",
        },
      ];
    }),
  );
  const favorable = Object.entries(assessments)
    .filter(([, assessment]) => assessment.favorable)
    .sort(
      ([, left], [, right]) =>
        left.taskChange - right.taskChange ||
        left.allocationChange - right.allocationChange,
    );
  return {
    recommendation: favorable[0]?.[0] ?? "retain-full-template",
    reason:
      favorable.length > 0
        ? assessments[favorable[0][0]].reason
        : "No alternative clears the conservative adoption thresholds.",
    variants: assessments,
  };
};

export const captureStatsConstructionMarkup = async (page) => {
  await page.locator('[data-stats-pane-id="character"]').click();
  await page.locator('[data-stats-pane="character"]').waitFor();
  const characterSurface = await page
    .locator("[data-stats-surface]")
    .evaluate((surface) => surface.outerHTML);
  const characterPane = await page
    .locator('[data-stats-pane="character"]')
    .evaluate((pane) => pane.outerHTML);
  const characterTabs = await page
    .locator("[data-stats-surface]")
    .evaluate((surface) =>
      [...surface.querySelectorAll("[data-stats-pane-id]")].map((tab) => ({
        id: tab.dataset.statsPaneId,
        className: tab.className,
        ariaSelected: tab.getAttribute("aria-selected") ?? "false",
        textContent: tab.textContent,
      })),
    );
  await page.locator('[data-stats-pane-id="disciplines"]').click();
  await page.locator('[data-stats-pane="disciplines"]').waitFor();
  const disciplinesSurface = await page
    .locator("[data-stats-surface]")
    .evaluate((surface) => surface.outerHTML);
  const disciplinesPane = await page
    .locator('[data-stats-pane="disciplines"]')
    .evaluate((pane) => pane.outerHTML);
  const disciplinesTabs = await page
    .locator("[data-stats-surface]")
    .evaluate((surface) =>
      [...surface.querySelectorAll("[data-stats-pane-id]")].map((tab) => ({
        id: tab.dataset.statsPaneId,
        className: tab.className,
        ariaSelected: tab.getAttribute("aria-selected") ?? "false",
        textContent: tab.textContent,
      })),
    );
  return {
    characterSurface,
    disciplinesSurface,
    paneMarkup: { character: characterPane, disciplines: disciplinesPane },
    tabState: { character: characterTabs, disciplines: disciplinesTabs },
  };
};

const runConstructionInPage = ({
  variant,
  characterSurface,
  disciplinesSurface,
  paneMarkup,
  tabState,
  iterations,
}) => {
  const parseSurface = (markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
  };
  const surfaces = {
    character: characterSurface,
    disciplines: disciplinesSurface,
  };
  const surface = document.querySelector("[data-stats-surface]");
  if (!surface || surface.querySelector("[data-stats-pane]")?.dataset.statsPane !== "disciplines") {
    throw new Error("Prepared Stats surface must begin on the disciplines pane.");
  }
  surface.dataset.constructionIdentity = "stable";
  const firstTab = surface.querySelector("[data-stats-pane-id]");
  firstTab.dataset.constructionIdentity = "stable";
  firstTab.focus();

  const cachedPanes = {};
  const startedAt = performance.now();
  if (variant === "render-once-keyed") {
    const template = document.createElement("template");
    template.innerHTML = paneMarkup.character;
    cachedPanes.character = template.content.firstElementChild;
  }
  let currentKey = "disciplines";
  for (let index = 0; index < iterations; index += 1) {
    const nextKey = currentKey === "character" ? "disciplines" : "character";
    const currentPane = surface.querySelector("[data-stats-pane]");
    let nextPane;
    let nextTabs = tabState[nextKey];
    if (variant === "full-template") {
      const nextSurface = parseSurface(surfaces[nextKey]);
      nextPane = nextSurface.querySelector("[data-stats-pane]");
      nextTabs = [...nextSurface.querySelectorAll("[data-stats-pane-id]")].map(
        (tab) => ({
          id: tab.dataset.statsPaneId,
          className: tab.className,
          ariaSelected: tab.getAttribute("aria-selected") ?? "false",
          textContent: tab.textContent,
        }),
      );
    } else if (variant === "direct-fragment") {
      const range = document.createRange();
      range.selectNode(currentPane);
      nextPane = range.createContextualFragment(paneMarkup[nextKey]).firstElementChild;
    } else {
      nextPane = cachedPanes[nextKey];
      cachedPanes[currentKey] = currentPane;
    }
    currentPane.replaceWith(nextPane);
    for (const tab of surface.querySelectorAll("[data-stats-pane-id]")) {
      const state = nextTabs.find(({ id }) => id === tab.dataset.statsPaneId);
      tab.className = state.className;
      tab.setAttribute("aria-selected", state.ariaSelected);
      tab.textContent = state.textContent;
    }
    surface.offsetHeight;
    currentKey = nextKey;
  }
  const elapsedMs = performance.now() - startedAt;
  const pane = surface.querySelector("[data-stats-pane]");
  const selectedTabs = surface.querySelectorAll(
    '[data-stats-pane-id][aria-selected="true"]',
  );
  const ids = [...surface.querySelectorAll("[id]")].map(({ id }) => id);
  return {
    elapsedMs,
    semantics: {
      surfaceIdentity: surface.dataset.constructionIdentity === "stable",
      tabIdentity: firstTab.dataset.constructionIdentity === "stable",
      focusIdentity: document.activeElement === firstTab,
      oneSelectedTab: selectedTabs.length === 1,
      paneMatchesSelection:
        pane?.dataset.statsPane === selectedTabs[0]?.dataset.statsPaneId,
      uniqueIds: ids.length === new Set(ids).size,
    },
  };
};

export const measureStatsConstructionVariant = async ({
  page,
  cdp,
  markup,
  variant,
  iterations = 24,
}) => {
  if (!VARIANTS.includes(variant)) throw new Error(`Unknown variant: ${variant}`);
  if (!Number.isInteger(iterations) || iterations < 2 || iterations % 2 !== 0) {
    throw new Error("Iterations must be an even integer of at least 2.");
  }
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  await cdp.send("HeapProfiler.startSampling", { samplingInterval: 16_384 });
  const beforeMetrics = metricMap(await cdp.send("Performance.getMetrics"));
  const beforeHeap = await cdp.send("Runtime.getHeapUsage");
  const beforeDom = await cdp.send("Memory.getDOMCounters");
  const result = await page.evaluate(runConstructionInPage, {
    variant,
    ...markup,
    iterations,
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const immediateHeap = await cdp.send("Runtime.getHeapUsage");
  const allocationProfile = await cdp.send("HeapProfiler.stopSampling");
  const afterMetrics = metricMap(await cdp.send("Performance.getMetrics"));
  await cdp.send("HeapProfiler.collectGarbage");
  const retainedHeap = await cdp.send("Runtime.getHeapUsage");
  const retainedDom = await cdp.send("Memory.getDOMCounters");
  return {
    variant,
    iterations,
    elapsedMs: Number(result.elapsedMs.toFixed(3)),
    taskDurationMs: metricDeltaMs(
      afterMetrics,
      beforeMetrics,
      "TaskDuration",
    ),
    scriptDurationMs: metricDeltaMs(
      afterMetrics,
      beforeMetrics,
      "ScriptDuration",
    ),
    layoutDurationMs: metricDeltaMs(
      afterMetrics,
      beforeMetrics,
      "LayoutDuration",
    ),
    styleDurationMs: metricDeltaMs(
      afterMetrics,
      beforeMetrics,
      "RecalcStyleDuration",
    ),
    allocatedHeapBytes: (() => {
      const visit = (node) =>
        (node.selfSize ?? 0) +
        (node.children ?? []).reduce((total, child) => total + visit(child), 0);
      return visit(allocationProfile.profile.head);
    })(),
    immediateHeapDeltaBytes: finiteDelta(
      immediateHeap.usedSize,
      beforeHeap.usedSize,
    ),
    retainedHeapBytes: finiteDelta(
      retainedHeap.usedSize,
      beforeHeap.usedSize,
    ),
    retainedNodeDelta: finiteDelta(retainedDom.nodes, beforeDom.nodes),
    retainedDocumentDelta: finiteDelta(
      retainedDom.documents,
      beforeDom.documents,
    ),
    semantics: result.semantics,
  };
};

export const compareStatsConstructionVariants = async ({
  context,
  preparePage,
  samples = 5,
  iterations = 24,
}) => {
  const measurements = Object.fromEntries(VARIANTS.map((variant) => [variant, []]));
  for (let sample = 0; sample < samples; sample += 1) {
    for (const variant of VARIANTS) {
      const page = await context.newPage();
      try {
        await preparePage(page);
        const markup = await captureStatsConstructionMarkup(page);
        const cdp = await context.newCDPSession(page);
        measurements[variant].push(
          await measureStatsConstructionVariant({
            page,
            cdp,
            markup,
            variant,
            iterations,
          }),
        );
      } finally {
        await page.close();
      }
    }
  }
  const summaries = Object.fromEntries(
    VARIANTS.map((variant) => [variant, summarizeSamples(measurements[variant])]),
  );
  return {
    samples,
    iterations,
    measurements,
    summaries,
    assessment: assessStatsConstructionExperiment(summaries),
  };
};
