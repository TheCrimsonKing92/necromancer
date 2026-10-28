import { performance } from "node:perf_hooks";
import {
  gpuProcessSampleFrom,
  sampleChromiumProcesses,
  summarizeChromiumProcessTreeCpu,
  summarizeGpuProcessCpu,
} from "./performance-gpu.mjs";
import { captureChromiumMemorySnapshot } from "./performance-memory-infra.mjs";
import {
  correlateGpuProcessContinuity,
  startWindowsGpuDiagnostics,
} from "./windows-gpu-diagnostics.mjs";

const wait = (durationMs) =>
  new Promise((done) => setTimeout(done, durationMs));

const finiteOrNull = (value) =>
  Number.isFinite(value) ? value : null;

const subtract = (value, baseline) =>
  Number.isFinite(value) && Number.isFinite(baseline)
    ? value - baseline
    : null;

const MEMORY_DECAY_COUNTERS = [
  "residentSetBytes",
  "gpuOwnerSizeBytes",
  "skiaGpuResourcesBytes",
  "gpuMemoryBufferBytes",
  "skiaBytes",
];

const memoryCounterValues = (memory) =>
  Object.fromEntries(
    MEMORY_DECAY_COUNTERS.map((name) => [
      name,
      finiteOrNull(memory?.counters?.[name]?.bytes),
    ]),
  );

const gpuAllocatorOwnership = (memory) =>
  (memory?.processes ?? [])
    .filter(({ type }) => String(type).includes("gpu"))
    .map(({ id, allocatorOwnership }) => ({
      processId: id,
      allocatorOwnership,
    }));

export const summarizeMemoryDecaySnapshots = (snapshots) => {
  const normalized = snapshots.map(
    ({ requestedAfterMs, observedAfterMs, memory }) => ({
      requestedAfterMs,
      observedAfterMs,
      available: memory?.available === true,
      counters: memoryCounterValues(memory),
      gpuAllocatorOwnership: gpuAllocatorOwnership(memory),
    }),
  );
  const immediate = normalized[0] ?? null;
  const points = normalized.map((point) => {
    const changeFromImmediateBytes = Object.fromEntries(
      MEMORY_DECAY_COUNTERS.map((name) => [
        name,
        immediate
          ? subtract(point.counters[name], immediate.counters[name])
          : null,
      ]),
    );
    return {
      ...point,
      changeFromImmediateBytes,
      releasedFromImmediateBytes: Object.fromEntries(
        MEMORY_DECAY_COUNTERS.map((name) => [
          name,
          Number.isFinite(changeFromImmediateBytes[name])
            ? Math.max(0, -changeFromImmediateBytes[name])
            : null,
        ]),
      ),
    };
  });

  return {
    available: points.some(({ available }) => available),
    pointCount: points.length,
    settledAfterMs: points.at(-1)?.observedAfterMs ?? null,
    points,
    interpretation:
      "Changes are relative to the immediate post-phase dump; allocator nodes remain non-additive.",
  };
};

const phaseValues = (phase) => ({
  gpuProcessCpuMsPerSecond: finiteOrNull(
    phase.gpuProcessCpu?.cpuMsPerSecond,
  ),
  chromiumProcessTreeCpuMsPerSecond: finiteOrNull(
    phase.chromiumProcessTreeCpu?.totalCpuMsPerSecond,
  ),
  chromiumResidentSetBytes: finiteOrNull(
    phase.chromiumMemory?.counters?.residentSetBytes?.bytes,
  ),
  chromiumGpuOwnerSizeBytes: finiteOrNull(
    phase.chromiumMemory?.counters?.gpuOwnerSizeBytes?.bytes,
  ),
  chromiumSkiaGpuResourcesBytes: finiteOrNull(
    phase.chromiumMemory?.counters?.skiaGpuResourcesBytes?.bytes,
  ),
  averageAggregateEnginePercent: finiteOrNull(
    phase.windowsHardwareDiagnostics?.engineUtilization
      ?.averageAggregatePercent,
  ),
  peakAggregateEnginePercent: finiteOrNull(
    phase.windowsHardwareDiagnostics?.engineUtilization
      ?.peakAggregatePercent,
  ),
  averageDedicatedBytes: finiteOrNull(
    phase.windowsHardwareDiagnostics?.processMemory
      ?.averageDedicatedBytes,
  ),
  peakDedicatedBytes: finiteOrNull(
    phase.windowsHardwareDiagnostics?.processMemory
      ?.peakDedicatedBytes,
  ),
  averageSharedBytes: finiteOrNull(
    phase.windowsHardwareDiagnostics?.processMemory
      ?.averageSharedBytes,
  ),
  peakSharedBytes: finiteOrNull(
    phase.windowsHardwareDiagnostics?.processMemory
      ?.peakSharedBytes,
  ),
});

