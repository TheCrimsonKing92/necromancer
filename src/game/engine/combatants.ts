import { TRADITIONS } from "../content";
import { WAKE_VARIANTS } from "../encounters";
import { advancementModifier } from "../advancements";
import { createBody } from "../anatomy";
import {
  defenseFromAttributes,
  maximumHealthFromAttributes,
  physicalPowerFromAttributes,
} from "../character";
import { createStartingKit } from "../items";
import { combatantArchetypeDefinition } from "../combatants/archetypes";
import { combatantFormDefinition } from "../combatants/forms";
import { legacyArchetypeIdFor } from "../combatants/legacy-identity";
import { legacyCadenceIdFor } from "../enemy-actions/cadences";
import {
  composeProceduralEnemyRoster,
  type ProceduralEnemyRosterRequest,
} from "../procedural-enemies";
import type {
  Ally,
  CharacterSex,
  Combatant,
  Player,
  TraditionId,
  WakeVariantId,
} from "../types";

export const createCombatant = (
  properties: Omit<
    Combatant,
    | "anatomy"
    | "materiality"
    | "ward"
    | "statuses"
    | "body"
    | "naturalArmor"
  > &
    Partial<
      Pick<
        Combatant,
        | "anatomy"
        | "materiality"
        | "ward"
        | "statuses"
        | "body"
        | "naturalArmor"
      >
    >,
): Combatant => {
  const archetypeId =
    properties.archetypeId ??
    legacyArchetypeIdFor(properties.id, properties.kind);
  const archetype = combatantArchetypeDefinition(archetypeId);
  const formId = properties.formId ?? archetype.formId;
  const form = combatantFormDefinition(formId);
  const anatomy = properties.anatomy ?? form.anatomy;
  const materiality = properties.materiality ?? form.materiality;

  return {
    ...properties,
    formId,
    archetypeId,
    identityProfileId:
      properties.identityProfileId ?? archetype.identityProfileId,
    cadenceId:
      properties.cadenceId ?? legacyCadenceIdFor(properties.id),
    anatomy,
    materiality,
    materialityLabel:
      properties.materialityLabel ?? archetype.materialityLabel,
    ward: properties.ward ?? 0,
    statuses: properties.statuses ?? [],
    body:
      properties.body ??
      createBody(archetype.bodyScale ?? form.bodyScale),
    naturalArmor: {
      ...(archetype.naturalArmor ?? {}),
      ...(properties.naturalArmor ?? {}),
    },
    naturalArmorLabel:
      properties.naturalArmorLabel ?? archetype.naturalArmorLabel,
    vitalParts:
      properties.vitalParts ??
      (form.vitalParts ? [...form.vitalParts] : undefined),
    bodyDamageModifiers:
      properties.bodyDamageModifiers ??
      (form.bodyDamageModifiers
        ? { ...form.bodyDamageModifiers }
        : undefined),
  };
};

export const createPlayer = (
  name: string,
  tradition: TraditionId,
  sex: CharacterSex,
): Player => {
  const definition = TRADITIONS[tradition];
  const attributes = { ...definition.startingAttributes };
  const skills = { ...definition.startingSkills };
  const maxHp = maximumHealthFromAttributes(attributes);
  const attack = physicalPowerFromAttributes(attributes);
  const defense = defenseFromAttributes(attributes);
  const maxSpirit = definition.startingSpirit;
  // Grave Warden currently begins with the established field kit. Its
  // practice-specific equipment remains content work rather than a hidden
  // dependency of making the rules playable.
  const kit = createStartingKit(
    tradition === "grave-warden" ? "medium" : tradition,
  );

  return {
    id: "player",
    name,
    kind: "player",
    sex,
    title: definition.name,
    formId: "living-humanoid",
    archetypeId: "living-necromancer",
    identityProfileId: "living-neutral",
    anatomy: "humanoid",
    materiality: "corporeal",
    tradition,
    level: 1,
    xp: 0,
    obols: 0,
    advancements: [],
    advancementReadiness: {
      practice: [],
      universal: [],
    },
    scars: [],
    hp: maxHp,
    maxHp,
    attack,
    defense,
    ward: 0,
    attributes,
    skills,
    spirit: maxSpirit,
    maxSpirit,
    statuses: [],
    body: createBody(),
    naturalArmor: {},
    inventory: kit.inventory,
    equipment: kit.equipment,
  };
};

