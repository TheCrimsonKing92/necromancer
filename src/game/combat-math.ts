import {
  attackPenaltyFromWounds,
  defensePenaltyFromWounds,
} from "./anatomy";
import {
  accuracyFromAttributes,
  defenseFromAttributes,
  occultPowerFromAttributes,
  physicalPowerFromAttributes,
} from "./character";
import { TRADITIONS } from "./content";
import {
  equipmentAttackBonus,
  equipmentDefenseBonus,
} from "./items";
import type {
  Combatant,
  DamageTypeId,
  Player,
  StatusEffect,
  StatusId,
} from "./types";

export const statusFor = (
  combatant: Combatant,
  statusId: StatusId,
): StatusEffect | undefined =>
  combatant.statuses.find((status) => status.id === statusId);

export const effectiveAttack = (attacker: Combatant): number => {
  const equipmentBonus =
    attacker.kind === "player"
      ? equipmentAttackBonus(attacker as Player)
      : 0;
  const baseAttack =
    attacker.kind === "player"
      ? physicalPowerFromAttributes((attacker as Player).attributes)
      : attacker.attack;
  return Math.max(
    0,
    baseAttack +
      equipmentBonus -
      attackPenaltyFromWounds(attacker),
  );
};

export const effectiveOccultPower = (
  attacker: Combatant,
): number => {
  if (attacker.kind !== "player") return effectiveAttack(attacker);

  const player = attacker as Player;
  return Math.max(
    0,
    occultPowerFromAttributes(
      player.attributes,
      TRADITIONS[player.tradition].occultAttribute,
    ) +
      equipmentAttackBonus(player) -
      attackPenaltyFromWounds(player),
  );
};

export const effectiveDefense = (target: Combatant): number => {
  const exposed = statusFor(target, "exposed")?.potency ?? 0;
  const equipmentBonus =
    target.kind === "player"
      ? equipmentDefenseBonus(target as Player)
      : 0;
  const baseDefense =
    target.kind === "player"
      ? defenseFromAttributes((target as Player).attributes)
      : target.defense;
  return Math.max(
    0,
    baseDefense +
      equipmentBonus -
      defensePenaltyFromWounds(target) -
      exposed,
  );
};

const accuracyRating = (
  attacker: Combatant,
  damageType: DamageTypeId,
): number => {
  if (attacker.kind !== "player") {
    return Math.max(
      0,
      attacker.attack - attackPenaltyFromWounds(attacker),
    );
  }

  const player = attacker as Player;
  return Math.max(
    0,
    accuracyFromAttributes(
      player.attributes,
      damageType,
      TRADITIONS[player.tradition].occultAttribute,
    ) - attackPenaltyFromWounds(player),
  );
};

const evasionRating = (target: Combatant): number => {
  const base =
    target.kind === "player"
      ? (target as Player).attributes.dexterity
      : target.defense;
  const exposed = statusFor(target, "exposed")?.potency ?? 0;
  return Math.max(
    0,
    base - defensePenaltyFromWounds(target) - exposed,
  );
};

export const getHitChance = (
  attacker: Combatant,
  target: Combatant,
  damageType: DamageTypeId = "physical",
): number => {
  const attackerForewarned =
    statusFor(attacker, "forewarned")?.potency ?? 0;
  const targetForewarned =
    statusFor(target, "forewarned")?.potency ?? 0;
  return Math.max(
    25,
    Math.min(
      95,
      70 +
        (accuracyRating(attacker, damageType) -
          evasionRating(target)) *
          5 +
        attackerForewarned -
        targetForewarned,
    ),
  );
};
