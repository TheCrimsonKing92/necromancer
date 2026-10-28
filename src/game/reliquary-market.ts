import type {
  EconomyServiceId,
  ItemDefinition,
  ItemId,
  RunState,
} from "./types";
import {
  marketPurchaseCount,
  marketServiceCount,
} from "./economy/market-activity";

export interface ReliquaryBarterCost {
  itemId: ItemId;
  quantity: number;
  obols: number;
}

export interface ReliquaryListing {
  itemId: ItemId;
  price: number;
  limitPerTestament?: number;
  barter?: ReliquaryBarterCost;
}

export type ReliquaryServiceId = EconomyServiceId;

export interface ReliquaryServiceDefinition {
  id: ReliquaryServiceId;
  name: string;
  description: string;
  price: number;
  limitPerTestament: number;
  effect: {
    ward: number;
    wardCap: number;
  };
}

export const RELIQUARY_BUY_POLICY: Readonly<{
  acceptedItemIds: readonly ItemId[];
  description: string;
}> = {
  acceptedItemIds: [
    "ritual-knife",
    "bone-wand",
    "iron-sickle",
    "mortuary-mallet",
    "warding-awl",
    "hooked-knife",
    "grave-iron-mask",
    "saint-bone-charm",
    "debtor-tally",
    "ossuary-ichor",
    "black-tonic",
    "hound-tooth",
    "grave-salt",
    "mortuary-tallow",
    "vigil-cordial",
    "grave-copper",
    "orra-crozier",
  ],
  description:
    "He buys mortuary instruments, sealed preparations, relics, and worked remains. His graveglass does not darken for road clothing, common linen, or carrying gear.",
};

export interface ReliquarySaleAvailability {
  accepted: boolean;
  reason: string | null;
}

export const reliquarySaleAvailability = (
  itemId: ItemId,
): ReliquarySaleAvailability =>
  RELIQUARY_BUY_POLICY.acceptedItemIds.includes(itemId)
    ? { accepted: true, reason: null }
    : {
        accepted: false,
        reason:
          "The broker buys mortuary instruments, sealed preparations, relics, and worked remains—not common road goods.",
      };

export const RELIQUARY_STOCK: readonly ReliquaryListing[] = [
  { itemId: "black-tonic", price: 6 },
  { itemId: "linen-binding", price: 3 },
  { itemId: "mortuary-mallet", price: 5 },
  { itemId: "warding-awl", price: 5 },
  { itemId: "burial-hood", price: 5 },
  {
    itemId: "vigil-cordial",
    price: 7,
    limitPerTestament: 1,
    barter: {
      itemId: "ossuary-ichor",
      quantity: 1,
      obols: 0,
    },
  },
  {
    itemId: "carrier-harness",
    price: 7,
    limitPerTestament: 1,
    barter: {
      itemId: "grave-copper",
      quantity: 1,
      obols: 2,
    },
  },
];

export const RELIQUARY_SERVICES: readonly ReliquaryServiceDefinition[] = [
  {
    id: "graveglass-ward",
    name: "Close a graveglass ward",
    description:
      "The broker heats a black-glass tooth and closes 4 Ward around you, up to 12. The glass can be worked only once.",
    price: 4,
    limitPerTestament: 1,
    effect: {
      ward: 4,
      wardCap: 12,
    },
  },
];

export const RELIQUARY_MARKET_ID = "north-vey-reliquary" as const;

export const reliquaryListingAvailable = (
  run: RunState,
  listing: ReliquaryListing,
): boolean =>
  listing.limitPerTestament === undefined ||
  marketPurchaseCount(
    run.economy,
    RELIQUARY_MARKET_ID,
    listing.itemId,
  ) <
    listing.limitPerTestament;

export const reliquaryServiceAvailable = (
  run: RunState,
  service: ReliquaryServiceDefinition,
): boolean =>
  marketServiceCount(
    run.economy,
    RELIQUARY_MARKET_ID,
    service.id,
  ) <
  service.limitPerTestament;

