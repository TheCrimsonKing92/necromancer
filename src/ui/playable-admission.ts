export type PlayableAdmissionIntent = "home" | "start-new" | "continue";

import type { GameState, TraditionId } from "../game/types";

export interface EphemeralJourneyController {
  readonly isComplete: (state: GameState) => boolean;
  readonly start: (tradition: TraditionId) => Promise<GameState>;
}

export interface NecromancerAppOptions {
  readonly savedAt?: string;
  readonly initialState?: GameState;
  readonly ephemeral?: boolean;
  readonly ephemeralJourney?: EphemeralJourneyController;
}

export interface NecromancerAppMountOptions {
  readonly intent?: PlayableAdmissionIntent;
}
