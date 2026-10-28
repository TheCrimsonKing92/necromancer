import type { GameState } from "../game/types";
import { patchBattleDom } from "./battle-dom-patch";
import { renderBattle } from "./battle-render";
import { patchLoadedInventoryDom } from "./optional-screen-loader";
import type { RenderContext } from "./render-context";
import { patchStoryDom } from "./story-dom-patch";
import type { StoryApproachExplorerState } from "./story-approach-state";

export const patchSameScreenDom = (
  root: HTMLElement,
  previous: GameState,
  next: GameState,
  context: RenderContext,
  storyApproachState?: StoryApproachExplorerState,
): boolean => {
  if (previous.screen !== next.screen || context.statsOpen) return false;
  if (next.screen === "story") {
    return previous.storyId === next.storyId
      ? patchStoryDom(root, previous, next, context, storyApproachState)
      : false;
  }
  if (next.screen === "inventory") {
    return patchLoadedInventoryDom(root, previous, next);
  }
  if (next.screen === "battle") {
    const tradition = next.run?.player.tradition;
    return patchBattleDom(
      root,
      `<div class="app-shell" data-screen="battle" ${tradition ? `data-tradition="${tradition}"` : ""}>${renderBattle(next, context)}</div>`,
    );
  }
  return false;
};
