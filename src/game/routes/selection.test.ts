import { describe, expect, it } from "vitest";
import { createRegionalRouteState } from "./navigation";
import { emptyRouteReadContext } from "./predicates";
import { selectRoutePoolEntry } from "./selection";
import { NORTH_VEY_EXPANSION_ROUTE_GRAPH } from "./fixtures/north-vey-expansion";

describe("regional route pool selection", () => {
  it("is deterministic for the same graph, state, context, and pool", () => {
    const context = emptyRouteReadContext("medium");
    const state = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      41,
      context,
    );
    const first = selectRoutePoolEntry(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      state,
      context,
      "flooded-weir-arrivals",
    );
    const second = selectRoutePoolEntry(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      state,
      context,
      "flooded-weir-arrivals",
    );

    expect(second).toEqual(first);
    expect(state.seenByPool["flooded-weir-arrivals"]).toBeUndefined();
  });

  it("selects every eligible entry across a broad seed sample", () => {
    const context = emptyRouteReadContext("medium");
    const selected = new Set<string>();
    for (let seed = 1; seed <= 256; seed += 1) {
      const state = createRegionalRouteState(
        NORTH_VEY_EXPANSION_ROUTE_GRAPH,
        seed,
        context,
      );
      const result = selectRoutePoolEntry(
        NORTH_VEY_EXPANSION_ROUTE_GRAPH,
        state,
        context,
        "flooded-weir-arrivals",
      );
      if (result) selected.add(result.selection.entryId);
    }

    expect(selected).toEqual(
      new Set([
        "charcoal-burners-crossing",
        "fresh-washout",
        "county-stone-cart",
      ]),
    );
  });

  it("avoids repeats until the eligible pool is exhausted", () => {
    const context = emptyRouteReadContext("medium");
    let state = createRegionalRouteState(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      47,
      context,
    );
    const first = selectRoutePoolEntry(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      state,
      context,
      "tenant-fold-arrivals",
    )!;
    state = first.state;
    const second = selectRoutePoolEntry(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      state,
      context,
      "tenant-fold-arrivals",
    )!;
    state = second.state;
    const third = selectRoutePoolEntry(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      state,
      context,
      "tenant-fold-arrivals",
    )!;
    state = third.state;
    const fourth = selectRoutePoolEntry(
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      state,
      context,
      "tenant-fold-arrivals",
    )!;

    expect(
      new Set([
        first.selection.entryId,
        second.selection.entryId,
        third.selection.entryId,
      ]).size,
    ).toBe(3);
    expect([
      "drovers-under-awning",
      "injured-teamster",
      "rent-agent-count",
    ]).toContain(fourth.selection.entryId);
  });

  it("never selects an ineligible event", () => {
    const context = emptyRouteReadContext("medium");
    for (let seed = 1; seed <= 128; seed += 1) {
      const state = createRegionalRouteState(
        NORTH_VEY_EXPANSION_ROUTE_GRAPH,
        seed,
        context,
      );
      const result = selectRoutePoolEntry(
        NORTH_VEY_EXPANSION_ROUTE_GRAPH,
        state,
        context,
        "weigh-house-arrivals",
      );
      expect(result?.selection.entryId).not.toBe("estate-watch");
    }
  });
});
