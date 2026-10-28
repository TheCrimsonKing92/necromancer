import type {
  BodyPartId,
  Player,
  Scar,
  Wound,
  WoundSeverity,
} from "../types";
import { BODY_PARTS } from "./definitions";
import { canWoundScar } from "./wound-creation";

const SCAR_LABELS: Record<BodyPartId, string> = {
  head: "Pale seam at the temple",
  torso: "Roped scar across the ribs",
  leftArm: "White line along the left arm",
  rightArm: "White line along the right arm",
  leftLeg: "Knotted scar on the left leg",
  rightLeg: "Knotted scar on the right leg",
};

export interface ConvalescenceOptions {
  conditionPerInjuredPart?: number;
  scarConditionPenalty?: number;
}

export interface ConvalescenceResult {
  stabilized: string[];
  improved: string[];
  healed: string[];
  scars: Scar[];
  conditionRestored: number;
}

const improvedSeverity = (
  severity: WoundSeverity,
): WoundSeverity | null =>
  severity === "grievous"
    ? "serious"
    : severity === "serious"
      ? "minor"
      : null;

export const convalesceWounds = (
  player: Player,
  options: ConvalescenceOptions = {},
): ConvalescenceResult => {
  const conditionPerInjuredPart = Math.max(
    0,
    Math.floor(options.conditionPerInjuredPart ?? 3),
  );
  const scarConditionPenalty = Math.max(
    0,
    Math.floor(options.scarConditionPenalty ?? 1),
  );
  const result: ConvalescenceResult = {
    stabilized: [],
    improved: [],
    healed: [],
    scars: [],
    conditionRestored: 0,
  };

  for (const definition of BODY_PARTS) {
    const part = player.body[definition.id];
    if (
      part.wounds.length === 0 &&
      part.condition >= part.maxCondition
    ) {
      continue;
    }

    const remaining: Wound[] = [];
    for (const wound of part.wounds) {
      if (!wound.treated) {
        wound.treated = true;
        wound.bleed = 0;
        result.stabilized.push(wound.label);
        remaining.push(wound);
        continue;
      }

      const severity = improvedSeverity(wound.severity);
      if (severity) {
        wound.severity = severity;
        wound.bleed = 0;
        result.improved.push(wound.label);
        remaining.push(wound);
        continue;
      }

      if (!canWoundScar(wound)) {
        result.healed.push(wound.label);
        continue;
      }

      const scar: Scar = {
        id: `scar-${wound.id}`,
        part: wound.part,
        label: SCAR_LABELS[wound.part],
        source: wound.source,
        conditionPenalty: scarConditionPenalty,
      };
      if (!player.scars.some((existing) => existing.id === scar.id)) {
        player.scars.push(scar);
        result.scars.push(scar);
        part.maxCondition = Math.max(
          1,
          part.maxCondition - scar.conditionPenalty,
        );
        part.condition = Math.min(part.condition, part.maxCondition);
      }
    }
    part.wounds = remaining;

    const conditionBefore = part.condition;
    part.condition = Math.min(
      part.maxCondition,
      part.condition + conditionPerInjuredPart,
    );
    result.conditionRestored += part.condition - conditionBefore;
  }

  return result;
};

export const scarsForPart = (
  player: Player,
  partId: BodyPartId,
): Scar[] => player.scars.filter((scar) => scar.part === partId);
