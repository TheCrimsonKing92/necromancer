import { describe, expect, it } from "vitest";
import {
  createStoryApproachIndex,
  storyApproachById,
  storyApproachIsBrowsable,
  storyApproachesForFacet,
  validateStoryApproachCatalog,
  validateStoryApproachReadContext,
  type StoryApproachCatalog,
} from "./story-approaches";

const catalog: StoryApproachCatalog = {
  objectives: [
    { id: "evacuate", label: "Get people out" },
    { id: "find-route", label: "Find another route" },
  ],
  capabilities: [
    { id: "survival", label: "Survival" },
    { id: "athletics", label: "Athletics" },
  ],
  targets: [
    { id: "orchard-track", label: "The orchard track" },
    { id: "eastern-road", label: "The eastern road" },
  ],
  approaches: [
    {
      id: "fixture:assess-orchard",
      label: "Test the orchard track",
      lead: "Learn whether the hidden track can bear the living.",
      detail: "Read the wind and ground before sending carts through.",
      objectives: ["evacuate", "find-route"],
      capabilities: ["survival"],
      targets: ["orchard-track"],
      timing: "observation",
      repeatability: "once",
      transitionId: "fixture:assess-orchard",
      resolution: { kind: "mundane-check", skill: "survival", difficulty: 5 },
      knownImmediateCost: "The fire continues while you range beyond the houses.",
    },
    {
      id: "fixture:clear-road",
      label: "Clear the eastern road",
      lead: "Put the road back beneath the waiting wheels.",
      detail: "Put shoulders and tools against the fallen cart.",
      objectives: ["evacuate"],
      capabilities: ["athletics"],
      targets: ["eastern-road"],
      timing: "preparation",
      repeatability: "while-opportunity-remains",
      transitionId: "fixture:clear-road",
      resolution: { kind: "mundane-check", skill: "athletics" },
    },
  ],
};

describe("authored story approaches", () => {
  it("indexes one authored approach through objective, capability, and target", () => {
    const index = createStoryApproachIndex(catalog.approaches);
    const context = { availability: {} };

    expect(
      storyApproachesForFacet(index, context, "objective", "find-route").map(
        ({ id }) => id,
      ),
    ).toEqual(["fixture:assess-orchard"]);
    expect(
      storyApproachesForFacet(index, context, "capability", "survival").map(
        ({ id }) => id,
      ),
    ).toEqual(["fixture:assess-orchard"]);
    expect(
      storyApproachesForFacet(index, context, "target", "orchard-track").map(
        ({ id }) => id,
      ),
    ).toEqual(["fixture:assess-orchard"]);
  });

  it("projects truthful availability without mutating the authored definition", () => {
    const index = createStoryApproachIndex(catalog.approaches);
    const definition = catalog.approaches[0]!;
    const view = storyApproachById(index, {
      availability: {
        "fixture:assess-orchard": {
          state: "needs-preparation",
          reason: "You need access beyond the locked orchard gate.",
        },
      },
    }, "fixture:assess-orchard");

    expect(view?.availability).toEqual({
      state: "needs-preparation",
      reason: "You need access beyond the locked orchard gate.",
    });
    expect("availability" in definition).toBe(false);
  });

  it("distinguishes attainable preparation from irrelevant or closed courses", () => {
    const definition = catalog.approaches[0]!;
    const view = (state: "available" | "needs-preparation" | "inapplicable" | "opportunity-closed") => ({
      ...definition,
      availability: { state },
    });

    expect(storyApproachIsBrowsable(view("available"))).toBe(true);
    expect(storyApproachIsBrowsable(view("needs-preparation"))).toBe(true);
    expect(storyApproachIsBrowsable(view("inapplicable"))).toBe(false);
    expect(storyApproachIsBrowsable(view("opportunity-closed"))).toBe(false);
  });

  it("rejects dangling indexes, transitions, duplicates, and vague unavailability", () => {
    expect(
      validateStoryApproachCatalog(
        {
          ...catalog,
          approaches: [
            catalog.approaches[0]!,
            {
              ...catalog.approaches[0]!,
              objectives: ["missing", "missing"],
              capabilities: ["athletics"],
              transitionId: "fixture:missing-transition",
            },
          ],
        },
        new Set(["fixture:assess-orchard"]),
      ),
    ).toEqual(
      expect.arrayContaining([
        "fixture:assess-orchard is duplicated.",
        "fixture:assess-orchard references missing transition fixture:missing-transition.",
        "fixture:assess-orchard repeats objective missing.",
        "fixture:assess-orchard references unknown objective missing.",
        "fixture:assess-orchard resolves with survival but does not index that capability.",
      ]),
    );
    expect(
      validateStoryApproachReadContext(catalog, {
        availability: {
          "fixture:assess-orchard": { state: "opportunity-closed" },
          "fixture:unknown": { state: "available" },
        },
      }),
    ).toEqual([
      "fixture:assess-orchard requires a truthful unavailable reason.",
      "Availability references unknown approach fixture:unknown.",
    ]);
  });

  it("rejects malformed authored pressure rules", () => {
    expect(validateStoryApproachCatalog({
      ...catalog,
      approaches: [{
        ...catalog.approaches[0]!,
        tempo: {
          cost: -1,
          relief: { success: -2 },
          label: "",
          detail: "",
        },
      }],
    }, new Set(["fixture:assess-orchard"]))).toContain(
      "fixture:assess-orchard has an invalid tempo rule.",
    );
  });

  it("requires deliberate combined methods for multi-capability indexing", () => {
    const multiCapability = {
      ...catalog.approaches[0]!,
      capabilities: ["survival", "athletics"],
    } as const;

    expect(validateStoryApproachCatalog(
      { ...catalog, approaches: [multiCapability] },
      new Set(["fixture:assess-orchard"]),
    )).toContain(
      "fixture:assess-orchard lists multiple capabilities without declaring a combined method.",
    );

    expect(validateStoryApproachCatalog(
      {
        ...catalog,
        approaches: [{ ...multiCapability, capabilityMode: "combined" }],
      },
      new Set(["fixture:assess-orchard"]),
    )).toEqual([]);
  });
});
