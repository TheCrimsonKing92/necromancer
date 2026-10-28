import assert from "node:assert/strict";
import test from "node:test";
import {
  assessDeepPerformanceStress,
  parsePerformanceDiagnosticOptions,
} from "./performance-deep-diagnostics.mjs";

test("parses an opt-in deep diagnostic cohort without changing defaults", () => {
  assert.deepEqual(parsePerformanceDiagnosticOptions([]), {
    cpuThrottleRate: 1,
    tailObservability: false,
    resourceCoverage: false,
    scalePersistence: false,
    optionalSurfaceSoak: false,
    worstCase: false,
  });
  assert.deepEqual(
    parsePerformanceDiagnosticOptions([
      "--cpu-throttle=4",
      "--tail-observability",
      "--coverage",
      "--scale-persistence",
      "--surface-soak",
      "--worst-case",
    ]),
    {
      cpuThrottleRate: 4,
      tailObservability: true,
      resourceCoverage: true,
      scalePersistence: true,
      optionalSurfaceSoak: true,
      worstCase: true,
    },
  );
});

test("gates long-session latency and retained growth without penalizing disabled diagnostics", () => {
  assert.ok(
    Object.values(assessDeepPerformanceStress({}).checks).every(Boolean),
  );
  const passing = assessDeepPerformanceStress({
    worstCase: {
      soak: {
        supported: true,
        p95CycleMs: 101,
        retained: {
          heapDelta: 676_612,
          secondHalfHeapDelta: 149_528,
          nodeDelta: 0,
          documentDelta: 0,
        },
      },
    },
  });
  assert.ok(Object.values(passing.checks).every(Boolean));
  assert.equal(
    assessDeepPerformanceStress({
      worstCase: {
        soak: {
          supported: true,
          p95CycleMs: 151,
          retained: {
            heapDelta: 800_000,
            secondHalfHeapDelta: 300_000,
            nodeDelta: 1,
            documentDelta: 1,
          },
        },
      },
    }).checks.worstCaseNoRetainedNodes,
    false,
  );
});

test("rejects invalid or repeated throttle options", () => {
  assert.throws(
    () => parsePerformanceDiagnosticOptions(["--cpu-throttle=0"]),
    /between 1 and 100/u,
  );
  assert.throws(
    () =>
      parsePerformanceDiagnosticOptions([
        "--cpu-throttle=2",
        "--cpu-throttle=4",
      ]),
    /only once/u,
  );
});
