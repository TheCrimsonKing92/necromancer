import type { AdvancementId } from "../game/types";
import type { StoryApproachExplorerState } from "./story-approach-state";

export type StatsPane = "character" | "disciplines";

export interface RenderContext {
  hasSave: boolean;
  savedLabel?: string;
  selectedTargetId?: string;
  message?: string;
  statsOpen?: boolean;
  statsPane?: StatsPane;
  selectedAdvancementId?: AdvancementId;
  storyApproachState?: StoryApproachExplorerState;
  developmentTools?: boolean;
  ephemeral?: boolean;
  ephemeralJourneyComplete?: boolean;
}
