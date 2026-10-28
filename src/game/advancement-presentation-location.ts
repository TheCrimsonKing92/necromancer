import type { AdvancementId, GameState } from "./types";

export type AdvancementPresentationLocation =
  | NonNullable<GameState["storyId"]>
  | "ending";

export const advancementPresentationLocation = (
  state: GameState,
): AdvancementPresentationLocation | null =>
  state.screen === "story" && state.storyId
    ? state.storyId
    : state.screen === "ending"
      ? "ending"
      : state.screen === "inventory"
        ? state.inventoryReturnScreen === "story" && state.storyId
          ? state.storyId
          : state.inventoryReturnScreen === "ending"
            ? "ending"
            : null
        : state.screen === "journal"
          ? state.journalReturnScreen === "story" && state.storyId
            ? state.storyId
            : state.journalReturnScreen === "ending"
              ? "ending"
              : null
          : null;

export const advancementPresentationFlag = (
  location: AdvancementPresentationLocation,
  advancementId: AdvancementId,
): string => `advancement-presented:${location}:${advancementId}`;
