import type {
  AnatomyId,
  BodyPartId,
  InjuryProfileId,
  Wound,
  WoundCareId,
  WoundSeverity,
} from "../types";
import { profiledWoundDefinition } from "./injury-profile";
import { anatomyWoundDefinition } from "./wound-catalog";

const woundDefinition = (
  part: BodyPartId,
  severity: WoundSeverity,
  anatomy: AnatomyId,
  profile?: InjuryProfileId,
) =>
  profile
    ? profiledWoundDefinition(part, severity, anatomy, profile)
    : anatomyWoundDefinition(anatomy, part, severity);

export const getWoundLabel = (
  partId: BodyPartId,
  severity: WoundSeverity,
  anatomy: AnatomyId = "humanoid",
  profile?: InjuryProfileId,
): string => woundDefinition(partId, severity, anatomy, profile).label;

export const getWoundCare = (
  partId: BodyPartId,
  severity: WoundSeverity,
  anatomy: AnatomyId = "humanoid",
  profile?: InjuryProfileId,
): WoundCareId => woundDefinition(partId, severity, anatomy, profile).care;

export const canBindWound = (wound: Wound): boolean =>
  wound.care === "binding";

export const canWoundScar = (wound: Wound): boolean =>
  wound.care === "binding";

export const woundSeverityForDamage = (
  damage: number,
  remainingCondition: number,
): WoundSeverity | null => {
  if (damage <= 0) return null;
  if (remainingCondition <= 0 || damage >= 8) return "grievous";
  if (damage >= 5) return "serious";
  if (damage >= 2) return "minor";
  return null;
};

export const createWound = (
  id: string,
  part: BodyPartId,
  severity: WoundSeverity,
  source: string,
  label: string | undefined = undefined,
  anatomy: AnatomyId = "humanoid",
  care: WoundCareId | undefined = undefined,
  profile?: InjuryProfileId,
): Wound => {
  const definition = woundDefinition(part, severity, anatomy, profile);
  return {
    id,
    part,
    severity,
    label: label ?? definition.label,
    bleed: definition.bleed,
    care: care ?? definition.care,
    treated: false,
    source,
  };
};
