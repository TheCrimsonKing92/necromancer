import type {
  StoryApproachAxis,
  StoryApproachId,
} from "../game/story-approaches";
import {
  DEFAULT_STORY_APPROACH_EXPLORER_STATE,
  type StoryApproachExplorerState,
} from "./story-approach-explorer-render";

const isAxis = (value: string | undefined): value is StoryApproachAxis =>
  value === "objective" || value === "capability" || value === "target";

export interface StoryApproachExplorerActionResult {
  readonly state: StoryApproachExplorerState;
  readonly confirmApproachId?: StoryApproachId;
}

/** Pure delegated-event projection. It never resolves an approach or mutates game state. */
export const reduceStoryApproachExplorerAction = (
  state: StoryApproachExplorerState,
  element: Readonly<{
    dataset: DOMStringMap;
  }>,
): StoryApproachExplorerActionResult | undefined => {
  const action = element.dataset.action;
  if (action === "open-story-approach-explorer") {
    return { state: { ...state, open: true } };
  }
  if (action === "open-featured-story-approach") {
    const approachId = element.dataset.approachId as StoryApproachId | undefined;
    const facetId = element.dataset.approachFacetId;
    if (!approachId || !facetId) return undefined;
    return {
      state: {
        open: true,
        axis: "capability",
        facetId,
        selectedApproachId: approachId,
      },
    };
  }
  if (action === "close-story-approach-explorer") {
    return {
      state: {
        ...DEFAULT_STORY_APPROACH_EXPLORER_STATE,
        featuredPreparationId: state.featuredPreparationId,
      },
    };
  }
  if (action === "dismiss-story-approach-outcome") {
    return { state: { ...state, featuredPreparationId: undefined } };
  }
  if (action === "set-story-approach-axis") {
    const axis = element.dataset.approachAxis;
    if (!isAxis(axis)) return undefined;
    return { state: { open: true, axis } };
  }
  if (action === "select-story-approach-facet") {
    const axis = element.dataset.approachAxis;
    const facetId = element.dataset.approachFacetId;
    if (!isAxis(axis) || !facetId) return undefined;
    return { state: { open: true, axis, facetId } };
  }
  if (action === "select-story-approach") {
    const approachId = element.dataset.approachId as
      | StoryApproachId
      | undefined;
    if (!approachId) return undefined;
    return { state: { ...state, open: true, selectedApproachId: approachId } };
  }
  if (action === "confirm-story-approach") {
    const approachId = element.dataset.approachId as
      | StoryApproachId
      | undefined;
    if (!approachId) return undefined;
    return { state, confirmApproachId: approachId };
  }
  return undefined;
};
