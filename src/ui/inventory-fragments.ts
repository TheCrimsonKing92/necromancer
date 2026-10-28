import {
  allWounds,
  BODY_PARTS,
  bodyConditionPercentage,
  untreatedBleeding,
} from "../game/anatomy";
import {
  ATTRIBUTE_IDS,
  MUNDANE_SKILL_IDS,
  fieldDressingRecovery,
  skillRankLabel,
} from "../game/character";
import {
  effectiveAttack,
  effectiveDefense,
  effectiveOccultPower,
  isPostDeathState,
  isReliquaryOpen,
} from "../game/engine";
import {
  EQUIPMENT_SLOTS,
  ITEMS,
  carryCapacity,
  carriedWeight,
  itemCount,
} from "../game/items";
import type { GameState, ItemId, Scar, Wound } from "../game/types";
import { renderLoadedBonebinderInventoryContents } from "./bonebinder-surface-loader";
import { escapeHtml } from "./html";
import { renderAnatomySectionContents } from "./inventory/anatomy-render";
import { renderEquipmentContents } from "./inventory/equipment-render";
import { renderReliquaryShopContents } from "./inventory/market-render";
import { renderPackContents } from "./inventory/pack-render";
import {
  combinedWoundEffectLabels,
  recoveryBurdenLabel,
} from "./wound-presentation";

export interface InventorySectionMarkup {
  labelledBy: string;
  modifier: string;
  contents: string;
}

export interface InventoryPatchMarkup {
  summary: string;
  sections: InventorySectionMarkup[];
}

export interface InventoryView {
  patch: InventoryPatchMarkup;
  readOnly: boolean;
  shopOpen: boolean;
}

const INVENTORY_ITEM_IDS = Object.keys(ITEMS) as ItemId[];

const woundsDiffer = (left: Wound[], right: Wound[]): boolean =>
  left.length !== right.length || left.some((wound, index) => {
    const other = right[index]!;
    return wound.id !== other.id ||
      wound.part !== other.part ||
      wound.severity !== other.severity ||
      wound.label !== other.label ||
      wound.bleed !== other.bleed ||
      wound.care !== other.care ||
      wound.treated !== other.treated ||
      wound.source !== other.source ||
      wound.combatPenaltyReduction !== other.combatPenaltyReduction ||
      wound.combatPenaltyReductionTurns !== other.combatPenaltyReductionTurns ||
      wound.recoveryBurden !== other.recoveryBurden;
  });

const scarsDiffer = (left: Scar[], right: Scar[]): boolean =>
  left.length !== right.length || left.some((scar, index) => {
    const other = right[index]!;
    return scar.id !== other.id ||
      scar.part !== other.part ||
      scar.label !== other.label ||
      scar.source !== other.source ||
      scar.conditionPenalty !== other.conditionPenalty;
  });

