import {
  resolveBattleAction,
  resolveMercyRedemption,
  resolvePendingPlayerAction,
  resolveWorkedAroundChoice,
} from "../game/engine";
import type { EngineResult, GameState } from "../game/types";
import { isActionId } from "./input-identifiers";

export interface BattleDomActionResult {
  result: EngineResult;
  announcesWitness: boolean;
}

export const resolveBattleDomAction = (
  state: GameState,
  origin: HTMLElement,
  selectedTargetId?: string,
): BattleDomActionResult | null => {
  switch (origin.dataset.action) {
    case "battle-action": {
      const actionId = origin.dataset.actionId;
      if (!actionId || !isActionId(actionId)) return null;
      return {
        result: resolveBattleAction(
          state,
          actionId,
          origin.dataset.woundId ?? selectedTargetId,
        ),
        announcesWitness: true,
      };
    }
    case "pending-player-action": {
      const decision = origin.dataset.decision;
      if (decision !== "continue" && decision !== "abort") return null;
      return {
        result: resolvePendingPlayerAction(state, decision),
        announcesWitness: true,
      };
    }
    case "worked-around-choice":
      return {
        result: resolveWorkedAroundChoice(
          state,
          origin.dataset.woundId,
        ),
        announcesWitness: true,
      };
    case "redeem-mercy": {
      const requested = Number(origin.dataset.amount ?? 1);
      if (!Number.isFinite(requested) || requested < 1) return null;
      return {
        result: resolveMercyRedemption(state, Math.floor(requested)),
        announcesWitness: true,
      };
    }
    default:
      return null;
  }
};
