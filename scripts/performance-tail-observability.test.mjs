import assert from "node:assert/strict";
import test from "node:test";
import {
  setCpuThrottlingRate,
  summarizePerformanceTailObservations,
  withCpuThrottling,
} from "./performance-tail-observability.mjs";

test("summarizes tail distributions and ranks forced-layout attribution", () => {
  const summary = summarizePerformanceTailObservations({
    status: "available",
    support: { longAnimationFrames: true, eventTiming: true },
    observed: { longAnimationFrames: 2, events: 2 },
    dropped: { longAnimationFrames: 0, events: 0 },
    longAnimationFrames: [
      {
        duration: 58,
        blockingDuration: 8,
        scripts: [
          {
            sourceURL: "http://127.0.0.1/app.js",
            sourceFunctionName: "render",
            invokerType: "event-listener",
            duration: 18,
            forcedStyleAndLayoutDuration: 6,
          },
        ],
      },
      {
        duration: 40,
        blockingDuration: 0,
        scripts: [
          {
            sourceURL: "http://127.0.0.1/app.js",
            sourceFunctionName: "render",
            invokerType: "event-listener",
            duration: 7,
            forcedStyleAndLayoutDuration: 2,
          },
        ],
      },
    ],
    events: [
      {
        name: "click",
        startTime: 10,
        processingStart: 14,
        processingEnd: 22,
        duration: 24,
      },
      {
        name: "keydown",
        startTime: 50,
        processingStart: 52,
        processingEnd: 58,
        duration: 16,
      },
    ],
  });

  assert.equal(summary.longAnimationFrames.framesOver50Ms, 1);
  assert.equal(summary.longAnimationFrames.durations.p95Ms, 58);
  assert.equal(
    summary.longAnimationFrames.scriptAttribution[0]
      .forcedStyleAndLayoutDurationMs,
    8,
  );
  assert.equal(summary.eventTiming.inputDelays.maximumMs, 4);
  assert.equal(summary.eventTiming.processingDurations.totalMs, 14);
  assert.equal(summary.eventTiming.presentationDelays.totalMs, 20);
  assert.equal(summary.eventTiming.byName.click.count, 1);
});

test("sets and always resets CPU throttling", async () => {
  const calls = [];
  const session = {
    send: async (method, parameters) => calls.push([method, parameters]),
  };

  await assert.rejects(
    withCpuThrottling(session, 4, async () => {
      throw new Error("failed work");
    }),
    /failed work/u,
  );
  assert.deepEqual(calls, [
    ["Emulation.setCPUThrottlingRate", { rate: 4 }],
    ["Emulation.setCPUThrottlingRate", { rate: 1 }],
  ]);
  await assert.rejects(setCpuThrottlingRate(session, 0), /between 1 and 100/u);
});
