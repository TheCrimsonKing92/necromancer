import { normalizeSeed } from "../random";
import { routeRequirementsSatisfied } from "./predicates";
import type {
  RegionalRouteGraph,
  RegionalRouteState,
  RouteActionSummary,
  RouteInteractionResult,
  RouteObjectiveSummary,
  RouteOptionSummary,
  RouteReadContext,
  RouteTransition,
} from "./types";

const addUnique = (values: string[], additions: readonly string[]): void => {
  for (const value of additions) {
    if (!values.includes(value)) values.push(value);
  }
};

export const cloneRouteState = (
  state: RegionalRouteState,
): RegionalRouteState => ({
  ...state,
  visitedNodeIds: [...state.visitedNodeIds],
  completedActionIds: [...state.completedActionIds],
  milestoneIds: [...state.milestoneIds],
  activeObjectiveIds: [...state.activeObjectiveIds],
  completedObjectiveIds: [...state.completedObjectiveIds],
  discoveredNodeIds: [...state.discoveredNodeIds],
  discoveredEdgeIds: [...state.discoveredEdgeIds],
  seenByPool: Object.fromEntries(
    Object.entries(state.seenByPool).map(([poolId, seen]) => [
      poolId,
      [...seen],
    ]),
  ),
});

const refreshObjectiveProgress = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
): void => {
  let changed = true;
  while (changed) {
    changed = false;
    for (const objectiveId of state.activeObjectiveIds) {
      if (state.completedObjectiveIds.includes(objectiveId)) continue;
      const objective = graph.objectives[objectiveId];
      if (
        objective &&
        objective.completion.every((predicate) =>
          routeRequirementsSatisfied(state, context, [predicate]),
        )
      ) {
        state.completedObjectiveIds.push(objectiveId);
        changed = true;
      }
    }
  }
};

const enterNode = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
  nodeId: string,
): void => {
  const node = graph.nodes[nodeId];
  if (!node) return;
  state.currentNodeId = nodeId;
  addUnique(state.visitedNodeIds, [nodeId]);
  addUnique(state.discoveredNodeIds, [nodeId]);
  addUnique(state.milestoneIds, node.arrivalMilestoneIds ?? []);
  addUnique(state.activeObjectiveIds, node.activatesObjectiveIds ?? []);
  refreshObjectiveProgress(graph, state, context);
};

export const createRegionalRouteState = (
  graph: RegionalRouteGraph,
  seed: number,
  context: RouteReadContext,
): RegionalRouteState => {
  const state: RegionalRouteState = {
    graphId: graph.id,
    regionId: graph.regionId,
    currentNodeId: graph.startNodeId,
    seed: normalizeSeed(seed),
    visitedNodeIds: [],
    completedActionIds: [],
    milestoneIds: [],
    activeObjectiveIds: [],
    completedObjectiveIds: [],
    discoveredNodeIds: [],
    discoveredEdgeIds: [],
    seenByPool: {},
  };
  enterNode(graph, state, context, graph.startNodeId);
  return state;
};

export const routeObjectiveSummaries = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
): RouteObjectiveSummary[] =>
  state.activeObjectiveIds.flatMap((objectiveId) => {
    const objective = graph.objectives[objectiveId];
    if (!objective) return [];
    return [
      {
        id: objective.id,
        label: objective.presentation.label,
        summary: objective.presentation.summary,
        status: state.completedObjectiveIds.includes(objectiveId)
          ? "completed"
          : "active",
        required: objective.required,
      },
    ];
  });

const edgeIsDisclosed = (
  state: RegionalRouteState,
  edgeId: string,
  visibility: "known" | "discovered",
): boolean =>
  visibility === "known" || state.discoveredEdgeIds.includes(edgeId);

export const routeOptionsFor = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
): RouteOptionSummary[] =>
  graph.edges.flatMap((edge) => {
    if (
      edge.from !== state.currentNodeId ||
      !edgeIsDisclosed(state, edge.id, edge.visibility)
    ) {
      return [];
    }
    const destination = graph.nodes[edge.to];
    if (!destination) return [];
    const eligible =
      (destination.revisitable ||
        !state.visitedNodeIds.includes(destination.id)) &&
      routeRequirementsSatisfied(
        state,
        context,
        destination.requires,
        destination.excludes,
      ) &&
      routeRequirementsSatisfied(
        state,
        context,
        edge.requires,
        edge.excludes,
      );
    return [
      {
        edgeId: edge.id,
        destinationNodeId: edge.to,
        label: edge.presentation.label,
        summary: eligible
          ? edge.presentation.summary
          : edge.blockedSummary,
        status: eligible ? "available" : "blocked",
        travelCost: edge.travelCost,
      },
    ];
  });

export const routeActionsFor = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
): RouteActionSummary[] => {
  const node = graph.nodes[state.currentNodeId];
  if (!node) return [];
  return node.actionIds.flatMap((actionId) => {
    const action = graph.actions[actionId];
    if (
      !action ||
      (!action.repeatable &&
        state.completedActionIds.includes(action.id)) ||
      !routeRequirementsSatisfied(
        state,
        context,
        action.requires,
        action.excludes,
      )
    ) {
      return [];
    }
    return [
      {
        actionId: action.id,
        label: action.presentation.label,
        summary: action.presentation.summary,
      },
    ];
  });
};

export const completeRouteInteraction = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
  actionId: string,
): RouteInteractionResult | null => {
  if (
    !routeActionsFor(graph, state, context).some(
      (action) => action.actionId === actionId,
    )
  ) {
    return null;
  }
  const action = graph.actions[actionId]!;
  const next = cloneRouteState(state);
  if (!action.repeatable) {
    addUnique(next.completedActionIds, [action.id]);
  }
  addUnique(next.milestoneIds, action.grantsMilestoneIds ?? []);
  addUnique(
    next.activeObjectiveIds,
    action.activatesObjectiveIds ?? [],
  );
  addUnique(next.discoveredEdgeIds, action.discoversEdgeIds ?? []);
  addUnique(next.discoveredNodeIds, action.discoversNodeIds ?? []);
  refreshObjectiveProgress(graph, next, context);
  return {
    state: next,
    actionId,
    consequenceIds: action.consequenceIds,
  };
};

export const navigateRoute = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
  edgeId: string,
): RouteTransition | null => {
  const option = routeOptionsFor(graph, state, context).find(
    (candidate) => candidate.edgeId === edgeId,
  );
  if (!option || option.status !== "available") return null;
  const edge = graph.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) return null;

  const next = cloneRouteState(state);
  addUnique(next.milestoneIds, edge.grantsMilestoneIds ?? []);
  addUnique(
    next.activeObjectiveIds,
    edge.activatesObjectiveIds ?? [],
  );
  addUnique(next.discoveredEdgeIds, edge.discoversEdgeIds ?? []);
  addUnique(next.discoveredNodeIds, edge.discoversNodeIds ?? []);
  enterNode(graph, next, context, edge.to);

  return {
    state: next,
    edgeId,
    consequenceIds: edge.consequenceIds,
    travelCost: edge.travelCost,
    arrivalPoolIds: graph.nodes[edge.to]?.arrivalPoolIds ?? [],
  };
};
