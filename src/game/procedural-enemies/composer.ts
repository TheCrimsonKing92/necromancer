import {
  COMBATANT_ARCHETYPES,
  combatantArchetypeDefinition,
} from "../combatants/archetypes";
import {
  combatantFormDefinition,
} from "../combatants/forms";
import { ENEMY_CADENCES } from "../enemy-actions/cadences";
import { normalizeSeed, rollInteger } from "../random";
import type { CombatantArchetypeId } from "../combatants/archetypes";
import type { EnemyCadenceId } from "../enemy-actions/cadences";
import type { MaterialityId, NaturalArmor } from "../types";
import {
  PROCEDURAL_ENEMY_LOADOUT_IDS,
  PROCEDURAL_ENEMY_ROLE_IDS,
  proceduralEnemyIdentitiesFor,
  proceduralEnemyLoadoutDefinition,
  proceduralEnemyRoleDefinition,
  type ProceduralEnemyLoadoutId,
  type ProceduralEnemyRoleId,
} from "./catalogs";
import {
  proceduralPopulationPlanIsOperational,
  resolveProceduralPopulationCandidate,
  validateProceduralPopulationRequest,
  type ProceduralPopulationPlan,
  type ProceduralPopulationRequest,
} from "./population";

export interface ProceduralEnemyRosterRequest {
  seed: number;
  encounterKey: string;
  threatBudget: number;
  minimumSize?: number;
  maximumSize?: number;
  allowedArchetypeIds?: readonly CombatantArchetypeId[];
  allowedRoleIds?: readonly ProceduralEnemyRoleId[];
  population?: ProceduralPopulationRequest;
}

export interface GeneratedEnemySpec {
  id: string;
  name: string;
  title: string;
  archetypeId: CombatantArchetypeId;
  cadenceId: EnemyCadenceId;
  roleId: ProceduralEnemyRoleId;
  loadoutId: ProceduralEnemyLoadoutId;
  maxHp: number;
  attack: number;
  defense: number;
  ward: number;
  naturalArmor: NaturalArmor;
  naturalArmorLabel?: string;
  threatCost: number;
  populationPlan?: ProceduralPopulationPlan;
}

export interface ProceduralEnemyRoster {
  seed: number;
  enemies: GeneratedEnemySpec[];
  threatBudget: number;
  threatSpent: number;
}

interface Candidate {
  roleId: ProceduralEnemyRoleId;
  loadoutId: ProceduralEnemyLoadoutId;
  archetypeId: CombatantArchetypeId;
  cadenceId: EnemyCadenceId;
  title: string;
  maxHp: number;
  attack: number;
  defense: number;
  ward: number;
  naturalArmor: NaturalArmor;
  naturalArmorLabel?: string;
  threatCost: number;
  populationPlan?: ProceduralPopulationPlan;
}

export const enemyThreatCost = (stats: {
  maxHp: number;
  attack: number;
  defense: number;
  ward: number;
  naturalArmor?: Readonly<NaturalArmor>;
  materiality?: MaterialityId;
}): number =>
  Math.max(
    1,
    Math.ceil(stats.maxHp / 10) +
      stats.attack +
      stats.defense +
      Math.ceil(stats.ward / 3) +
      Math.ceil(
        Object.values(stats.naturalArmor ?? {}).reduce(
          (sum, value) => sum + (value ?? 0),
          0,
        ) / 3,
      ) +
      (stats.materiality === "incorporeal" ? 1 : 0),
  );

