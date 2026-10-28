import { getBodyPartShortLabel } from "../../game/anatomy";
import { itemVisual } from "../../game/item-visuals";
import type {
  ItemDefinition,
  ItemId,
} from "../../game/types";
import { escapeHtml } from "../html";

export const renderItemVisual = (
  itemId: ItemId,
  modifier: "pack" | "equipment" | "shop",
): string => {
  const visual = itemVisual(itemId);
  return `<img
    class="item-visual item-visual--${modifier}"
    src="${escapeHtml(visual.src)}"
    alt="${escapeHtml(visual.alt)}"
    width="256"
    height="256"
    loading="lazy"
    decoding="async"
    style="aspect-ratio:${visual.aspectRatio}"
  >`;
};

export const itemDistinctionClass = (item: ItemDefinition): string =>
  item.provenance?.distinction === "singular" ? " is-singular" : "";

export const renderItemProvenance = (item: ItemDefinition): string =>
  item.provenance
    ? `<span class="item-provenance" aria-label="Singular item. Provenance: ${escapeHtml(item.provenance.label)}">Singular · ${escapeHtml(item.provenance.label)}</span>`
    : "";

export const renderItemEffect = (item: ItemDefinition): string => {
  if (item.weapon) {
    return `${item.weapon.baseDamage} base damage · ${item.weapon.attackBonus >= 0 ? "+" : ""}${item.weapon.attackBonus} attack${item.weapon.traumaBonus > 0 ? ` · +${item.weapon.traumaBonus} trauma` : ""} · ${item.weapon.damageType}`;
  }
  if (item.armor) {
    const coverage = item.armor.parts
      .map((part) => getBodyPartShortLabel(part))
      .join(", ");
    return `${item.armor.value} armor · ${coverage}`;
  }
  if (item.bonuses) {
    const bonuses = [
      item.bonuses.attack
        ? `${item.bonuses.attack > 0 ? "+" : ""}${item.bonuses.attack} attack`
        : "",
      item.bonuses.defense
        ? `${item.bonuses.defense > 0 ? "+" : ""}${item.bonuses.defense} defense`
        : "",
      item.bonuses.maxSpirit
        ? `${item.bonuses.maxSpirit > 0 ? "+" : ""}${item.bonuses.maxSpirit} maximum Spirit`
        : "",
      item.bonuses.carryCapacity
        ? `${item.bonuses.carryCapacity > 0 ? "+" : ""}${item.bonuses.carryCapacity} carrying capacity`
        : "",
    ].filter(Boolean);
    return bonuses.join(" · ");
  }
  if (item.consumable?.effect === "heal") {
    return `Restores ${item.consumable.power} Health`;
  }
  if (item.consumable?.effect === "treat") {
    return "Permits one Medicine attempt on a bindable wound";
  }
  if (item.consumable?.effect === "restore-spirit") {
    return `Restores ${item.consumable.power} Spirit`;
  }
  return "Ritual and crafting material";
};
