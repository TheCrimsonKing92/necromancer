export type PossessiveDeterminer = "his" | "her" | "their" | "its";

export interface CombatantIdentityProfile {
  possessiveDeterminer: PossessiveDeterminer;
  defeatProfile:
    | "living-humanoid"
    | "grave-hound"
    | "manifestation"
    | "bound-saint";
}

export const COMBATANT_IDENTITY_PROFILES = {
  "living-neutral": {
    possessiveDeterminer: "their",
    defeatProfile: "living-humanoid",
  },
  "living-male": {
    possessiveDeterminer: "his",
    defeatProfile: "living-humanoid",
  },
  "living-female": {
    possessiveDeterminer: "her",
    defeatProfile: "living-humanoid",
  },
  "grave-hound": {
    possessiveDeterminer: "its",
    defeatProfile: "grave-hound",
  },
  manifestation: {
    possessiveDeterminer: "its",
    defeatProfile: "manifestation",
  },
  "bound-saint": {
    possessiveDeterminer: "her",
    defeatProfile: "bound-saint",
  },
} as const satisfies Record<string, CombatantIdentityProfile>;

export type CombatantIdentityProfileId =
  keyof typeof COMBATANT_IDENTITY_PROFILES;

export const isCombatantIdentityProfileId = (
  value: unknown,
): value is CombatantIdentityProfileId =>
  typeof value === "string" &&
  Object.hasOwn(COMBATANT_IDENTITY_PROFILES, value);

