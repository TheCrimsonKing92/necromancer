import { describe, expect, it } from "vitest";
import { createCharacter, openInventory, unequipItem } from "../game/engine";
import { changedInventorySections } from "./inventory-fragments";

describe("inventory fragment invalidation", () => {
  it("updates equipment and pack previews without rebuilding anatomy for a weapon change", () => {
    const inventory = openInventory(
      createCharacter("Mara", "medium", 1).state,
    ).state;
    const unequipped = unequipItem(inventory, "mainHand").state;

    expect([...changedInventorySections(inventory, unequipped)].sort()).toEqual([
      "equipment-heading",
      "pack-heading",
    ]);
  });
});
