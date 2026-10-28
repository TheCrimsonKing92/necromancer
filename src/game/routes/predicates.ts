import type {
  RegionalRouteState,
  RoutePredicate,
  RouteReadContext,
} from "./types";

const includes = (
  values: readonly string[],
  value: string,
): boolean => values.includes(value);

const withinBounds = (
  value: number,
  atLeast?: number,
  atMost?: number,
): boolean =>
  (atLeast === undefined || value >= atLeast) &&
  (atMost === undefined || value <= atMost);

export const routePredicateSatisfied = (
  predicate: RoutePredicate,
  state: RegionalRouteState,
  context: RouteReadContext,
): boolean => {
  switch (predicate.kind) {
    case "practice":
      return predicate.oneOf.includes(context.practiceId);
    case "capability":
      return includes(context.capabilityIds, predicate.id);
    case "milestone":
      return includes(state.milestoneIds, predicate.id);
    case "objective-complete":
      return includes(state.completedObjectiveIds, predicate.id);
    case "visited":
      return includes(state.visitedNodeIds, predicate.nodeId);
    case "action-complete":
      return includes(state.completedActionIds, predicate.actionId);
    case "known-fact":
      return includes(context.knownFactIds, predicate.id);
    case "world-fact":
      return includes(context.worldFactIds, predicate.id);
    case "actor-known":
      return includes(context.knownActorIds, predicate.id);
    case "actor-standing":
      return withinBounds(
        context.actorStanding[predicate.id] ?? 0,
        predicate.atLeast,
        predicate.atMost,
      );
    case "relationship":
      return includes(context.relationshipIds, predicate.id);
    case "pressure":
      return withinBounds(
        context.pressure[predicate.id] ?? 0,
        predicate.atLeast,
        predicate.atMost,
      );
    case "resource":
      return (context.resources[predicate.id] ?? 0) >= predicate.atLeast;
  }
};

export const routeRequirementsSatisfied = (
  state: RegionalRouteState,
  context: RouteReadContext,
  requires: readonly RoutePredicate[] = [],
  excludes: readonly RoutePredicate[] = [],
): boolean =>
  requires.every((predicate) =>
    routePredicateSatisfied(predicate, state, context),
  ) &&
  excludes.every(
    (predicate) =>
      !routePredicateSatisfied(predicate, state, context),
  );

export const emptyRouteReadContext = (
  practiceId: string,
): RouteReadContext => ({
  practiceId,
  capabilityIds: [],
  knownFactIds: [],
  worldFactIds: [],
  knownActorIds: [],
  actorStanding: {},
  relationshipIds: [],
  pressure: {},
  resources: {},
});
