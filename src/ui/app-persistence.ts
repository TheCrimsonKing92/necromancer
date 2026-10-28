import { clearSave, saveGame, type StorageLike } from "../game/persistence";
import type { GameState } from "../game/types";

export interface AppliedStatePersistence {
  readonly savedAt?: string;
  readonly error?: string;
}

export const persistAppliedState = (
  storage: StorageLike,
  state: GameState,
  ephemeral: boolean,
): AppliedStatePersistence => {
  if (ephemeral) return {};
  const savedAt = new Date();
  if (saveGame(storage, state, () => savedAt)) {
    return { savedAt: savedAt.toISOString() };
  }
  return state.run
    ? { error: "Progress could not be saved in this browser." }
    : {};
};

export const resetSavedCampaign = (storage: StorageLike): string | null => {
  if (!window.confirm(
    "Reset this campaign? Its current testament, world state, and Chronicle will be erased from this browser.",
  )) return null;
  return clearSave(storage)
    ? "The campaign has been erased."
    : "The browser refused to erase the campaign.";
};
