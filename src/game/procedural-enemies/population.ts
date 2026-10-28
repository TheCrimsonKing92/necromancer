import {
  evaluateCapabilityAvailability,
  validateCapabilityConditionContext,
  validateConditionedCapability,
  type CapabilityAvailability,
  type CapabilityConditionContext,
  type ConditionedCapability,
} from "../capability-conditions";
import { COMBATANT_ARCHETYPES } from "../combatants/archetypes";
import { ENEMY_CADENCES, type EnemyCadenceId } from "../enemy-actions/cadences";
import {
  PROCEDURAL_ENEMY_LOADOUTS,
  PROCEDURAL_ENEMY_ROLES,
  type ProceduralEnemyLoadoutId,
  type ProceduralEnemyRoleId,
} from "./catalogs";
import type { CombatantArchetypeId } from "../combatants/archetypes";

export interface ProceduralPopulationSelector {
  roleIds?: readonly ProceduralEnemyRoleId[];
  loadoutIds?: readonly ProceduralEnemyLoadoutId[];
  archetypeIds?: readonly CombatantArchetypeId[];
}

export interface ProceduralPopulationOrientation {
  regionTags?: readonly string[];
  institutionTags?: readonly string[];
}

export interface ProceduralPopulationProfile {
  id: string;
  selector: ProceduralPopulationSelector;
  orientations: readonly ProceduralPopulationOrientation[];
  capability?: ConditionedCapability<EnemyCadenceId>;
}

export interface ProceduralPopulationLocation {
  regionTags: readonly string[];
  institutionTags: readonly string[];
}

export type ProceduralPopulationPresence =
  | { kind: "local" }
  | {
      kind: "travel" | "migration" | "displacement" | "authored-exception";
      originId: string;
      origin: ProceduralPopulationLocation;
      reasonId: string;
    };

export interface ProceduralEncounterPopulationContext
  extends ProceduralPopulationLocation {
  conditions: readonly string[];
  providers?: CapabilityConditionContext["providers"];
  reachIds?: CapabilityConditionContext["reachIds"];
  opportunities?: readonly string[];
  preparations?: CapabilityConditionContext["preparations"];
  resources?: CapabilityConditionContext["resources"];
  presence?: ProceduralPopulationPresence;
  intentionalDeprivation?: { reasonId: string };
}

export interface ProceduralPopulationRequest {
  context: ProceduralEncounterPopulationContext;
  profiles: readonly ProceduralPopulationProfile[];
}

export type ProceduralPlacementState =
  | "oriented"
  | "prepared"
  | "travel-ready"
  | "travel-prepared"
  | "setup-required"
  | "intentionally-deprived";

export interface ProceduralPopulationPlan {
  profileId: string;
  placement: ProceduralPlacementState;
  presenceReasonId?: string;
  originId?: string;
  deprivationReasonId?: string;
  capability?: CapabilityAvailability<EnemyCadenceId>;
}

export interface ProceduralPopulationCandidate {
  roleId: ProceduralEnemyRoleId;
  loadoutId: ProceduralEnemyLoadoutId;
  archetypeId: CombatantArchetypeId;
  cadenceId: EnemyCadenceId;
}

const intersects = (left: readonly string[], right: readonly string[]): boolean =>
  left.some((entry) => right.includes(entry));

const orientationMatches = (
  orientation: ProceduralPopulationOrientation,
  location: ProceduralPopulationLocation,
): boolean =>
  (orientation.regionTags === undefined ||
    intersects(orientation.regionTags, location.regionTags)) &&
  (orientation.institutionTags === undefined ||
    intersects(orientation.institutionTags, location.institutionTags));

const selectorMatches = (
  selector: ProceduralPopulationSelector,
  candidate: ProceduralPopulationCandidate,
): boolean =>
  (selector.roleIds === undefined ||
    selector.roleIds.includes(candidate.roleId)) &&
  (selector.loadoutIds === undefined ||
    selector.loadoutIds.includes(candidate.loadoutId)) &&
  (selector.archetypeIds === undefined ||
    selector.archetypeIds.includes(candidate.archetypeId));

