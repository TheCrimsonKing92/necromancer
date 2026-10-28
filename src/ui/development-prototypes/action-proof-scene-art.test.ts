import { describe, expect, it } from "vitest";
import {
  actionProofSceneAnchorIndex,
  actionProofSceneAnchorStyle,
  validateActionProofSceneArt,
  type ActionProofSceneArtDefinition,
} from "./action-proof-scene-art";

const validScene: ActionProofSceneArtDefinition = {
  id: "road-proof",
  projection: "isometric",
  desktop: { src: "/road.jpg", width: 1600, height: 900 },
  mobile: { src: "/road-mobile.jpg", width: 900, height: 1600 },
  standingFigureHeightPercent: 12,
  anchors: [
    { id: "bridge", ground: "bridge", desktop: [42, 66], mobile: [51, 70], depth: 6 },
  ],
  stateLayers: [
    { id: "broken-wagon", asset: { src: "/wagon.webp", width: 512, height: 256 }, anchorId: "bridge", purpose: "Blocks the crossing" },
  ],
};

describe("action-proof scene art", () => {
  it("validates responsive plates, scale, anchors, and state-layer ownership", () => {
    expect(validateActionProofSceneArt(validScene)).toEqual([]);
    expect(actionProofSceneAnchorIndex(validScene).get("bridge")?.ground).toBe("bridge");
    expect(actionProofSceneAnchorStyle(validScene.anchors[0]!)).toContain("--stage-mobile-x:51%");
  });

  it("rejects impossible placement and dangling state layers", () => {
    expect(validateActionProofSceneArt({
      ...validScene,
      standingFigureHeightPercent: 31,
      anchors: [{ ...validScene.anchors[0]!, desktop: [120, 66] }],
      stateLayers: [{ ...validScene.stateLayers[0]!, anchorId: "missing" }],
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("standing figure scale"),
      expect.stringContaining("outside a scene plate"),
      expect.stringContaining("missing anchor"),
    ]));
  });
});