const candidatesFor = (
  request: ProceduralEnemyRosterRequest,
): Candidate[] => {
  const allowedArchetypes = request.allowedArchetypeIds
    ? new Set(request.allowedArchetypeIds)
    : null;
  const allowedRoles = request.allowedRoleIds
    ? new Set(request.allowedRoleIds)
    : null;
  const candidates: Candidate[] = [];

  for (const roleId of PROCEDURAL_ENEMY_ROLE_IDS) {
    if (allowedRoles && !allowedRoles.has(roleId)) continue;
    const role = proceduralEnemyRoleDefinition(roleId);
    for (const loadoutId of PROCEDURAL_ENEMY_LOADOUT_IDS) {
      const loadout = proceduralEnemyLoadoutDefinition(loadoutId);
      if (!loadout.roleIds.includes(roleId)) continue;
      for (const archetypeId of role.archetypeIds) {
        if (allowedArchetypes && !allowedArchetypes.has(archetypeId)) {
          continue;
        }
        if (!loadout.archetypeIds.includes(archetypeId)) continue;
        const archetype = combatantArchetypeDefinition(archetypeId);
        const form = combatantFormDefinition(archetype.formId);
        if (
          form.anatomy !== loadout.anatomy ||
          form.materiality !== loadout.materiality
        ) {
          continue;
        }
        const stats = {
          maxHp: role.maxHp + (loadout.maxHpModifier ?? 0),
          attack: role.attack + (loadout.attackModifier ?? 0),
          defense: role.defense + (loadout.defenseModifier ?? 0),
          ward: role.ward + (loadout.wardModifier ?? 0),
        };
        const naturalArmor = {
          ...(archetype.naturalArmor ?? {}),
          ...(loadout.naturalArmor ?? {}),
        };
        const candidate = {
          roleId,
          loadoutId,
          archetypeId,
          cadenceId: loadout.cadenceId,
          title: loadout.title,
          ...stats,
          naturalArmor,
          naturalArmorLabel:
            loadout.naturalArmorLabel ?? archetype.naturalArmorLabel,
          threatCost: enemyThreatCost({
            ...stats,
            naturalArmor,
            materiality: form.materiality,
          }),
        } satisfies Candidate;
        const populationPlan = request.population
          ? resolveProceduralPopulationCandidate(
              candidate,
              request.population,
              (plan) =>
                proceduralPopulationPlanIsOperational(
                  plan,
                  request.population!.context,
                ),
            )
          : undefined;
        if (request.population && !populationPlan) continue;
        candidates.push({
          ...candidate,
          cadenceId:
            populationPlan?.capability?.actionId ?? candidate.cadenceId,
          populationPlan,
        });
      }
    }
  }
  return candidates;
};

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const validateProceduralEnemyCatalogs = (): string[] => {
  const errors: string[] = [];
  for (const roleId of PROCEDURAL_ENEMY_ROLE_IDS) {
    const role = proceduralEnemyRoleDefinition(roleId);
    if (role.archetypeIds.length === 0) {
      errors.push(`${roleId} has no compatible archetype`);
    }
    for (const archetypeId of role.archetypeIds) {
      if (!COMBATANT_ARCHETYPES[archetypeId]) {
        errors.push(`${roleId} references missing archetype ${archetypeId}`);
      }
    }
  }
  for (const loadoutId of PROCEDURAL_ENEMY_LOADOUT_IDS) {
    const loadout = proceduralEnemyLoadoutDefinition(loadoutId);
    if (!ENEMY_CADENCES[loadout.cadenceId]) {
      errors.push(`${loadoutId} references missing cadence ${loadout.cadenceId}`);
    }
    if (loadout.roleIds.length === 0 || loadout.archetypeIds.length === 0) {
      errors.push(`${loadoutId} has no compatible role and archetype`);
    }
    for (const archetypeId of loadout.archetypeIds) {
      const archetype = COMBATANT_ARCHETYPES[archetypeId]
        ? combatantArchetypeDefinition(archetypeId)
        : undefined;
      if (!archetype) {
        errors.push(`${loadoutId} references missing archetype ${archetypeId}`);
        continue;
      }
      const form = combatantFormDefinition(archetype.formId);
      if (
        form.anatomy !== loadout.anatomy ||
        form.materiality !== loadout.materiality
      ) {
        errors.push(
          `${loadoutId} is incompatible with ${archetypeId} (${form.anatomy}/${form.materiality})`,
        );
      }
      if (
        !form.permitsNaturalArmor &&
        (Object.keys(archetype.naturalArmor ?? {}).length > 0 ||
          Object.keys(loadout.naturalArmor ?? {}).length > 0)
      ) {
        errors.push(`${loadoutId} equips armor on ${archetype.formId}`);
      }
    }
  }
  const identityArchetypeIds = new Set<CombatantArchetypeId>();
  for (const roleId of PROCEDURAL_ENEMY_ROLE_IDS) {
    for (const archetypeId of proceduralEnemyRoleDefinition(roleId)
      .archetypeIds) {
      identityArchetypeIds.add(archetypeId);
    }
  }
  for (const archetypeId of identityArchetypeIds) {
    if ((proceduralEnemyIdentitiesFor(archetypeId)?.length ?? 0) === 0) {
      errors.push(`${archetypeId} has no authored identities`);
    }
  }
  return errors;
};

