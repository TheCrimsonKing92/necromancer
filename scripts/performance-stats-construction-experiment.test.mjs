import assert from "node:assert/strict";
import test from "node:test";
import { assessStatsConstructionExperiment } from "./performance-stats-construction-experiment.mjs";

const result = (overrides = {}) => ({
  taskDurationMs: 20,
  allocatedHeapBytes: 500_000,
  layoutDurationMs: 5,
  retainedHeapBytes: 100_000,
  retainedNodeDelta: 0,
  retainedDocumentDelta: 0,
  semanticsPreserved: true,
  ...overrides,
});

test("adopts only an alternative with material task and allocation gains", () => {
  const assessment = assessStatsConstructionExperiment({
    "full-template": result(),
    "direct-fragment": result({
      taskDurationMs: 15,
      allocatedHeapBytes: 350_000,
      layoutDurationMs: 5.1,
      retainedHeapBytes: 110_000,
    }),
    "render-once-keyed": result({
      taskDurationMs: 8,
      allocatedHeapBytes: 200_000,
      retainedHeapBytes: 150_000,
      retainedNodeDelta: 80,
    }),
  });
  assert.equal(assessment.recommendation, "direct-fragment");
  assert.equal(assessment.variants["direct-fragment"].favorable, true);
  assert.equal(assessment.variants["render-once-keyed"].favorable, false);
});

test("retains the current implementation when semantics or gains are marginal", () => {
  const assessment = assessStatsConstructionExperiment({
    "full-template": result(),
    "direct-fragment": result({
      taskDurationMs: 18,
      allocatedHeapBytes: 390_000,
    }),
    "render-once-keyed": result({
      taskDurationMs: 10,
      allocatedHeapBytes: 200_000,
      semanticsPreserved: false,
    }),
  });
  assert.equal(assessment.recommendation, "retain-full-template");
});
