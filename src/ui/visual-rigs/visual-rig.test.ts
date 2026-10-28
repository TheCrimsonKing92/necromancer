import { describe, expect, it } from "vitest";
import { QUADRUPED_HOUND_RIG } from "./action-proof-visual-catalog";
import {
  projectAppearanceRecipe,
  validateVisualRig,
  visualNodesForAnatomyPart,
  type VisualRigDefinition,
} from "./visual-rig";

describe("anatomy-independent visual rigs", () => {
  it("maps one quadruped part across canine nodes and two parts into shared forequarters", () => {
    expect(visualNodesForAnatomyPart(QUADRUPED_HOUND_RIG, "leftArm")).toEqual([
      "forequarters",
      "left-foreleg",
      "left-forepaw",
    ]);
    expect(visualNodesForAnatomyPart(QUADRUPED_HOUND_RIG, "rightArm")).toContain("forequarters");

    const recipe = projectAppearanceRecipe({
      rig: QUADRUPED_HOUND_RIG,
      baseLayer: {
        visualId: "cast:ash-hound",
        familyId: "painted-atlas-fallback",
        nodeIds: ["hound-silhouette"],
      },
      anatomyStates: [{
        anatomyPartId: "leftArm",
        visualId: "condition:left-foreleg-hurt",
      }],
    });
    expect(recipe.affectedNodeIds).toEqual([
      "forequarters",
      "left-foreleg",
      "left-forepaw",
    ]);
  });

  it("accepts hound-specific mounts and refuses an invented human hand slot", () => {
    const recipe = projectAppearanceRecipe({
      rig: QUADRUPED_HOUND_RIG,
      baseLayer: {
        visualId: "cast:ash-hound",
        familyId: "painted-atlas-fallback",
        nodeIds: ["hound-silhouette"],
      },
      visualLayers: [
        {
          visualId: "fixture:hound-collar",
          familyId: "hound-neckwear",
          mountId: "hound-neck",
        },
        {
          visualId: "fixture:ritual-knife",
          familyId: "held-one-hand",
          mountId: "human-main-grip",
        },
      ],
    });
    expect(recipe.layers.map(({ visualId }) => visualId)).toContain("fixture:hound-collar");
    expect(recipe.rejectedVisualIds).toEqual(["fixture:ritual-knife"]);
  });

  it("orders layers and records rig-specific occlusion", () => {
    const recipe = projectAppearanceRecipe({
      rig: QUADRUPED_HOUND_RIG,
      baseLayer: {
        visualId: "cast:ash-hound",
        familyId: "painted-atlas-fallback",
        nodeIds: ["hound-silhouette"],
      },
      visualLayers: [{
        visualId: "fixture:burden-harness",
        familyId: "hound-harness",
        mountId: "hound-back",
      }],
      anatomyStates: [{ anatomyPartId: "torso", visualId: "fixture:torn-flank" }],
    });
    expect(recipe.layers.map(({ visualId, layerOrder }) => [visualId, layerOrder])).toEqual([
      ["cast:ash-hound", 0],
      ["fixture:burden-harness", 38],
      ["fixture:torn-flank", 80],
    ]);
    expect(recipe.occludedNodeIds).toEqual(["trunk"]);
  });

  it("admits only finite known motion from the rig profile", () => {
    const badRig: VisualRigDefinition = {
      ...QUADRUPED_HOUND_RIG,
      id: "bad-test-rig",
      motionProfile: {
        id: "bad-motion",
        motions: [{ id: "idle-forever", poseId: "hound-rest", durationMs: 4000, iterations: 1 }],
      },
    };
    expect(validateVisualRig(QUADRUPED_HOUND_RIG)).toEqual([]);
    expect(validateVisualRig(badRig)).toContain(
      "bad-test-rig: motion idle-forever must be finite and at most 1200ms.",
    );

    const recipe = projectAppearanceRecipe({
      rig: QUADRUPED_HOUND_RIG,
      baseLayer: {
        visualId: "cast:ash-hound",
        familyId: "painted-atlas-fallback",
        nodeIds: ["hound-silhouette"],
      },
      motionId: "idle-forever",
    });
    expect(recipe.motionId).toBeUndefined();
    expect(recipe.poseId).toBe("hound-rest");
  });
});
