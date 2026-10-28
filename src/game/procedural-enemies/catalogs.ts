import type { CombatantArchetypeId } from "../combatants/archetypes";
import type { EnemyCadenceId } from "../enemy-actions/cadences";
import type {
  AnatomyId,
  MaterialityId,
  NaturalArmor,
} from "../types";

export interface ProceduralEnemyRoleDefinition {
  archetypeIds: readonly CombatantArchetypeId[];
  maxHp: number;
  attack: number;
  defense: number;
  ward: number;
}

export interface ProceduralEnemyLoadoutDefinition {
  roleIds: readonly ProceduralEnemyRoleId[];
  archetypeIds: readonly CombatantArchetypeId[];
  cadenceId: EnemyCadenceId;
  title: string;
  anatomy: AnatomyId;
  materiality: MaterialityId;
  naturalArmor?: Readonly<NaturalArmor>;
  naturalArmorLabel?: string;
  maxHpModifier?: number;
  attackModifier?: number;
  defenseModifier?: number;
  wardModifier?: number;
}

export interface ProceduralEnemyIdentityDefinition {
  name: string;
}

export const PROCEDURAL_ENEMY_ROLES = {
  "line-holder": {
    archetypeIds: ["county-reeve", "reliquary-poacher"],
    maxHp: 17,
    attack: 3,
    defense: 1,
    ward: 0,
  },
  enforcer: {
    archetypeIds: ["county-reeve", "reliquary-poacher"],
    maxHp: 20,
    attack: 4,
    defense: 2,
    ward: 0,
  },
  marksman: {
    archetypeIds: ["reliquary-poacher"],
    maxHp: 15,
    attack: 3,
    defense: 1,
    ward: 0,
  },
  "grave-hound": {
    archetypeIds: ["ash-hound"],
    maxHp: 14,
    attack: 3,
    defense: 0,
    ward: 0,
  },
  "occult-harrier": {
    archetypeIds: ["mourner"],
    maxHp: 12,
    attack: 3,
    defense: 0,
    ward: 1,
  },
} as const satisfies Record<string, ProceduralEnemyRoleDefinition>;

export type ProceduralEnemyRoleId = keyof typeof PROCEDURAL_ENEMY_ROLES;

export const proceduralEnemyRoleDefinition = (
  id: ProceduralEnemyRoleId,
): ProceduralEnemyRoleDefinition => PROCEDURAL_ENEMY_ROLES[id];

export const PROCEDURAL_ENEMY_ROLE_IDS: readonly ProceduralEnemyRoleId[] = [
  "line-holder",
  "enforcer",
  "marksman",
  "grave-hound",
  "occult-harrier",
];

export const PROCEDURAL_ENEMY_LOADOUTS = {
  "spear-and-shield": {
    roleIds: ["line-holder"],
    archetypeIds: ["county-reeve"],
    cadenceId: "reeve-spear-shield",
    title: "Toll-road levy",
    anatomy: "humanoid",
    materiality: "corporeal",
    naturalArmor: { torso: 1 },
    naturalArmorLabel: "Quilted road coat",
  },
  "baton-and-hook": {
    roleIds: ["enforcer"],
    archetypeIds: ["county-reeve"],
    cadenceId: "reeve-baton-hook",
    title: "County road sergeant",
    anatomy: "humanoid",
    materiality: "corporeal",
    naturalArmor: { head: 1, torso: 1 },
    naturalArmorLabel: "Kettle helm and road leathers",
  },
  billhook: {
    roleIds: ["enforcer", "line-holder"],
    archetypeIds: ["reliquary-poacher"],
    cadenceId: "poacher-billhook",
    title: "Reliquary poacher",
    anatomy: "humanoid",
    materiality: "corporeal",
    naturalArmor: { torso: 1, leftArm: 1, rightArm: 1 },
    naturalArmorLabel: "Boiled-leather jack",
  },
  crossbow: {
    roleIds: ["marksman"],
    archetypeIds: ["reliquary-poacher"],
    cadenceId: "poacher-crossbow",
    title: "Vault-side crossbow",
    anatomy: "humanoid",
    materiality: "corporeal",
  },
  "ash-teeth": {
    roleIds: ["grave-hound"],
    archetypeIds: ["ash-hound"],
    cadenceId: "grave-hound-rake",
    title: "Starved grave-hound",
    anatomy: "quadruped",
    materiality: "corporeal",
  },
  "mourning-nails": {
    roleIds: ["occult-harrier"],
    archetypeIds: ["mourner"],
    cadenceId: "mourner-grief",
    title: "Grief without an owner",
    anatomy: "manifestation",
    materiality: "incorporeal",
  },
} as const satisfies Record<string, ProceduralEnemyLoadoutDefinition>;

export type ProceduralEnemyLoadoutId =
  keyof typeof PROCEDURAL_ENEMY_LOADOUTS;

export const proceduralEnemyLoadoutDefinition = (
  id: ProceduralEnemyLoadoutId,
): ProceduralEnemyLoadoutDefinition => PROCEDURAL_ENEMY_LOADOUTS[id];

export const PROCEDURAL_ENEMY_LOADOUT_IDS: readonly ProceduralEnemyLoadoutId[] = [
  "spear-and-shield",
  "baton-and-hook",
  "billhook",
  "crossbow",
  "ash-teeth",
  "mourning-nails",
];

export const PROCEDURAL_ENEMY_IDENTITIES = {
  "county-reeve": [
    { name: "Tess Fen" },
    { name: "Elian Rusk" },
    { name: "Mara Venn" },
    { name: "Colm Brade" },
  ],
  "reliquary-poacher": [
    { name: "Nim Bale" },
    { name: "Sera Dault" },
    { name: "Orin Mett" },
    { name: "Hale Vargo" },
  ],
  "ash-hound": [
    { name: "Ash hound" },
    { name: "Cinder hound" },
    { name: "Barrow hound" },
  ],
  mourner: [
    { name: "Left-behind Mourner" },
    { name: "Household Mourner" },
    { name: "Unclaimed Mourner" },
  ],
} as const satisfies Partial<
  Record<CombatantArchetypeId, readonly ProceduralEnemyIdentityDefinition[]>
>;

export const proceduralEnemyIdentitiesFor = (
  archetypeId: CombatantArchetypeId,
): readonly ProceduralEnemyIdentityDefinition[] | undefined =>
  (
    PROCEDURAL_ENEMY_IDENTITIES as Partial<
      Record<
        CombatantArchetypeId,
        readonly ProceduralEnemyIdentityDefinition[]
      >
    >
  )[archetypeId];
