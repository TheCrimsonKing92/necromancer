import { OPENING_BURIAL_SCENES } from "./content/opening-burial";
import { SAINT_WAKE_SCENES } from "./content/saint-wake";
import { TOLL_ROAD_SCENES } from "./content/toll-road";
import { contentStorySceneFor } from "./content-packs/story-runtime-port";
import type { ActiveStoryId, StoryId, StoryScene } from "./types";

export {
  ACTIONS,
  getPlayerActionIds,
  TRADITIONS,
} from "./content/definitions";
export {
  storyChoiceCompletionFlag,
  storyChoiceDetailFor,
  storyChoiceIsComplete,
  storyChoiceLabelFor,
  storyChoicesFor,
  storyEyebrowFor,
  storyOutcomeDismissalFlag,
  storyTitleFor,
} from "./content/story-selectors";

export const STORY_SCENES: Record<StoryId, StoryScene> = {
  ...OPENING_BURIAL_SCENES,
  ...TOLL_ROAD_SCENES,
  ...SAINT_WAKE_SCENES,
} as Record<StoryId, StoryScene>;

export const storySceneFor = (id: ActiveStoryId): StoryScene | undefined =>
  Object.hasOwn(STORY_SCENES, id)
    ? STORY_SCENES[id as StoryId]
    : contentStorySceneFor(id);
