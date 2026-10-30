import type { TraditionId } from "./character";
import type { CharacterSex } from "./combat";

export type ScreenId =
  | "home"
  | "creation"
  | "story"
  | "battle"
  | "inventory"
  | "journal"
  | "ending";

export const STORY_IDS = [
  "weary-traveler",
  "burial-cut",
  "ossuary-road",
  "road-aftermath",
  "hollow-tollhouse",
  "ossuary-vault",
  "saint-orra-aftermath",
  "road-interlude",
  "black-mile-wake",
] as const;
export type CoreStoryId = (typeof STORY_IDS)[number];
export type ContentStoryId = `${string}:${string}`;
export type StoryId = CoreStoryId;
export type ActiveStoryId = StoryId | ContentStoryId;
export type EndingId = "victory" | "defeat" | "fled";
export type BattleOutcome = EndingId | null;

export type SuccessorRelationshipMode =
  | "familiar"
  | "spiritual"
  | "independent";

export type TestamentEndReason =
  | "death"
  | "completion"
  | "withdrawal"
  | "retirement"
  | "yielding"
  | "disappearance";

export interface ActiveTestamentIdentity {
  id: string;
  ordinal: number;
  predecessorTestamentId: string | null;
  successorRelationship: SuccessorRelationshipMode | null;
}

export interface TestamentSuccessorLink {
  testamentId: string;
  relationship: SuccessorRelationshipMode;
}

export interface ClosedTestamentSummary {
  testamentId: string;
  ordinal: number;
  useName: string;
  sex: CharacterSex;
  tradition: TraditionId;
  practiceName: string;
  endReason: TestamentEndReason;
  level: number;
  experience: number;
  battlesWon: number;
  finalHealth: number;
  maximumHealth: number;
  worldRevision: number;
  successor: TestamentSuccessorLink | null;
}

export interface CampaignContinuityState {
  id: string;
  seed: number;
  worldRevision: number;
  nextTestamentOrdinal: number;
  activeTestament: ActiveTestamentIdentity | null;
  closedTestaments: ClosedTestamentSummary[];
}
