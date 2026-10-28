const finiteDurations = (values, { allowZero = true } = {}) =>
  values.filter(
    (value) => Number.isFinite(value) && (allowZero ? value >= 0 : value > 0),
  );

const percentile = (sorted, ratio) =>
  sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? null;

const rounded = (value, digits = 2) =>
  value === null ? null : Number(value.toFixed(digits));

export const HIGH_REFRESH_TARGET_HZ = 120;

export const summarizeDurations = (values) => {
  const samples = finiteDurations(values);
  const sorted = [...samples].sort((left, right) => left - right);
  if (samples.length === 0) {
    return {
      samples: 0,
      meanMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      worstMs: null,
    };
  }
  return {
    samples: samples.length,
    meanMs: rounded(
      samples.reduce((total, value) => total + value, 0) / samples.length,
    ),
    p50Ms: rounded(percentile(sorted, 0.5)),
    p95Ms: rounded(percentile(sorted, 0.95)),
    p99Ms: rounded(percentile(sorted, 0.99)),
    worstMs: rounded(sorted.at(-1)),
  };
};

export const summarizeRefreshIntervals = (
  intervals,
  targetHz = HIGH_REFRESH_TARGET_HZ,
) => {
  const durations = summarizeDurations(intervals);
  const samples = finiteDurations(intervals, { allowZero: false });
  const targetFrameMs = 1000 / targetHz;
  // Windows/DWM and high-resolution timers introduce small boundary jitter.
  // A 15% grace still classifies a real second frame (16.67 ms at 120 Hz)
  // as missed while avoiding a false miss at 8.34 ms.
  const deadlineMs = targetFrameMs * 1.15;
  const missedByInterval = samples.map((duration) =>
    Math.max(0, Math.ceil(duration / deadlineMs) - 1),
  );
  const missedFrames = missedByInterval.reduce(
    (total, missed) => total + missed,
    0,
  );
  const expectedFrames = samples.length + missedFrames;
  return {
    ...durations,
    targetHz,
    targetFrameMs: rounded(targetFrameMs),
    deadlineWithJitterMs: rounded(deadlineMs),
    estimatedHz:
      durations.p50Ms && durations.p50Ms > 0
        ? rounded(1000 / durations.p50Ms, 1)
        : null,
    intervalsOverDeadline: samples.filter((value) => value > deadlineMs)
      .length,
    intervalsOverTwoFrames: samples.filter(
      (value) => value > targetFrameMs * 2,
    ).length,
    missedFrames,
    fullyDeliveredPercent:
      expectedFrames > 0
        ? rounded((samples.length / expectedFrames) * 100, 3)
        : null,
    maximumConsecutiveMissedFrames:
      missedByInterval.length > 0 ? Math.max(...missedByInterval) : null,
  };
};

export const summarizeHighRefreshWorkload = (
  workload,
  targetHz = HIGH_REFRESH_TARGET_HZ,
) => ({
  frames: summarizeRefreshIntervals(workload.intervals ?? [], targetHz),
  handlers: summarizeDurations(workload.handlers ?? []),
  nextPaints: summarizeDurations(workload.nextPaints ?? []),
  scrollRangePx: workload.scrollRangePx ?? 0,
  stalls: workload.stalls ?? [],
  diagnostics: workload.diagnostics ?? null,
});

