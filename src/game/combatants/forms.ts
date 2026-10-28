import type {
  AnatomyId,
  BodyPartId,
  DamageTypeId,
  MaterialityId,
} from "../types";

export interface CombatantFormDefinition {
  anatomy: AnatomyId;
  materiality: MaterialityId;
  bodyScale: number;
  vitalParts?: readonly BodyPartId[];
  bodyDamageModifiers?: Readonly<Partial<Record<DamageTypeId, number>>>;
  permitsNaturalArmor: boolean;
}

export const COMBATANT_FORMS = {
  "living-humanoid": {
    anatomy: "humanoid",
    materiality: "corporeal",
    bodyScale: 1,
    permitsNaturalArmor: true,
  },
  "living-quadruped": {
    anatomy: "quadruped",
    materiality: "corporeal",
    bodyScale: 0.72,
    permitsNaturalArmor: true,
  },
  "bound-revenant": {
    anatomy: "humanoid",
    materiality: "corporeal",
    bodyScale: 1,
    permitsNaturalArmor: true,
  },
  "distributed-revenant": {
    anatomy: "humanoid",
    materiality: "corporeal",
    bodyScale: 1,
    vitalParts: [],
    bodyDamageModifiers: { physical: 0.5, occult: 1.25 },
    permitsNaturalArmor: true,
  },
  manifestation: {
    anatomy: "manifestation",
    materiality: "incorporeal",
    bodyScale: 1,
    vitalParts: [],
    bodyDamageModifiers: { physical: 0.5, occult: 1.25 },
    permitsNaturalArmor: false,
  },
  "quadruped-shade": {
    anatomy: "quadruped",
    materiality: "incorporeal",
    bodyScale: 0.4,
    vitalParts: [],
    bodyDamageModifiers: { physical: 0.5, occult: 1.25 },
    permitsNaturalArmor: false,
  },
} as const satisfies Record<string, CombatantFormDefinition>;

export type CombatantFormId = keyof typeof COMBATANT_FORMS;

export const combatantFormDefinition = (
  id: CombatantFormId,
): CombatantFormDefinition => COMBATANT_FORMS[id];

export const isCombatantFormId = (value: unknown): value is CombatantFormId =>
  typeof value === "string" && Object.hasOwn(COMBATANT_FORMS, value);
