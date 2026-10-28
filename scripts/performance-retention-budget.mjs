export const STATS_OPEN_CLOSE_RETENTION_BUDGET = Object.freeze({
  warningHeapBytes: 200_000,
  maximumHeapBytes: 300_000,
});

const maximum = (values) =>
  values.length === 0 ? 0 : Math.max(...values.filter(Number.isFinite), 0);

export const assessStatsOpenCloseRetention = (
  experiment,
  budget = STATS_OPEN_CLOSE_RETENTION_BUDGET,
) => {
  const cycles = experiment?.cycles ?? [];
  const peakRetainedHeapBytes = maximum([
    experiment?.peakRetainedHeapBytes,
    ...cycles.map(({ retainedHeapBytes }) => retainedHeapBytes),
  ]);
  const maximumRetainedNodeDelta = maximum(
    cycles.map(({ retainedNodeDelta }) => retainedNodeDelta),
  );
  const maximumDocumentDelta = maximum(
    cycles.map(({ documentDelta }) => documentDelta),
  );
  const noRetainedNodes =
    cycles.length > 0 &&
    cycles.every(({ retainedNodeDelta }) => retainedNodeDelta === 0);
  const noRetainedDocuments =
    cycles.length > 0 &&
    cycles.every(({ documentDelta }) => documentDelta === 0);

  return {
    available: cycles.length > 0,
    cycleCount: cycles.length,
    finalRetainedHeapBytes: experiment?.final?.retainedHeapBytes ?? null,
    peakRetainedHeapBytes,
    maximumRetainedNodeDelta,
    maximumDocumentDelta,
    noRetainedNodes,
    noRetainedDocuments,
    heapWarning: peakRetainedHeapBytes > budget.warningHeapBytes,
    heapWithinBudget: peakRetainedHeapBytes <= budget.maximumHeapBytes,
  };
};
