import {
  BODY_PARTS,
  canBindWound,
  getBodyPartLabel,
} from "./anatomy";
import {
  fieldDressingChance,
  fieldDressingRecovery,
} from "./character";
import {
  ITEMS,
  EQUIPMENT_SLOT_LABELS,
  addItem,
  itemCount,
  removeItem,
} from "./items";
import {
  requireInventoryState,
  requireMutableInventoryState,
} from "./inventory-eligibility";
import { rollInteger } from "./random";
import {
  repairPersistentServant,
  type PersistentServantRepairRequest,
} from "./content-packs/bonebinder-runtime";
import type {
  EngineResult,
  EquipmentSlot,
  GameState,
  ItemId,
  Player,
} from "./types";

export type BonebinderServantRepairRequest = PersistentServantRepairRequest;

const cloneState = (state: GameState): GameState =>
  structuredClone(state);

export const openInventory = (state: GameState): EngineResult => {
  if (
    !state.run ||
    (state.screen !== "story" && state.screen !== "ending")
  ) {
    return {
      state,
      error: "Equipment cannot be changed here.",
    };
  }

  const next = cloneState(state);
  next.inventoryReturnScreen = state.screen;
  next.screen = "inventory";
  return { state: next };
};

export const closeInventory = (state: GameState): EngineResult => {
  const invalid = requireInventoryState(state);
  if (invalid) return invalid;

  const next = cloneState(state);
  next.screen =
    state.inventoryReturnScreen ??
    (state.ending ? "ending" : "story");
  next.inventoryReturnScreen = null;
  return { state: next };
};

export const openJournal = (state: GameState): EngineResult => {
  if (
    !state.run ||
    (state.screen !== "story" &&
      state.screen !== "battle" &&
      state.screen !== "ending")
  ) {
    return {
      state,
      error: "The journal cannot be opened here.",
    };
  }

  const next = cloneState(state);
  next.journalReturnScreen = state.screen;
  next.screen = "journal";
  return { state: next };
};

export const closeJournal = (state: GameState): EngineResult => {
  if (state.screen !== "journal" || !state.run) {
    return {
      state,
      error: "The journal is not open.",
    };
  }

  const next = cloneState(state);
  next.screen =
    state.journalReturnScreen ??
    (state.run.battle ? "battle" : state.ending ? "ending" : "story");
  next.journalReturnScreen = null;
  return { state: next };
};

export const switchJournalToInventory = (
  state: GameState,
): EngineResult => {
  if (
    state.screen !== "journal" ||
    !state.run ||
    (state.journalReturnScreen !== "story" &&
      state.journalReturnScreen !== "ending")
  ) {
    return {
      state,
      error: "Equipment cannot be changed here.",
    };
  }

  const next = cloneState(state);
  next.inventoryReturnScreen = state.journalReturnScreen;
  next.journalReturnScreen = null;
  next.screen = "inventory";
  return { state: next };
};

export const switchInventoryToJournal = (
  state: GameState,
): EngineResult => {
  if (
    state.screen !== "inventory" ||
    !state.run ||
    (state.inventoryReturnScreen !== "story" &&
      state.inventoryReturnScreen !== "ending")
  ) {
    return {
      state,
      error: "The journal cannot be opened here.",
    };
  }

  const next = cloneState(state);
  next.journalReturnScreen = state.inventoryReturnScreen;
  next.inventoryReturnScreen = null;
  next.screen = "journal";
  return { state: next };
};

export const equipItem = (
  state: GameState,
  itemId: ItemId,
  slot: EquipmentSlot,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;

  const item = ITEMS[itemId];
  if (!item.allowedSlots?.includes(slot)) {
    return {
      state,
      error: `${item.name} cannot be equipped there.`,
    };
  }
  if (!state.run || itemCount(state.run.player.inventory, itemId) < 1) {
    return {
      state,
      error: `${item.name} is not in your pack.`,
    };
  }

  const next = cloneState(state);
  const player = next.run!.player;
  const displaced = player.equipment[slot];
  removeItem(player.inventory, itemId);
  if (displaced) addItem(player.inventory, displaced);
  player.equipment[slot] = itemId;
  return {
    state: next,
    message: `Equipped ${item.name} in ${EQUIPMENT_SLOT_LABELS[slot].toLowerCase()}.${displaced ? ` ${ITEMS[displaced].name} returns to the pack.` : ""}`,
  };
};

export const unequipItem = (
  state: GameState,
  slot: EquipmentSlot,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;

  const equipped = state.run?.player.equipment[slot];
  if (!equipped) {
    return {
      state,
      error: "That equipment slot is already empty.",
    };
  }

  const next = cloneState(state);
  const player = next.run!.player;
  addItem(player.inventory, equipped);
  player.equipment[slot] = null;
  return {
    state: next,
    message: `Unequipped ${ITEMS[equipped].name} from ${EQUIPMENT_SLOT_LABELS[slot].toLowerCase()}.`,
  };
};

export interface InventoryItemUseAvailability {
  label: string;
  unavailableReason: string | null;
}