export const reliquaryBarterLabel = (
  definitions: Readonly<Record<string, ItemDefinition>>,
  cost: ReliquaryBarterCost,
): string => {
  const item = definitions[cost.itemId];
  const itemCost = `${cost.quantity} ${item?.name ?? cost.itemId}`;
  return cost.obols > 0
    ? `${itemCost} + ${cost.obols} ${cost.obols === 1 ? "obol" : "obols"}`
    : itemCost;
};

export const validateReliquaryEconomy = (
  definitions: Readonly<Record<string, ItemDefinition>>,
  stock: ReadonlyArray<{
    itemId: string;
    price: number;
    limitPerTestament?: number;
    barter?: {
      itemId: string;
      quantity: number;
      obols: number;
    };
  }>,
  services: ReadonlyArray<ReliquaryServiceDefinition> =
    RELIQUARY_SERVICES,
): string[] => {
  const errors: string[] = [];
  const listed = new Set<string>();
  const serviceIds = new Set<string>();

  for (const [key, definition] of Object.entries(definitions)) {
    if (key !== definition.id) {
      errors.push(
        `${key}: record key does not match item id ${definition.id}.`,
      );
    }
    if (
      !Number.isInteger(definition.sellValue) ||
      definition.sellValue < 0
    ) {
      errors.push(
        `${definition.id}: sale value must be a non-negative integer.`,
      );
    }
  }

  for (const itemId of RELIQUARY_BUY_POLICY.acceptedItemIds) {
    if (!definitions[itemId]) {
      errors.push(`${itemId}: broker demand item is not defined.`);
    }
  }

  for (const listing of stock) {
    const item = definitions[listing.itemId];
    if (!item) {
      errors.push(`${listing.itemId}: market item is not defined.`);
      continue;
    }
    if (listed.has(listing.itemId)) {
      errors.push(`${listing.itemId}: duplicate market listing.`);
    }
    listed.add(listing.itemId);
    if (!Number.isInteger(listing.price) || listing.price < 1) {
      errors.push(
        `${listing.itemId}: purchase price must be a positive integer.`,
      );
    } else if (listing.price <= item.sellValue) {
      errors.push(
        `${listing.itemId}: purchase price must exceed sale value.`,
      );
    }
    if (
      listing.limitPerTestament !== undefined &&
      (!Number.isInteger(listing.limitPerTestament) ||
        listing.limitPerTestament < 1)
    ) {
      errors.push(
        `${listing.itemId}: stock limit must be a positive integer.`,
      );
    }

    if (listing.barter) {
      const offered = definitions[listing.barter.itemId];
      if (!offered) {
        errors.push(
          `${listing.itemId}: barter item ${listing.barter.itemId} is not defined.`,
        );
      } else if (listing.barter.itemId === listing.itemId) {
        errors.push(`${listing.itemId}: cannot be bartered for itself.`);
      }
      if (
        !Number.isInteger(listing.barter.quantity) ||
        listing.barter.quantity < 1 ||
        !Number.isInteger(listing.barter.obols) ||
        listing.barter.obols < 0
      ) {
        errors.push(`${listing.itemId}: barter cost is invalid.`);
      } else if (
        offered &&
        offered.sellValue * listing.barter.quantity +
          listing.barter.obols <=
          item.sellValue
      ) {
        errors.push(
          `${listing.itemId}: barter cost creates a profitable buyback loop.`,
        );
      }
    }
  }

  for (const service of services) {
    if (serviceIds.has(service.id)) {
      errors.push(`${service.id}: duplicate market service.`);
    }
    serviceIds.add(service.id);
    if (!Number.isInteger(service.price) || service.price < 1) {
      errors.push(`${service.id}: service price must be a positive integer.`);
    }
    if (
      !Number.isInteger(service.limitPerTestament) ||
      service.limitPerTestament < 1
    ) {
      errors.push(`${service.id}: service limit must be a positive integer.`);
    }
    if (
      !Number.isInteger(service.effect.ward) ||
      service.effect.ward < 1 ||
      !Number.isInteger(service.effect.wardCap) ||
      service.effect.wardCap < service.effect.ward
    ) {
      errors.push(`${service.id}: Ward service effect is invalid.`);
    }
  }

  return errors;
};
