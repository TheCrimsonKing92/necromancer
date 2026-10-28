import { describe, expect, it } from "vitest";
import { createCharacter } from "../game/engine";
import { resolveInventoryAppAction } from "./inventory-app-action";

const origin = (dataset: DOMStringMap): HTMLElement =>
  ({ dataset }) as unknown as HTMLElement;

describe("inventory app actions", () => {
  it("keeps inventory mutations delegated through their domain transitions", () => {
    const state = createCharacter("Mara", "medium", "female", 1).state;
    state.screen = "inventory";
    state.inventoryReturnScreen = "story";

    const result = resolveInventoryAppAction(
      state,
      origin({ action: "unequip-item", slot: "mainHand" }),
    );

    expect(result).not.toBeNull();
    expect(result?.error).toBeUndefined();
    expect(result?.state.run?.player.equipment.mainHand).toBeNull();
  });
});