export const assessHighRefreshCapability = ({
  baseline,
  targeting,
  compoundScroll,
  targetHz = HIGH_REFRESH_TARGET_HZ,
}) => {
  const targetFrameMs = 1000 / targetHz;
  const thresholds = {
    minimumObservedHz: targetHz * 0.95,
    maximumFrameP95Ms: targetFrameMs * 1.15,
    maximumFrameP99Ms: targetFrameMs * 2,
    minimumFullyDeliveredPercent: 99,
    maximumConsecutiveMissedFrames: 1,
    maximumHandlerP95Ms: 4,
    maximumHandlerWorstMs: targetFrameMs,
    maximumNextPaintP95Ms: targetFrameMs * 2,
    maximumTaskPerFrameMs: 4,
    maximumScriptPerFrameMs: 1,
    maximumStyleLayoutPerFrameMs: 1.5,
  };
  const observedHz = baseline.estimatedHz;
  const environmentQualified =
    observedHz !== null && observedHz >= thresholds.minimumObservedHz;
  const workloadChecks = (workload) => {
    const samples = Math.max(1, workload.frames.samples ?? 0);
    const durations =
      workload.diagnostics?.browserMetrics?.durationsMs ?? {};
    return {
      frameP95:
        workload.frames.p95Ms !== null &&
        workload.frames.p95Ms <= thresholds.maximumFrameP95Ms,
      frameP99:
        workload.frames.p99Ms !== null &&
        workload.frames.p99Ms <= thresholds.maximumFrameP99Ms,
      delivery:
        workload.frames.fullyDeliveredPercent !== null &&
        workload.frames.fullyDeliveredPercent >=
          thresholds.minimumFullyDeliveredPercent,
      consecutiveMisses:
        workload.frames.maximumConsecutiveMissedFrames !== null &&
        workload.frames.maximumConsecutiveMissedFrames <=
          thresholds.maximumConsecutiveMissedFrames,
      handler:
        workload.handlers.p95Ms !== null &&
        workload.handlers.p95Ms <= thresholds.maximumHandlerP95Ms,
      handlerWorst:
        workload.handlers.worstMs !== null &&
        workload.handlers.worstMs <= thresholds.maximumHandlerWorstMs,
      nextPaint:
        workload.nextPaints.p95Ms !== null &&
        workload.nextPaints.p95Ms <= thresholds.maximumNextPaintP95Ms,
      taskBudget:
        (durations.TaskDuration ?? 0) / samples <=
        thresholds.maximumTaskPerFrameMs,
      scriptBudget:
        (durations.ScriptDuration ?? 0) / samples <=
        thresholds.maximumScriptPerFrameMs,
      styleLayoutBudget:
        ((durations.LayoutDuration ?? 0) +
          (durations.RecalcStyleDuration ?? 0)) /
          samples <=
        thresholds.maximumStyleLayoutPerFrameMs,
      appLongWork:
        (workload.diagnostics?.performanceEntries?.longTasks?.length ?? 0) ===
          0 &&
        (workload.diagnostics?.performanceEntries?.longAnimationFrames ?? [])
          .every((entry) => (entry.scripts?.length ?? 0) === 0),
    };
  };
  const checks = {
    environmentQualified,
    targeting: workloadChecks(targeting),
    compoundScroll: workloadChecks(compoundScroll),
  };
  const applicationFailures = [];
  const deliveryFailures = [];
  for (const [workloadId, workload] of Object.entries({
    targeting: checks.targeting,
    compoundScroll: checks.compoundScroll,
  })) {
    for (const [check, passed] of Object.entries(workload)) {
      if (passed) continue;
      const destination = [
        "frameP95",
        "frameP99",
        "delivery",
        "consecutiveMisses",
        "nextPaint",
      ].includes(check)
        ? deliveryFailures
        : applicationFailures;
      destination.push(`${workloadId}.${check}`);
    }
  }
  const capabilityPassed =
    environmentQualified && applicationFailures.length === 0;
  const deliveryPassed = environmentQualified && deliveryFailures.length === 0;
  return {
    targetHz,
    targetFrameMs: rounded(targetFrameMs),
    observedHz,
    environmentQualified,
    thresholds: Object.fromEntries(
      Object.entries(thresholds).map(([key, value]) => [key, rounded(value)]),
    ),
    checks,
    capabilityPassed,
    deliveryPassed,
    passed: capabilityPassed && deliveryPassed,
    failures: [...applicationFailures, ...deliveryFailures],
    applicationFailures,
    deliveryFailures,
    enforcement: environmentQualified
      ? "application-enforced-delivery-observed"
      : "environment-unavailable",
  };
};