export const validateProceduralRosterRequest = (
  request: ProceduralEnemyRosterRequest,
): string[] => {
  const errors: string[] = [];
  if (request.population) {
    errors.push(...validateProceduralPopulationRequest(request.population));
  }
  const minimumSize = request.minimumSize ?? 1;
  const maximumSize = request.maximumSize ?? 3;
  if (request.encounterKey.trim().length === 0) {
    errors.push("encounterKey must not be empty");
  }
  if (!Number.isSafeInteger(request.threatBudget) || request.threatBudget < 1) {
    errors.push("threatBudget must be a positive safe integer");
  }
  if (!Number.isSafeInteger(minimumSize) || minimumSize < 1) {
    errors.push("minimumSize must be a positive safe integer");
  }
  if (
    !Number.isSafeInteger(maximumSize) ||
    maximumSize < minimumSize ||
    maximumSize > 6
  ) {
    errors.push("maximumSize must be between minimumSize and 6");
  }
  const candidates = candidatesFor(request);
  if (request.population && candidates.length === 0) {
    const unfiltered = candidatesFor({ ...request, population: undefined });
    const planned = unfiltered
      .map((candidate) =>
        resolveProceduralPopulationCandidate(candidate, request.population!),
      )
      .filter((plan): plan is ProceduralPopulationPlan => plan !== undefined);
    if (
      planned.length > 0 &&
      planned.every(
        (plan) =>
          !proceduralPopulationPlanIsOperational(
            plan,
            request.population!.context,
          ),
      )
    ) {
      errors.push(
        "population requires stateful capability execution unsupported by static battle cadences",
      );
    }
  }
  if (candidates.length === 0) errors.push("request has no compatible enemies");
  const cheapest = Math.min(...candidates.map((entry) => entry.threatCost));
  if (
    Number.isFinite(cheapest) &&
    cheapest * minimumSize > request.threatBudget
  ) {
    errors.push("threatBudget cannot satisfy minimumSize");
  }
  return errors;
};

export const validateGeneratedEnemyRoster = (
  roster: ProceduralEnemyRoster,
): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  let spent = 0;
  for (const enemy of roster.enemies) {
    if (ids.has(enemy.id)) errors.push(`duplicate generated id ${enemy.id}`);
    ids.add(enemy.id);
    if (!COMBATANT_ARCHETYPES[enemy.archetypeId]) {
      errors.push(`${enemy.id} references missing archetype ${enemy.archetypeId}`);
    }
    if (!ENEMY_CADENCES[enemy.cadenceId]) {
      errors.push(`${enemy.id} references missing cadence ${enemy.cadenceId}`);
    }
    const plannedAction = enemy.populationPlan?.capability?.actionId;
    if (plannedAction && !ENEMY_CADENCES[plannedAction]) {
      errors.push(`${enemy.id} plans missing cadence ${plannedAction}`);
    }
    if (plannedAction && plannedAction !== enemy.cadenceId) {
      errors.push(`${enemy.id} does not use its planned cadence ${plannedAction}`);
    }
    const archetype = COMBATANT_ARCHETYPES[enemy.archetypeId]
      ? combatantArchetypeDefinition(enemy.archetypeId)
      : undefined;
    const form = archetype
      ? combatantFormDefinition(archetype.formId)
      : undefined;
    const expected = enemyThreatCost({
      ...enemy,
      materiality: form?.materiality,
    });
    if (expected !== enemy.threatCost) {
      errors.push(`${enemy.id} has threat cost ${enemy.threatCost}, expected ${expected}`);
    }
    spent += enemy.threatCost;
  }
  if (spent !== roster.threatSpent) errors.push("threatSpent is inconsistent");
  if (spent > roster.threatBudget) errors.push("roster exceeds threatBudget");
  return errors;
};

