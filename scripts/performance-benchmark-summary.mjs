import { STATS_OPEN_CLOSE_RETENTION_BUDGET } from "./performance-retention-budget.mjs";

const finiteValues = (values) =>
  values.filter((value) => Number.isFinite(value));

const percentile = (sorted, ratio) =>
  sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)];

const medianOf = (sorted) => {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

export const wilsonInterval = (successes, trials, z = 1.96) => {
  if (!Number.isInteger(trials) || trials <= 0) return null;
  const boundedSuccesses = Math.min(trials, Math.max(0, successes));
  const rate = boundedSuccesses / trials;
  const zSquared = z ** 2;
  const denominator = 1 + zSquared / trials;
  const center = (rate + zSquared / (2 * trials)) / denominator;
  const margin =
    (z / denominator) *
    Math.sqrt(
      (rate * (1 - rate)) / trials + zSquared / (4 * trials ** 2),
    );
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
};

export const summarizeSeries = (values) => {
  const sorted = finiteValues(values).sort(
    (left, right) => left - right,
  );
  if (sorted.length === 0) {
    return {
      count: 0,
      min: null,
      median: null,
      p90: null,
      p95: null,
      p99: null,
      max: null,
      medianAbsoluteDeviation: null,
    };
  }

  const median = medianOf(sorted);
  const deviations = sorted
    .map((value) => Math.abs(value - median))
    .sort((left, right) => left - right);

  return {
    count: sorted.length,
    min: sorted[0],
    median,
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted.at(-1),
    medianAbsoluteDeviation: medianOf(deviations),
  };
};

const read = (value, path) =>
  path.reduce(
    (current, key) =>
      current === null || current === undefined
        ? null
        : current[key],
    value,
  );

const metricPaths = {
  gpuProcessCpuMsPerSecond: [
    "gpuProcessCpu",
    "cpuMsPerSecond",
  ],
  averageAggregateEnginePercent: [
    "windowsHardwareDiagnostics",
    "engineUtilization",
    "averageAggregatePercent",
  ],
  peakAggregateEnginePercent: [
    "windowsHardwareDiagnostics",
    "engineUtilization",
    "peakAggregatePercent",
  ],
  averageDedicatedBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "averageDedicatedBytes",
  ],
  peakDedicatedBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "peakDedicatedBytes",
  ],
  dedicatedRangeBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "dedicatedRangeBytes",
  ],
  dedicatedWindowDeltaBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "dedicatedWindowDeltaBytes",
  ],
  averageSharedBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "averageSharedBytes",
  ],
  peakSharedBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "peakSharedBytes",
  ],
  sharedRangeBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "sharedRangeBytes",
  ],
  sharedWindowDeltaBytes: [
    "windowsHardwareDiagnostics",
    "processMemory",
    "sharedWindowDeltaBytes",
  ],
  interactionP95Ms: ["result", "p95Ms"],
  estimatedPaintsPerSecond: [
    "result",
    "estimatedPaintsPerSecond",
  ],
  frameP95Ms: ["result", "p95FrameMs"],
  estimatedFramesPerSecond: [
    "result",
    "estimatedFramesPerSecond",
  ],
  layerCount: ["layerTree", "layerCount"],
  contentLayerCount: ["layerTree", "contentLayerCount"],
  contentAreaCssPixels: [
    "layerTree",
    "contentAreaCssPixels",
  ],
  cumulativePaintCount: [
    "layerTree",
    "cumulativePaintCount",
  ],
  documentHeight: ["surfaces", "document", "height"],
  theoreticalFullRasterRgbaBytes: [
    "surfaces",
    "document",
    "theoreticalFullRasterRgbaBytes",
  ],
  fixedCssPixelArea: [
    "surfaces",
    "fixed",
    "cssPixelArea",
  ],
  stickyCssPixelArea: [
    "surfaces",
    "sticky",
    "cssPixelArea",
  ],
  gradientCssPixelArea: [
    "surfaces",
    "gradients",
    "cssPixelArea",
  ],
  rasterAssetCount: [
    "surfaces",
    "rasterAssets",
    "uniqueCount",
  ],
  theoreticalIntrinsicRgbaBytes: [
    "surfaces",
    "rasterAssets",
    "theoreticalIntrinsicRgbaBytes",
  ],
};

