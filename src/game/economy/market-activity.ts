import type {
  EconomyMarketId,
  EconomyServiceId,
  EconomyState,
  ItemId,
  MarketActivityState,
} from "../types";

const activityFor = (
  economy: EconomyState,
  marketId: EconomyMarketId,
): MarketActivityState => {
  const existing = economy.markets[marketId];
  if (existing) return existing;
  const activity: MarketActivityState = { purchases: {}, services: {} };
  economy.markets[marketId] = activity;
  return activity;
};

export const marketPurchaseCount = (
  economy: EconomyState,
  marketId: EconomyMarketId,
  itemId: ItemId,
): number => economy.markets[marketId]?.purchases[itemId] ?? 0;

export const marketServiceCount = (
  economy: EconomyState,
  marketId: EconomyMarketId,
  serviceId: EconomyServiceId,
): number => economy.markets[marketId]?.services[serviceId] ?? 0;

export const recordMarketPurchase = (
  economy: EconomyState,
  marketId: EconomyMarketId,
  itemId: ItemId,
): void => {
  const activity = activityFor(economy, marketId);
  activity.purchases[itemId] = (activity.purchases[itemId] ?? 0) + 1;
};

export const recordMarketService = (
  economy: EconomyState,
  marketId: EconomyMarketId,
  serviceId: EconomyServiceId,
): void => {
  const activity = activityFor(economy, marketId);
  activity.services[serviceId] = (activity.services[serviceId] ?? 0) + 1;
};