export const inventoryItemUseAvailability = (
  player: Player,
  itemId: ItemId,
): InventoryItemUseAvailability | null => {
  const item = ITEMS[itemId];
  if (!item.consumable || item.consumable.effect === "treat") {
    return null;
  }

  if (item.consumable.effect === "heal") {
    const restored = Math.min(
      item.consumable.power,
      player.maxHp - player.hp,
    );
    return restored > 0
      ? {
          label: `Drink · restore ${restored} Health`,
          unavailableReason: null,
        }
      : {
          label: "Health full",
          unavailableReason: "You are already at full Health.",
        };
  }

  const restored = Math.min(
    item.consumable.power,
    player.maxSpirit - player.spirit,
  );
  return restored > 0
    ? {
        label: `Drink · restore ${restored} Spirit`,
        unavailableReason: null,
      }
    : {
        label: "Spirit full",
        unavailableReason: "You are already at full Spirit.",
      };
};

export const useInventoryItem = (
  state: GameState,
  itemId: ItemId,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;
  const item = ITEMS[itemId];
  if (!item.consumable || item.consumable.effect === "treat") {
    return {
      state,
      error: "That item cannot be used on its own.",
    };
  }

  const player = state.run!.player;
  if (itemCount(player.inventory, itemId) < 1) {
    return { state, error: `No ${item.name.toLowerCase()} remains.` };
  }
  const availability = inventoryItemUseAvailability(player, itemId);
  if (!availability || availability.unavailableReason) {
    return {
      state,
      error:
        availability?.unavailableReason ??
        "That item cannot be used on its own.",
    };
  }

  const next = cloneState(state);
  const nextPlayer = next.run!.player;
  removeItem(nextPlayer.inventory, itemId);
  if (item.consumable.effect === "heal") {
    const previousHealth = nextPlayer.hp;
    nextPlayer.hp = Math.min(
      nextPlayer.maxHp,
      nextPlayer.hp + item.consumable.power,
    );
    return {
      state: next,
      message: `${item.name} restores ${nextPlayer.hp - previousHealth} Health (${previousHealth} → ${nextPlayer.hp}).`,
    };
  }

  const previousSpirit = nextPlayer.spirit;
  nextPlayer.spirit = Math.min(
    nextPlayer.maxSpirit,
    nextPlayer.spirit + item.consumable.power,
  );
  return {
    state: next,
    message: `${item.name} restores ${nextPlayer.spirit - previousSpirit} Spirit (${previousSpirit} → ${nextPlayer.spirit}).`,
  };
};

export const treatWound = (
  state: GameState,
  woundId: string,
): EngineResult => {
  const invalid = requireMutableInventoryState(state);
  if (invalid) return invalid;

  const player = state.run!.player;
  const part = BODY_PARTS.map(
    (definition) => player.body[definition.id],
  ).find((candidate) =>
    candidate.wounds.some((wound) => wound.id === woundId),
  );
  const wound = part?.wounds.find(
    (candidate) => candidate.id === woundId,
  );
  if (!part || !wound) {
    return { state, error: "That wound could not be found." };
  }
  if (wound.treated) {
    return { state, error: "That wound is already stabilized." };
  }
  if (!canBindWound(wound)) {
    return {
      state,
      error: `${wound.label} cannot be dressed with linen. It needs a safe rest.`,
    };
  }
  if (itemCount(player.inventory, "linen-binding") < 1) {
    return { state, error: "No clean linen binding remains." };
  }

  const next = cloneState(state);
  const nextRun = next.run!;
  const nextPlayer = nextRun.player;
  const nextPart = nextPlayer.body[part.id];
  const nextWound = nextPart.wounds.find(
    (candidate) => candidate.id === woundId,
  )!;
  const chance = fieldDressingChance(
    nextPlayer.attributes,
    nextPlayer.skills,
    nextWound.severity,
  );
  const attempt = rollInteger(nextRun.seed, 1, 100);
  nextRun.seed = attempt.seed;

  removeItem(nextPlayer.inventory, "linen-binding");
  if (attempt.value <= chance) {
    const treatmentPower = fieldDressingRecovery(nextPlayer.skills);
    nextWound.treated = true;
    nextWound.bleed = 0;
    nextPart.condition = Math.min(
      nextPart.maxCondition,
      nextPart.condition + treatmentPower,
    );
    return {
      state: next,
      message: `The binding holds. ${nextWound.label} is stabilized, and the ${getBodyPartLabel(nextPart.id, nextPlayer.anatomy).toLowerCase()} recovers ${treatmentPower} condition.`,
    };
  }

  return {
    state: next,
    message: `The linen comes away spoiled. ${nextWound.label} remains untreated.`,
  };
};

export const repairBonebinderServant = (
  state: GameState,
  request: BonebinderServantRepairRequest,
): EngineResult => repairPersistentServant(state, request);

export { isPostDeathState } from "./inventory-eligibility";
export {
  barterForItem,
  buyItem,
  buyReliquaryService,
  isReliquaryOpen,
  sellItem,
} from "./economy/reliquary-runtime";
