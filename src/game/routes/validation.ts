import { normalizeSeed } from "../random";
import type {
  RegionalRouteGraph,
  RegionalRouteState,
  RoutePredicate,
} from "./types";

const addUnique = (values: string[], additions: readonly string[] = []): void => {
  for (const value of additions) {
    if (!values.includes(value)) values.push(value);
  }
};

const duplicates = (values: readonly string[]): string[] =>
  values.filter((value, index) => values.indexOf(value) !== index);

const recordIdsMatchKeys = (
  label: string,
  records: Readonly<Record<string, { id: string }>>,
): string[] =>
  Object.entries(records).flatMap(([key, value]) =>
    key === value.id ? [] : [`${label} key "${key}" contains id "${value.id}".`],
  );

const validatePredicateReference = (
  graph: RegionalRouteGraph,
  predicate: RoutePredicate,
  owner: string,
): string[] => {
  switch (predicate.kind) {
    case "objective-complete":
      return graph.objectives[predicate.id]
        ? []
        : [`${owner} references unknown objective "${predicate.id}".`];
    case "visited":
      return graph.nodes[predicate.nodeId]
        ? []
        : [`${owner} references unknown node "${predicate.nodeId}".`];
    case "action-complete":
      return graph.actions[predicate.actionId]
        ? []
        : [`${owner} references unknown action "${predicate.actionId}".`];
    case "practice": {
      const unknown = predicate.oneOf.filter(
        (practiceId) => !graph.playablePracticeIds.includes(practiceId),
      );
      return [
        ...(predicate.oneOf.length === 0
          ? [`${owner} has an empty practice predicate.`]
          : []),
        ...unknown.map(
          (practiceId) =>
            `${owner} references unavailable practice "${practiceId}".`,
        ),
      ];
    }
    default:
      return [];
  }
};

const validatePredicates = (
  graph: RegionalRouteGraph,
  owner: string,
  ...groups: readonly (readonly RoutePredicate[] | undefined)[]
): string[] =>
  groups.flatMap((group) =>
    (group ?? []).flatMap((predicate) =>
      validatePredicateReference(graph, predicate, owner),
    ),
  );

const internalPredicateSatisfied = (
  predicate: RoutePredicate,
  state: RegionalRouteState,
  practiceId: string,
): boolean | undefined => {
  switch (predicate.kind) {
    case "practice":
      return predicate.oneOf.includes(practiceId);
    case "milestone":
      return state.milestoneIds.includes(predicate.id);
    case "objective-complete":
      return state.completedObjectiveIds.includes(predicate.id);
    case "visited":
      return state.visitedNodeIds.includes(predicate.nodeId);
    case "action-complete":
      return state.completedActionIds.includes(predicate.actionId);
    default:
      return undefined;
  }
};

const symbolicallyEligible = (
  state: RegionalRouteState,
  practiceId: string,
  requires: readonly RoutePredicate[] = [],
  excludes: readonly RoutePredicate[] = [],
): boolean =>
  requires.every(
    (predicate) =>
      internalPredicateSatisfied(predicate, state, practiceId) ?? true,
  ) &&
  excludes.every(
    (predicate) =>
      !(internalPredicateSatisfied(predicate, state, practiceId) ?? false),
  );

const refreshSymbolicObjectives = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  practiceId: string,
): void => {
  let changed = true;
  while (changed) {
    changed = false;
    for (const objectiveId of state.activeObjectiveIds) {
      if (state.completedObjectiveIds.includes(objectiveId)) continue;
      const objective = graph.objectives[objectiveId];
      if (
        objective &&
        symbolicallyEligible(state, practiceId, objective.completion)
      ) {
        state.completedObjectiveIds.push(objectiveId);
        changed = true;
      }
    }
  }
};

const enterSymbolicNode = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  practiceId: string,
  nodeId: string,
): void => {
  const node = graph.nodes[nodeId];
  if (!node) return;
  state.currentNodeId = nodeId;
  addUnique(state.visitedNodeIds, [nodeId]);
  addUnique(state.discoveredNodeIds, [nodeId]);
  addUnique(state.milestoneIds, node.arrivalMilestoneIds);
  addUnique(state.activeObjectiveIds, node.activatesObjectiveIds);
  refreshSymbolicObjectives(graph, state, practiceId);
};

const cloneSymbolicState = (
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
  seenByPool: {},
});

const symbolicStateKey = (state: RegionalRouteState): string =>
  [
    state.currentNodeId,
    ...[
      state.visitedNodeIds,
      state.completedActionIds,
      state.milestoneIds,
      state.activeObjectiveIds,
      state.completedObjectiveIds,
      state.discoveredEdgeIds,
    ].map((values) => [...values].sort().join(",")),
  ].join("|");

