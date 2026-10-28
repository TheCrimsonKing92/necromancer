import {
  equipItem,
  treatWound,
  unequipItem,
  useInventoryItem,
} from "../game/engine";
import type { EngineResult, GameState } from "../game/types";
import { isEquipmentSlot, isItemId } from "./input-identifiers";

export const resolveInventoryAppAction = (
  state: GameState,
  origin: HTMLElement,
): EngineResult | null => {
  switch (origin.dataset.action) {
    case "equip-item": {
      const itemId = origin.dataset.itemId;
      const slot = origin.dataset.slot;
      return itemId && slot && isItemId(itemId) && isEquipmentSlot(slot)
        ? equipItem(state, itemId, slot)
        : null;
    }
    case "unequip-item": {
      const slot = origin.dataset.slot;
      return slot && isEquipmentSlot(slot) ? unequipItem(state, slot) : null;
    }
    case "use-item": {
      const itemId = origin.dataset.itemId;
      return itemId && isItemId(itemId) ? useInventoryItem(state, itemId) : null;
    }
    case "treat-wound": {
      const woundId = origin.dataset.woundId;
      return woundId ? treatWound(state, woundId) : null;
    }
    default:
      return null;
  }
};
