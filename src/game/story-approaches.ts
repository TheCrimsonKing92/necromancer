import type { PracticeCapabilityId } from "./practices/types";
import type { MundaneSkillId } from "./types";

export type StoryApproachId = `${string}:${string}`;
export type StoryApproachTransitionId = `${string}:${string}`;
export type StoryApproachObjectiveId = string;
export type StoryApproachTargetId = string;
export type StoryApproachCapabilityId =
  | MundaneSkillId
  | PracticeCapabilityId
  | `item:${string}`
  | `actor:${string}`
  | `knowledge:${string}`
  | `relationship:${string}`;

export type StoryApproachTiming = "observation" | "preparation" | "decision";
export type StoryApproachRepeatability =
  | "once"
  | "while-opportunity-remains"
  | "repeatable";
export type StoryApproachAvailabilityState =
  | "available"
  | "needs-preparation"
  | "inapplicable"
  | "opportunity-closed";
export type StoryApproachAxis = "objective" | "capability" | "target";

export interface StoryApproachFacetDefinition {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface StoryApproachDefinition {
  readonly id: StoryApproachId;
  readonly label: string;
  /** Short suggestive line used while browsing; full method belongs in detail. */
  readonly lead: string;
  readonly detail: string;
  readonly objectives: readonly StoryApproachObjectiveId[];
  readonly capabilities: readonly StoryApproachCapabilityId[];
  /** Required when more than one capability materially contributes to the method. */
  readonly capabilityMode?: "combined";
  readonly targets: readonly StoryApproachTargetId[];
  readonly timing: StoryApproachTiming;
  readonly repeatability: StoryApproachRepeatability;
  readonly transitionId: StoryApproachTransitionId;
  /** Promotes a particularly character-defining option outside the full browser. */
  readonly prominence?: "practice";
  /** The authoritative method used to resolve this approach. */
  readonly resolution:
    | {
        readonly kind: "mundane-check";
        readonly skill: MundaneSkillId;
        readonly difficulty?: number;
      }
    | { readonly kind: "certain" };
  /** Authored scene-pressure rule, consumed by the owning transition. */
  readonly tempo?: {
    readonly cost: number;
    readonly relief: Readonly<
      Partial<Record<"success" | "failure" | "certain", number>>
    >;
    readonly label: string;
    readonly detail: string;
  };
  /** Immediate, knowable expenditure or exposure. Never future or hidden fallout. */
  readonly knownImmediateCost?: string;
}

export interface StoryApproachCatalog {
  readonly approaches: readonly StoryApproachDefinition[];
  readonly objectives: readonly StoryApproachFacetDefinition[];
  readonly capabilities: readonly StoryApproachFacetDefinition[];
  readonly targets: readonly StoryApproachFacetDefinition[];
  /** Optional authored framing for scenes where preparation is a primary phase. */
  readonly invitation?: {
    readonly eyebrow: string;
    readonly title: string;
    readonly detail: string;
    readonly actionLabel?: string;
  };
}

export interface StoryPreparationSummaryEntry {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  /** Authored account shown when this completed work is first featured. */
  readonly outcome?: {
    readonly eyebrow: string;
    readonly title: string;
    readonly body: string;
    readonly result: string;
  };
  readonly tone?: "secured" | "uncertain" | "cost";
}

export interface StoryApproachSurfaceStatus {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
  readonly tone?: "steady" | "strained" | "closed";
}

export interface StoryApproachAvailability {
  readonly state: StoryApproachAvailabilityState;
  /** Player-safe account of the present obstacle or closed opportunity. */
  readonly reason?: string;
}

export interface StoryApproachReadContext {
  readonly availability: Readonly<
    Partial<Record<StoryApproachId, StoryApproachAvailability>>
  >;
}

export interface StoryApproachView extends StoryApproachDefinition {
  readonly availability: StoryApproachAvailability;
}

/**
 * Browsing is for live courses: immediately usable work and conditions this
 * character could still satisfy. Closed opportunities and capabilities that do
 * not belong to the current character stay out of every browse axis.
 */
export const storyApproachIsBrowsable = (
  approach: StoryApproachView,
): boolean => approach.availability.state === "available" ||
  approach.availability.state === "needs-preparation";

export interface StoryApproachIndex {
  readonly byId: ReadonlyMap<StoryApproachId, StoryApproachDefinition>;
  readonly byObjective: ReadonlyMap<
    StoryApproachObjectiveId,
    readonly StoryApproachDefinition[]
  >;
  readonly byCapability: ReadonlyMap<
    StoryApproachCapabilityId,
    readonly StoryApproachDefinition[]
  >;
  readonly byTarget: ReadonlyMap<
    StoryApproachTargetId,
    readonly StoryApproachDefinition[]
  >;
}

const NAMESPACED_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FACET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?::[a-z0-9]+(?:-[a-z0-9]+)*)?$/;
const isNonEmpty = (value: string | undefined): boolean =>
  value !== undefined && value.trim().length > 0;
