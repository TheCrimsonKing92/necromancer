import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeBenchmarkReports,
  summarizeSeries,
  wilsonInterval,
} from "./performance-benchmark-summary.mjs";
import {
  assessStatsOpenCloseRetention,
  STATS_OPEN_CLOSE_RETENTION_BUDGET,
} from "./performance-retention-budget.mjs";

test("summarizes a series with robust distribution values", () => {
  assert.deepEqual(summarizeSeries([1, 2, 3, 100, null]), {
    count: 4,
    min: 1,
    median: 2.5,
    p90: 100,
    p95: 100,
    p99: 100,
    max: 100,
    medianAbsoluteDeviation: 1,
  });
});

test("wilsonInterval reports uncertainty instead of treating a short clean cohort as proof", () => {
  const cleanFive = wilsonInterval(0, 5);
  assert.equal(cleanFive.lower, 0);
  assert.ok(cleanFive.upper > 0.4);

  const oneFailure = wilsonInterval(1, 5);
  assert.ok(oneFailure.lower > 0);
  assert.ok(oneFailure.upper > 0.6);
});

test("summarizes comparable phase reports and app-idle deltas", () => {
  const report = (cpu) => ({
    cohort: { id: "same" },
    graphics: {
      phaseDiagnostics: {
        phases: [
          {
            id: "targeting",
            comparisonBaselineId: "battle-idle",
            gpuProcessCpu: { cpuMsPerSecond: cpu },
            result: {
              p95Ms: 20 - cpu,
              estimatedPaintsPerSecond: cpu * 10,
            },
            relativeToAppIdle: {
              gpuProcessCpuMsPerSecond: cpu - 2,
            },
            relativeToComparisonBaseline: {
              gpuProcessCpuMsPerSecond: cpu - 4,
            },
          },
        ],
      },
    },
    targetPaintCadence: { p95Ms: 10 },
    scrollInteractionStress: { p95FrameMs: 12 },
    retainedResources: { heapUsedAfterGcBytes: 40 },
    page: {
      domElements: 20,
      transferBytes: 99_000 + cpu,
      observed: { largestContentfulPaintMs: 60 + cpu },
    },
    assessment: { slowestInteraction: { nextPaintMs: 20 + cpu } },
    localMutations: {
      scenarios: [
        {
          label: "Choose servant direction",
          handlerMs: cpu,
          immediatePaintMs: 2 * cpu,
          settledPaintMs: 3 * cpu,
          mainThread: { taskMs: 4 * cpu, layoutMs: cpu },
          heap: {
            allocatedBeforeGcBytes: 100 * cpu,
            retainedAfterGcBytes: 10 * cpu,
          },
        },
      ],
      experiments: {
        statsOffscreenContainment: {
          delta: {
            handlerMs: 0,
            immediatePaintMs: -cpu,
            settledPaintMs: -cpu,
            taskMs: -cpu,
            layoutMs: -cpu,
            allocatedBeforeGcBytes: cpu,
            retainedAfterGcBytes: cpu,
          },
        },
        persistenceAttribution: {
          estimatedStorageWrite: {
            handlerMs: cpu,
            immediatePaintMs: cpu,
            settledPaintMs: cpu,
            taskMs: cpu,
            layoutMs: cpu,
            allocatedBeforeGcBytes: cpu,
            retainedAfterGcBytes: cpu,
          },
          estimatedSerialization: {
            handlerMs: cpu,
            immediatePaintMs: cpu,
            settledPaintMs: cpu,
            taskMs: cpu,
            layoutMs: cpu,
            allocatedBeforeGcBytes: cpu,
            retainedAfterGcBytes: cpu,
          },
          estimatedTotalPersistence: {
            handlerMs: cpu,
            immediatePaintMs: cpu,
            settledPaintMs: cpu,
            taskMs: cpu,
            layoutMs: cpu,
            allocatedBeforeGcBytes: cpu,
            retainedAfterGcBytes: cpu,
          },
        },
      },
      summary: {
        statsOpenCloseRetention: {
          available: true,
          cycleCount: 24,
          finalRetainedHeapBytes: 121_000 + cpu,
          peakRetainedHeapBytes: 122_000 + cpu,
          maximumRetainedNodeDelta: 0,
          maximumDocumentDelta: 0,
          noRetainedNodes: true,
          noRetainedDocuments: true,
          heapWarning: false,
          heapWithinBudget: true,
        },
      },
    },
  });
  const result = summarizeBenchmarkReports([
    report(5),
    report(7),
  ]);

  assert.equal(result.comparable, true);
  assert.equal(result.budgetFailureCount, 0);
  assert.equal(result.allBudgetsPassed, true);
  assert.equal(result.application.transferBytes.median, 99_006);
  assert.equal(result.application.largestContentfulPaintMs.median, 66);
  assert.equal(result.application.slowestInteractionNextPaintMs.median, 26);
  assert.equal(
    result.phases.targeting.comparisonBaselineId,
    "battle-idle",
  );
  assert.equal(
    result.phases.targeting.absolute.gpuProcessCpuMsPerSecond
      .median,
    6,
  );
  assert.equal(
    result.phases.targeting.relativeToAppIdle
      .gpuProcessCpuMsPerSecond.max,
    5,
  );
  assert.equal(
    result.phases.targeting.absolute.interactionP95Ms.median,
    14,
  );
  assert.equal(
    result.phases.targeting.absolute.estimatedPaintsPerSecond
      .median,
    60,
  );
  assert.equal(
    result.phases.targeting.relativeToComparisonBaseline
      .gpuProcessCpuMsPerSecond.median,
    2,
  );
  assert.equal(
    result.localMutations.chooseServantDirection.taskMs.median,
    24,
  );
  assert.equal(
    result.localMutations.statsOffscreenContainmentDelta.layoutMs
      .median,
    -6,
  );
  assert.equal(
    result.localMutations.estimatedTotalPersistence.taskMs.median,
    6,
  );
  assert.equal(
    result.localMutations.statsOpenCloseStability.peakRetainedHeapBytes.median,
    122_006,
  );
  assert.equal(
    result.localMutations.statsOpenCloseStability.allRunsReleasedNodes,
    true,
  );
  assert.equal(
    result.localMutations.statsOpenCloseStability.failureCount,
    0,
  );
  assert.equal(
    result.localMutations.statsOpenCloseStability.maximumHeapBytes,
    STATS_OPEN_CLOSE_RETENTION_BUDGET.maximumHeapBytes,
  );
});

