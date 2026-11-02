import { describe, expect, it } from "vitest";
import { createWound } from "./anatomy";
import {
  effectiveAttack,
  effectiveDefense,
  effectiveOccultPower,
  getHitChance,
  statusFor,
} from "./combat-math";
import { createCombatant, createPlayer } from "./engine/combatants";
import { createEmptyEquipment } from "./items";
import type { BodyPartId, Combatant, StatusEffect } from "./types";

const foe = (attack: number, defense: number): Combatant =>
  createCombatant({
    id: "test-foe",
    name: "Test foe",
    kind: "enemy",
    title: "Foe",
    hp: 10,
    maxHp: 10,
    attack,
    defense,
  });

const wound = (combatant: Combatant, part: BodyPartId): void => {
  combatant.body[part].wounds.push(
    createWound(`test-${part}`, part, "grievous", "Test injury"),
  );
};

describe("combat math floors", () => {
  it("floors non-player attack and occult power when wounds exceed attack", () => {
    const attacker = foe(1, 5);
    wound(attacker, "leftArm");
    wound(attacker, "rightArm");

    expect(effectiveAttack(attacker)).toBe(0);
    expect(effectiveOccultPower(attacker)).toBe(0);
  });

  it("floors non-player defense when wounds exceed defense", () => {
    const target = foe(5, 1);
    wound(target, "leftLeg");
    wound(target, "rightLeg");

    expect(effectiveDefense(target)).toBe(0);
  });

  it("floors player attack and occult power after attributes and equipment", () => {
    const player = createPlayer("Mara", "medium", "female");
    wound(player, "head");
    wound(player, "leftArm");
    wound(player, "rightArm");

    expect(effectiveAttack(player)).toBe(0);
    expect(effectiveOccultPower(player)).toBe(0);
  });

  it("floors player defense when wounds exceed attributes and equipment", () => {
    const player = createPlayer("Mara", "medium", "female");
    player.equipment.charm = "saint-bone-charm";
    wound(player, "leftLeg");
    wound(player, "rightLeg");

    expect(effectiveDefense(player)).toBe(0);
  });

  it("subtracts wound penalties from non-player fields above the floors", () => {
    const combatant = foe(5, 6);
    expect(effectiveAttack(combatant)).toBe(5);
    expect(effectiveOccultPower(combatant)).toBe(5);
    expect(effectiveDefense(combatant)).toBe(6);

    wound(combatant, "leftArm");
    wound(combatant, "leftLeg");

    expect(effectiveAttack(combatant)).toBe(3);
    expect(effectiveOccultPower(combatant)).toBe(3);
    expect(effectiveDefense(combatant)).toBe(4);
  });
});

describe("combat math status effects", () => {
  it("lowers effective defense by exposed potency", () => {
    const target = foe(3, 6);
    expect(effectiveDefense(target)).toBe(6);

    target.statuses.push({ id: "exposed", potency: 2, turns: 2 });

    expect(effectiveDefense(target)).toBe(4);
  });

  it("lowers target evasion by exposed potency", () => {
    const attacker = foe(3, 3);
    const target = foe(3, 3);
    expect(getHitChance(attacker, target)).toBe(70);

    target.statuses.push({ id: "exposed", potency: 2, turns: 2 });

    expect(getHitChance(attacker, target)).toBe(80);
  });

  it("raises hit chance by the attacker's forewarned potency", () => {
    const attacker = foe(3, 3);
    const target = foe(3, 3);
    expect(getHitChance(attacker, target)).toBe(70);

    attacker.statuses.push({ id: "forewarned", potency: 3, turns: 2 });

    expect(getHitChance(attacker, target)).toBe(73);
  });

  it("lowers hit chance by the target's forewarned potency", () => {
    const attacker = foe(3, 3);
    const target = foe(3, 3);
    expect(getHitChance(attacker, target)).toBe(70);

    target.statuses.push({ id: "forewarned", potency: 3, turns: 2 });

    expect(getHitChance(attacker, target)).toBe(67);
  });

  it("finds the requested status among other effects", () => {
    const combatant = foe(3, 3);
    const forewarned: StatusEffect = {
      id: "forewarned",
      potency: 3,
      turns: 2,
    };
    combatant.statuses.push(
      { id: "exposed", potency: 1, turns: 2 },
      forewarned,
    );

    expect(statusFor(combatant, "forewarned")).toBe(forewarned);
    expect(statusFor(combatant, "burning")).toBeUndefined();
  });
});

