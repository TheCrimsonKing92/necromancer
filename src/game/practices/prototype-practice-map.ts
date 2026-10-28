import type { TraditionId } from "../types";
import type { PracticeId } from "./types";

const PROTOTYPE_PRACTICE_IDS = {
  medium: "medium",
  summoner: "bonebinder",
  thaumaturgist: "renderer",
  "grave-warden": "grave-warden",
} as const satisfies Record<TraditionId, PracticeId>;

export const practiceIdForPrototypeTradition = (
  traditionId: TraditionId,
): PracticeId => PROTOTYPE_PRACTICE_IDS[traditionId];
