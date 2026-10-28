export const MAX_MERCY_TOKENS = 2;

export type DepartureRecoveryExpression =
  | "bank-the-departure"
  | "open-hand";

/**
 * JSON-safe state intended to live with a battle once the discipline is wired
 * into RunState. The battle key and claimed IDs make defeat recovery
 * deterministic and idempotent across save/load.
 */
export interface DepartureRecoveryState {
  battleKey: string | null;
  expression: DepartureRecoveryExpression | null;
  mercyTokens: number;
  claimedDefeatIds: string[];
  openHandConversionSpent: boolean;
}

export interface ResolveDepartureRecoveryInput {
  state: DepartureRecoveryState;
  battleKey: string;
  expression: DepartureRecoveryExpression;
  /** IDs of confirmed, eligible enemy defeats in the current transition. */
  defeatIds: readonly string[];
  recipientStanding: boolean;
  spirit: number;
  maxSpirit: number;
  ward: number;
  maxWard: number;
}

export interface DepartureRecoveryResolution {
  state: DepartureRecoveryState;
  expression: DepartureRecoveryExpression;
  acceptedDefeatIds: string[];
  spiritBefore: number;
  spiritAfter: number;
  spiritRecovered: number;
  spiritOverflow: number;
  mercyBefore: number;
  mercyAfter: number;
  mercyAdded: number;
  mercyOverflow: number;
  wardBefore: number;
  wardAfter: number;
  wardGained: number;
  openHandTriggered: boolean;
}

export interface RedeemMercyInput {
  state: DepartureRecoveryState;
  battleKey: string;
  phase: "player-turn-start" | "other";
  requested: number;
  spirit: number;
  maxSpirit: number;
}

export interface MercyRedemption {
  state: DepartureRecoveryState;
  spiritBefore: number;
  spiritAfter: number;
  spiritRecovered: number;
  mercyBefore: number;
  mercyAfter: number;
  mercySpent: number;
}

const isExpression = (
  value: unknown,
): value is DepartureRecoveryExpression =>
  value === "bank-the-departure" || value === "open-hand";

const wholeAtLeastZero = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;

const boundedPool = (value: unknown, maximum: unknown): number =>
  Math.min(wholeAtLeastZero(value), wholeAtLeastZero(maximum));

const canonicalIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const id = candidate.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
};

export const emptyDepartureRecoveryState = (): DepartureRecoveryState => ({
  battleKey: null,
  expression: null,
  mercyTokens: 0,
  claimedDefeatIds: [],
  openHandConversionSpent: false,
});

export const normalizeDepartureRecoveryState = (
  value: unknown,
): DepartureRecoveryState => {
  if (!value || typeof value !== "object") {
    return emptyDepartureRecoveryState();
  }
  const candidate = value as Partial<DepartureRecoveryState>;
  const battleKey =
    typeof candidate.battleKey === "string" && candidate.battleKey.trim()
      ? candidate.battleKey.trim()
      : null;
  const expression = isExpression(candidate.expression)
    ? candidate.expression
    : null;
  if (!battleKey || !expression) return emptyDepartureRecoveryState();

  return {
    battleKey,
    expression,
    mercyTokens:
      expression === "bank-the-departure"
        ? Math.min(MAX_MERCY_TOKENS, wholeAtLeastZero(candidate.mercyTokens))
        : 0,
    claimedDefeatIds: canonicalIds(candidate.claimedDefeatIds),
    openHandConversionSpent:
      expression === "open-hand" &&
      candidate.openHandConversionSpent === true,
  };
};

/** Starts a new battle or returns the expression already locked for this one. */
export const beginDepartureRecoveryBattle = (
  state: DepartureRecoveryState,
  battleKey: string,
  expression: DepartureRecoveryExpression,
): DepartureRecoveryState => {
  const normalized = normalizeDepartureRecoveryState(state);
  const canonicalBattleKey = battleKey.trim();
  if (!canonicalBattleKey) return emptyDepartureRecoveryState();
  if (normalized.battleKey === canonicalBattleKey) return normalized;
  return {
    ...emptyDepartureRecoveryState(),
    battleKey: canonicalBattleKey,
    expression,
  };
};

export const endDepartureRecoveryBattle = (): DepartureRecoveryState =>
  emptyDepartureRecoveryState();

