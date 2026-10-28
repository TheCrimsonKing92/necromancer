export type CheckProspect =
  | "Poor"
  | "Unfavorable"
  | "Uncertain"
  | "Favorable"
  | "Strong";

/** Player-facing band for a known check. Exact probability remains a rule detail. */
export const checkProspectForChance = (chance: number): CheckProspect => {
  if (chance < 30) return "Poor";
  if (chance < 45) return "Unfavorable";
  if (chance < 65) return "Uncertain";
  if (chance < 80) return "Favorable";
  return "Strong";
};
