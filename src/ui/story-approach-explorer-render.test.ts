import { describe, expect, it } from "vitest";
import {
  createStoryApproachIndex,
  type StoryApproachCatalog,
} from "../game/story-approaches";
import { reduceStoryApproachExplorerAction } from "./story-approach-explorer-action";
import {
  DEFAULT_STORY_APPROACH_EXPLORER_STATE,
  renderStoryApproachExplorer,
} from "./story-approach-explorer-render";

const catalog: StoryApproachCatalog = {
  objectives: [{ id: "evacuate", label: "Get people out" }],
  capabilities: [{ id: "survival", label: "Survival" }],
  targets: [{ id: "orchard-track", label: "The orchard track" }],
  approaches: [
    {
      id: "fixture:assess-orchard",
      label: "Test the orchard track",
      lead: "Learn whether the hidden track can bear the living.",
      detail: "Read the wind and ground before sending carts through.",
      objectives: ["evacuate"],
      capabilities: ["survival"],
      targets: ["orchard-track"],
      timing: "observation",
      repeatability: "once",
      transitionId: "fixture:assess-orchard",
      prominence: "practice",
      resolution: { kind: "mundane-check", skill: "survival", difficulty: 5 },
      tempo: {
        cost: 1,
        relief: { success: 1 },
        label: "May preserve room to act",
        detail: "A sound route keeps the evacuation from losing ground.",
      },
      knownImmediateCost: "The fire continues while you range beyond the houses.",
    },
  ],
};

const resolutions = new Map([
  ["fixture:assess-orchard", {
    summary: "Survival 2 · Practiced · Favorable",
    method: "Survival 2 · Practiced",
    prospect: "Favorable" as const,
    detail: "Prospect under the present conditions: Favorable.",
  }],
]);

