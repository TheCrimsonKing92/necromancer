import { describe, expect, it } from "vitest";
import { FIRE_ROAD_LOCATIONS } from "../../../game/development-prototypes/fire-road/road-under-ash-navigation";
import { validateActionProofSceneArt } from "../action-proof-scene-art";
import { ROAD_UNDER_ASH_SCENE_ART, fireRoadSceneAnchorStyle } from "./road-under-ash-art";

describe("Fire Road navigation art", () => {
  it("maps every authoritative position to both responsive compositions", () => {
    expect(validateActionProofSceneArt(ROAD_UNDER_ASH_SCENE_ART)).toEqual([]);
    expect(ROAD_UNDER_ASH_SCENE_ART.anchors.map(({ id }) => id).sort()).toEqual(Object.keys(FIRE_ROAD_LOCATIONS).sort());
    expect(fireRoadSceneAnchorStyle("bridge-support")).toContain("--stage-mobile-x:50%");
  });
});
