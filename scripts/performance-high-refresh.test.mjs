import test from "node:test";
import assert from "node:assert/strict";
import {
  assessHighRefreshCapability,
  summarizeDurations,
  summarizeHighRefreshWorkload,
  summarizeRefreshIntervals,
} from "./performance-high-refresh.mjs";

test("summarizes high-refresh duration tails", () => {
  assert.deepEqual(summarizeDurations([1, 2, 3, 4, 5]), {
    samples: 5,
    meanMs: 3,
    p50Ms: 3,
    p95Ms: 5,
    p99Ms: 5,
    worstMs: 5,
  });
});

test("retains exact zero-cost handler samples", () => {
  const summary = summarizeDurations([0, 0, 0.2]);
  assert.equal(summary.samples, 3);
  assert.equal(summary.p50Ms, 0);
});

test("counts missed 120 Hz opportunities without treating timer jitter as loss", () => {
  const summary = summarizeRefreshIntervals([8.2, 8.34, 8.5, 16.7], 120);
  assert.equal(summary.intervalsOverDeadline, 1);
  assert.equal(summary.missedFrames, 1);
  assert.equal(summary.maximumConsecutiveMissedFrames, 1);
  assert.equal(summary.fullyDeliveredPercent, 80);
});

test("qualifies a stable 120 Hz environment and both important workloads", () => {
  const baseline = summarizeRefreshIntervals(Array(180).fill(8.33), 120);
  const workload = summarizeHighRefreshWorkload({
    intervals: Array(600).fill(8.33),
    handlers: Array(600).fill(0.5),
    nextPaints: Array(600).fill(8.33),
  });
  const assessment = assessHighRefreshCapability({
    baseline,
    targeting: workload,
    compoundScroll: workload,
  });
  assert.equal(assessment.environmentQualified, true);
  assert.equal(assessment.passed, true);
  assert.deepEqual(assessment.failures, []);
});

test("keeps a 60 Hz display distinct from an application failure", () => {
  const baseline = summarizeRefreshIntervals(Array(180).fill(16.67), 120);
  const workload = summarizeHighRefreshWorkload({
    intervals: Array(600).fill(16.67),
    handlers: Array(600).fill(0.5),
    nextPaints: Array(600).fill(16.67),
  });
  const assessment = assessHighRefreshCapability({
    baseline,
    targeting: workload,
    compoundScroll: workload,
  });
  assert.equal(assessment.environmentQualified, false);
  assert.equal(assessment.enforcement, "environment-unavailable");
  assert.equal(assessment.passed, false);
});

test("separates an isolated delivery stall from application work", () => {
  const baseline = summarizeRefreshIntervals(Array(180).fill(8.33), 120);
  const workload = summarizeHighRefreshWorkload({
    intervals: [...Array(599).fill(8.33), 34],
    handlers: Array(600).fill(0.5),
    nextPaints: Array(600).fill(8.33),
  });
  const assessment = assessHighRefreshCapability({
    baseline,
    targeting: workload,
    compoundScroll: workload,
  });
  assert.equal(assessment.passed, false);
  assert.equal(assessment.capabilityPassed, true);
  assert.equal(assessment.deliveryPassed, false);
  assert.ok(
    assessment.deliveryFailures.includes("targeting.consecutiveMisses"),
  );
});
