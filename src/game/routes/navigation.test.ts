import { describe, expect, it } from "vitest";
import {
  completeRouteInteraction,
  createRegionalRouteState,
  navigateRoute,
  routeActionsFor,
  routeOptionsFor,
} from "./navigation";
import { emptyRouteReadContext } from "./predicates";
import { NORTH_VEY_EXPANSION_ROUTE_GRAPH } from "./fixtures/north-vey-expansion";
import { PROVING_GROUND_ROUTE_GRAPH } from "./fixtures/proving-ground";
import type { RegionalRouteState, RouteReadContext } from "./types";

const context: RouteReadContext = {
  ...emptyRouteReadContext("medium"),
  knownActorIds: ["north-vey-factor-clerk"],
  actorStanding: { "north-vey-factor-clerk": 1 },
  resources: { copper: 5, "clean-linen": 2 },
};

const take = (
  state: RegionalRouteState,
  edgeId: string,
): RegionalRouteState => {
  const result = navigateRoute(
    NORTH_VEY_EXPANSION_ROUTE_GRAPH,
    state,
    context,
    edgeId,
  );
  expect(result, `Expected edge ${edgeId} to be available`).not.toBeNull();
  return result!.state;
};

const act = (
  state: RegionalRouteState,
  actionId: string,
): RegionalRouteState => {
  const result = completeRouteInteraction(
    NORTH_VEY_EXPANSION_ROUTE_GRAPH,
    state,
    context,
    actionId,
  );
  expect(result, `Expected action ${actionId} to be available`).not.toBeNull();
  return result!.state;
};

describe("regional route navigation", () => {
  it("keeps optional interactions at the current location", () => {
    const state = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      17,
      context,
    );
    const result = completeRouteInteraction(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      state,
      context,
      "hear-market-reports",
    );

    expect(result?.state.currentNodeId).toBe("vey-market");
    expect(result?.state.completedActionIds).toContain("hear-market-reports");
    expect(state.completedActionIds).not.toContain("hear-market-reports");
  });

  it("does not disclose a hidden route until an interaction discovers it", () => {
    let state = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      17,
      context,
    );
    state = take(state, "market-to-flooded-weir");

    expect(
      routeOptionsFor(NORTH_VEY_EXPANSION_ROUTE_GRAPH, state, context).map(
        (option) => option.edgeId,
      ),
    ).not.toContain("weir-to-weigh-sluice");

    state = act(state, "survey-waterline");
    expect(
      routeOptionsFor(NORTH_VEY_EXPANSION_ROUTE_GRAPH, state, context).map(
        (option) => option.edgeId,
      ),
    ).toContain("weir-to-weigh-sluice");
  });

  it("supports two objective orders which rejoin at the weigh house", () => {
    let crossingFirst = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      19,
      context,
    );
    crossingFirst = take(crossingFirst, "market-to-flooded-weir");
    crossingFirst = act(crossingFirst, "shore-crossing");
    crossingFirst = act(crossingFirst, "survey-waterline");
    crossingFirst = take(crossingFirst, "weir-to-tenant");
    crossingFirst = act(crossingFirst, "compare-rut-marks");
    crossingFirst = take(crossingFirst, "tenant-to-weigh-house");

    let wagonsFirst = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      19,
      context,
    );
    wagonsFirst = take(wagonsFirst, "market-to-tenant-fold");
    wagonsFirst = act(wagonsFirst, "compare-rut-marks");
    wagonsFirst = take(wagonsFirst, "tenant-to-weir");
    wagonsFirst = act(wagonsFirst, "shore-crossing");
    wagonsFirst = act(wagonsFirst, "survey-waterline");
    wagonsFirst = take(wagonsFirst, "weir-to-weigh-sluice");

    expect(crossingFirst.currentNodeId).toBe("abandoned-weigh-house");
    expect(wagonsFirst.currentNodeId).toBe("abandoned-weigh-house");
    expect(new Set(crossingFirst.completedObjectiveIds)).toEqual(
      new Set(["trace-missing-wagons", "secure-northern-crossing"]),
    );
    expect(new Set(wagonsFirst.completedObjectiveIds)).toEqual(
      new Set(["trace-missing-wagons", "secure-northern-crossing"]),
    );
    expect(
      routeOptionsFor(
        NORTH_VEY_EXPANSION_ROUTE_GRAPH,
        wagonsFirst,
        context,
      ).find((option) => option.edgeId === "weigh-house-to-assembly")?.status,
    ).toBe("available");
  });

  it("allows revisiting field locations without consuming their interactions again", () => {
    let state = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      23,
      context,
    );
    state = take(state, "market-to-tenant-fold");
    state = act(state, "compare-rut-marks");
    state = take(state, "tenant-to-market");
    state = take(state, "market-to-tenant-fold");

    expect(state.visitedNodeIds.filter((id) => id === "tenant-fold")).toHaveLength(
      1,
    );
    expect(
      routeActionsFor(NORTH_VEY_EXPANSION_ROUTE_GRAPH, state, context).map(
        (action) => action.actionId,
      ),
    ).not.toContain("compare-rut-marks");
  });

  it("exposes only authored summaries, not predicates or hidden content ids", () => {
    const state = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      29,
      {
        ...context,
        worldFactIds: ["north-vey-ferry-seized"],
      },
    );
    const serialized = JSON.stringify(
      routeOptionsFor(NORTH_VEY_EXPANSION_ROUTE_GRAPH, state, context),
    );

    expect(serialized).not.toContain("north-vey-ferry-seized");
    expect(serialized).not.toContain("weir-to-weigh-sluice");
    expect(serialized).not.toContain("north-vey-");
  });

  it("models the current proving-ground fork and tollhouse rejoin", () => {
    const provingContext = emptyRouteReadContext("summoner");
    const initial = createRegionalRouteState(
      PROVING_GROUND_ROUTE_GRAPH,
      31,
      provingContext,
    );
    const road = navigateRoute(
      PROVING_GROUND_ROUTE_GRAPH,
      initial,
      provingContext,
      "burial-to-ossuary-road",
    )!.state;
    const cut = navigateRoute(
      PROVING_GROUND_ROUTE_GRAPH,
      initial,
      provingContext,
      "burial-to-cut",
    )!.state;
    const roadSettled = completeRouteInteraction(
      PROVING_GROUND_ROUTE_GRAPH,
      road,
      provingContext,
      "settle-ossuary-road",
    )!.state;
    const cutCrossed = completeRouteInteraction(
      PROVING_GROUND_ROUTE_GRAPH,
      cut,
      provingContext,
      "cross-burial-cut",
    )!.state;

    expect(
      navigateRoute(
        PROVING_GROUND_ROUTE_GRAPH,
        roadSettled,
        provingContext,
        "ossuary-road-to-tollhouse",
      )?.state.currentNodeId,
    ).toBe("hollow-tollhouse");
    expect(
      navigateRoute(
        PROVING_GROUND_ROUTE_GRAPH,
        cutCrossed,
        provingContext,
        "burial-cut-to-tollhouse",
      )?.state.currentNodeId,
    ).toBe("hollow-tollhouse");
  });
});
