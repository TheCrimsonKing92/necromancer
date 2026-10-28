import type { NaturalArmor } from "../types";
import {
  COMBATANT_FORMS,
  type CombatantFormDefinition,
  type CombatantFormId,
} from "./forms";
import {
  COMBATANT_IDENTITY_PROFILES,
  type CombatantIdentityProfileId,
} from "./identity-profiles";

export interface CombatantArchetypeDefinition {
  formId: CombatantFormId;
  identityProfileId: CombatantIdentityProfileId;
  bodyScale?: number;
  naturalArmor?: Readonly<NaturalArmor>;
  naturalArmorLabel?: string;
  materialityLabel?: string;
}

export const COMBATANT_ARCHETYPES = {
  "living-necromancer": {
    formId: "living-humanoid",
    identityProfileId: "living-neutral",
  },
  "road-reeve": {
    formId: "living-humanoid",
    identityProfileId: "living-male",
    bodyScale: 0.9,
    naturalArmor: { torso: 1 },
    naturalArmorLabel: "Road leathers",
  },
  "ash-hound": {
    formId: "living-quadruped",
    identityProfileId: "grave-hound",
    naturalArmor: {
      torso: 1,
      leftArm: 1,
      rightArm: 1,
      leftLeg: 1,
      rightLeg: 1,
    },
    naturalArmorLabel: "Ash-hide",
  },
  "ossuary-saint": {
    formId: "distributed-revenant",
    identityProfileId: "bound-saint",
    bodyScale: 1.12,
    naturalArmor: { head: 2, torso: 2 },
    naturalArmorLabel: "Saint Orra’s grave-iron shell",
  },
  "bell-widow": {
    formId: "manifestation",
    identityProfileId: "manifestation",
    materialityLabel: "The widow’s rain-woven outline",
  },
  redactor: {
    formId: "manifestation",
    identityProfileId: "manifestation",
    bodyScale: 0.9,
    materialityLabel: "The Redactor’s written body",
  },
  cantor: {
    formId: "manifestation",
    identityProfileId: "manifestation",
    bodyScale: 0.88,
    materialityLabel: "The cantor’s hymn-shaped form",
  },
  pallbearer: {
    formId: "bound-revenant",
    identityProfileId: "living-neutral",
    bodyScale: 0.9,
    naturalArmor: { torso: 2 },
    naturalArmorLabel: "Bier-frame and burial bone",
  },
  mourner: {
    formId: "manifestation",
    identityProfileId: "manifestation",
    bodyScale: 0.74,
    materialityLabel: "The mourner’s ownerless grief",
  },
  "reliquary-poacher": {
    formId: "living-humanoid",
    identityProfileId: "living-neutral",
  },
  "county-reeve": {
    formId: "living-humanoid",
    identityProfileId: "living-neutral",
  },
  "hound-shade": {
    formId: "quadruped-shade",
    identityProfileId: "grave-hound",
    materialityLabel: "The shade’s smoke-thin form",
  },
  "bound-shade": {
    formId: "manifestation",
    identityProfileId: "manifestation",
    bodyScale: 0.35,
    materialityLabel: "The shade’s borrowed outline",
  },
  "bound-servant": {
    formId: "bound-revenant",
    identityProfileId: "living-neutral",
    bodyScale: 0.9,
  },
} as const satisfies Record<string, CombatantArchetypeDefinition>;

export type CombatantArchetypeId = keyof typeof COMBATANT_ARCHETYPES;

export const combatantArchetypeDefinition = (
  id: CombatantArchetypeId,
): CombatantArchetypeDefinition => COMBATANT_ARCHETYPES[id];

export const isCombatantArchetypeId = (
  value: unknown,
): value is CombatantArchetypeId =>
  typeof value === "string" && Object.hasOwn(COMBATANT_ARCHETYPES, value);

export interface CombatantCatalogValidationInput {
  forms: Readonly<Record<string, CombatantFormDefinition>>;
  identityProfiles: Readonly<Record<string, unknown>>;
  archetypes: Readonly<
    Record<
      string,
      Omit<CombatantArchetypeDefinition, "formId" | "identityProfileId"> & {
        formId: string;
        identityProfileId: string;
      }
    >
  >;
}

export const validateCombatantCatalogs = (
  catalogs: CombatantCatalogValidationInput = {
    forms: COMBATANT_FORMS,
    identityProfiles: COMBATANT_IDENTITY_PROFILES,
    archetypes: COMBATANT_ARCHETYPES,
  },
): string[] => {
  const errors: string[] = [];
  for (const [id, archetype] of Object.entries(catalogs.archetypes)) {
    if (!Object.hasOwn(catalogs.forms, archetype.formId)) {
      errors.push(`${id} references missing form ${archetype.formId}`);
      continue;
    }
    const form = catalogs.forms[archetype.formId]!;
    if (!Object.hasOwn(catalogs.identityProfiles, archetype.identityProfileId)) {
      errors.push(
        `${id} references missing identity profile ${archetype.identityProfileId}`,
      );
    }
    if (
      form &&
      !form.permitsNaturalArmor &&
      Object.keys(archetype.naturalArmor ?? {}).length > 0
    ) {
      errors.push(`${id} gives natural armor to ${archetype.formId}`);
    }
    if (
      archetype.bodyScale !== undefined &&
      (!Number.isFinite(archetype.bodyScale) || archetype.bodyScale <= 0)
    ) {
      errors.push(`${id} has invalid body scale`);
    }
  }
  return errors;
};
