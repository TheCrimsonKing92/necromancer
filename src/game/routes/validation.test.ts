import { describe, expect, it } from "vitest";
import { NORTH_VEY_EXPANSION_ROUTE_GRAPH } from "./fixtures/north-vey-expansion";
import { PROVING_GROUND_ROUTE_GRAPH } from "./fixtures/proving-ground";
import {
  practiceCanCompleteRequiredObjectives,
  validateRegionalRouteGraph,
} from "./validation";

describe("regional route graph validation", () => {
  it("accepts the proving ground and expansion foundation", () => {
    expect(validateRegionalRouteGraph(PROVING_GROUND_ROUTE_GRAPH)).toEqual([]);
    expect(validateRegionalRouteGraph(NORTH_VEY_EXPANSION_ROUTE_GRAPH)).toEqual(
      [],
    );
  });

  it("proves every current playable practice can complete required objectives", () => {
    for (const graph of [
      PROVING_GROUND_ROUTE_GRAPH,
      NORTH_VEY_EXPANSION_ROUTE_GRAPH,
    ]) {
      for (const practiceId of graph.playablePracticeIds) {
        expect(
          practiceCanCompleteRequiredObjectives(graph, practiceId),
          `${practiceId} should be able to complete ${graph.id}`,
        ).toBe(true);
      }
    }
  });

  it("reports malformed references, weights, and undiscoverable hidden edges", () => {
    const malformed = {
      ...NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      actions: Object.fromEntries(
        Object.entries(NORTH_VEY_EXPANSION_ROUTE_GRAPH.actions).map(
          ([id, action]) => [
            id,
            {
              ...action,
              discoversEdgeIds:
                id === "survey-waterline" ? [] : action.discoversEdgeIds,
            },
          ],
        ),
      ),
      nodes: {
        ...NORTH_VEY_EXPANSION_ROUTE_GRAPH.nodes,
        "vey-market": {
          ...NORTH_VEY_EXPANSION_ROUTE_GRAPH.nodes["vey-market"]!,
          actionIds: ["missing-action"],
        },
      },
      pools: {
        ...NORTH_VEY_EXPANSION_ROUTE_GRAPH.pools,
        "flooded-weir-arrivals": {
          ...NORTH_VEY_EXPANSION_ROUTE_GRAPH.pools[
            "flooded-weir-arrivals"
          ]!,
          entries: [
            {
              ...NORTH_VEY_EXPANSION_ROUTE_GRAPH.pools[
                "flooded-weir-arrivals"
              ]!.entries[0]!,
              weight: 0,
            },
          ],
        },
      },
    };
    const errors = validateRegionalRouteGraph(malformed);

    expect(errors.some((error) => error.includes("missing-action"))).toBe(true);
    expect(errors.some((error) => error.includes("invalid weight"))).toBe(true);
    expect(
      errors.some(
        (error) =>
          error.includes("weir-to-weigh-sluice") &&
          error.includes("no discovery source"),
      ),
    ).toBe(true);
  });

  it("detects a route that cannot reach its required conclusion", () => {
    const broken = {
      ...NORTH_VEY_EXPANSION_ROUTE_GRAPH,
      edges: NORTH_VEY_EXPANSION_ROUTE_GRAPH.edges.filter(
        (edge) => edge.id !== "weigh-house-to-assembly",
      ),
    };

    for (const practiceId of broken.playablePracticeIds) {
      expect(practiceCanCompleteRequiredObjectives(broken, practiceId)).toBe(
        false,
      );
    }
  });
});