export const inventoryView = (
  state: GameState,
  includedSections?: ReadonlySet<string>,
): InventoryView | null => {
  const player = state.run?.player;
  if (!player) return null;
  const readOnly = isPostDeathState(state);
  const shopOpen = isReliquaryOpen(state);
  const inventoryItems = (
    Object.entries(player.inventory) as Array<[ItemId, number | undefined]>
  )
    .filter((entry): entry is [ItemId, number] => (entry[1] ?? 0) > 0)
    .sort(([left], [right]) =>
      ITEMS[left].name.localeCompare(ITEMS[right].name),
    );
  const wounds = allWounds(player);
  const bleeding = untreatedBleeding(player);
  const woundConsequences = combinedWoundEffectLabels(player);
  const woundBurden = wounds.length > 0 ? recoveryBurdenLabel(player) : "";
  const summary = `
    <div><dt>Health</dt><dd>${player.hp} / ${player.maxHp}</dd></div>
    <div><dt>Spirit</dt><dd>${player.spirit} / ${player.maxSpirit}</dd></div>
    <div><dt>Ward</dt><dd>${player.ward}</dd></div>
    <div><dt>Load</dt><dd>${carriedWeight(player).toFixed(1)} / ${carryCapacity(player)}</dd></div>
    <div><dt>Physical power</dt><dd>${effectiveAttack(player)}</dd></div>
    <div><dt>Occult power</dt><dd>${effectiveOccultPower(player)}</dd></div>
    <div><dt>Effective defense</dt><dd>${effectiveDefense(player)}</dd></div>
    <div><dt>Medicine</dt><dd>${player.skills.medicine} · ${skillRankLabel(player.skills.medicine)} · ${fieldDressingRecovery(player.skills)} condition on success</dd></div>
    <div><dt>Body condition</dt><dd>${bodyConditionPercentage(player)}%</dd></div>
    <div><dt>Wounds / scars</dt><dd>${wounds.length} / ${player.scars.length}</dd></div>
    <div><dt>Wound effects</dt><dd>${wounds.length > 0 ? `${woundConsequences.length > 0 ? `${escapeHtml(woundConsequences.join(" · "))} · ` : "No immediate combat penalty · "}${escapeHtml(woundBurden)}` : bleeding > 0 ? `${bleeding} Health / round` : "None"}</dd></div>
    ${shopOpen ? `<div><dt>Black obols</dt><dd>${player.obols}</dd></div>` : ""}
  `;
  const includes = (labelledBy: string): boolean =>
    !includedSections || includedSections.has(labelledBy);
  const servantContents = includes("servant-repair-heading")
    ? renderLoadedBonebinderInventoryContents(state.run!, readOnly)
    : "";
  const sections: InventorySectionMarkup[] = [
    ...(servantContents
      ? [{ labelledBy: "servant-repair-heading", modifier: "servant", contents: servantContents }]
      : []),
    ...(includes("equipment-heading")
      ? [{ labelledBy: "equipment-heading", modifier: "equipment", contents: renderEquipmentContents(player, readOnly) }]
      : []),
    ...(includes("pack-heading")
      ? [{ labelledBy: "pack-heading", modifier: "pack", contents: renderPackContents(player, inventoryItems, shopOpen, readOnly) }]
      : []),
    ...(shopOpen && includes("shop-heading")
      ? [{ labelledBy: "shop-heading", modifier: "shop", contents: renderReliquaryShopContents(state.run!) }]
      : []),
    ...(includes("anatomy-heading")
      ? [{ labelledBy: "anatomy-heading", modifier: "anatomy", contents: renderAnatomySectionContents(player, readOnly) }]
      : []),
  ];
  return { patch: { summary, sections }, readOnly, shopOpen };
};

export const renderInventoryPatchMarkup = (
  state: GameState,
  includedSections?: ReadonlySet<string>,
): InventoryPatchMarkup | null =>
  inventoryView(state, includedSections)?.patch ?? null;

export const changedInventorySections = (
  previousState: GameState,
  nextState: GameState,
): Set<string> => {
  const previous = previousState.run?.player;
  const next = nextState.run?.player;
  if (!previous || !next) return new Set();
  const inventoryChanged = INVENTORY_ITEM_IDS.some(
    (id) =>
      (previous.inventory[id] ?? 0) !== (next.inventory[id] ?? 0),
  );
  const equipmentChanged = EQUIPMENT_SLOTS.some(
    (slot) => previous.equipment[slot] !== next.equipment[slot],
  );
  const attributesChanged = ATTRIBUTE_IDS.some(
    (id) => previous.attributes[id] !== next.attributes[id],
  );
  const skillsChanged = MUNDANE_SKILL_IDS.some(
    (id) => previous.skills[id] !== next.skills[id],
  );
  const capabilitiesChanged = attributesChanged || skillsChanged;
  const armorChanged = (["head", "torso", "arms", "legs"] as const).some(
    (slot) => previous.equipment[slot] !== next.equipment[slot],
  );
  const bodyChanged = BODY_PARTS.some(({ id }) => {
    const left = previous.body[id];
    const right = next.body[id];
    return left.condition !== right.condition ||
      left.maxCondition !== right.maxCondition ||
      woundsDiffer(left.wounds, right.wounds);
  });
  const scarsChanged = scarsDiffer(previous.scars, next.scars);
  const bindingsChanged =
    itemCount(previous.inventory, "linen-binding") !==
    itemCount(next.inventory, "linen-binding");
  const materialsChanged = bindingsChanged ||
    itemCount(previous.inventory, "mortuary-tallow") !==
      itemCount(next.inventory, "mortuary-tallow");
  const changed = new Set<string>();
  if (equipmentChanged || capabilitiesChanged) changed.add("equipment-heading");
  if (inventoryChanged || equipmentChanged || capabilitiesChanged) {
    changed.add("pack-heading");
  }
  if (
    (inventoryChanged || previous.obols !== next.obols) &&
    isReliquaryOpen(nextState)
  ) {
    changed.add("shop-heading");
  }
  if (
    bodyChanged ||
    scarsChanged ||
    armorChanged ||
    bindingsChanged ||
    skillsChanged
  ) changed.add("anatomy-heading");
  if (
    JSON.stringify(previousState.run?.practiceStates?.bonebinder) !==
      JSON.stringify(nextState.run?.practiceStates?.bonebinder) ||
    materialsChanged
  ) changed.add("servant-repair-heading");
  return changed;
};
