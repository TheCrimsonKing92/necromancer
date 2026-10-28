import type { FireRoadPositionId } from "../../../game/development-prototypes/fire-road/road-under-ash-navigation";
import {
  actionProofSceneAnchorIndex,
  actionProofSceneAnchorStyle,
  validateActionProofSceneArt,
  type ActionProofSceneAnchor,
  type ActionProofSceneArtDefinition,
} from "../action-proof-scene-art";

const anchor = (
  id: FireRoadPositionId,
  ground: ActionProofSceneAnchor["ground"],
  desktop: ActionProofSceneAnchor["desktop"],
  mobile: ActionProofSceneAnchor["mobile"],
  depth: number,
): ActionProofSceneAnchor => ({ id, ground, desktop, mobile, depth });

export const ROAD_UNDER_ASH_SCENE_ART: ActionProofSceneArtDefinition = {
  id: "fire-road:road-under-ash:v3",
  projection: "isometric",
  desktop: {
    src: "/assets/scenes/fire-road-navigation-v4.webp",
    width: 1672,
    height: 941,
  },
  mobile: {
    src: "/assets/scenes/fire-road-navigation-mobile-v4.webp",
    width: 941,
    height: 1672,
  },
  standingFigureHeightPercent: 12,
  anchors: [
    anchor("safety-road", "road", [14, 76], [30, 72], 8),
    anchor("west-verge", "road", [20, 72], [36, 68], 9),
    anchor("yard-lane", "yard", [29, 52], [38, 44], 10),
    anchor("carter-side", "road", [45, 57], [48, 49], 11),
    anchor("bridge-approach", "road", [44, 66], [47, 60], 12),
    anchor("bridge-support", "bridge", [51, 68], [50, 58], 13),
    anchor("wagon-flank", "road", [62, 56], [61, 47], 14),
    anchor("eastern-road", "road", [69, 49], [68, 48], 15),
    anchor("evacuee-line", "road", [75, 43], [72, 45], 16),
    anchor("brush-edge", "wild", [80, 48], [78, 47], 17),
    anchor("far-scrub", "wild", [86, 54], [84, 46], 18),
  ],
  stateLayers: [
    {
      id: "broken-grain-wagon",
      asset: { src: "/assets/scenes/fire-road-wreck-v1-768.png", width: 768, height: 512 },
      anchorId: "wagon-flank",
      purpose: "The authored obstruction that blocks the evacuation lane.",
    },
  ],
};

const sceneErrors = validateActionProofSceneArt(ROAD_UNDER_ASH_SCENE_ART);
if (sceneErrors.length) throw new Error(sceneErrors.join("\n"));

const FIRE_ROAD_ANCHORS = actionProofSceneAnchorIndex(ROAD_UNDER_ASH_SCENE_ART);

export const fireRoadSceneAnchor = (position: FireRoadPositionId): ActionProofSceneAnchor => {
  const result = FIRE_ROAD_ANCHORS.get(position);
  if (!result) throw new Error(`Fire Road scene art is missing ${position}.`);
  return result;
};

export const fireRoadSceneAnchorStyle = (position: FireRoadPositionId): string =>
  actionProofSceneAnchorStyle(fireRoadSceneAnchor(position));