const availabilityScore = (
  availability: CapabilityAvailability | undefined,
): number => {
  if (!availability) return 50;
  switch (availability.state) {
    case "ready":
      return 50 + availability.activeAmplifiers.length;
    case "prepared":
      return 40 + availability.activeAmplifiers.length;
    case "setup-required":
      return 30;
    case "fallback":
      return 10;
    case "untrained":
    case "unavailable":
      return -1;
  }
};

const placementFor = (
  availability: CapabilityAvailability | undefined,
  presence: ProceduralPopulationPresence,
  deprivationReasonId: string | undefined,
): ProceduralPlacementState | undefined => {
  if (!availability) {
    return presence.kind === "local" ? "oriented" : "travel-ready";
  }
  if (availability.state === "ready") {
    return presence.kind === "local" ? "oriented" : "travel-ready";
  }
  if (availability.state === "prepared") {
    return presence.kind === "local" ? "prepared" : "travel-prepared";
  }
  if (availability.state === "setup-required") return "setup-required";
  if (
    availability.state === "fallback" &&
    deprivationReasonId !== undefined &&
    deprivationReasonId.trim().length > 0
  ) {
    return "intentionally-deprived";
  }
  return undefined;
};

export const resolveProceduralPopulationCandidate = (
  candidate: ProceduralPopulationCandidate,
  request: ProceduralPopulationRequest,
  accepts: (plan: ProceduralPopulationPlan) => boolean = () => true,
): ProceduralPopulationPlan | undefined => {
  const presence = request.context.presence ?? { kind: "local" };
  const origin = presence.kind === "local" ? request.context : presence.origin;
  let best:
    | { score: number; plan: ProceduralPopulationPlan }
    | undefined;

  for (const profile of request.profiles) {
    if (!selectorMatches(profile.selector, candidate)) continue;
    if (!profile.orientations.some((entry) => orientationMatches(entry, origin))) {
      continue;
    }
    const capability = profile.capability
      ? evaluateCapabilityAvailability(profile.capability, {
          knownCapabilities: [profile.capability.id],
          present: request.context.conditions,
          providers: request.context.providers,
          reachIds: request.context.reachIds,
          opportunities: request.context.opportunities,
          preparations: request.context.preparations,
          resources: request.context.resources,
        })
      : undefined;
    const placement = placementFor(
      capability,
      presence,
      request.context.intentionalDeprivation?.reasonId,
    );
    if (!placement) continue;
    const plan = {
      profileId: profile.id,
      placement,
      presenceReasonId:
        presence.kind === "local" ? undefined : presence.reasonId,
      originId: presence.kind === "local" ? undefined : presence.originId,
      deprivationReasonId:
        placement === "intentionally-deprived"
          ? request.context.intentionalDeprivation?.reasonId
          : undefined,
      capability,
    } satisfies ProceduralPopulationPlan;
    if (!accepts(plan)) continue;
    const score =
      availabilityScore(capability) + (presence.kind === "local" ? 20 : 0);
    if (best && best.score >= score) continue;
    best = {
      score,
      plan,
    };
  }
  return best?.plan;
};

/**
 * The current battle model owns one static cadence per combatant. Admit only
 * plans that can be represented honestly by that contract. Stateful setup and
 * per-action consumption remain unavailable until battle-site state owns the
 * corresponding transition.
 */
export const proceduralPopulationPlanIsOperational = (
  plan: ProceduralPopulationPlan,
  context: ProceduralEncounterPopulationContext,
): boolean => {
  const capability = plan.capability;
  if (!capability) return true;
  if (capability.state === "fallback") return capability.actionId !== undefined;
  if (capability.state !== "ready" && capability.state !== "prepared") {
    return false;
  }
  if (
    capability.activeAmplifiers.length > 0 &&
    capability.amplifiedActionId === undefined
  ) {
    return false;
  }
  if (
    capability.resourceCommitments.some(
      (commitment) => commitment.commitment !== "encounter",
    )
  ) {
    return false;
  }
  const preparations = new Map(
    (context.preparations ?? []).map((preparation) => [
      preparation.id,
      preparation,
    ]),
  );
  return capability.preparationCommitments.every(
    (id) => preparations.get(id)?.commitment === "encounter",
  );
};

