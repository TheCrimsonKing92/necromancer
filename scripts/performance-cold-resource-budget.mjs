export const COLD_TRANSFER_OVERHEAD_ALLOWANCE_BYTES_PER_REQUEST = 400;

const stageBudget = (encodedBodyBytes, resourceCount) =>
  Object.freeze({
    encodedBodyBytes,
    resourceCount,
    transferOverheadBytesPerRequest:
      COLD_TRANSFER_OVERHEAD_ALLOWANCE_BYTES_PER_REQUEST,
  });

/**
 * Cold resources are admitted by the first UI checkpoint that needs them.
 * Encoded body bytes measure owned payload. Resource count bounds request
 * fragmentation. The observed transfer allowance is derived from both so
 * response headers do not become an unexplained magic-number tax.
 */
export const COLD_RESOURCE_STAGE_BUDGETS = Object.freeze({
  title: stageBudget(14_000, 4),
  creation: stageBudget(88_000, 3),
  opening: stageBudget(19_000, 4),
  battle: stageBudget(33_000, 6),
  "post-combat": stageBudget(13_500, 4),
});

export const derivedTransferBudgetBytes = (budget) =>
  budget.encodedBodyBytes +
  budget.resourceCount * budget.transferOverheadBytesPerRequest;
