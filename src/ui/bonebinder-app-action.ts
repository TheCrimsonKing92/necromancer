import type { GameState } from "../game/types";
import { patchBattleDirectionDom } from "./battle-dom-patch";
import { renderBattleDirectionPatchMarkup } from "./battle-render";
import {
  resolveLoadedBonebinderDomAction,
} from "./bonebinder-surface-loader";
import type { BonebinderDomResult } from "./bonebinder-dom";

export interface BonebinderAppResult extends BonebinderDomResult {
  patchDom?: () => boolean;
}

export const resolveBonebinderAppAction = (
  root: HTMLElement,
  state: GameState,
  origin: HTMLElement,
  selectedTargetId?: string,
): Promise<BonebinderAppResult | null> | null => {
  const pending = resolveLoadedBonebinderDomAction(
    state,
    origin,
    selectedTargetId,
  );
  if (!pending) return null;
  return pending.then((result) => {
    if (!result || result.patchKind !== "battle-direction") return result;
    return {
      ...result,
      patchDom: () =>
        patchBattleDirectionDom(
          root,
          renderBattleDirectionPatchMarkup(result.result.state, {
            hasSave: false,
            selectedTargetId,
          }, Boolean(state.run?.battle?.log.length)),
        ),
    };
  });
};