const difference = (phase, baseline) => {
  const values = phaseValues(phase);
  const baselineValues = phaseValues(baseline);
  return Object.fromEntries(
    Object.keys(values).map((key) => [
      key,
      subtract(values[key], baselineValues[key]),
    ]),
  );
};

export const addGpuPhaseComparisons = (phases) => {
  const browserIdle = phases.find(
    ({ id }) => id === "browser-idle",
  );
  const appIdle = phases.find(({ id }) => id === "app-idle");

  return phases.map((phase) => {
    const comparisonBaseline = phase.comparisonBaselineId
      ? phases.find(({ id }) => id === phase.comparisonBaselineId)
      : null;
    return {
      ...phase,
      relativeToBrowserIdle: browserIdle
        ? difference(phase, browserIdle)
        : null,
      relativeToAppIdle: appIdle
        ? difference(phase, appIdle)
        : null,
      relativeToComparisonBaseline: comparisonBaseline
        ? difference(phase, comparisonBaseline)
        : null,
    };
  });
};

export const captureGpuPhase = async ({
  id,
  browserSession,
  layerTree,
  run = async () => null,
  minimumWindowMs = 5_000,
  windowsSampleCount = 4,
  memoryDecayMs = [],
}) => {
  const processTreeStart = await sampleChromiumProcesses(browserSession);
  const gpuStart = gpuProcessSampleFrom(processTreeStart);
  const windowsPromise = startWindowsGpuDiagnostics({
    enabled: true,
    targetProcessIds: gpuStart.processes.map(({ id: processId }) => processId),
    sampleCount: windowsSampleCount,
  });
  const startedAt = performance.now();
  const result = await run();
  const activeWorkMs = performance.now() - startedAt;
  await wait(Math.max(0, minimumWindowMs - activeWorkMs));
  const windowsResult = await windowsPromise;
  const windowMs = performance.now() - startedAt;
  const processTreeEnd = await sampleChromiumProcesses(browserSession);
  const gpuEnd = gpuProcessSampleFrom(processTreeEnd);
  const gpuProcessCpu = summarizeGpuProcessCpu(
    gpuStart,
    gpuEnd,
    windowMs,
  );
  const chromiumProcessTreeCpu = summarizeChromiumProcessTreeCpu(
    processTreeStart,
    processTreeEnd,
    windowMs,
  );
  // Capture after the phase counters close so tracing overhead cannot inflate
  // the phase's CPU attribution. This is an end-state snapshot, not a delta.
  const decayStartedAt = performance.now();
  const chromiumMemory = await captureChromiumMemorySnapshot({
    session: browserSession,
    processSample: processTreeEnd,
  });
  const memorySnapshots = [
    {
      requestedAfterMs: 0,
      observedAfterMs: Number(
        (performance.now() - decayStartedAt).toFixed(2),
      ),
      memory: chromiumMemory,
    },
  ];
  const requestedDecayPoints = [
    ...new Set(
      memoryDecayMs.filter(
        (durationMs) => Number.isFinite(durationMs) && durationMs > 0,
      ),
    ),
  ].sort((left, right) => left - right);
  for (const requestedAfterMs of requestedDecayPoints) {
    await wait(
      Math.max(
        0,
        requestedAfterMs - (performance.now() - decayStartedAt),
      ),
    );
    const processSample = await sampleChromiumProcesses(browserSession);
    const memory = await captureChromiumMemorySnapshot({
      session: browserSession,
      processSample,
    });
    memorySnapshots.push({
      requestedAfterMs,
      observedAfterMs: Number(
        (performance.now() - decayStartedAt).toFixed(2),
      ),
      memory,
    });
  }

  return {
    id,
    windowMs: Number(windowMs.toFixed(2)),
    activeWorkMs: Number(activeWorkMs.toFixed(2)),
    gpuProcessCpu,
    chromiumProcessTreeCpu,
    chromiumMemory,
    chromiumMemoryDecay: summarizeMemoryDecaySnapshots(memorySnapshots),
    windowsHardwareDiagnostics:
      correlateGpuProcessContinuity(
        windowsResult,
        gpuProcessCpu,
      ),
    layerTree: layerTree ? await layerTree.snapshot() : null,
    result,
  };
};
