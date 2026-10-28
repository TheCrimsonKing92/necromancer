import { describe, expect, it } from "vitest";
import {
  ACTION_PROOF_ENTRY_MOTION,
  motionForRenderedFigure,
  motionCuesForActionProofIntent,
} from "./action-proof-motion";

describe("direct-play bounded motion cues", () => {
  it("describes action causality without using a timer or persisted state", () => {
    expect(motionCuesForActionProofIntent({ kind: "act", actionId: "strike", targetId: "hound" })).toEqual([
      { entityId: "player", motionId: "commit" },
      { entityId: "necromancer", motionId: "commit" },
      { entityId: "hound", motionId: "recoil", delayMs: 150 },
    ]);
    expect(ACTION_PROOF_ENTRY_MOTION).toEqual([{ entityId: "*", motionId: "settle" }]);
  });

  it("applies only motion supported by the rendered rig", () => {
    const cues = [
      { entityId: "hound", motionId: "recoil" },
      { entityId: "households", motionId: "recoil" },
    ] as const;
    expect(motionForRenderedFigure("hound", ["settle", "recoil", "dissolve"], cues)).toBe("recoil");
    expect(motionForRenderedFigure("households", ["settle", "advance"], cues)).toBeUndefined();
  });
});
