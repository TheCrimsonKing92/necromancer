import { getBodyPartShortLabel } from "../../game/anatomy";
import {
  effectiveAttack,
  effectiveDefense,
} from "../../game/engine";
import {
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  ITEMS,
  equippedArmorForPart,
  equippedWeapon,
  offHandStrikeDamage,
} from "../../game/items";
import type {
  EquipmentSlot,
  ItemDefinition,
  Player,
} from "../../game/types";
import { escapeHtml } from "../html";
import {
  itemDistinctionClass,
  renderItemEffect,
  renderItemProvenance,
  renderItemVisual,
} from "./item-render";

const renderEquipOption = (
  player: Player,
  item: ItemDefinition,
  slot: EquipmentSlot,
): string => {
  const currentItemId = player.equipment[slot];
  const currentItem = currentItemId ? ITEMS[currentItemId] : undefined;
  const preview: Player = {
    ...player,
    equipment: {
      ...player.equipment,
      [slot]: item.id,
    },
  };
  const changes: string[] = [];
  const attackBefore = effectiveAttack(player);
  const attackAfter = effectiveAttack(preview);
  const defenseBefore = effectiveDefense(player);
  const defenseAfter = effectiveDefense(preview);
  const weaponBefore = equippedWeapon(player);
  const weaponAfter = equippedWeapon(preview);
  const offHandBefore = offHandStrikeDamage(player);
  const offHandAfter = offHandStrikeDamage(preview);

  if (attackBefore !== attackAfter) {
    changes.push(`Attack ${attackBefore} → ${attackAfter}`);
  }
  if (defenseBefore !== defenseAfter) {
    changes.push(`Defense ${defenseBefore} → ${defenseAfter}`);
  }
  if (weaponBefore.baseDamage !== weaponAfter.baseDamage) {
    changes.push(
      `Readied damage ${weaponBefore.baseDamage} → ${weaponAfter.baseDamage}`,
    );
  }
  if (weaponBefore.traumaBonus !== weaponAfter.traumaBonus) {
    changes.push(
      `Trauma ${weaponBefore.traumaBonus} → ${weaponAfter.traumaBonus}`,
    );
  }
  if (weaponBefore.damageType !== weaponAfter.damageType) {
    changes.push(
      `${weaponAfter.damageType === "occult" ? "Occult" : "Physical"} damage`,
    );
  }
  if (offHandBefore !== offHandAfter) {
    changes.push(
      `Off-hand strike damage ${offHandBefore} → ${offHandAfter}`,
    );
  }

  const armorParts = new Set([
    ...(currentItem?.armor?.parts ?? []),
    ...(item.armor?.parts ?? []),
  ]);
  for (const part of armorParts) {
    const armorBefore = equippedArmorForPart(player, part);
    const armorAfter = equippedArmorForPart(preview, part);
    if (armorBefore !== armorAfter) {
      changes.push(
        `${getBodyPartShortLabel(part)} armor ${armorBefore} → ${armorAfter}`,
      );
    }
  }

  return `
    <div class="equip-option">
      <div>
        <span>
          ${escapeHtml(EQUIPMENT_SLOT_LABELS[slot])}
          ·
          ${currentItem ? `replaces ${escapeHtml(currentItem.name)}` : "empty slot"}
        </span>
        <small>${escapeHtml(changes.length ? changes.join(" · ") : "No derived-stat change")}</small>
      </div>
      <button
        class="item-action"
        type="button"
        data-action="equip-item"
        data-item-id="${item.id}"
        data-slot="${slot}"
      >
        Equip
      </button>
    </div>
  `;
};

const renderEquipmentSlot = (
  player: Player,
  slot: EquipmentSlot,
  readOnly = false,
): string => {
  const itemId = player.equipment[slot];
  const item = itemId ? ITEMS[itemId] : undefined;
  const offHandDamage =
    slot === "offHand" ? offHandStrikeDamage(player) : 0;

  return `
    <article class="equipment-slot ${item ? "is-filled" : ""}${item ? itemDistinctionClass(item) : ""}">
      <p class="equipment-slot__label">${escapeHtml(EQUIPMENT_SLOT_LABELS[slot])}</p>
      ${
        item
          ? `<div class="equipment-slot__content">
              ${renderItemVisual(item.id, "equipment")}
              <div class="equipment-slot__body">
                <strong>${escapeHtml(item.name)}</strong>
                ${renderItemProvenance(item)}
                <span>${escapeHtml(renderItemEffect(item))}${offHandDamage > 0 ? ` · +${offHandDamage} strike damage while paired` : ""}</span>
              </div>
            </div>
            ${
              readOnly
                ? ""
                : `<button
                    class="item-action"
                    type="button"
                    data-action="unequip-item"
                    data-slot="${slot}"
                  >
                    Unequip
                  </button>`
            }`
          : `<p class="equipment-slot__empty">Nothing equipped</p>`
      }
    </article>
  `;
};

export const renderEquipmentContents = (
  player: Player,
  readOnly: boolean,
): string => `
    <div class="section-heading">
      <h2 id="equipment-heading">Equipment</h2>
      <span>${readOnly ? "Recorded at death" : "Change gear outside combat"}</span>
    </div>
    <div class="equipment-grid">
      ${EQUIPMENT_SLOTS.map((slot) =>
        renderEquipmentSlot(player, slot, readOnly),
      ).join("")}
    </div>
`;

export { renderEquipOption };
