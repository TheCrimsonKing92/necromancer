import {
  createWound,
  getBodyPartLabel,
  isCombatantStanding,
  isVitalPartDestroyed,
  pickBodyPart,
  woundSeverityForDamage,
} from "./anatomy";
import {
  effectiveAttack,
  effectiveDefense,
  effectiveOccultPower,
  getHitChance,
} from "./combat-math";
import { ACTIONS } from "./content";
import { equippedArmorForPart } from "./items";
import { rollInteger } from "./random";
import type {
  ActionId,
  BattleState,
  BodyPartId,
  Combatant,
  DamageTypeId,
  InjuryProfileId,
  Player,
} from "./types";

export interface AppliedDamageResult {
  damage: number;
  wardAbsorbed: number;
  armorAbsorbed: number;
  resistanceAbsorbed: number;
  location: BodyPartId;
  locationLabel: string;
  protectionLabel?: string;
  resistanceLabel?: string;
  woundLabel?: string;
}

interface HitDamageResult extends AppliedDamageResult {
  hit: true;
  chance: number;
  roll: number;
  defeated: boolean;
  defeatCause?: "health" | "vital-region";
}

interface MissDamageResult {
  hit: false;
  damage: 0;
  chance: number;
  roll: number;
  defeated: false;
}

export type DamageResult = HitDamageResult | MissDamageResult;

export interface AttackCheck {
  chance: number;
  roll: number;
  hit: boolean;
}

export interface AppliedDamage {
  result: AppliedDamageResult;
  woundCreated: boolean;
}

export const applyIncomingDamage = (
  target: Combatant,
  incoming: number,
  damageType: DamageTypeId,
  location: BodyPartId,
  source: string,
  traumaBonus: number,
  woundId: string,
  injuryProfile: InjuryProfileId =
    damageType === "occult" ? "spectral" : "impact",
): AppliedDamage => {
  const wardAbsorbed = Math.min(target.ward, incoming);
  const afterWard = incoming - wardAbsorbed;
  const resistanceAbsorbed =
    damageType === "physical" &&
    target.materiality === "incorporeal" &&
    afterWard > 0
      ? Math.ceil(afterWard / 2)
      : 0;
  const afterResistance = afterWard - resistanceAbsorbed;
  const naturalArmor =
    damageType === "physical"
      ? (target.naturalArmor[location] ?? 0)
      : 0;
  const equippedArmor =
    damageType === "physical" && target.kind === "player"
      ? equippedArmorForPart(target as Player, location)
      : 0;
  const armor = naturalArmor + equippedArmor;
  const armorAbsorbed =
    afterResistance > 0
      ? Math.min(armor, Math.max(0, afterResistance - 1))
      : 0;
  const damage = afterResistance - armorAbsorbed;
  const protectionLabel =
    armorAbsorbed <= 0
      ? undefined
      : naturalArmor > 0 && equippedArmor > 0
        ? `${target.naturalArmorLabel ?? "Natural protection"} and worn armor`
        : naturalArmor > 0
          ? (target.naturalArmorLabel ?? "Natural protection")
          : "Armor";

  target.ward -= wardAbsorbed;
  target.hp = Math.max(0, target.hp - damage);
  const bodyPart = target.body[location];
  const bodyDamageModifier = Math.max(
    0,
    target.bodyDamageModifiers?.[damageType] ?? 1,
  );
  const conditionDamage =
    damage <= 0 || bodyDamageModifier === 0
      ? 0
      : Math.max(1, Math.round(damage * bodyDamageModifier));
  bodyPart.condition = Math.max(
    0,
    bodyPart.condition - conditionDamage,
  );

  const trauma =
    conditionDamage > 0 ? conditionDamage + traumaBonus : 0;
  const severity = woundSeverityForDamage(trauma, bodyPart.condition);
  let woundLabel: string | undefined;
  if (
    severity &&
    !bodyPart.wounds.some((wound) => wound.severity === severity)
  ) {
    const wound = createWound(
      woundId,
      location,
      severity,
      source,
      undefined,
      target.anatomy,
      undefined,
      injuryProfile,
    );
    bodyPart.wounds.push(wound);
    woundLabel = wound.label;
  }

  if (isVitalPartDestroyed(target)) {
    target.hp = 0;
  }

  return {
    woundCreated: woundLabel !== undefined,
    result: {
      damage,
      wardAbsorbed,
      armorAbsorbed,
      resistanceAbsorbed,
      location,
      locationLabel: getBodyPartLabel(location, target.anatomy),
      protectionLabel,
      resistanceLabel:
        resistanceAbsorbed > 0
          ? (target.materialityLabel ?? "Incorporeal form")
          : undefined,
      woundLabel,
    },
  };
};

