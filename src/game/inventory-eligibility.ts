import { isCombatantStanding } from "./anatomy";
import type { EngineResult, GameState } from "./types";

export const requireInventoryState = (
  state: GameState,
): EngineResult | undefined => {
  if (state.screen !== "inventory" || !state.run) {
    return {
      state,
      error: "Your inventory is not open.",
    };
  }
  return undefined;
};

export const isPostDeathState = (state: GameState): boolean =>
  Boolean(
    state.run &&
      (state.ending === "defeat" ||
        !isCombatantStanding(state.run.player)),
  );

export const requireMutableInventoryState = (
  state: GameState,
): EngineResult | undefined => {
  const invalid = requireInventoryState(state);
  if (invalid) return invalid;
  if (isPostDeathState(state)) {
    return {
      state,
      error:
        "This body can no longer use, treat, or rearrange what it carried.",
    };
  }
  return undefined;
};