export const composeProceduralEnemyRoster = (
  request: ProceduralEnemyRosterRequest,
): ProceduralEnemyRoster => {
  const errors = [
    ...validateProceduralEnemyCatalogs(),
    ...validateProceduralRosterRequest(request),
  ];
  if (errors.length > 0) throw new Error(errors.join("; "));

  let seed = normalizeSeed(request.seed);
  let remaining = request.threatBudget;
  const minimumSize = request.minimumSize ?? 1;
  const maximumSize = request.maximumSize ?? 3;
  const candidates = candidatesFor(request);
  const minimumCost = Math.min(...candidates.map((entry) => entry.threatCost));
  const enemies: GeneratedEnemySpec[] = [];
  const usedNames = new Set<string>();

  while (enemies.length < maximumSize) {
    const requiredAfterThis = Math.max(0, minimumSize - enemies.length - 1);
    const affordable = candidates.filter(
      (entry) =>
        entry.threatCost <= remaining - requiredAfterThis * minimumCost,
    );
    if (affordable.length === 0) break;

    const candidateRoll = rollInteger(seed, 0, affordable.length - 1);
    seed = candidateRoll.seed;
    const candidate = affordable[candidateRoll.value]!;
    const identities = proceduralEnemyIdentitiesFor(candidate.archetypeId);
    if (!identities || identities.length === 0) {
      throw new Error(`${candidate.archetypeId} has no authored identities`);
    }
    const identityRoll = rollInteger(seed, 0, identities.length - 1);
    seed = identityRoll.seed;
    const identity =
      Array.from({ length: identities.length }, (_, offset) =>
        identities[(identityRoll.value + offset) % identities.length],
      ).find((candidate) => candidate && !usedNames.has(candidate.name)) ??
      identities[identityRoll.value]!;
    usedNames.add(identity.name);
    const index = enemies.length + 1;
    enemies.push({
      id: `generated-${slug(request.encounterKey)}-${index}-${slug(identity.name)}`,
      name: identity.name,
      title: candidate.title,
      archetypeId: candidate.archetypeId,
      cadenceId: candidate.cadenceId,
      roleId: candidate.roleId,
      loadoutId: candidate.loadoutId,
      maxHp: candidate.maxHp,
      attack: candidate.attack,
      defense: candidate.defense,
      ward: candidate.ward,
      naturalArmor: { ...candidate.naturalArmor },
      naturalArmorLabel: candidate.naturalArmorLabel,
      threatCost: candidate.threatCost,
      populationPlan: candidate.populationPlan,
    });
    remaining -= candidate.threatCost;
  }

  const roster = {
    seed,
    enemies,
    threatBudget: request.threatBudget,
    threatSpent: request.threatBudget - remaining,
  };
  const rosterErrors = validateGeneratedEnemyRoster(roster);
  if (rosterErrors.length > 0) throw new Error(rosterErrors.join("; "));
  return roster;
};

export const NORTH_VEY_ROAD_THREAT_FIXTURE: ProceduralEnemyRosterRequest = {
  seed: 0x4e565259,
  encounterKey: "north-vey-road-threat",
  threatBudget: 15,
  minimumSize: 2,
  maximumSize: 2,
  allowedArchetypeIds: [
    "county-reeve",
    "reliquary-poacher",
    "ash-hound",
  ],
};
