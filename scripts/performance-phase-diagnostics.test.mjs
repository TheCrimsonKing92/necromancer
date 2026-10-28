import assert from "node:assert/strict";
import test from "node:test";
import {
  addGpuPhaseComparisons,
  summarizeMemoryDecaySnapshots,
} from "./performance-phase-diagnostics.mjs";

const phase = (id, cpu, engine, dedicated, shared) => ({
  id,
  gpuProcessCpu: { cpuMsPerSecond: cpu },
  windowsHardwareDiagnostics: {
    engineUtilization: {
      averageAggregatePercent: engine,
      peakAggregatePercent: engine + 1,
    },
    processMemory: {
      averageDedicatedBytes: dedicated,
      peakDedicatedBytes: dedicated + 10,
      averageSharedBytes: shared,
      peakSharedBytes: shared + 5,
    },
  },
});

test("compares every GPU phase to browser and application idle", () => {
  const result = addGpuPhaseComparisons([
    phase("browser-idle", 2, 0, 100, 20),
    phase("app-idle", 3, 1, 120, 25),
    phase("targeting", 8, 4, 150, 30),
  ]);

  assert.equal(
    result[2].relativeToBrowserIdle.gpuProcessCpuMsPerSecond,
    6,
  );
  assert.equal(
    result[2].relativeToAppIdle.averageAggregateEnginePercent,
    3,
  );
  assert.equal(
    result[2].relativeToAppIdle.peakDedicatedBytes,
    30,
  );
});

test("keeps unavailable comparison values null", () => {
  const result = addGpuPhaseComparisons([
    { id: "browser-idle" },
    { id: "targeting" },
  ]);
  assert.equal(
    result[1].relativeToBrowserIdle.averageDedicatedBytes,
    null,
  );
  assert.equal(result[1].relativeToAppIdle, null);
});

test("compares an experiment to its paired phase", () => {
  const experiment = {
    ...phase("battle-static-dossier", 5, 2, 130, 24),
    comparisonBaselineId: "battle-idle",
  };
  const result = addGpuPhaseComparisons([
    phase("browser-idle", 2, 0, 100, 20),
    phase("app-idle", 3, 1, 120, 25),
    phase("battle-idle", 7, 3, 150, 30),
    experiment,
  ]);

  assert.equal(
    result[3].relativeToComparisonBaseline.gpuProcessCpuMsPerSecond,
    -2,
  );
  assert.equal(
    result[3].relativeToComparisonBaseline.peakDedicatedBytes,
    -20,
  );
  assert.equal(result[2].relativeToComparisonBaseline, null);
});

test("reports post-activity memory decay without adding allocator nodes", () => {
  const memory = (gpuBytes, skiaBytes, allocatorBytes) => ({
    available: true,
    counters: {
      residentSetBytes: { bytes: gpuBytes * 3 },
      gpuOwnerSizeBytes: { bytes: gpuBytes },
      skiaGpuResourcesBytes: { bytes: skiaBytes },
      gpuMemoryBufferBytes: { bytes: null },
      skiaBytes: { bytes: skiaBytes * 2 },
    },
    processes: [
      {
        id: 42,
        type: "gpu",
        allocatorOwnership: {
          entries: [{ name: "gpu", sizeBytes: allocatorBytes }],
        },
      },
    ],
  });
  const result = summarizeMemoryDecaySnapshots([
    {
      requestedAfterMs: 0,
      observedAfterMs: 275,
      memory: memory(1_000, 500, 1_000),
    },
    {
      requestedAfterMs: 2_000,
      observedAfterMs: 2_280,
      memory: memory(800, 350, 800),
    },
    {
      requestedAfterMs: 10_000,
      observedAfterMs: 10_275,
      memory: memory(700, 300, 700),
    },
  ]);

  assert.equal(result.available, true);
  assert.equal(result.pointCount, 3);
  assert.equal(result.settledAfterMs, 10_275);
  assert.equal(
    result.points[2].changeFromImmediateBytes.gpuOwnerSizeBytes,
    -300,
  );
  assert.equal(
    result.points[2].releasedFromImmediateBytes.skiaGpuResourcesBytes,
    200,
  );
  assert.deepEqual(
    result.points[1].gpuAllocatorOwnership[0].allocatorOwnership.entries,
    [{ name: "gpu", sizeBytes: 800 }],
  );
  assert.equal(
    result.points[1].releasedFromImmediateBytes.gpuMemoryBufferBytes,
    null,
  );
});
