import { describe, expect, it } from "vitest";
import { createPlayer } from "./engine/combatants";
import {
  storyApproachResolutionReadout,
} from "./story-approach-resolution";
import type {
  StoryApproachCatalog,
  StoryApproachDefinition,
} from "./story-approaches";

const catalog: StoryApproachCatalog = {
  objectives: [{ id: "hold-road", label: "Hold the road" }],
  capabilities: [
    { id: "survival", label: "Survival" },
    { id: "command-dead-initiative", label: "Bound servant" },
  ],
  targets: [{ id: "fire-line", label: "The fire line" }],
  approaches: [],
};

const approach = (
  resolution: StoryApproachDefinition["resolution"],
  capabilities: StoryApproachDefinition["capabilities"] = ["survival"],
): StoryApproachDefinition => ({
  id: "fixture:hold-road",
  label: "Hold the road",
  lead: "Choose the ground.",
  detail: "Keep one road open.",
  objectives: ["hold-road"],
  capabilities,
  targets: ["fire-line"],
  timing: "preparation",
  repeatability: "once",
  transitionId: "fixture:hold-road",
  resolution,
});

describe("story approach resolution readout", () => {
  it("shows the player's actual mundane rank and a qualitative prospect without a percentage", () => {
    const player = createPlayer("Mara", "medium", "female");
    player.skills.survival = 2;
    const readout = storyApproachResolutionReadout(
      approach({ kind: "mundane-check", skill: "survival", difficulty: 5 }),
      catalog,
      player,
    );

    expect(readout.method).toBe("Survival 2 · Practiced");
    expect(readout.prospect).toBe("Strong");
    expect(readout.detail).toBe("Prospect under the present conditions: Strong.");
    expect(JSON.stringify(readout)).not.toMatch(/\d+%/);
  });

  it("describes requirement-bound authored actions as assured instead of inventing a roll", () => {
    const readout = storyApproachResolutionReadout(
      approach({ kind: "certain" }, ["command-dead-initiative"]),
      catalog,
      createPlayer("Mara", "summoner", "female"),
    );

    expect(readout).toMatchObject({
      method: "Bound servant",
      prospect: "Assured",
      summary: "Bound servant · Assured",
    });
  });
});