export const createRoadEnemies = (): Combatant[] => [
  createCombatant({
    id: "road-reeve",
    name: "Hollis Vane",
    kind: "enemy",
    title: "Road reeve",
    archetypeId: "road-reeve",
    cadenceId: "reeve-hooked-knife",
    hp: 19,
    maxHp: 19,
    attack: 4,
    defense: 2,
  }),
  createCombatant({
    id: "ash-hound",
    name: "Ash hound",
    kind: "enemy",
    title: "Starved grave-hound",
    archetypeId: "ash-hound",
    cadenceId: "grave-hound-rake",
    anatomy: "quadruped",
    hp: 14,
    maxHp: 14,
    attack: 3,
    defense: 0,
  }),
];

export const createVaultEnemies = (): Combatant[] => [
  createCombatant({
    id: "ossuary-saint",
    name: "Saint Orra",
    kind: "enemy",
    title: "Patron of outstanding debts",
    archetypeId: "ossuary-saint",
    cadenceId: "saint-ossuary-cycle",
    hp: 32,
    maxHp: 32,
    attack: 4,
    defense: 3,
  }),
];

export const createWakeEnemies = (
  variantId: WakeVariantId,
): Combatant[] =>
  WAKE_VARIANTS[variantId].enemies.map((definition) =>
    createCombatant({
      id: definition.id,
      name: definition.name,
      kind: "enemy",
      title: definition.title,
      archetypeId: definition.archetypeId,
      cadenceId: definition.cadenceId,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      attack: definition.attack,
      defense: definition.defense,
      ward: definition.ward ?? 0,
      anatomy: definition.anatomy,
      materiality: definition.materiality,
      materialityLabel: definition.materialityLabel,
      body: createBody(definition.bodyScale),
      naturalArmor: definition.naturalArmor ?? {},
      naturalArmorLabel: definition.naturalArmorLabel,
    }),
  );

export const createProceduralEnemies = (
  request: ProceduralEnemyRosterRequest,
): {
  seed: number;
  enemies: Combatant[];
  threatBudget: number;
  threatSpent: number;
} => {
  const roster = composeProceduralEnemyRoster(request);
  return {
    seed: roster.seed,
    threatBudget: roster.threatBudget,
    threatSpent: roster.threatSpent,
    enemies: roster.enemies.map((definition) =>
      createCombatant({
        id: definition.id,
        name: definition.name,
        kind: "enemy",
        title: definition.title,
        archetypeId: definition.archetypeId,
        cadenceId: definition.cadenceId,
        hp: definition.maxHp,
        maxHp: definition.maxHp,
        attack: definition.attack,
        defense: definition.defense,
        ward: definition.ward,
        naturalArmor: definition.naturalArmor,
        naturalArmorLabel: definition.naturalArmorLabel,
      }),
    ),
  };
};

export const createAshShade = (player: Player): Ally => ({
  id: "ash-shade",
  name: "Ash-hound shade",
  kind: "ally",
  title: "A loyalty taught after death",
  formId: "quadruped-shade",
  archetypeId: "hound-shade",
  identityProfileId: "grave-hound",
  anatomy: "quadruped",
  materiality: "incorporeal",
  materialityLabel: "The shade’s smoke-thin form",
  hp: 1,
  maxHp: 1,
  attack: 4 + advancementModifier(player, "shade-attack"),
  defense: 0,
  ward: 0,
  statuses: [],
  body: createBody(0.4),
  naturalArmor: {},
  lifetime: {
    kind: "temporary",
    remainingTurns:
      3 + advancementModifier(player, "shade-duration"),
  },
});
