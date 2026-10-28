import assert from "node:assert/strict";
import test from "node:test";
import {
  correlateGpuProcessContinuity,
  startWindowsGpuDiagnostics,
  summarizeWindowsGpuSamples,
} from "./windows-gpu-diagnostics.mjs";

const payload = {
  status: "raw",
  source: "Windows Performance Counters",
  targetProcessIds: [42],
  sampleIntervalSeconds: 1,
  requestedSamples: 3,
  samples: [
    {
      engines: [{ percent: 0 }],
      dedicatedBytes: 100,
      sharedBytes: 50,
      memoryInstanceCount: 1,
    },
    {
      engines: [{ percent: 10 }, { percent: 5 }],
      dedicatedBytes: 200,
      sharedBytes: 80,
      memoryInstanceCount: 1,
    },
    {
      engines: [{ percent: 20 }, { percent: 2 }],
      dedicatedBytes: 300,
      sharedBytes: 120,
      memoryInstanceCount: 1,
    },
  ],
};

test("summarizes aggregate, busiest-engine, and memory samples", () => {
  const result = summarizeWindowsGpuSamples(payload);
  assert.equal(result.status, "available");
  assert.equal(result.reliable, true);
  assert.equal(
    result.engineUtilization.averageAggregatePercent,
    18.5,
  );
  assert.equal(
    result.engineUtilization.peakSingleEnginePercent,
    20,
  );
  assert.equal(result.processMemory.averageDedicatedBytes, 250);
  assert.equal(result.processMemory.peakSharedBytes, 120);
  assert.equal(result.processMemory.minimumDedicatedBytes, 200);
  assert.equal(result.processMemory.dedicatedRangeBytes, 100);
  assert.equal(
    result.processMemory.dedicatedWindowDeltaBytes,
    100,
  );
  assert.equal(result.processMemory.sharedRangeBytes, 40);
  assert.equal(result.sampling.discardedWarmupSamples, 1);
  assert.equal(result.sampling.matchedProcessSamples, 3);
  assert.equal(result.sampling.counterWindowDurationMs, 2000);
});

test("rejects malformed or empty sampler payloads", () => {
  const malformed = summarizeWindowsGpuSamples({});
  assert.equal(malformed.status, "unavailable");

  const empty = summarizeWindowsGpuSamples({
    ...payload,
    samples: [],
  });
  assert.equal(empty.status, "unavailable");
});

test("marks counter data unreliable after GPU-process churn", () => {
  const result = correlateGpuProcessContinuity(
    summarizeWindowsGpuSamples(payload),
    { reliable: false },
  );
  assert.equal(result.status, "available");
  assert.equal(result.reliable, false);
  assert.match(result.reason, /GPU process changed/u);
});

test("reports partial data instead of zero for a missing component", () => {
  const result = summarizeWindowsGpuSamples({
    ...payload,
    samples: payload.samples.map((sample) => ({
      ...sample,
      memoryInstanceCount: 0,
    })),
  });
  assert.equal(result.status, "partial");
  assert.equal(result.reliable, false);
  assert.equal(result.processMemory, null);
  assert.notEqual(result.engineUtilization, null);
  assert.match(result.reason, /process memory/u);
});

test("reports missing process-keyed samples as partial", () => {
  const result = summarizeWindowsGpuSamples({
    ...payload,
    requestedSamples: 4,
  });
  assert.equal(result.status, "partial");
  assert.equal(result.reliable, false);
  assert.match(result.reason, /1 process-keyed counter sample/u);
});

test("disables or rejects Windows counters before spawning", async () => {
  const disabled = await startWindowsGpuDiagnostics({
    enabled: false,
    targetProcessIds: [42],
  });
  assert.equal(disabled.status, "disabled");

  const unsupported = await startWindowsGpuDiagnostics({
    enabled: true,
    targetProcessIds: [42],
    platform: "linux",
  });
  assert.equal(unsupported.status, "unsupported");

  const unavailable = await startWindowsGpuDiagnostics({
    enabled: true,
    targetProcessIds: [0, Number.NaN],
    platform: "win32",
  });
  assert.equal(unavailable.status, "unavailable");
});
