import type {
  Combatant,
  Wound,
  WoundSeverity,
} from "../types";
import { BODY_PARTS } from "./definitions";

const SEVERITY_RANK: Record<WoundSeverity, number> = {
  minor: 1,
  serious: 2,
  grievous: 3,
};

export const allWounds = (combatant: Combatant): Wound[] =>
  BODY_PARTS.flatMap((part) => combatant.body[part.id].wounds);

const severityPenalty = (wound: Wound): number =>
  wound.severity === "grievous"
    ? 2
    : wound.severity === "serious"
      ? 1
      : 0;

export interface WoundEffects {
  attackPenalty: number;
  defensePenalty: number;
  fleePenalty: number;
  bleedPerRound: number;
  recoverySteps: number;
}

export const recoveryStepsForWound = (wound: Wound): number =>
  SEVERITY_RANK[wound.severity] +
  (wound.treated ? 0 : 1) +
  (wound.recoveryBurden ?? 0);

export const woundEffects = (wound: Wound): WoundEffects => {
  const reduction = Math.max(0, wound.combatPenaltyReduction ?? 0);
  const penalty = Math.max(0, severityPenalty(wound) - reduction);
  const armOrHead =
    wound.part === "leftArm" ||
    wound.part === "rightArm" ||
    wound.part === "head";
  const legOrTorso =
    wound.part === "leftLeg" ||
    wound.part === "rightLeg" ||
    wound.part === "torso";
  const leg =
    wound.part === "leftLeg" || wound.part === "rightLeg";

  return {
    attackPenalty: armOrHead ? penalty : 0,
    defensePenalty: legOrTorso ? penalty : 0,
    fleePenalty: leg
      ? Math.max(0, SEVERITY_RANK[wound.severity] - reduction) * 5
      : 0,
    bleedPerRound: wound.treated ? 0 : wound.bleed,
    recoverySteps: recoveryStepsForWound(wound),
  };
};

export const combinedWoundEffects = (
  combatant: Combatant,
): WoundEffects =>
  allWounds(combatant).reduce<WoundEffects>(
    (total, wound) => {
      const effects = woundEffects(wound);
      total.attackPenalty += effects.attackPenalty;
      total.defensePenalty += effects.defensePenalty;
      total.fleePenalty += effects.fleePenalty;
      total.bleedPerRound += effects.bleedPerRound;
      total.recoverySteps = Math.max(
        total.recoverySteps,
        effects.recoverySteps,
      );
      return total;
    },
    {
      attackPenalty: 0,
      defensePenalty: 0,
      fleePenalty: 0,
      bleedPerRound: 0,
      recoverySteps: 0,
    },
  );

export const untreatedBleeding = (combatant: Combatant): number =>
  combinedWoundEffects(combatant).bleedPerRound;

export const attackPenaltyFromWounds = (combatant: Combatant): number =>
  combinedWoundEffects(combatant).attackPenalty;

export const defensePenaltyFromWounds = (combatant: Combatant): number =>
  combinedWoundEffects(combatant).defensePenalty;

export const fleePenaltyFromWounds = (combatant: Combatant): number =>
  combinedWoundEffects(combatant).fleePenalty;

export const isVitalPartDestroyed = (combatant: Combatant): boolean =>
  (combatant.vitalParts ?? ["head", "torso"]).some(
    (part) => combatant.body[part].condition <= 0,
  );

export const isCombatantStanding = (combatant: Combatant): boolean =>
  combatant.hp > 0 && !isVitalPartDestroyed(combatant);

export const bodyConditionPercentage = (combatant: Combatant): number => {
  const totals = BODY_PARTS.reduce(
    (result, definition) => {
      const part = combatant.body[definition.id];
      result.condition += part.condition;
      result.maximum += part.maxCondition;
      return result;
    },
    { condition: 0, maximum: 0 },
  );

  return totals.maximum > 0
    ? Math.round((totals.condition / totals.maximum) * 100)
    : 0;
};