export const practiceCanCompleteRequiredObjectives = (
  graph: RegionalRouteGraph,
  practiceId: string,
): boolean => {
  const requiredObjectiveIds = Object.values(graph.objectives)
    .filter((objective) => objective.required)
    .map((objective) => objective.id);
  const initial: RegionalRouteState = {
    graphId: graph.id,
    regionId: graph.regionId,
    currentNodeId: graph.startNodeId,
    seed: normalizeSeed(1),
    visitedNodeIds: [],
    completedActionIds: [],
    milestoneIds: [],
    activeObjectiveIds: [],
    completedObjectiveIds: [],
    discoveredNodeIds: [],
    discoveredEdgeIds: [],
    seenByPool: {},
  };
  enterSymbolicNode(graph, initial, practiceId, graph.startNodeId);

  const queue = [initial];
  const seenStates = new Set<string>();
  while (queue.length > 0) {
    const state = queue.shift()!;
    const key = symbolicStateKey(state);
    if (seenStates.has(key)) continue;
    seenStates.add(key);
    if (
      requiredObjectiveIds.every((objectiveId) =>
        state.completedObjectiveIds.includes(objectiveId),
      )
    ) {
      return true;
    }

    const node = graph.nodes[state.currentNodeId];
    if (!node) continue;
    for (const actionId of node.actionIds) {
      const action = graph.actions[actionId];
      if (
        !action ||
        (!action.repeatable && state.completedActionIds.includes(action.id)) ||
        !symbolicallyEligible(
          state,
          practiceId,
          action.requires,
          action.excludes,
        )
      ) {
        continue;
      }
      const next = cloneSymbolicState(state);
      if (!action.repeatable) addUnique(next.completedActionIds, [action.id]);
      addUnique(next.milestoneIds, action.grantsMilestoneIds);
      addUnique(next.activeObjectiveIds, action.activatesObjectiveIds);
      addUnique(next.discoveredEdgeIds, action.discoversEdgeIds);
      addUnique(next.discoveredNodeIds, action.discoversNodeIds);
      refreshSymbolicObjectives(graph, next, practiceId);
      queue.push(next);
    }

    for (const edge of graph.edges) {
      if (
        edge.from !== state.currentNodeId ||
        (edge.visibility === "discovered" &&
          !state.discoveredEdgeIds.includes(edge.id))
      ) {
        continue;
      }
      const destination = graph.nodes[edge.to];
      if (
        !destination ||
        (!destination.revisitable &&
          state.visitedNodeIds.includes(destination.id)) ||
        !symbolicallyEligible(
          state,
          practiceId,
          edge.requires,
          edge.excludes,
        ) ||
        !symbolicallyEligible(
          state,
          practiceId,
          destination.requires,
          destination.excludes,
        )
      ) {
        continue;
      }
      const next = cloneSymbolicState(state);
      addUnique(next.milestoneIds, edge.grantsMilestoneIds);
      addUnique(next.activeObjectiveIds, edge.activatesObjectiveIds);
      addUnique(next.discoveredEdgeIds, edge.discoversEdgeIds);
      addUnique(next.discoveredNodeIds, edge.discoversNodeIds);
      enterSymbolicNode(graph, next, practiceId, edge.to);
      queue.push(next);
    }
  }
  return false;
};

