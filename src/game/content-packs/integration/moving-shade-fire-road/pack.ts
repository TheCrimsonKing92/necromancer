import type { ContentPack } from "../../types";
import { installContentStoryApproachSurface } from "../../story-approach-runtime";
import {
  FIRE_ROAD_APPROACH_CATALOG,
  FIRE_ROAD_APPROACH_INDEX,
  fireRoadApproachContext,
  fireRoadApproachStatus,
  fireRoadPreparationSummary,
} from "./approaches";
import { FIRE_ROAD_SCENE } from "./scene";
import { FIRE_ROAD_PACK_ID, FIRE_ROAD_SCENE_ID } from "./state";
import { FIRE_ROAD_TRANSITIONS } from "./transitions";

const transitionIds = new Set(FIRE_ROAD_TRANSITIONS.map(({ id }) => id));

const FIRE_ROAD_CONTENT_PACK: ContentPack = Object.freeze({
  id: FIRE_ROAD_PACK_ID,
  version: 1,
  dependencies: ["core"] as const,
  definitions: {
    scenes: [{ id: FIRE_ROAD_SCENE_ID, value: FIRE_ROAD_SCENE }],
  },
  lifecycle: {
    activate: () => installContentStoryApproachSurface({
      ownerId: FIRE_ROAD_PACK_ID,
      sceneId: FIRE_ROAD_SCENE_ID,
      catalog: FIRE_ROAD_APPROACH_CATALOG,
      index: FIRE_ROAD_APPROACH_INDEX,
      transitionIds,
      contextFor: fireRoadApproachContext,
      preparedFor: fireRoadPreparationSummary,
      statusFor: fireRoadApproachStatus,
      visibleFor: (run) => run.packStates?.[FIRE_ROAD_PACK_ID] !== undefined &&
        run.packStates[FIRE_ROAD_PACK_ID]?.version === 1 &&
        (run.packStates[FIRE_ROAD_PACK_ID]?.value as { phase?: string }).phase === "response",
    }),
  },
  rules: { storyTransitions: FIRE_ROAD_TRANSITIONS },
});

export default FIRE_ROAD_CONTENT_PACK;