const emptyResolution = (
  state: DepartureRecoveryState,
  spirit: number,
  maxSpirit: number,
  ward: number,
  maxWard: number,
): DepartureRecoveryResolution => ({
  state,
  expression: state.expression ?? "open-hand",
  acceptedDefeatIds: [],
  spiritBefore: boundedPool(spirit, maxSpirit),
  spiritAfter: boundedPool(spirit, maxSpirit),
  spiritRecovered: 0,
  spiritOverflow: 0,
  mercyBefore: state.mercyTokens,
  mercyAfter: state.mercyTokens,
  mercyAdded: 0,
  mercyOverflow: 0,
  wardBefore: boundedPool(ward, maxWard),
  wardAfter: boundedPool(ward, maxWard),
  wardGained: 0,
  openHandTriggered: false,
});

export const resolveDepartureRecovery = (
  input: ResolveDepartureRecoveryInput,
): DepartureRecoveryResolution => {
  const state = beginDepartureRecoveryBattle(
    input.state,
    input.battleKey,
    input.expression,
  );
  if (!state.expression) {
    return emptyResolution(
      state,
      input.spirit,
      input.maxSpirit,
      input.ward,
      input.maxWard,
    );
  }

  const claimed = new Set(state.claimedDefeatIds);
  const acceptedDefeatIds = canonicalIds(input.defeatIds).filter(
    (id) => !claimed.has(id),
  );
  const nextState: DepartureRecoveryState = {
    ...state,
    claimedDefeatIds: [...state.claimedDefeatIds, ...acceptedDefeatIds],
  };
  const resolution = emptyResolution(
    nextState,
    input.spirit,
    input.maxSpirit,
    input.ward,
    input.maxWard,
  );
  resolution.expression = state.expression;
  resolution.acceptedDefeatIds = acceptedDefeatIds;
  if (acceptedDefeatIds.length === 0 || !input.recipientStanding) {
    return resolution;
  }

  if (state.expression === "bank-the-departure") {
    const capacity = Math.min(
      MAX_MERCY_TOKENS,
      wholeAtLeastZero(input.maxSpirit),
    );
    const mercyAfter = Math.min(
      capacity,
      state.mercyTokens + acceptedDefeatIds.length,
    );
    resolution.mercyAfter = mercyAfter;
    resolution.mercyAdded = mercyAfter - state.mercyTokens;
    resolution.mercyOverflow =
      acceptedDefeatIds.length - resolution.mercyAdded;
    resolution.state = {
      ...nextState,
      mercyTokens: mercyAfter,
    };
    return resolution;
  }

  const spiritAfter = Math.min(
    wholeAtLeastZero(input.maxSpirit),
    resolution.spiritBefore + acceptedDefeatIds.length,
  );
  resolution.spiritAfter = spiritAfter;
  resolution.spiritRecovered = spiritAfter - resolution.spiritBefore;
  resolution.spiritOverflow =
    acceptedDefeatIds.length - resolution.spiritRecovered;

  const fullyWastedAtMaximum =
    resolution.spiritRecovered === 0 &&
    resolution.spiritOverflow > 0 &&
    resolution.spiritBefore === wholeAtLeastZero(input.maxSpirit);
  if (fullyWastedAtMaximum && !state.openHandConversionSpent) {
    resolution.openHandTriggered = true;
    resolution.wardAfter = Math.min(
      wholeAtLeastZero(input.maxWard),
      resolution.wardBefore + 1,
    );
    resolution.wardGained = resolution.wardAfter - resolution.wardBefore;
    resolution.state = {
      ...nextState,
      openHandConversionSpent: true,
    };
  }
  return resolution;
};

/**
 * Mercy may only be redeemed at player-turn start. Redemption never creates a
 * departure or another token, so waiting can only spend a finite battle pool.
 */
export const redeemMercyTokens = (
  input: RedeemMercyInput,
): MercyRedemption => {
  const state = normalizeDepartureRecoveryState(input.state);
  const spiritBefore = boundedPool(input.spirit, input.maxSpirit);
  const result: MercyRedemption = {
    state,
    spiritBefore,
    spiritAfter: spiritBefore,
    spiritRecovered: 0,
    mercyBefore: state.mercyTokens,
    mercyAfter: state.mercyTokens,
    mercySpent: 0,
  };
  if (
    state.battleKey !== input.battleKey.trim() ||
    state.expression !== "bank-the-departure" ||
    input.phase !== "player-turn-start"
  ) {
    return result;
  }

  const spiritRoom = wholeAtLeastZero(input.maxSpirit) - spiritBefore;
  const mercySpent = Math.min(
    state.mercyTokens,
    wholeAtLeastZero(input.requested),
    spiritRoom,
  );
  result.mercySpent = mercySpent;
  result.mercyAfter = state.mercyTokens - mercySpent;
  result.spiritRecovered = mercySpent;
  result.spiritAfter = spiritBefore + mercySpent;
  result.state = {
    ...state,
    mercyTokens: result.mercyAfter,
  };
  return result;
};
