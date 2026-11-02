import { describe, expect, it } from "vitest";
import { applyIncomingDamage } from "./damage-resolution";
import { createCombatant, createPlayer } from "./engine/combatants";
import { createEmptyEquipment } from "./items";
import type { Combatant, DamageTypeId } from "./types";

interface LayerOrderCase {
  name: string;
  incoming: number;
  damageType: DamageTypeId;
  materiality: Combatant["materiality"];
  armor: number;
  ward: number;
  expected: {
    resistanceAbsorbed: number;
    armorAbsorbed: number;
    wardAbsorbed: number;
    damage: number;
    wardLeft: number;
    protectionLabel?: string;
    resistanceLabel?: string;
  };
}

const cases: LayerOrderCase[] = [
  {
    name: "absorbs armor before ward and preserves unused ward",
    incoming: 6, damageType: "physical", materiality: "corporeal",
    armor: 2, ward: 5,
    expected: {
      resistanceAbsorbed: 0, armorAbsorbed: 2, wardAbsorbed: 4,
      damage: 0, wardLeft: 1, protectionLabel: "Test hide",
    },
  },
  {
    name: "halves an incorporeal physical hit before spending ward",
    incoming: 6, damageType: "physical", materiality: "incorporeal",
    armor: 0, ward: 5,
    expected: {
      resistanceAbsorbed: 3, armorAbsorbed: 0, wardAbsorbed: 3,
      damage: 0, wardLeft: 2, resistanceLabel: "Test spectral form",
    },
  },
  {
    name: "rounds resistance up before armor and a depleted ward",
    incoming: 9, damageType: "physical", materiality: "incorporeal",
    armor: 2, ward: 1,
    expected: {
      resistanceAbsorbed: 5, armorAbsorbed: 2, wardAbsorbed: 1,
      damage: 1, wardLeft: 0,
      protectionLabel: "Test hide", resistanceLabel: "Test spectral form",
    },
  },
  {
    name: "lets ward absorb the last point that armor must leave",
    incoming: 3, damageType: "physical", materiality: "corporeal",
    armor: 5, ward: 1,
    expected: {
      resistanceAbsorbed: 0, armorAbsorbed: 2, wardAbsorbed: 1,
      damage: 0, wardLeft: 0, protectionLabel: "Test hide",
    },
  },
  {
    name: "sends occult damage straight to ward despite armor and materiality",
    incoming: 6, damageType: "occult", materiality: "incorporeal",
    armor: 2, ward: 4,
    expected: {
      resistanceAbsorbed: 0, armorAbsorbed: 0, wardAbsorbed: 4,
      damage: 2, wardLeft: 0,
    },
  },
  {
    name: "preserves corporeal armor absorption with no ward",
    incoming: 6, damageType: "physical", materiality: "corporeal",
    armor: 2, ward: 0,
    expected: {
      resistanceAbsorbed: 0, armorAbsorbed: 2, wardAbsorbed: 0,
      damage: 4, wardLeft: 0, protectionLabel: "Test hide",
    },
  },
  {
    name: "preserves resistance and armor absorption with no ward",
    incoming: 6, damageType: "physical", materiality: "incorporeal",
    armor: 2, ward: 0,
    expected: {
      resistanceAbsorbed: 3, armorAbsorbed: 2, wardAbsorbed: 0,
      damage: 1, wardLeft: 0,
      protectionLabel: "Test hide", resistanceLabel: "Test spectral form",
    },
  },
  {
    name: "preserves the armor damage floor with no ward",
    incoming: 3, damageType: "physical", materiality: "corporeal",
    armor: 5, ward: 0,
    expected: {
      resistanceAbsorbed: 0, armorAbsorbed: 2, wardAbsorbed: 0,
      damage: 1, wardLeft: 0, protectionLabel: "Test hide",
    },
  },
  {
    name: "leaves every layer unused on zero incoming damage",
    incoming: 0, damageType: "physical", materiality: "incorporeal",
    armor: 2, ward: 5,
    expected: {
      resistanceAbsorbed: 0, armorAbsorbed: 0, wardAbsorbed: 0,
      damage: 0, wardLeft: 5,
    },
  },
];

describe("applyIncomingDamage layer order", () => {
  it.each(cases)("$name", ({ incoming, damageType, materiality, armor, ward, expected }) => {
    const target = createCombatant({
      id: "test-target", name: "Test target", kind: "enemy", title: "Target",
      hp: 100, maxHp: 100, attack: 0, defense: 0,
      materiality, materialityLabel: "Test spectral form", ward,
      naturalArmor: { torso: armor }, naturalArmorLabel: "Test hide",
    });
    target.body.torso.condition = 100;
    target.body.torso.maxCondition = 100;

    const applied = applyIncomingDamage(
      target, incoming, damageType, "torso", "Test hit", 0, "w1",
    );

    expect(applied.result).toMatchObject({
      resistanceAbsorbed: expected.resistanceAbsorbed,
      armorAbsorbed: expected.armorAbsorbed,
      wardAbsorbed: expected.wardAbsorbed,
      damage: expected.damage,
      location: "torso",
      protectionLabel: expected.protectionLabel,
      resistanceLabel: expected.resistanceLabel,
    });
    expect(target.hp).toBe(100 - expected.damage);
    expect(target.ward).toBe(expected.wardLeft);
    expect(target.body.torso.condition).toBe(100 - expected.damage);
    if (expected.damage === 0) {
      expect(applied.woundCreated).toBe(false);
      expect(target.body.torso.wounds).toEqual([]);
    }
  });

  it("combines location-specific natural and worn armor before ward with the same label", () => {
    const target = createPlayer("Mara", "medium", "female");
    target.hp = target.maxHp = 100;
    target.body.torso.condition = target.body.torso.maxCondition = 100;
    target.equipment = createEmptyEquipment();
    target.equipment.torso = "gravecloth-coat";
    target.naturalArmor = { torso: 1, head: 10 };
    target.naturalArmorLabel = "Test hide";
    target.ward = 5;

    const applied = applyIncomingDamage(
      target, 6, "physical", "torso", "Test hit", 0, "w1",
    );

    expect(applied.result).toMatchObject({
      resistanceAbsorbed: 0,
      armorAbsorbed: 2,
      wardAbsorbed: 4,
      damage: 0,
      protectionLabel: "Test hide and worn armor",
      resistanceLabel: undefined,
    });
    expect(target.hp).toBe(100);
    expect(target.ward).toBe(1);
    expect(target.body.torso.condition).toBe(100);
    expect(target.body.torso.wounds).toEqual([]);
    expect(applied.woundCreated).toBe(false);
  });
});