export const dealDamage = (
  battle: BattleState,
  attacker: Combatant,
  target: Combatant,
  baseDamage: number,
  damageType: DamageTypeId = "physical",
  source = "impact",
  traumaBonus = 0,
  injuryProfile: InjuryProfileId =
    damageType === "occult" ? "spectral" : "impact",
  committedCheck?: AttackCheck,
): DamageResult => {
  const check = committedCheck ?? rollAttackCheck(battle, attacker, target, damageType);
  if (!check.hit) {
    return {
      hit: false,
      damage: 0,
      chance: check.chance,
      roll: check.roll,
      defeated: false,
    };
  }

  const wasStanding = isCombatantStanding(target);
  const healthBefore = target.hp;
  const hitLocation = rollInteger(battle.seed, 1, 100);
  battle.seed = hitLocation.seed;
  const location = pickBodyPart(hitLocation.value, target.anatomy);
  const variance = rollInteger(battle.seed, -1, 1);
  battle.seed = variance.seed;
  const defense =
    damageType === "occult"
      ? Math.floor(effectiveDefense(target) / 2)
      : effectiveDefense(target);
  const incoming = Math.max(
    1,
    baseDamage +
      (damageType === "occult"
        ? effectiveOccultPower(attacker)
        : effectiveAttack(attacker)) +
      variance.value -
      defense,
  );
  const applied = applyIncomingDamage(
    target,
    incoming,
    damageType,
    location,
    source,
    traumaBonus,
    `w${battle.nextWoundId}`,
    injuryProfile,
  );
  if (applied.woundCreated) {
    battle.nextWoundId += 1;
  }
  const defeated = wasStanding && !isCombatantStanding(target);
  const defeatCause =
    defeated &&
    isVitalPartDestroyed(target) &&
    healthBefore - applied.result.damage > 0
      ? "vital-region"
      : defeated
        ? "health"
        : undefined;
  return {
    hit: true,
    chance: check.chance,
    roll: check.roll,
    defeated,
    defeatCause,
    ...applied.result,
  };
};

export const dealActionDamage = (
  battle: BattleState,
  attacker: Combatant,
  target: Combatant,
  actionId: ActionId,
  source: string,
  baseDamageBonus = 0,
  committedCheck?: AttackCheck,
): DamageResult => {
  const attack = ACTIONS[actionId].attack;
  if (!attack) {
    throw new Error(`${actionId} has no attack profile.`);
  }

  return dealDamage(
    battle,
    attacker,
    target,
    attack.baseDamage + baseDamageBonus,
    attack.damageType,
    source,
    attack.traumaBonus,
    attack.injuryProfile,
    committedCheck,
  );
};

export const rollAttackCheck = (
  battle: BattleState,
  attacker: Combatant,
  target: Combatant,
  damageType: DamageTypeId,
): AttackCheck => {
  const chance = getHitChance(attacker, target, damageType);
  const result = rollInteger(battle.seed, 1, 100);
  battle.seed = result.seed;
  return {
    chance,
    roll: result.value,
    hit: result.value <= chance,
  };
};