export const validateRegionalRouteGraph = (
  graph: RegionalRouteGraph,
): string[] => {
  const errors = [
    ...recordIdsMatchKeys("Objective", graph.objectives),
    ...recordIdsMatchKeys("Node", graph.nodes),
    ...recordIdsMatchKeys("Action", graph.actions),
    ...recordIdsMatchKeys("Pool", graph.pools),
  ];
  if (!graph.nodes[graph.startNodeId]) {
    errors.push(`Start node "${graph.startNodeId}" does not exist.`);
  }
  if (duplicates(graph.playablePracticeIds).length > 0) {
    errors.push("Playable practice ids must be unique.");
  }

  const edgeIds = graph.edges.map((edge) => edge.id);
  for (const duplicate of duplicates(edgeIds)) {
    errors.push(`Edge id "${duplicate}" is duplicated.`);
  }

  for (const objective of Object.values(graph.objectives)) {
    if (!objective.presentation.label || !objective.presentation.summary) {
      errors.push(`Objective "${objective.id}" is missing player-safe copy.`);
    }
    errors.push(
      ...validatePredicates(
        graph,
        `Objective "${objective.id}"`,
        objective.completion,
      ),
    );
  }

  for (const node of Object.values(graph.nodes)) {
    if (node.regionId !== graph.regionId) {
      errors.push(`Node "${node.id}" belongs to the wrong region.`);
    }
    if (!node.presentation.label || !node.presentation.summary) {
      errors.push(`Node "${node.id}" is missing player-safe copy.`);
    }
    for (const actionId of node.actionIds) {
      if (!graph.actions[actionId]) {
        errors.push(`Node "${node.id}" references unknown action "${actionId}".`);
      }
    }
    for (const poolId of node.arrivalPoolIds ?? []) {
      if (!graph.pools[poolId]) {
        errors.push(`Node "${node.id}" references unknown pool "${poolId}".`);
      }
    }
    for (const objectiveId of node.activatesObjectiveIds ?? []) {
      if (!graph.objectives[objectiveId]) {
        errors.push(
          `Node "${node.id}" activates unknown objective "${objectiveId}".`,
        );
      }
    }
    errors.push(
      ...validatePredicates(
        graph,
        `Node "${node.id}"`,
        node.requires,
        node.excludes,
      ),
    );
    if (
      !node.terminal &&
      !graph.edges.some((edge) => edge.from === node.id)
    ) {
      errors.push(`Nonterminal node "${node.id}" has no outgoing edge.`);
    }
  }

  for (const action of Object.values(graph.actions)) {
    if (!action.presentation.label || !action.presentation.summary) {
      errors.push(`Action "${action.id}" is missing player-safe copy.`);
    }
    if (action.mode !== "interaction") {
      errors.push(`Action "${action.id}" must not consume navigation.`);
    }
    for (const edgeId of action.discoversEdgeIds ?? []) {
      if (!edgeIds.includes(edgeId)) {
        errors.push(`Action "${action.id}" discovers unknown edge "${edgeId}".`);
      }
    }
    for (const nodeId of action.discoversNodeIds ?? []) {
      if (!graph.nodes[nodeId]) {
        errors.push(`Action "${action.id}" discovers unknown node "${nodeId}".`);
      }
    }
    for (const objectiveId of action.activatesObjectiveIds ?? []) {
      if (!graph.objectives[objectiveId]) {
        errors.push(
          `Action "${action.id}" activates unknown objective "${objectiveId}".`,
        );
      }
    }
    errors.push(
      ...validatePredicates(
        graph,
        `Action "${action.id}"`,
        action.requires,
        action.excludes,
      ),
    );
  }

  for (const edge of graph.edges) {
    if (!graph.nodes[edge.from] || !graph.nodes[edge.to]) {
      errors.push(`Edge "${edge.id}" has an unknown endpoint.`);
    }
    if (!edge.presentation.label || !edge.presentation.summary) {
      errors.push(`Edge "${edge.id}" is missing player-safe copy.`);
    }
    if (!edge.blockedSummary) {
      errors.push(`Edge "${edge.id}" is missing a player-safe blocked summary.`);
    }
    if (!Number.isFinite(edge.travelCost) || edge.travelCost < 0) {
      errors.push(`Edge "${edge.id}" has an invalid travel cost.`);
    }
    for (const discoveredEdgeId of edge.discoversEdgeIds ?? []) {
      if (!edgeIds.includes(discoveredEdgeId)) {
        errors.push(
          `Edge "${edge.id}" discovers unknown edge "${discoveredEdgeId}".`,
        );
      }
    }
    errors.push(
      ...validatePredicates(
        graph,
        `Edge "${edge.id}"`,
        edge.requires,
        edge.excludes,
      ),
    );
  }

  const disclosedEdgeIds = new Set([
    ...Object.values(graph.actions).flatMap(
      (action) => action.discoversEdgeIds ?? [],
    ),
    ...graph.edges.flatMap((edge) => edge.discoversEdgeIds ?? []),
  ]);
  for (const edge of graph.edges) {
    if (edge.visibility === "discovered" && !disclosedEdgeIds.has(edge.id)) {
      errors.push(`Hidden edge "${edge.id}" has no discovery source.`);
    }
  }

  for (const pool of Object.values(graph.pools)) {
    if (pool.entries.length === 0) {
      errors.push(`Pool "${pool.id}" has no entries.`);
    }
    for (const duplicate of duplicates(pool.entries.map((entry) => entry.id))) {
      errors.push(`Pool "${pool.id}" duplicates entry "${duplicate}".`);
    }
    for (const entry of pool.entries) {
      if (!entry.contentId) {
        errors.push(`Pool "${pool.id}" entry "${entry.id}" has no content id.`);
      }
      if (!Number.isFinite(entry.weight) || entry.weight <= 0) {
        errors.push(
          `Pool "${pool.id}" entry "${entry.id}" has an invalid weight.`,
        );
      }
      errors.push(
        ...validatePredicates(
          graph,
          `Pool "${pool.id}" entry "${entry.id}"`,
          entry.requires,
          entry.excludes,
        ),
      );
    }
  }

  for (const practiceId of graph.playablePracticeIds) {
    if (!practiceCanCompleteRequiredObjectives(graph, practiceId)) {
      errors.push(
        `Practice "${practiceId}" cannot complete every required objective.`,
      );
    }
  }
  return errors;
};
