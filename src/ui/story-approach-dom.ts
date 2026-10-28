import type { GameState } from "../game/types";
import { storyApproachSurfaceFor } from "../game/content-packs/story-approach-runtime";
import { completeDomUpdate, focusKeyFor } from "./focus-management";
import {
  renderStoryApproachExplorer,
  type StoryApproachExplorerState,
} from "./story-approach-explorer-render";

export const patchStoryApproachExplorer = (
  root: HTMLElement,
  state: GameState,
  explorerState: StoryApproachExplorerState,
): boolean => {
  const run = state.run;
  const host = root.querySelector<HTMLElement>("[data-story-approach-host]");
  if (state.screen !== "story" || !state.storyId || !run || !host) return false;
  const surface = storyApproachSurfaceFor(state.storyId, run);
  if (!surface) return false;
  host.innerHTML = renderStoryApproachExplorer({ ...surface, state: explorerState });
  const focusKey = explorerState.selectedApproachId
    ? focusKeyFor("select-story-approach", { approachId: explorerState.selectedApproachId })
    : explorerState.facetId
      ? focusKeyFor("select-story-approach-facet", { approachAxis: explorerState.axis, approachFacetId: explorerState.facetId })
      : explorerState.open
        ? focusKeyFor("set-story-approach-axis", { approachAxis: explorerState.axis })
        : focusKeyFor("open-story-approach-explorer");
  completeDomUpdate(root, { kind: "restore", key: focusKey });
  return true;
};
