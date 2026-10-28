import { describe, expect, it } from "vitest";
import {
  EXCHANGE_ITEM_EXPANSION_IDS,
  GROUNDED_ITEM_EXPANSION_IDS,
  ITEM_DESIGN_NOTES,
} from "./item-design";
import {
  ITEMS,
  VAULT_LOOT,
} from "./items";
import {
  RELIQUARY_STOCK,
  validateReliquaryEconomy,
} from "./reliquary-market";

describe("reliquary economy", () => {
  it("accepts the built-in item values and stock", () => {
    expect(
      validateReliquaryEconomy(ITEMS, RELIQUARY_STOCK),
    ).toEqual([]);
  });

  it("rejects duplicate stock and a profitable buyback loop", () => {
    const stock = [
      ...RELIQUARY_STOCK,
      {
        itemId: "black-tonic",
        price: ITEMS["black-tonic"].sellValue,
      },
    ];

    const errors = validateReliquaryEconomy(ITEMS, stock);

    expect(errors).toContain(
      "black-tonic: duplicate market listing.",
    );
    expect(errors).toContain(
      "black-tonic: purchase price must exceed sale value.",
    );
  });

  it("keeps the grounded expansion attainable and mechanically distinct", () => {
    const stockIds = new Set(
      RELIQUARY_STOCK.map((listing) => listing.itemId),
    );
    for (const itemId of GROUNDED_ITEM_EXPANSION_IDS) {
      expect(stockIds.has(itemId)).toBe(true);
      expect(ITEMS[itemId].description.trim()).not.toBe("");
      expect(ITEM_DESIGN_NOTES[itemId].provenance.trim()).not.toBe("");
      expect(ITEM_DESIGN_NOTES[itemId].economyRole.trim()).not.toBe("");
      expect(
        ITEM_DESIGN_NOTES[itemId].acquisitionIntent,
      ).toContain("Reliquary market");
    }

    expect(ITEMS["mortuary-mallet"].weapon).toMatchObject({
      baseDamage: 3,
      attackBonus: 0,
      traumaBonus: 2,
      damageType: "physical",
      injuryProfile: "impact",
    });
    expect(ITEMS["warding-awl"].weapon).toMatchObject({
      baseDamage: 1,
      attackBonus: 1,
      damageType: "occult",
      injuryProfile: "spectral",
    });
    expect(ITEMS["burial-hood"].armor).toEqual({
      value: 1,
      parts: ["head"],
    });
    expect(ITEMS["grave-iron-mask"].armor?.value).toBeGreaterThan(
      ITEMS["burial-hood"].armor!.value,
    );
  });

  it("adds bounded exchange stock without flattening unique spoils into shop goods", () => {
    const stock = new Map(
      RELIQUARY_STOCK.map((listing) => [listing.itemId, listing]),
    );
    for (const itemId of EXCHANGE_ITEM_EXPANSION_IDS) {
      expect(ITEMS[itemId].description.trim()).not.toBe("");
      expect(ITEM_DESIGN_NOTES[itemId].provenance.trim()).not.toBe("");
      expect(ITEM_DESIGN_NOTES[itemId].economyRole.trim()).not.toBe("");
      expect(ITEM_DESIGN_NOTES[itemId].acquisitionIntent.trim()).not.toBe("");
    }

    expect(stock.get("vigil-cordial")).toMatchObject({
      price: 7,
      limitPerTestament: 1,
      barter: { itemId: "ossuary-ichor", quantity: 1, obols: 0 },
    });
    expect(stock.get("carrier-harness")).toMatchObject({
      price: 7,
      limitPerTestament: 1,
      barter: { itemId: "grave-copper", quantity: 1, obols: 2 },
    });
    expect(stock.has("orra-crozier")).toBe(false);
    expect(VAULT_LOOT).toContainEqual({
      itemId: "orra-crozier",
      quantity: 1,
    });
    expect(ITEMS["orra-crozier"].weapon).toMatchObject({
      baseDamage: 4,
      attackBonus: -1,
      traumaBonus: 2,
      damageType: "occult",
      injuryProfile: "spectral",
    });
  });
});