test("assesses repeated Stats retention against lifecycle budgets", () => {
  const healthy = assessStatsOpenCloseRetention({
    cycles: [
      { retainedHeapBytes: 80_000, retainedNodeDelta: 0, documentDelta: 0 },
      { retainedHeapBytes: 121_000, retainedNodeDelta: 0, documentDelta: 0 },
    ],
    final: { retainedHeapBytes: 121_000 },
    peakRetainedHeapBytes: 121_000,
  });

  assert.deepEqual(healthy, {
    available: true,
    cycleCount: 2,
    finalRetainedHeapBytes: 121_000,
    peakRetainedHeapBytes: 121_000,
    maximumRetainedNodeDelta: 0,
    maximumDocumentDelta: 0,
    noRetainedNodes: true,
    noRetainedDocuments: true,
    heapWarning: false,
    heapWithinBudget: true,
  });

  const leaking = assessStatsOpenCloseRetention({
    cycles: [
      {
        retainedHeapBytes:
          STATS_OPEN_CLOSE_RETENTION_BUDGET.maximumHeapBytes + 1,
        retainedNodeDelta: 2,
        documentDelta: 1,
      },
    ],
    final: {
      retainedHeapBytes:
        STATS_OPEN_CLOSE_RETENTION_BUDGET.maximumHeapBytes + 1,
    },
  });

  assert.equal(leaking.noRetainedNodes, false);
  assert.equal(leaking.noRetainedDocuments, false);
  assert.equal(leaking.heapWarning, true);
  assert.equal(leaking.heapWithinBudget, false);
  assert.equal(leaking.maximumRetainedNodeDelta, 2);
  assert.equal(leaking.maximumDocumentDelta, 1);
});

test("rejects cross-cohort aggregation", () => {
  const result = summarizeBenchmarkReports([
    { cohort: { id: "one" } },
    { cohort: { id: "two" } },
  ]);
  assert.equal(result.comparable, false);
  assert.match(result.warning, /different graphics cohorts/u);
  assert.equal(
    result.localMutations.statsOpenCloseStability.allRunsReleasedNodes,
    null,
  );
});

test("does not report advisory cohort observations as budget failures", () => {
  const result = summarizeBenchmarkReports([
    {
      cohort: { id: "hardware" },
      assessment: {
        needsAttention: ["transferSize"],
        enforcement: { mode: "advisory" },
      },
    },
  ]);

  assert.equal(result.assessmentIssueCount, 1);
  assert.equal(result.advisoryIssueCount, 1);
  assert.equal(result.budgetFailureCount, 0);
  assert.equal(result.allBudgetsPassed, true);
});
