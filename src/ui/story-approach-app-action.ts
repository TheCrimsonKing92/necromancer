import { chooseStoryApproach } from "../game/engine/story-approach-transitions";
import { storyApproachSurfaceFor } from "../game/content-packs/story-approach-runtime";
import type { EngineResult, GameState } from "../game/types";
import { focusKeyFor, type FocusIntent } from "./focus-management";
import { reduceStoryApproachExplorerAction } from "./story-approach-explorer-action";
import { patchStoryApproachExplorer } from "./story-approach-dom";
import {
  DEFAULT_STORY_APPROACH_EXPLORER_STATE,
  type StoryApproachExplorerState,
} from "./story-approach-explorer-render";

export interface StoryApproachAppActionResult {
  readonly explorerState: StoryApproachExplorerState;
  readonly result?: EngineResult;
  readonly focusIntent?: FocusIntent;
  readonly patched?: boolean;
}

export const resolveStoryApproachAppAction = (
  root: HTMLElement,
  state: GameState,
  explorerState: StoryApproachExplorerState,
  origin: HTMLElement,
): StoryApproachAppActionResult | undefined => {
  const action = reduceStoryApproachExplorerAction(explorerState, origin);
  if (!action) return undefined;
  if (!action.confirmApproachId) {
    return {
      explorerState: action.state,
      patched: patchStoryApproachExplorer(root, state, action.state),
    };
  }
  const previousPreparationIds = new Set(
    state.storyId && state.run
      ? (storyApproachSurfaceFor(state.storyId, state.run)?.prepared ?? []).map(
          ({ id }) => id,
        )
      : [],
  );
  const result = chooseStoryApproach(state, action.confirmApproachId);
  const featuredPreparationId =
    !result.error && result.state.storyId && result.state.run
      ? storyApproachSurfaceFor(
          result.state.storyId,
          result.state.run,
        )?.prepared.find(({ id }) => !previousPreparationIds.has(id))?.id
      : undefined;
  const nextExplorerState = result.error
      ? action.state
      : {
        ...DEFAULT_STORY_APPROACH_EXPLORER_STATE,
        featuredPreparationId,
      };
  return {
    explorerState: nextExplorerState,
    result,
    focusIntent: result.error
      ? {
          kind: "restore",
          key: focusKeyFor("set-story-approach-axis", {
            approachAxis: nextExplorerState.axis,
          }),
        }
      : "result",
  };
};
