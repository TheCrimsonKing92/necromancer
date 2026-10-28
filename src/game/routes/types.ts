export type RouteNodeKind =
  | "hub"
  | "story"
  | "service"
  | "social"
  | "hazard"
  | "combat";

export type RoutePoolDisposition =
  | "friendly"
  | "neutral"
  | "hazardous"
  | "hostile";

export interface RoutePresentation {
  label: string;
  summary: string;
}

export type RoutePredicate =
  | {
      kind: "practice";
      oneOf: readonly string[];
    }
  | {
      kind: "capability";
      id: string;
    }
  | {
      kind: "milestone";
      id: string;
    }
  | {
      kind: "objective-complete";
      id: string;
    }
  | {
      kind: "visited";
      nodeId: string;
    }
  | {
      kind: "action-complete";
      actionId: string;
    }
  | {
      kind: "known-fact";
      id: string;
    }
  | {
      kind: "world-fact";
      id: string;
    }
  | {
      kind: "actor-known";
      id: string;
    }
  | {
      kind: "actor-standing";
      id: string;
      atLeast?: number;
      atMost?: number;
    }
  | {
      kind: "relationship";
      id: string;
    }
  | {
      kind: "pressure";
      id: string;
      atLeast?: number;
      atMost?: number;
    }
  | {
      kind: "resource";
      id: string;
      atLeast: number;
    };

export interface RouteReadContext {
  practiceId: string;
  capabilityIds: readonly string[];
  knownFactIds: readonly string[];
  worldFactIds: readonly string[];
  knownActorIds: readonly string[];
  actorStanding: Readonly<Record<string, number | undefined>>;
  relationshipIds: readonly string[];
  pressure: Readonly<Record<string, number | undefined>>;
  resources: Readonly<Record<string, number | undefined>>;
}

export interface RouteObjectiveDefinition {
  id: string;
  presentation: RoutePresentation;
  required: boolean;
  completion: readonly RoutePredicate[];
}

export interface RouteActionDefinition {
  id: string;
  presentation: RoutePresentation;
  mode: "interaction";
  repeatable?: boolean;
  requires?: readonly RoutePredicate[];
  excludes?: readonly RoutePredicate[];
  consequenceIds: readonly string[];
  grantsMilestoneIds?: readonly string[];
  activatesObjectiveIds?: readonly string[];
  discoversEdgeIds?: readonly string[];
  discoversNodeIds?: readonly string[];
}

export interface RouteNodeDefinition {
  id: string;
  regionId: string;
  kind: RouteNodeKind;
  presentation: RoutePresentation;
  revisitable: boolean;
  terminal?: boolean;
  requires?: readonly RoutePredicate[];
  excludes?: readonly RoutePredicate[];
  actionIds: readonly string[];
  arrivalPoolIds?: readonly string[];
  arrivalMilestoneIds?: readonly string[];
  activatesObjectiveIds?: readonly string[];
}

export interface RouteEdgeDefinition {
  id: string;
  from: string;
  to: string;
  presentation: RoutePresentation;
  blockedSummary: string;
  travelCost: number;
  visibility: "known" | "discovered";
  requires?: readonly RoutePredicate[];
  excludes?: readonly RoutePredicate[];
  consequenceIds: readonly string[];
  grantsMilestoneIds?: readonly string[];
  activatesObjectiveIds?: readonly string[];
  discoversEdgeIds?: readonly string[];
  discoversNodeIds?: readonly string[];
}

export interface RoutePoolEntryDefinition {
  id: string;
  contentId: string;
  disposition: RoutePoolDisposition;
  weight: number;
  requires?: readonly RoutePredicate[];
  excludes?: readonly RoutePredicate[];
}

export interface RoutePoolDefinition {
  id: string;
  entries: readonly RoutePoolEntryDefinition[];
}

export interface RegionalRouteGraph {
  id: string;
  regionId: string;
  startNodeId: string;
  playablePracticeIds: readonly string[];
  objectives: Readonly<Record<string, RouteObjectiveDefinition>>;
  nodes: Readonly<Record<string, RouteNodeDefinition>>;
  actions: Readonly<Record<string, RouteActionDefinition>>;
  edges: readonly RouteEdgeDefinition[];
  pools: Readonly<Record<string, RoutePoolDefinition>>;
}

export interface RegionalRouteState {
  graphId: string;
  regionId: string;
  currentNodeId: string;
  seed: number;
  visitedNodeIds: string[];
  completedActionIds: string[];
  milestoneIds: string[];
  activeObjectiveIds: string[];
  completedObjectiveIds: string[];
  discoveredNodeIds: string[];
  discoveredEdgeIds: string[];
  seenByPool: Record<string, string[]>;
}

export interface RouteObjectiveSummary {
  id: string;
  label: string;
  summary: string;
  status: "active" | "completed";
  required: boolean;
}

export interface RouteOptionSummary {
  edgeId: string;
  destinationNodeId: string;
  label: string;
  summary: string;
  status: "available" | "blocked";
  travelCost: number;
}

export interface RouteActionSummary {
  actionId: string;
  label: string;
  summary: string;
}

export interface RouteTransition {
  state: RegionalRouteState;
  edgeId: string;
  consequenceIds: readonly string[];
  travelCost: number;
  arrivalPoolIds: readonly string[];
}

export interface RouteInteractionResult {
  state: RegionalRouteState;
  actionId: string;
  consequenceIds: readonly string[];
}

export interface RoutePoolSelection {
  seed: number;
  poolId: string;
  entryId: string;
  contentId: string;
  disposition: RoutePoolDisposition;
}

export interface RoutePoolSelectionResult {
  state: RegionalRouteState;
  selection: RoutePoolSelection;
}
