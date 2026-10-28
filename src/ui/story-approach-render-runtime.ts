import type { GameState } from "../game/types";
import type { StoryApproachExplorerState } from "./story-approach-state";

type StoryApproachRenderer = (
  state: GameState,
  explorerState: StoryApproachExplorerState,
) => string;

let installedRenderer: StoryApproachRenderer | undefined;

export const installStoryApproachRenderer = (
  renderer: StoryApproachRenderer,
): void => {
  installedRenderer = renderer;
};

export const renderLoadedStoryApproachSurface = (
  state: GameState,
  explorerState: StoryApproachExplorerState,
): string => installedRenderer?.(state, explorerState) ?? "";