describe("story approach explorer projection", () => {
  it("stays compact while closed and keeps preparation state readable", () => {
    const markup = renderStoryApproachExplorer({
      catalog,
      index: createStoryApproachIndex(catalog.approaches),
      context: { availability: {} },
      state: DEFAULT_STORY_APPROACH_EXPLORER_STATE,
      prepared: [{ id: "carts", label: "Four carts secured", tone: "secured" }],
      resolutions,
      status: {
        eyebrow: "Operating room",
        title: "Several courses remain open.",
        detail: "Substantial actions advance the scene.",
      },
    });

    expect(markup).toContain("Work secured");
    expect(markup).toContain("What now favors the town");
    expect(markup).toContain("Four carts secured");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Several courses remain open.");
    expect(markup).toContain("Your practice sees another course");
    expect(markup).toContain("Consider this approach");
    expect(markup).not.toContain("data-story-approach-explorer");
  });

  it("features newly completed work before settling it into the compact record", () => {
    const prepared = [{
      id: "host-need",
      label: "The host's supply need is known",
      detail: "Strengthens the seasonal counteroffer",
      tone: "secured" as const,
      outcome: {
        eyebrow: "THE HOST CANNOT HIDE ITS HUNGER",
        title: "The remount lines betray the ordinance.",
        body: "Fresh horses stand too few among the foreign host.",
        result: "You gain bargaining leverage for the seasonal counteroffer.",
      },
    }];
    const input = {
      catalog,
      index: createStoryApproachIndex(catalog.approaches),
      context: { availability: {} },
      prepared,
      resolutions,
    };

    const featured = renderStoryApproachExplorer({
      ...input,
      state: {
        ...DEFAULT_STORY_APPROACH_EXPLORER_STATE,
        featuredPreparationId: "host-need",
      },
    });
    const settled = renderStoryApproachExplorer({
      ...input,
      state: DEFAULT_STORY_APPROACH_EXPLORER_STATE,
    });

    expect(featured).toContain("data-preparation-outcome");
    expect(featured).toContain("The remount lines betray the ordinance.");
    expect(featured).toContain("You gain bargaining leverage");
    expect(featured).not.toContain("What now favors the town");
    expect(settled).toContain("What now favors the town");
    expect(settled).toContain("story-preparation-summary__copy");
    expect(settled).not.toContain("data-preparation-outcome");
  });

  it("renders three browse axes, explicit unavailable reasons, and a disabled confirmation", () => {
    const markup = renderStoryApproachExplorer({
      catalog,
      index: createStoryApproachIndex(catalog.approaches),
      context: {
        availability: {
          "fixture:assess-orchard": {
            state: "needs-preparation",
            reason: "The orchard gate remains locked.",
          },
        },
      },
      state: {
        open: true,
        axis: "capability",
        facetId: "survival",
        selectedApproachId: "fixture:assess-orchard",
      },
      prepared: [],
      resolutions,
    });

    expect(markup).toContain("By objective");
    expect(markup).toContain("By capability");
    expect(markup).toContain("By target");
    expect(markup).toContain('role="group"');
    expect(markup).toContain("Learn whether the hidden track can bear the living.");
    expect(markup.match(/Read the wind and ground before sending carts through\./g)).toHaveLength(1);
    expect(markup.match(/The orchard gate remains locked\./g)).toHaveLength(1);
    expect(markup).toContain("The orchard gate remains locked.");
    expect(markup).toContain("Known immediate cost");
    expect(markup).toContain("Uses Survival 2 · Practiced · Favorable");
    expect(markup).toContain("How it resolves");
    expect(markup).toContain("Prospect under the present conditions: Favorable.");
    expect(markup).toContain("May preserve room to act");
    expect(markup).toContain("Scene pressure");
    expect(markup).not.toMatch(/\d+%/);
    expect(markup).toMatch(/confirm-story-approach[^>]* disabled/);
    expect(markup).not.toContain("title=");
  });

  it("removes closed opportunities while leaving their completed work in the summary", () => {
    const markup = renderStoryApproachExplorer({
      catalog,
      index: createStoryApproachIndex(catalog.approaches),
      context: {
        availability: {
          "fixture:assess-orchard": {
            state: "opportunity-closed",
            reason: "The orchard track has already been assessed.",
          },
        },
      },
      state: {
        open: true,
        axis: "objective",
        facetId: "evacuate",
        selectedApproachId: "fixture:assess-orchard",
      },
      prepared: [
        { id: "orchard", label: "The orchard track is known", tone: "secured" },
      ],
      resolutions,
    });

    expect(markup).toContain("The orchard track is known");
    expect(markup).not.toContain("Test the orchard track");
    expect(markup).not.toContain("Opportunity closed");
    expect(markup).not.toContain("The orchard track has already been assessed.");
  });

  it("omits inapplicable approaches while retaining and prioritizing attainable ones", () => {
    const expandedCatalog: StoryApproachCatalog = {
      ...catalog,
      approaches: [
        catalog.approaches[0]!,
        {
          ...catalog.approaches[0]!,
          id: "fixture:other-practice",
          label: "Invoke another practice",
          transitionId: "fixture:other-practice",
        },
        {
          ...catalog.approaches[0]!,
          id: "fixture:ready-course",
          label: "Take the ready course",
          transitionId: "fixture:ready-course",
        },
      ],
    };
    const markup = renderStoryApproachExplorer({
      catalog: expandedCatalog,
      index: createStoryApproachIndex(expandedCatalog.approaches),
      context: { availability: {
        "fixture:assess-orchard": {
          state: "needs-preparation",
          reason: "The orchard gate remains locked.",
        },
        "fixture:other-practice": {
          state: "inapplicable",
          reason: "This belongs to another practice.",
        },
      } },
      state: {
        open: true,
        axis: "objective",
        facetId: "evacuate",
        selectedApproachId: "fixture:assess-orchard",
      },
      prepared: [],
      resolutions,
    });

    expect(markup).not.toContain("Invoke another practice");
    expect(markup).not.toContain("This belongs to another practice");
    expect(markup.indexOf("Take the ready course")).toBeLessThan(
      markup.indexOf("Test the orchard track"),
    );
    expect(markup).toContain("The orchard gate remains locked");
  });

  it("reduces delegated controls without resolving authoritative transitions", () => {
    const opened = reduceStoryApproachExplorerAction(
      DEFAULT_STORY_APPROACH_EXPLORER_STATE,
      { dataset: { action: "open-story-approach-explorer" } as DOMStringMap },
    );
    const selected = reduceStoryApproachExplorerAction(opened!.state, {
      dataset: {
        action: "select-story-approach",
        approachId: "fixture:assess-orchard",
      } as DOMStringMap,
    });
    const featured = reduceStoryApproachExplorerAction(
      DEFAULT_STORY_APPROACH_EXPLORER_STATE,
      {
        dataset: {
          action: "open-featured-story-approach",
          approachId: "fixture:assess-orchard",
          approachFacetId: "survival",
        } as DOMStringMap,
      },
    );
    const confirmed = reduceStoryApproachExplorerAction(selected!.state, {
      dataset: {
        action: "confirm-story-approach",
        approachId: "fixture:assess-orchard",
      } as DOMStringMap,
    });

    expect(confirmed).toMatchObject({
      confirmApproachId: "fixture:assess-orchard",
      state: { open: true, selectedApproachId: "fixture:assess-orchard" },
    });
    expect(featured).toMatchObject({
      state: {
        open: true,
        axis: "capability",
        facetId: "survival",
        selectedApproachId: "fixture:assess-orchard",
      },
    });

    const dismissed = reduceStoryApproachExplorerAction(
      {
        ...DEFAULT_STORY_APPROACH_EXPLORER_STATE,
        featuredPreparationId: "host-need",
      },
      {
        dataset: {
          action: "dismiss-story-approach-outcome",
        } as DOMStringMap,
      },
    );
    expect(dismissed?.state.featuredPreparationId).toBeUndefined();
  });
});
