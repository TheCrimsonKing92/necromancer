import type {
  EconomyMarketId,
  EconomyServiceId,
  EconomyState,
  ItemId,
} from "./types";

export const ECONOMY_MARKET_IDS = [
  "north-vey-reliquary",
] as const satisfies readonly EconomyMarketId[];

export const ECONOMY_SERVICE_IDS = [
  "graveglass-ward",
] as const satisfies readonly EconomyServiceId[];

/**
 * Market counts are historical eligibility data, not an unbounded transaction
 * log. Catalog limits remain authoritative; this cap only bounds corrupt or
 * far-future persisted counters.
 */
export const MAX_PERSISTED_MARKET_ACTIVITY = 99;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeCounts = <Id extends string>(
  value: unknown,
  acceptsId: (id: string) => id is Id,
): Partial<Record<Id, number>> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([id, count]) =>
      acceptsId(id) &&
      typeof count === "number" &&
      Number.isSafeInteger(count) &&
      count > 0
        ? [[id, Math.min(count, MAX_PERSISTED_MARKET_ACTIVITY)]]
        : [],
    ),
  ) as Partial<Record<Id, number>>;
};

const isEconomyMarketId = (id: string): id is EconomyMarketId =>
  ECONOMY_MARKET_IDS.includes(id as EconomyMarketId);

const isEconomyServiceId = (id: string): id is EconomyServiceId =>
  ECONOMY_SERVICE_IDS.includes(id as EconomyServiceId);

export const createEconomyState = (): EconomyState => ({ markets: {} });

export const normalizeEconomyState = (
  value: unknown,
  isItemId: (id: string) => id is ItemId,
): EconomyState => {
  if (!isRecord(value) || !isRecord(value.markets)) {
    return createEconomyState();
  }

  const markets: EconomyState["markets"] = {};
  for (const [marketId, rawActivity] of Object.entries(value.markets)) {
    if (!isEconomyMarketId(marketId) || !isRecord(rawActivity)) continue;
    markets[marketId] = {
      purchases: normalizeCounts(rawActivity.purchases, isItemId),
      services: normalizeCounts(rawActivity.services, isEconomyServiceId),
    };
  }
  return { markets };
};
