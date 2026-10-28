import {
  BODY_PARTS,
  createBody,
  getWoundCare,
  getWoundLabel,
} from "../anatomy";
import type {
  Combatant,
  CombatantKind,
  StatusEffect,
} from "../types";
import {
  combatantArchetypeDefinition,
  isCombatantArchetypeId,
} from "../combatants/archetypes";
import {
  combatantFormDefinition,
  isCombatantFormId,
} from "../combatants/forms";
import { isCombatantIdentityProfileId } from "../combatants/identity-profiles";
import { legacyArchetypeIdFor } from "../combatants/legacy-identity";
import {
  ENEMY_CADENCES,
  legacyCadenceIdFor,
  type EnemyCadenceId,
} from "../enemy-actions/cadences";
import {
  isRecord,
  isStatus,
  numberOr,
  stringOr,
} from "./validation";

const migrateStatuses = (value: unknown): StatusEffect[] =>
  Array.isArray(value)
    ? value.filter(isStatus).map((status) => ({ ...status }))
    : [];

const cadenceIdFrom = (
  value: unknown,
  id: string,
): EnemyCadenceId | undefined =>
  typeof value === "string" && Object.hasOwn(ENEMY_CADENCES, value)
    ? (value as EnemyCadenceId)
    : legacyCadenceIdFor(id);

const identityFor = (
  value: Record<string, unknown>,
  id: string,
  kind: CombatantKind,
) => {
  const archetypeId = isCombatantArchetypeId(value.archetypeId)
    ? value.archetypeId
    : legacyArchetypeIdFor(id, kind);
  const archetype = combatantArchetypeDefinition(archetypeId);
  const formId = isCombatantFormId(value.formId)
    ? value.formId
    : archetype.formId;
  const form = combatantFormDefinition(formId);
  const identityProfileId = isCombatantIdentityProfileId(
    value.identityProfileId,
  )
    ? value.identityProfileId
    : archetype.identityProfileId;
  return { archetypeId, archetype, formId, form, identityProfileId };
};

export const migrateCombatant = (
  value: unknown,
  fallbackKind: CombatantKind,
): Combatant | null => {
  if (!isRecord(value)) return null;

  const id = stringOr(value.id, `${fallbackKind}-unknown`);
  const maxHp = Math.max(1, numberOr(value.maxHp, 1));
  const identity = identityFor(value, id, fallbackKind);

  return {
    id,
    name: stringOr(value.name, "Nameless"),
    kind: fallbackKind,
    title: stringOr(value.title, ""),
    formId: identity.formId,
    archetypeId: identity.archetypeId,
    identityProfileId: identity.identityProfileId,
    cadenceId: cadenceIdFrom(value.cadenceId, id),
    anatomy: identity.form.anatomy,
    materiality: identity.form.materiality,
    materialityLabel: identity.archetype.materialityLabel,
    hp: Math.max(0, Math.min(maxHp, numberOr(value.hp, maxHp))),
    maxHp,
    attack: numberOr(value.attack, 0),
    defense: numberOr(value.defense, 0),
    ward: Math.max(0, numberOr(value.ward, 0)),
    statuses: migrateStatuses(value.statuses),
    body: createBody(
      identity.archetype.bodyScale ?? identity.form.bodyScale,
    ),
    naturalArmor: { ...(identity.archetype.naturalArmor ?? {}) },
    naturalArmorLabel: identity.archetype.naturalArmorLabel,
    vitalParts: identity.form.vitalParts
      ? [...identity.form.vitalParts]
      : undefined,
    bodyDamageModifiers: identity.form.bodyDamageModifiers
      ? { ...identity.form.bodyDamageModifiers }
      : undefined,
  };
};

export const normalizeCurrentCombatant = (
  combatant: Combatant,
): void => {
  const identity = identityFor(
    combatant as unknown as Record<string, unknown>,
    combatant.id,
    combatant.kind,
  );
  combatant.formId = identity.formId;
  combatant.archetypeId = identity.archetypeId;
  combatant.identityProfileId = identity.identityProfileId;
  combatant.cadenceId = cadenceIdFrom(combatant.cadenceId, combatant.id);
  combatant.anatomy = identity.form.anatomy;
  combatant.materiality = identity.form.materiality;
  if (
    combatant.materiality === "incorporeal" &&
    combatant.materialityLabel === undefined
  ) {
    combatant.materialityLabel = identity.archetype.materialityLabel;
  }

  const expectedVitalParts = identity.form.vitalParts;
  const expectedBodyDamage = identity.form.bodyDamageModifiers;
  if (combatant.kind === "player") {
    delete combatant.vitalParts;
    delete combatant.bodyDamageModifiers;
  } else {
    if (expectedVitalParts !== undefined) {
      combatant.vitalParts = [...expectedVitalParts];
    }
    if (expectedBodyDamage !== undefined) {
      combatant.bodyDamageModifiers = { ...expectedBodyDamage };
    }
  }

  if (!identity.form.permitsNaturalArmor) {
    combatant.naturalArmor = {};
    delete combatant.naturalArmorLabel;
  } else if (
    combatant.naturalArmorLabel === undefined &&
    Object.keys(combatant.naturalArmor).length > 0
  ) {
    combatant.naturalArmorLabel = identity.archetype.naturalArmorLabel;
  }

  for (const definition of BODY_PARTS) {
    for (const wound of combatant.body[definition.id].wounds) {
      if (wound.care !== "binding" && wound.care !== "rest") {
        wound.care = getWoundCare(
          wound.part,
          wound.severity,
          combatant.anatomy,
        );
      }
      const incompatibleQuadrupedLabel =
        combatant.anatomy === "quadruped" &&
        /\b(?:arm|hand)\b/i.test(wound.label);
      const incompatibleManifestationLabel =
        combatant.anatomy === "manifestation" &&
        /\b(?:arm|leg|hand|paw|rib|skull|chest|torso)\b/i.test(
          wound.label,
        );
      if (
        incompatibleQuadrupedLabel ||
        incompatibleManifestationLabel
      ) {
        wound.label = getWoundLabel(
          wound.part,
          wound.severity,
          combatant.anatomy,
        );
      }
      if (wound.care === "rest") {
        wound.bleed = 0;
      }
    }
  }
};
