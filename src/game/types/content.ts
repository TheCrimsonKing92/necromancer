import type {
  TraditionId,
  MundaneSkillId,
  AdvancementId,
  AdvancementClassification,
} from "./character";
import type {
  AdvancementDuality,
  AdvancementBranchId,
} from "./advancement";
import type { ActiveStoryId } from "./continuity";
import type {
  ActionId,
  BodyPartId,
  AttackProfile,
  ItemKind,
  EquipmentSlot,
  ItemId,
} from "./combat";
import type {
  RunState,
  GameState,
} from "./state";
import type { AdvancementEffect } from "./content-core";

export interface AdvancementDefinition {
  id: AdvancementId;
  branch: AdvancementBranchId;
  minimumLevel: number;
  cost: number;
  prerequisites: AdvancementId[];
  name: string;
  tradition?: TraditionId;
  practice?: import("../practices/types").PracticeId;
  description: string;
  resultText: string;
  effectText: string;
  effect: AdvancementEffect;
  classification?: AdvancementClassification;
  duality?: AdvancementDuality;
  legacy?: boolean;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  kind: ItemKind;
  description: string;
  provenance?: {
    distinction: "singular";
    label: string;
  };
  sellValue: number;
  weight: number;
  stackable: boolean;
  allowedSlots?: EquipmentSlot[];
  weapon?: AttackProfile & {
    strikeLead: string;
    attackBonus: number;
  };
  armor?: {
    value: number;
    parts: BodyPartId[];
  };
  bonuses?: {
    attack?: number;
    defense?: number;
    maxSpirit?: number;
    carryCapacity?: number;
  };
  consumable?: {
    effect: "heal" | "treat" | "restore-spirit";
    power: number;
  };
}

export interface ActionDefinition {
  id: ActionId;
  label: string;
  shortLabel: string;
  description: string;
  spiritCost: number;
  requiresTarget: boolean;
  tradition?: TraditionId;
  attack?: AttackProfile;
}

export const STORY_EFFECT_IDS = [
  "attune",
  "take-tonic",
  "take-burial-cut",
  "burial-cut-check",
  "leave-burial-cut",
  "open-ground",
  "dead-advance",
  "study-ledger",
  "medium-communion",
  "summoner-hound",
  "thaumaturgist-render",
  "grave-warden-road-seal",
  "leave-aftermath",
  "rest-tollhouse",
  "press-descent",
  "warded-descent",
  "shatter-seal",
  "dress-saint-wounds",
  "follow-name-storm",
  "share-caravan-fire",
  "trade-for-surgery",
  "bargain-for-vigil-cordial",
  "sell-grave-salt-to-iven",
  "help-ditch-burial",
  "inspect-disputed-bundle",
  "leave-bundle-with-burial-crew",
  "release-bundle-to-broker",
  "continue-road",
  "wake-guarded",
  "wake-severing",
] as const;
export type StoryEffect = (typeof STORY_EFFECT_IDS)[number];
export type ContentStoryTransitionId = `${string}:${string}`;
export type StoryTransitionId = StoryEffect | ContentStoryTransitionId;

export const isStoryEffect = (value: string): value is StoryEffect =>
  (STORY_EFFECT_IDS as readonly string[]).includes(value);

export type StoryRewardReference =
  | {
      kind: "item";
      itemId: ItemId;
      quantity?: number;
    }
  | {
      kind: "effect";
      label: string;
      description: string;
    };

export interface StoryChoice {
  id: string;
  presentWhen?: (run: RunState) => boolean;
  label: string | ((run: RunState) => string);
  detail: string | ((run: RunState) => string);
  effect: StoryTransitionId;
  tradition?: TraditionId;
  skill?: MundaneSkillId;
  signal?: "risk" | "tradeoff";
  mode?: "interaction" | "transition";
  /** Whether a non-navigating interaction should be presented as optional. */
  optional?: boolean;
  outcome?: {
    eyebrow: string;
    title: string | ((run: RunState) => string);
    body: string | ((run: RunState) => string);
    result: (run: RunState) => string;
    rewards?:
      | StoryRewardReference[]
      | ((run: RunState) => StoryRewardReference[]);
  };
}

export interface StoryScene {
  id: ActiveStoryId;
  eyebrow: string | ((run: RunState) => string);
  title: string | ((run: RunState) => string);
  paragraphs: (run: RunState) => string[];
  choices: StoryChoice[] | ((run: RunState) => StoryChoice[]);
}

export interface EngineResult {
  state: GameState;
  error?: string;
  message?: string;
}
