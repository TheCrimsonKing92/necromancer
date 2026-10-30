import type {
  WakeVariantId,
  RoadEventId,
  WorldFactionId,
  WorldRelationId,
  WorldFactId,
  WorldBeliefState,
  WorldEvidenceState,
  WorldProvenanceState,
  WorldClaimState,
  WorldRelationshipState,
  WorldPressureState,
} from "./world";
import type {
  ScreenId,
  ActiveStoryId,
  EndingId,
  CampaignContinuityState,
} from "./continuity";
import type {
  EconomyState,
  Player,
} from "./economy";
import type { BattleState } from "./battle";

export interface WorldState {
  pressures: {
    escapedNames: number;
    countyNotice: number;
  };
  standing: Record<WorldRelationId, number>;
  facts: WorldFactId[];
  playerKnowledge: WorldFactId[];
  knowledge: Record<WorldFactionId, WorldFactId[]>;
  beliefs: WorldBeliefState[];
  evidence: WorldEvidenceState[];
  provenance: WorldProvenanceState[];
  claims: WorldClaimState[];
  relationships: WorldRelationshipState[];
  activePressures: WorldPressureState[];
}

export interface RunState {
  seed: number;
  player: Player;
  world: WorldState;
  economy: EconomyState;
  flags: string[];
  wakeVariant: WakeVariantId | null;
  roadEvent: RoadEventId | null;
  seenRoadEvents: RoadEventId[];
  battle: BattleState | null;
  battlesWon: number;
  /** Versioned state owned by lazy content packs; keys are stable pack IDs. */
  packStates?: Partial<
    Record<`${string}:${string}`, { readonly version: number; value: unknown }>
  >;
  practiceStates?: {
    bonebinder?: import("../practices/bonebinder/types").BonebinderPracticeState;
    graveWarden?: import("../practices/grave-warden/types").GraveWardenPracticeState;
  };
}

export interface GameState {
  schemaVersion: 4;
  campaign: CampaignContinuityState | null;
  screen: ScreenId;
  storyId: ActiveStoryId | null;
  ending: EndingId | null;
  run: RunState | null;
  inventoryReturnScreen: "story" | "ending" | null;
  journalReturnScreen?: "story" | "battle" | "ending" | null;
}
