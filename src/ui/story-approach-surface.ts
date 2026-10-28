import { storyApproachSurfaceFor } from "../game/content-packs/story-approach-runtime";
import { installStoryApproachRenderer } from "./story-approach-render-runtime";
import { renderStoryApproachExplorer } from "./story-approach-explorer-render";

installStoryApproachRenderer((state, explorerState) => {
  const run = state.run;
  if (state.screen !== "story" || !state.storyId || !run) return "";
  const surface = storyApproachSurfaceFor(state.storyId, run);
  return surface
    ? renderStoryApproachExplorer({ ...surface, state: explorerState })
    : "";
});

export const storyApproachSurfaceReady = true;