describe("combat math hit chance", () => {
  it("clamps a very accurate attacker against an unskilled target to 95", () => {
    expect(getHitChance(foe(20, 20), foe(0, 0))).toBe(95);
  });

  it("clamps the reverse matchup to 25", () => {
    expect(getHitChance(foe(0, 0), foe(20, 20))).toBe(25);
  });

  it("returns 70 for an equal matchup", () => {
    expect(getHitChance(foe(3, 3), foe(3, 3))).toBe(70);
  });

  it.each([
    [4, 2, 80],
    [2, 4, 60],
  ])("uses accuracy %i and evasion %i to return %i", (accuracy, evasion, chance) => {
    expect(getHitChance(foe(accuracy, 0), foe(0, evasion))).toBe(chance);
  });

  it("subtracts attack wounds from non-player accuracy", () => {
    const attacker = foe(4, 4);
    const target = foe(4, 4);
    expect(getHitChance(attacker, target)).toBe(70);

    wound(attacker, "leftArm");

    expect(getHitChance(attacker, target)).toBe(60);
  });

  it("subtracts defense wounds from non-player evasion", () => {
    const attacker = foe(4, 4);
    const target = foe(4, 4);
    expect(getHitChance(attacker, target)).toBe(70);

    wound(target, "leftLeg");

    expect(getHitChance(attacker, target)).toBe(80);
  });
});

describe("combat math player contributions", () => {
  it("adds equipment attack bonuses to strength rather than the attack field", () => {
    const player = createPlayer("Mara", "medium", "female");
    player.attack = 99;
    player.equipment = createEmptyEquipment();
    expect(effectiveAttack(player)).toBe(3);

    player.equipment.mainHand = "ritual-knife";
    expect(effectiveAttack(player)).toBe(4);

    player.equipment.charm = "debtor-tally";
    expect(effectiveAttack(player)).toBe(5);

    player.attributes.strength = 5;
    expect(effectiveAttack(player)).toBe(7);
  });

  it("adds equipment defense bonuses to dexterity rather than the defense field", () => {
    const player = createPlayer("Mara", "medium", "female");
    player.defense = 99;
    player.equipment = createEmptyEquipment();
    expect(effectiveDefense(player)).toBe(2);

    player.equipment.charm = "saint-bone-charm";
    expect(effectiveDefense(player)).toBe(3);

    player.attributes.dexterity = 4;
    expect(effectiveDefense(player)).toBe(5);
  });

  it("combines Willpower, the tradition attribute and equipment for occult power", () => {
    const player = createPlayer("Mara", "medium", "female");
    player.attack = 99;
    player.equipment = createEmptyEquipment();
    expect(effectiveOccultPower(player)).toBe(3);

    player.equipment.mainHand = "ritual-knife";
    expect(effectiveOccultPower(player)).toBe(4);

    player.attributes.willpower = 5;
    player.attributes.charisma = 6;
    expect(effectiveOccultPower(player)).toBe(6);
  });

  it("subtracts player wounds from attack, occult power and defense above zero", () => {
    const player = createPlayer("Mara", "medium", "female");
    player.equipment.charm = "saint-bone-charm";
    expect(effectiveAttack(player)).toBe(4);
    expect(effectiveOccultPower(player)).toBe(4);
    expect(effectiveDefense(player)).toBe(3);

    wound(player, "leftArm");
    wound(player, "leftLeg");

    expect(effectiveAttack(player)).toBe(2);
    expect(effectiveOccultPower(player)).toBe(2);
    expect(effectiveDefense(player)).toBe(1);
  });

  it("uses dexterity for physical accuracy and evasion without equipment bonuses", () => {
    const player = createPlayer("Mara", "medium", "female");
    const enemy = foe(2, 2);
    player.attack = 99;
    player.defense = 99;
    player.equipment.charm = "saint-bone-charm";
    expect(getHitChance(player, enemy)).toBe(70);
    expect(getHitChance(enemy, player)).toBe(70);

    player.attributes.dexterity = 4;

    expect(getHitChance(player, enemy)).toBe(80);
    expect(getHitChance(enemy, player)).toBe(60);
  });

  it("uses occult attributes for occult accuracy and subtracts attack wounds", () => {
    const player = createPlayer("Mara", "medium", "female");
    const target = foe(2, 2);
    expect(getHitChance(player, target, "physical")).toBe(70);
    expect(getHitChance(player, target, "occult")).toBe(75);

    wound(player, "leftArm");

    expect(getHitChance(player, target, "physical")).toBe(60);
    expect(getHitChance(player, target, "occult")).toBe(65);
  });

  it("subtracts player defense wounds from evasion", () => {
    const player = createPlayer("Mara", "medium", "female");
    const attacker = foe(2, 2);
    expect(getHitChance(attacker, player)).toBe(70);

    wound(player, "leftLeg");

    expect(getHitChance(attacker, player)).toBe(80);
  });
});