const duplicates = (values: readonly string[]): string[] =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

const pushGrouped = <Key extends string>(
  groups: Map<Key, StoryApproachDefinition[]>,
  keys: readonly Key[],
  approach: StoryApproachDefinition,
): void => {
  for (const key of keys) {
    const values = groups.get(key) ?? [];
    values.push(approach);
    groups.set(key, values);
  }
};

const freezeGroups = <Key extends string>(
  groups: Map<Key, StoryApproachDefinition[]>,
): ReadonlyMap<Key, readonly StoryApproachDefinition[]> => {
  const frozen = new Map<Key, readonly StoryApproachDefinition[]>();
  for (const [key, approaches] of groups) {
    frozen.set(key, Object.freeze([...approaches]));
  }
  return frozen;
};

export const createStoryApproachIndex = (
  approaches: readonly StoryApproachDefinition[],
): StoryApproachIndex => {
  const byId = new Map<StoryApproachId, StoryApproachDefinition>();
  const byObjective = new Map<
    StoryApproachObjectiveId,
    StoryApproachDefinition[]
  >();
  const byCapability = new Map<
    StoryApproachCapabilityId,
    StoryApproachDefinition[]
  >();
  const byTarget = new Map<StoryApproachTargetId, StoryApproachDefinition[]>();

  for (const approach of approaches) {
    byId.set(approach.id, approach);
    pushGrouped(byObjective, approach.objectives, approach);
    pushGrouped(byCapability, approach.capabilities, approach);
    pushGrouped(byTarget, approach.targets, approach);
  }

  return Object.freeze({
    byId: Object.freeze(byId),
    byObjective: freezeGroups(byObjective),
    byCapability: freezeGroups(byCapability),
    byTarget: freezeGroups(byTarget),
  });
};

const listForAxis = (
  index: StoryApproachIndex,
  axis: StoryApproachAxis,
  facetId: string,
): readonly StoryApproachDefinition[] => {
  if (axis === "objective") return index.byObjective.get(facetId) ?? [];
  if (axis === "capability") {
    return index.byCapability.get(facetId as StoryApproachCapabilityId) ?? [];
  }
  return index.byTarget.get(facetId) ?? [];
};

export const storyApproachesForFacet = (
  index: StoryApproachIndex,
  context: StoryApproachReadContext,
  axis: StoryApproachAxis,
  facetId: string,
): StoryApproachView[] =>
  listForAxis(index, axis, facetId).map((approach) => ({
    ...approach,
    availability: context.availability[approach.id] ?? { state: "available" },
  }));

export const storyApproachById = (
  index: StoryApproachIndex,
  context: StoryApproachReadContext,
  approachId: StoryApproachId,
): StoryApproachView | undefined => {
  const approach = index.byId.get(approachId);
  if (!approach) return undefined;
  return {
    ...approach,
    availability: context.availability[approach.id] ?? { state: "available" },
  };
};

const validateFacetCatalog = (
  name: StoryApproachAxis,
  facets: readonly StoryApproachFacetDefinition[],
  errors: string[],
): Set<string> => {
  const ids = new Set<string>();
  for (const facet of facets) {
    if (!FACET_ID.test(facet.id)) {
      errors.push(`${name} facet "${facet.id}" has an invalid id.`);
    }
    if (ids.has(facet.id)) {
      errors.push(`${name} facet "${facet.id}" is duplicated.`);
    }
    ids.add(facet.id);
    if (!isNonEmpty(facet.label)) {
      errors.push(`${name} facet "${facet.id}" has no label.`);
    }
  }
  return ids;
};