const comparisonMetricPaths = (comparisonKey) => ({
  gpuProcessCpuMsPerSecond: [
    comparisonKey,
    "gpuProcessCpuMsPerSecond",
  ],
  averageAggregateEnginePercent: [
    comparisonKey,
    "averageAggregateEnginePercent",
  ],
  peakAggregateEnginePercent: [
    comparisonKey,
    "peakAggregateEnginePercent",
  ],
  averageDedicatedBytes: [
    comparisonKey,
    "averageDedicatedBytes",
  ],
  peakDedicatedBytes: [
    comparisonKey,
    "peakDedicatedBytes",
  ],
  averageSharedBytes: [
    comparisonKey,
    "averageSharedBytes",
  ],
  peakSharedBytes: [
    comparisonKey,
    "peakSharedBytes",
  ],
});
const appIdleMetricPaths = comparisonMetricPaths("relativeToAppIdle");
const experimentMetricPaths = comparisonMetricPaths(
  "relativeToComparisonBaseline",
);

const localScenarioMetricPaths = {
  handlerMs: ["handlerMs"],
  immediatePaintMs: ["immediatePaintMs"],
  settledPaintMs: ["settledPaintMs"],
  taskMs: ["mainThread", "taskMs"],
  layoutMs: ["mainThread", "layoutMs"],
  allocatedBeforeGcBytes: ["heap", "allocatedBeforeGcBytes"],
  retainedAfterGcBytes: ["heap", "retainedAfterGcBytes"],
  structuredCloneMs: ["runtimeCosts", "structuredClone", "totalMs"],
  jsonStringifyMs: ["runtimeCosts", "jsonStringify", "totalMs"],
  storageSetItemMs: ["runtimeCosts", "storageSetItem", "totalMs"],
};

const statsContainmentDeltaPaths = {
  handlerMs: ["localMutations", "experiments", "statsOffscreenContainment", "delta", "handlerMs"],
  immediatePaintMs: ["localMutations", "experiments", "statsOffscreenContainment", "delta", "immediatePaintMs"],
  settledPaintMs: ["localMutations", "experiments", "statsOffscreenContainment", "delta", "settledPaintMs"],
  taskMs: ["localMutations", "experiments", "statsOffscreenContainment", "delta", "taskMs"],
  layoutMs: ["localMutations", "experiments", "statsOffscreenContainment", "delta", "layoutMs"],
  allocatedBeforeGcBytes: ["localMutations", "experiments", "statsOffscreenContainment", "delta", "allocatedBeforeGcBytes"],
  retainedAfterGcBytes: ["localMutations", "experiments", "statsOffscreenContainment", "delta", "retainedAfterGcBytes"],
};

const persistenceDeltaPaths = (estimate) =>
  Object.fromEntries(
    Object.keys(localScenarioMetricPaths).map((name) => [
      name,
      ["localMutations", "experiments", "persistenceAttribution", estimate, name],
    ]),
  );

const summarizeMetrics = (samples, paths) =>
  Object.fromEntries(
    Object.entries(paths).map(([name, path]) => [
      name,
      summarizeSeries(samples.map((sample) => read(sample, path))),
    ]),
  );

const summarizeLocalScenario = (reports, label) =>
  summarizeMetrics(
    reports
      .map((report) =>
        report.localMutations?.scenarios?.find(
          (scenario) => scenario.label === label,
        ),
      )
      .filter(Boolean),
    localScenarioMetricPaths,
  );

const summarizeStatsOpenCloseStability = (reports) => {
  const samples = reports
    .map(
      (report) =>
        report.localMutations?.summary?.statsOpenCloseRetention,
    )
    .filter(({ available } = {}) => available);

  return {
    sampleCount: samples.length,
    warningHeapBytes: STATS_OPEN_CLOSE_RETENTION_BUDGET.warningHeapBytes,
    maximumHeapBytes: STATS_OPEN_CLOSE_RETENTION_BUDGET.maximumHeapBytes,
    cycleCount: summarizeSeries(samples.map(({ cycleCount }) => cycleCount)),
    finalRetainedHeapBytes: summarizeSeries(
      samples.map(({ finalRetainedHeapBytes }) => finalRetainedHeapBytes),
    ),
    peakRetainedHeapBytes: summarizeSeries(
      samples.map(({ peakRetainedHeapBytes }) => peakRetainedHeapBytes),
    ),
    maximumRetainedNodeDelta: summarizeSeries(
      samples.map(
        ({ maximumRetainedNodeDelta }) => maximumRetainedNodeDelta,
      ),
    ),
    maximumDocumentDelta: summarizeSeries(
      samples.map(({ maximumDocumentDelta }) => maximumDocumentDelta),
    ),
    allRunsReleasedNodes:
      samples.length === 0
        ? null
        : samples.every(({ noRetainedNodes }) => noRetainedNodes),
    allRunsReleasedDocuments:
      samples.length === 0
        ? null
        : samples.every(({ noRetainedDocuments }) => noRetainedDocuments),
    warningCount: samples.filter(({ heapWarning }) => heapWarning).length,
    failureCount: samples.filter(({ heapWithinBudget }) => !heapWithinBudget)
      .length,
  };
};

