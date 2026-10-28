import {
  ITEMS,
  addItem,
  canCarry,
  canCarryAfterExchange,
  itemCount,
  removeItem,
} from "../items";
import {
  RELIQUARY_MARKET_ID,
  RELIQUARY_SERVICES,
  RELIQUARY_STOCK,
  reliquaryListingAvailable,
  reliquarySaleAvailability,
  reliquaryServiceAvailable,
  type ReliquaryServiceId,
} from "../reliquary-market";
import {
  recordMarketPurchase,
  recordMarketService,
} from "./market-activity";
import { installReliquaryMarketRuntime } from "./reliquary-runtime";
import {
  isPostDeathState,
  requireMutableInventoryState,
} from "../inventory-eligibility";
import type {
  EngineResult,
  GameState,
  ItemId,
} from "../types";

const cloneState = (state: GameState): GameState =>
  structuredClone(state);

export const isReliquaryOpen = (state: GameState): boolean =>
  state.screen === "inventory" &&
  !isPostDeathState(state) &&
  state.storyId === "saint-orra-aftermath" &&
  Boolean(state.run && state.run.battlesWon === 2);

export const sellItem = (
  state: GameState,
  itemId: ItemId,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;
  if (!isReliquaryOpen(state)) {
    return {
      state,
      error: "No buyer waits at this point in the testament.",
    };
  }

  const player = state.run!.player;
  const item = ITEMS[itemId];
  if (itemCount(player.inventory, itemId) < 1) {
    return { state, error: `${item.name} is not in your pack.` };
  }
  if (item.sellValue < 1) {
    return {
      state,
      error: "The reliquary broker finds no price in that.",
    };
  }
  const sale = reliquarySaleAvailability(itemId);
  if (!sale.accepted) {
    return {
      state,
      error: sale.reason ?? "The reliquary broker names no price.",
    };
  }

  const next = cloneState(state);
  const nextPlayer = next.run!.player;
  removeItem(nextPlayer.inventory, itemId);
  nextPlayer.obols += item.sellValue;
  return {
    state: next,
    message: `Sold ${item.name} for ${item.sellValue} ${item.sellValue === 1 ? "obol" : "obols"}. ${nextPlayer.obols} ${nextPlayer.obols === 1 ? "obol remains" : "obols remain"}.`,
  };
};

export const buyItem = (
  state: GameState,
  itemId: ItemId,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;
  if (!isReliquaryOpen(state)) {
    return {
      state,
      error: "No seller waits at this point in the testament.",
    };
  }

  const listing = RELIQUARY_STOCK.find(
    (candidate) => candidate.itemId === itemId,
  );
  if (!listing) {
    return {
      state,
      error: "The reliquary broker does not offer that.",
    };
  }
  if (!reliquaryListingAvailable(state.run!, listing)) {
    return {
      state,
      error: "The broker has no second measure to sell.",
    };
  }

  const player = state.run!.player;
  if (player.obols < listing.price) {
    return {
      state,
      error: `Requires ${listing.price} black obols.`,
    };
  }
  if (!canCarry(player, itemId)) {
    return {
      state,
      error: "Your pack cannot carry another measure.",
    };
  }

  const next = cloneState(state);
  const nextPlayer = next.run!.player;
  nextPlayer.obols -= listing.price;
  addItem(nextPlayer.inventory, itemId);
  if (listing.limitPerTestament !== undefined) {
    recordMarketPurchase(
      next.run!.economy,
      RELIQUARY_MARKET_ID,
      itemId,
    );
  }
  return {
    state: next,
    message: `Bought ${ITEMS[itemId].name} for ${listing.price} ${listing.price === 1 ? "obol" : "obols"}. ${nextPlayer.obols} ${nextPlayer.obols === 1 ? "obol remains" : "obols remain"}.`,
  };
};

export const barterForItem = (
  state: GameState,
  itemId: ItemId,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;
  if (!isReliquaryOpen(state)) {
    return {
      state,
      error: "No broker waits to weigh that exchange.",
    };
  }

  const listing = RELIQUARY_STOCK.find(
    (candidate) => candidate.itemId === itemId,
  );
  if (!listing?.barter) {
    return {
      state,
      error: "The broker names no barter for that item.",
    };
  }
  if (!reliquaryListingAvailable(state.run!, listing)) {
    return {
      state,
      error: "The broker has no second measure to trade.",
    };
  }

  const player = state.run!.player;
  const cost = listing.barter;
  if (itemCount(player.inventory, cost.itemId) < cost.quantity) {
    return {
      state,
      error: `The exchange requires ${cost.quantity} ${ITEMS[cost.itemId].name}.`,
    };
  }
  if (player.obols < cost.obols) {
    return {
      state,
      error: `The exchange also requires ${cost.obols} black ${cost.obols === 1 ? "obol" : "obols"}.`,
    };
  }
  if (
    !canCarryAfterExchange(
      player,
      itemId,
      cost.itemId,
      cost.quantity,
    )
  ) {
    return {
      state,
      error: "Your pack cannot carry another measure.",
    };
  }

  const next = cloneState(state);
  const nextPlayer = next.run!.player;
  removeItem(nextPlayer.inventory, cost.itemId, cost.quantity);
  nextPlayer.obols -= cost.obols;
  addItem(nextPlayer.inventory, itemId);
  recordMarketPurchase(
    next.run!.economy,
    RELIQUARY_MARKET_ID,
    itemId,
  );
  const obolCost =
    cost.obols > 0
      ? ` and ${cost.obols} ${cost.obols === 1 ? "obol" : "obols"}`
      : "";
  return {
    state: next,
    message: `Traded ${cost.quantity} ${ITEMS[cost.itemId].name}${obolCost} for ${ITEMS[itemId].name}.`,
  };
};

export const buyReliquaryService = (
  state: GameState,
  serviceId: ReliquaryServiceId,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;
  if (!isReliquaryOpen(state)) {
    return {
      state,
      error: "No reliquary service is available here.",
    };
  }

  const service = RELIQUARY_SERVICES.find(
    (candidate) => candidate.id === serviceId,
  );
  if (!service) {
    return {
      state,
      error: "The broker offers no such preparation.",
    };
  }
  if (!reliquaryServiceAvailable(state.run!, service)) {
    return {
      state,
      error: "The spent graveglass cannot be worked twice.",
    };
  }
  const player = state.run!.player;
  if (player.obols < service.price) {
    return {
      state,
      error: `Requires ${service.price} black obols.`,
    };
  }
  if (player.ward >= service.effect.wardCap) {
    return {
      state,
      error: `Your Ward already stands at ${service.effect.wardCap}.`,
    };
  }

  const next = cloneState(state);
  const nextPlayer = next.run!.player;
  const wardBefore = nextPlayer.ward;
  nextPlayer.obols -= service.price;
  nextPlayer.ward = Math.min(
    service.effect.wardCap,
    nextPlayer.ward + service.effect.ward,
  );
  recordMarketService(
    next.run!.economy,
    RELIQUARY_MARKET_ID,
    service.id,
  );
  return {
    state: next,
    message: `The graveglass closes ${nextPlayer.ward - wardBefore} Ward around you (${wardBefore} → ${nextPlayer.ward}). ${nextPlayer.obols} ${nextPlayer.obols === 1 ? "obol remains" : "obols remain"}.`,
  };
};

export const activateReliquaryMarketRuntime = (): void => {
  installReliquaryMarketRuntime({
    isOpen: isReliquaryOpen,
    sell: sellItem,
    buy: buyItem,
    barter: barterForItem,
    buyService: buyReliquaryService,
  });
};