const invalidTags = (tags: readonly string[] | undefined): boolean =>
  tags?.some((tag) => tag.trim().length === 0) === true;

export const validateProceduralPopulationRequest = (
  request: ProceduralPopulationRequest,
): string[] => {
  const errors = validateCapabilityConditionContext({
    knownCapabilities: [],
    present: request.context.conditions,
    providers: request.context.providers,
    reachIds: request.context.reachIds,
    opportunities: request.context.opportunities,
    preparations: request.context.preparations,
    resources: request.context.resources,
  });
  if (
    invalidTags(request.context.regionTags) ||
    invalidTags(request.context.institutionTags)
  ) {
    errors.push("population context contains an empty orientation tag");
  }
  const presence = request.context.presence ?? { kind: "local" };
  if (
    request.context.intentionalDeprivation &&
    request.context.intentionalDeprivation.reasonId.trim().length === 0
  ) {
    errors.push("intentional deprivation has no reason");
  }
  if (presence.kind !== "local") {
    if (presence.originId.trim().length === 0) {
      errors.push(`${presence.kind} population has no origin`);
    }
    if (presence.reasonId.trim().length === 0) {
      errors.push(`${presence.kind} population has no reason`);
    }
    if (
      invalidTags(presence.origin.regionTags) ||
      invalidTags(presence.origin.institutionTags)
    ) {
      errors.push(`${presence.kind} population has an invalid origin`);
    }
  }

  const profileIds = new Set<string>();
  if (request.profiles.length === 0) errors.push("population has no profiles");
  for (const profile of request.profiles) {
    if (profile.id.trim().length === 0) {
      errors.push("population profile has no id");
    } else if (profileIds.has(profile.id)) {
      errors.push(`population repeats profile ${profile.id}`);
    }
    profileIds.add(profile.id);
    if (profile.orientations.length === 0) {
      errors.push(`${profile.id || "population profile"} has no orientation`);
    }
    for (const orientation of profile.orientations) {
      if (
        invalidTags(orientation.regionTags) ||
        invalidTags(orientation.institutionTags)
      ) {
        errors.push(`${profile.id || "population profile"} has an empty tag`);
      }
    }
    for (const roleId of profile.selector.roleIds ?? []) {
      if (!PROCEDURAL_ENEMY_ROLES[roleId]) {
        errors.push(`${profile.id} references missing role ${roleId}`);
      }
    }
    for (const loadoutId of profile.selector.loadoutIds ?? []) {
      if (!PROCEDURAL_ENEMY_LOADOUTS[loadoutId]) {
        errors.push(`${profile.id} references missing loadout ${loadoutId}`);
      }
    }
    for (const archetypeId of profile.selector.archetypeIds ?? []) {
      if (!COMBATANT_ARCHETYPES[archetypeId]) {
        errors.push(`${profile.id} references missing archetype ${archetypeId}`);
      }
    }
    if (!profile.capability) continue;
    errors.push(...validateConditionedCapability(profile.capability));
    const actionIds = [
      profile.capability.primaryActionId,
      profile.capability.amplifiedActionId,
      profile.capability.fallbackActionId,
      ...(profile.capability.setup ?? []).map((entry) => entry.actionId),
    ].filter((id): id is EnemyCadenceId => id !== undefined);
    for (const actionId of actionIds) {
      if (!ENEMY_CADENCES[actionId]) {
        errors.push(`${profile.id} references missing cadence ${actionId}`);
      }
    }
    const loadoutIds = profile.selector.loadoutIds;
    if (!loadoutIds || loadoutIds.length === 0) {
      errors.push(`${profile.id} capability must select an explicit loadout`);
    } else {
      for (const loadoutId of loadoutIds) {
        const loadout = PROCEDURAL_ENEMY_LOADOUTS[loadoutId];
        if (
          loadout &&
          loadout.cadenceId !== profile.capability.primaryActionId
        ) {
          errors.push(`${profile.id} primary cadence does not match ${loadoutId}`);
        }
      }
    }
  }
  return errors;
};
