import { describe, expect, it } from "vitest";
import {
  actionProofSpatialTurnGroups,
  actionProofTravelVector,
} from "./action-proof-spatial-motion";

describe("action-proof spatial motion", () => {
  it("derives the inverse travel vector needed to animate from the prior position", () => {
    expect(actionProofTravelVector({ x: 20, y: 40 }, { x: 68, y: 76 })).toEqual({
      x: -48,
      y: -36,
      distance: 60,
    });
  });

  it("orders moving characters by exchange phase while keeping coordinated groups together", () => {
    expect(actionProofSpatialTurnGroups([
      "hound",
      "households",
      "necromancer",
      "sera",
      "ditch-hand",
      "raised-carter",
    ])).toEqual([
      ["necromancer"],
      ["ditch-hand"],
      ["raised-carter"],
      ["households", "sera"],
      ["hound"],
    ]);
  });
});