export const summarizeBenchmarkReports = (reports) => {
  const hasAssessmentIssues = (report) =>
    (report.assessment?.needsAttention?.length ?? 0) > 0;
  const isEnforced = (report) =>
    report.assessment?.enforcement?.mode !== "advisory";
  const assessmentIssueCount = reports.filter(hasAssessmentIssues).length;
  const advisoryIssueCount = reports.filter(
    (report) => hasAssessmentIssues(report) && !isEnforced(report),
  ).length;
  const budgetFailureCount = reports.filter(
    (report) => hasAssessmentIssues(report) && isEnforced(report),
  ).length;
  const cohortIds = [
    ...new Set(
      reports
        .map((report) => report.cohort?.id)
        .filter(Boolean),
    ),
  ];
  const phaseIds = [
    ...new Set(
      reports.flatMap(
        (report) =>
          report.graphics?.phaseDiagnostics?.phases?.map(
            ({ id }) => id,
          ) ?? [],
      ),
    ),
  ];

  return {
    runCount: reports.length,
    assessmentIssueCount,
    advisoryIssueCount,
    budgetFailureCount,
    budgetFailureRate:
      reports.length === 0 ? null : budgetFailureCount / reports.length,
    budgetFailureWilson95: wilsonInterval(
      budgetFailureCount,
      reports.length,
    ),
    allBudgetsPassed: budgetFailureCount === 0,
    comparable: cohortIds.length === 1,
    cohortIds,
    warning:
      cohortIds.length === 1
        ? null
        : "Reports span different graphics cohorts and must not be treated as one regression series.",
    phases: Object.fromEntries(
      phaseIds.map((id) => {
        const samples = reports
          .map((report) =>
            report.graphics?.phaseDiagnostics?.phases?.find(
              (phase) => phase.id === id,
            ),
          )
          .filter(Boolean);
        return [
          id,
          {
            sampleCount: samples.length,
            comparisonBaselineId:
              samples.find(
                ({ comparisonBaselineId }) =>
                  comparisonBaselineId,
              )?.comparisonBaselineId ?? null,
            absolute: summarizeMetrics(samples, metricPaths),
            relativeToAppIdle: summarizeMetrics(
              samples,
              appIdleMetricPaths,
            ),
            relativeToComparisonBaseline: summarizeMetrics(
              samples,
              experimentMetricPaths,
            ),
          },
        ];
      }),
    ),
    application: {
      largestContentfulPaintMs: summarizeSeries(
        reports.map(
          (report) => report.page?.observed?.largestContentfulPaintMs,
        ),
      ),
      slowestInteractionNextPaintMs: summarizeSeries(
        reports.map(
          (report) => report.assessment?.slowestInteraction?.nextPaintMs,
        ),
      ),
      transferBytes: summarizeSeries(
        reports.map((report) => report.page?.transferBytes),
      ),
      targetPaintCadenceP95Ms: summarizeSeries(
        reports.map(
          (report) => report.targetPaintCadence?.p95Ms,
        ),
      ),
      scrollInteractionP95Ms: summarizeSeries(
        reports.map(
          (report) => report.scrollInteractionStress?.p95FrameMs,
        ),
      ),
      retainedHeapBytes: summarizeSeries(
        reports.map(
          (report) =>
            report.retainedResources?.heapUsedAfterGcBytes,
        ),
      ),
      domElements: summarizeSeries(
        reports.map((report) => report.page?.domElements),
      ),
    },
    localMutations: {
      openStats: summarizeLocalScenario(reports, "Open Stats"),
      openDisciplineTree: summarizeLocalScenario(
        reports,
        "Open discipline tree",
      ),
      warmStats: summarizeLocalScenario(reports, "Reopen Stats (warm)"),
      statsOpenCloseStability: summarizeStatsOpenCloseStability(reports),
      chooseServantDirection: summarizeLocalScenario(
        reports,
        "Choose servant direction",
      ),
      replaceServantDirection: summarizeLocalScenario(
        reports,
        "Replace servant direction",
      ),
      statsOffscreenContainmentDelta: summarizeMetrics(
        reports,
        statsContainmentDeltaPaths,
      ),
      estimatedStorageWrite: summarizeMetrics(
        reports,
        persistenceDeltaPaths("estimatedStorageWrite"),
      ),
      estimatedSerialization: summarizeMetrics(
        reports,
        persistenceDeltaPaths("estimatedSerialization"),
      ),
      estimatedTotalPersistence: summarizeMetrics(
        reports,
        persistenceDeltaPaths("estimatedTotalPersistence"),
      ),
    },
  };
};
