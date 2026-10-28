import type { CombatantKind } from "../types";
import type { CombatantArchetypeId } from "./archetypes";

const LEGACY_ARCHETYPE_IDS: Readonly<Record<string, CombatantArchetypeId>> = {
  player: "living-necromancer",
  "road-reeve": "road-reeve",
  "ash-hound": "ash-hound",
  "ossuary-saint": "ossuary-saint",
  "wake-bell-widow": "bell-widow",
  "wake-redactor": "redactor",
  "wake-cantor": "cantor",
  "wake-pallbearer": "pallbearer",
  "wake-mourner-left": "mourner",
  "wake-mourner-right": "mourner",
  "wake-poacher-captain": "reliquary-poacher",
  "wake-poacher-bow": "reliquary-poacher",
  "wake-reeve-sergeant": "county-reeve",
  "wake-reeve-levy": "county-reeve",
  "ash-shade": "hound-shade",
  "bound-shade": "bound-shade",
};

export const legacyArchetypeIdFor = (
  id: string,
  kind: CombatantKind,
): CombatantArchetypeId =>
  LEGACY_ARCHETYPE_IDS[id] ??
  (kind === "player"
    ? "living-necromancer"
    : kind === "ally"
      ? "bound-servant"
      : "reliquary-poacher");