export const validateStoryApproachCatalog = (
  catalog: StoryApproachCatalog,
  transitionIds: ReadonlySet<string>,
): string[] => {
  const errors: string[] = [];
  const objectiveIds = validateFacetCatalog(
    "objective",
    catalog.objectives,
    errors,
  );
  const capabilityIds = validateFacetCatalog(
    "capability",
    catalog.capabilities,
    errors,
  );
  const targetIds = validateFacetCatalog("target", catalog.targets, errors);
  const approachIds = new Set<string>();

  if (
    catalog.invitation &&
    (!isNonEmpty(catalog.invitation.eyebrow) ||
      !isNonEmpty(catalog.invitation.title) ||
      !isNonEmpty(catalog.invitation.detail) ||
      (catalog.invitation.actionLabel !== undefined &&
        !isNonEmpty(catalog.invitation.actionLabel)))
  ) {
    errors.push("Approach invitation fields must contain visible text.");
  }

  for (const approach of catalog.approaches) {
    const path = approach.id || "<unnamed approach>";
    if (!NAMESPACED_ID.test(approach.id)) {
      errors.push(`${path} has an invalid namespaced approach id.`);
    }
    if (approachIds.has(approach.id)) {
      errors.push(`${path} is duplicated.`);
    }
    approachIds.add(approach.id);
    if (
      !isNonEmpty(approach.label) ||
      !isNonEmpty(approach.lead) ||
      !isNonEmpty(approach.detail)
    ) {
      errors.push(`${path} requires a label, lead, and detail.`);
    }
    if (!NAMESPACED_ID.test(approach.transitionId)) {
      errors.push(`${path} has an invalid transition id.`);
    } else if (!transitionIds.has(approach.transitionId)) {
      errors.push(`${path} references missing transition ${approach.transitionId}.`);
    }
    if (
      approach.resolution.kind === "mundane-check" &&
      !approach.capabilities.includes(approach.resolution.skill)
    ) {
      errors.push(
        `${path} resolves with ${approach.resolution.skill} but does not index that capability.`,
      );
    }
    if (approach.capabilities.length > 1 && approach.capabilityMode !== "combined") {
      errors.push(
        `${path} lists multiple capabilities without declaring a combined method.`,
      );
    }
    if (approach.capabilities.length < 2 && approach.capabilityMode === "combined") {
      errors.push(
        `${path} declares a combined capability method without multiple capabilities.`,
      );
    }
    if (
      approach.tempo &&
      (approach.tempo.cost < 0 ||
        Object.values(approach.tempo.relief).some(
          (value) => value !== undefined && value < 0,
        ) ||
        !isNonEmpty(approach.tempo.label) ||
        !isNonEmpty(approach.tempo.detail))
    ) {
      errors.push(`${path} has an invalid tempo rule.`);
    }
    for (const [axis, ids, declared] of [
      ["objective", approach.objectives, objectiveIds],
      ["capability", approach.capabilities, capabilityIds],
      ["target", approach.targets, targetIds],
    ] as const) {
      if (ids.length === 0) errors.push(`${path} has no ${axis} index.`);
      for (const duplicate of duplicates(ids)) {
        errors.push(`${path} repeats ${axis} ${duplicate}.`);
      }
      for (const id of ids) {
        if (!declared.has(id)) {
          errors.push(`${path} references unknown ${axis} ${id}.`);
        }
      }
    }
  }

  return errors;
};

export const validateStoryApproachReadContext = (
  catalog: StoryApproachCatalog,
  context: StoryApproachReadContext,
): string[] => {
  const errors: string[] = [];
  const known = new Set<string>(catalog.approaches.map(({ id }) => id));
  for (const [id, availability] of Object.entries(context.availability)) {
    if (!known.has(id)) errors.push(`Availability references unknown approach ${id}.`);
    if (!availability) continue;
    if (availability.state !== "available" && !isNonEmpty(availability.reason)) {
      errors.push(`${id} requires a truthful unavailable reason.`);
    }
  }
  return errors;
};
