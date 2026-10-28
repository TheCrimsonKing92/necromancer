import type { GameState } from "../game/types";

export type DevelopmentTacticalSceneRenderer = (
  state: GameState,
  selectedSubjectId?: string,
  outcomeMarkup?: string,
) => string;

declare global {
  var __renderNecromancerTacticalScene:
    | DevelopmentTacticalSceneRenderer
    | undefined;
}

export {};
