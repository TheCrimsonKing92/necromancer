import type { GameState } from "../game/types";
import { patchBattleDom } from "./battle-dom-patch";
import {
  captureFocusKey,
  completeDomUpdate,
  type FocusIntent,
} from "./focus-management";
import { renderApp } from "./render";
import type { RenderContext } from "./render-context";

export const renderAppTransition = (
  root: HTMLElement,
  state: GameState,
  context: RenderContext,
  focusIntent: FocusIntent,
): void => {
  const preservedKey = focusIntent === "preserve"
    ? captureFocusKey(document.activeElement)
    : undefined;
  const markup = renderApp(state, context);
  const patchedBattle = focusIntent === "preserve" &&
    state.screen === "battle" &&
    patchBattleDom(root, markup);
  if (!patchedBattle) root.innerHTML = markup;
  completeDomUpdate(root, focusIntent, preservedKey);
};
