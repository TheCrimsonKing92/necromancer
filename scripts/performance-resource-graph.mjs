const normalizeResourceName = (name) => {
  try {
    const url = new URL(name);
    return `${url.pathname}${url.search}`;
  } catch {
    return String(name);
  }
};

import { derivedTransferBudgetBytes } from "./performance-cold-resource-budget.mjs";

const finiteBytes = (value) =>
  Number.isFinite(value) && value >= 0 ? value : 0;

export const capturePageResourceCheckpoint = (page, id) =>
  page.evaluate((checkpointId) => {
    const resources = performance
      .getEntriesByType("resource")
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType || "unknown",
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        startTimeMs: entry.startTime,
        durationMs: entry.duration,
      }));
    return {
      id: checkpointId,
      observedAtMs: performance.now(),
      resources,
    };
  }, id);

/**
 * Attribute each cold resource to the first UI checkpoint at which the browser
 * had observed it. Transfer and body sizes remain separate because cache hits
 * can legitimately expose a body with zero transferred bytes.
 */
export const summarizeResourceGraph = (
  checkpoints,
  { stageBudgets = {} } = {},
) => {
  const seen = new Map();
  const stages = [];
  let cumulativeTransferBytes = 0;
  let cumulativeEncodedBodyBytes = 0;
  let cumulativeBudgetTransferBytes = 0;
  let cumulativeBudgetEncodedBodyBytes = 0;
  let cumulativeBudgetResourceCount = 0;

  for (const checkpoint of checkpoints) {
    const addedResources = [];
    for (const resource of checkpoint.resources ?? []) {
      const key = String(resource.name);
      if (seen.has(key)) continue;
      const summarized = {
        name: normalizeResourceName(resource.name),
        initiatorType: resource.initiatorType ?? "unknown",
        transferBytes: finiteBytes(resource.transferSize),
        encodedBodyBytes: finiteBytes(resource.encodedBodySize),
        decodedBodyBytes: finiteBytes(resource.decodedBodySize),
        startTimeMs: resource.startTimeMs ?? null,
        durationMs: resource.durationMs ?? null,
        firstObservedAt: checkpoint.id,
      };
      seen.set(key, summarized);
      addedResources.push(summarized);
    }
    addedResources.sort(
      (left, right) =>
        right.transferBytes - left.transferBytes ||
        left.name.localeCompare(right.name),
    );
    const addedTransferBytes = addedResources.reduce(
      (total, resource) => total + resource.transferBytes,
      0,
    );
    const addedEncodedBodyBytes = addedResources.reduce(
      (total, resource) => total + resource.encodedBodyBytes,
      0,
    );
    cumulativeTransferBytes += addedTransferBytes;
    cumulativeEncodedBodyBytes += addedEncodedBodyBytes;
    const stageBudget = stageBudgets[checkpoint.id] ?? null;
    const budget =
      stageBudget === null
        ? null
        : {
            encodedBodyBytes: finiteBytes(stageBudget.encodedBodyBytes),
            resourceCount: finiteBytes(stageBudget.resourceCount),
            transferOverheadBytesPerRequest: finiteBytes(
              stageBudget.transferOverheadBytesPerRequest,
            ),
            transferBytes: derivedTransferBudgetBytes(stageBudget),
          };
    const overBudget =
      budget === null
        ? null
        : {
            encodedBodyBytes: Math.max(
              0,
              addedEncodedBodyBytes - budget.encodedBodyBytes,
            ),
            resourceCount: Math.max(
              0,
              addedResources.length - budget.resourceCount,
            ),
            transferBytes: Math.max(
              0,
              addedTransferBytes - budget.transferBytes,
            ),
          };
    const budgetFailures =
      overBudget === null
        ? []
        : Object.entries(overBudget)
            .filter(([, overage]) => overage > 0)
            .map(([dimension]) => dimension);
    if (budget !== null) {
      cumulativeBudgetTransferBytes += budget.transferBytes;
      cumulativeBudgetEncodedBodyBytes += budget.encodedBodyBytes;
      cumulativeBudgetResourceCount += budget.resourceCount;
    }
    stages.push({
      id: checkpoint.id,
      observedAtMs: checkpoint.observedAtMs ?? null,
      addedResourceCount: addedResources.length,
      addedTransferBytes,
      addedEncodedBodyBytes,
      cumulativeTransferBytes,
      cumulativeEncodedBodyBytes,
      budget,
      withinBudget: budget === null ? null : budgetFailures.length === 0,
      budgetFailures,
      overBudget,
      resources: addedResources,
    });
  }

  const resources = [...seen.values()].sort(
    (left, right) =>
      right.transferBytes - left.transferBytes ||
      left.name.localeCompare(right.name),
  );
  return {
    available: checkpoints.length > 0,
    checkpointCount: checkpoints.length,
    resourceCount: resources.length,
    transferBytes: cumulativeTransferBytes,
    encodedBodyBytes: cumulativeEncodedBodyBytes,
    budget: {
      transferBytes: cumulativeBudgetTransferBytes,
      encodedBodyBytes: cumulativeBudgetEncodedBodyBytes,
      resourceCount: cumulativeBudgetResourceCount,
      withinTransferBudget: stages.every(
        ({ overBudget }) =>
          overBudget === null || overBudget.transferBytes === 0,
      ),
      withinEncodedBodyBudget: stages.every(
        ({ overBudget }) =>
          overBudget === null || overBudget.encodedBodyBytes === 0,
      ),
      withinResourceCountBudget: stages.every(
        ({ overBudget }) =>
          overBudget === null || overBudget.resourceCount === 0,
      ),
      withinBudget: stages.every(
        ({ withinBudget }) => withinBudget !== false,
      ),
    },
    stages,
    largestColdResources: resources.slice(0, 12),
    interpretation:
      "Ownership is the first UI checkpoint that observed a request, not source-code authorship.",
  };
};
