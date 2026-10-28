import type { GameState } from "../game/types";
import { isTraditionId } from "./input-identifiers";
import type { EphemeralJourneyController } from "./playable-admission";

export const resolveEphemeralJourneyState = (
  state: GameState,
  origin: HTMLElement,
  controller?: EphemeralJourneyController,
): Promise<GameState> | null => {
  if (!controller) return null;
  if (origin.dataset.action === "restart-development-proof") {
    return controller.isComplete(state) && state.run
      ? controller.start(state.run.player.tradition)
      : null;
  }
  const tradition = origin.dataset.tradition;
  return origin.dataset.action === "start-fire-road-prototype" &&
      tradition && isTraditionId(tradition)
    ? controller.start(tradition)
    : null;
};
