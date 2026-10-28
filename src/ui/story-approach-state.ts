import type { StoryApproachAxis, StoryApproachId } from "../game/story-approaches";

export interface StoryApproachExplorerState {
  readonly open: boolean;
  readonly axis: StoryApproachAxis;
  readonly facetId?: string;
  readonly selectedApproachId?: StoryApproachId;
  readonly featuredPreparationId?: string;
}

export const DEFAULT_STORY_APPROACH_EXPLORER_STATE = Object.freeze({
  open: false,
  axis: "objective",
} satisfies StoryApproachExplorerState);
