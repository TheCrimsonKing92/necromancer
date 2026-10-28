import type { WakeVariantDefinition } from "../encounters";
import type { PracticeDefinition } from "../practices/types";
import type { RoadEventDefinition } from "../road-events";
import type { RegionalRouteGraph } from "../routes/types";
import type {
  ActionDefinition,
  AdvancementDefinition,
  ContentStoryTransitionId,
  EngineResult,
  GameState,
  ItemDefinition,
  RunState,
  StoryChoice,
  StoryScene,
} from "../types";
export type { ContentStoryTransitionId } from "../types";
import type { WorldFactDefinition } from "../world/facts";

export type PracticeContentPackId = `practice:${string}`;
export type RegionContentPackId = `region:${string}`;
export type IntegrationContentPackId = `integration:${string}:${string}`;

export type ContentPackId =
  | "core"
  | PracticeContentPackId
  | RegionContentPackId
  | IntegrationContentPackId;

export type ContentPackKind =
  | "core"
  | "practice"
  | "region"
  | "integration";

export interface ContentKey<K extends string = string> {
  readonly pack: ContentPackId;
  readonly id: K;
}

export interface ContentPackReference {
  readonly id: ContentPackId;
  readonly version: number;
}

export interface PersistedContentSet {
  readonly packs: readonly ContentPackReference[];
  readonly activePractice: PracticeContentPackId;
  readonly activeRegions: readonly RegionContentPackId[];
}

export interface PackStateEnvelope {
  readonly version: number;
  readonly value: unknown;
}

export type NamespacedPackState = Partial<
  Record<Exclude<ContentPackId, "core">, PackStateEnvelope>
>;

export interface OwnedDefinition<TDefinition> {
  readonly id: string;
  readonly value: TDefinition;
}

export interface LoadedOwnedDefinition<TDefinition>
  extends OwnedDefinition<TDefinition> {
  readonly packId: ContentPackId;
}

export interface ContentPackDefinitions {
  readonly practices?: readonly OwnedDefinition<PracticeDefinition>[];
  readonly actions?: readonly OwnedDefinition<ActionDefinition>[];
  readonly advancements?: readonly OwnedDefinition<AdvancementDefinition>[];
  readonly regions?: readonly OwnedDefinition<RegionalRouteGraph>[];
  readonly scenes?: readonly OwnedDefinition<StoryScene>[];
  readonly encounters?: readonly OwnedDefinition<WakeVariantDefinition>[];
  readonly roadEvents?: readonly OwnedDefinition<RoadEventDefinition>[];
  readonly items?: readonly OwnedDefinition<ItemDefinition>[];
  readonly worldFacts?: readonly OwnedDefinition<WorldFactDefinition>[];
}

export type ContentDefinitionCatalogName = keyof ContentPackDefinitions;

export interface ContentRuleContribution {
  readonly id: string;
}

export interface ContentStoryTransitionResult {
  readonly error?: string;
  readonly message?: string;
  readonly completeInteraction?: boolean;
}

export interface ContentStoryTransitionContext {
  readonly state: GameState;
  readonly run: RunState;
  readonly choice: StoryChoice;
}

export interface ContentStoryTransitionContribution
  extends ContentRuleContribution {
  readonly id: ContentStoryTransitionId;
  readonly resolve: (
    context: ContentStoryTransitionContext,
  ) => ContentStoryTransitionResult | void;
}

export interface ContentPackRules {
  readonly playerActions?: readonly ContentRuleContribution[];
  readonly advancementEffects?: readonly ContentRuleContribution[];
  readonly storyTransitions?: readonly ContentStoryTransitionContribution[];
  readonly battleParticipants?: readonly ContentRuleContribution[];
  readonly departureEffects?: readonly ContentRuleContribution[];
}

export type ContentRulePortName = keyof ContentPackRules;

export interface PackStateNormalizationResult {
  readonly value: unknown;
  readonly notices: readonly string[];
}

export type PackStateNormalizer = (
  envelope: Readonly<PackStateEnvelope> | undefined,
) => PackStateNormalizationResult;

export interface ContentPackLifecycle {
  readonly activate?: () => void;
  readonly initializePractice?: (state: GameState) => EngineResult;
  readonly normalizeRunState?: (run: RunState) => void;
  readonly normalizeState?: PackStateNormalizer;
}

export interface ContentPack {
  readonly id: ContentPackId;
  readonly version: number;
  readonly dependencies: readonly ContentPackId[];
  readonly definitions: Readonly<ContentPackDefinitions>;
  readonly lifecycle?: Readonly<ContentPackLifecycle>;
  readonly rules?: Readonly<ContentPackRules>;
}

export interface ContentPackModule {
  readonly default: ContentPack;
}

export interface ContentPackManifestEntry {
  readonly id: ContentPackId;
  readonly kind: ContentPackKind;
  readonly version: number;
  readonly dependencies: readonly ContentPackId[];
  readonly load: () => Promise<ContentPackModule>;
}

export interface ContentPackManifest {
  readonly entries: readonly ContentPackManifestEntry[];
  readonly byId: ReadonlyMap<ContentPackId, ContentPackManifestEntry>;
}

export interface LoadedPackSummary extends ContentPackReference {
  readonly kind: ContentPackKind;
  readonly dependencies: readonly ContentPackId[];
}

export interface LoadedRuleContribution extends ContentRuleContribution {
  readonly packId: ContentPackId;
}

export interface LoadedStoryTransitionContribution
  extends ContentStoryTransitionContribution {
  readonly packId: ContentPackId;
}

export type ContentDefinitionRegistry = Readonly<{
  [K in ContentDefinitionCatalogName]: ReadonlyMap<
    string,
    LoadedOwnedDefinition<NonNullable<ContentPackDefinitions[K]>[number]["value"]>
  >;
}>;

export interface ContentRuleRegistry {
  readonly playerActions: ReadonlyMap<string, LoadedRuleContribution>;
  readonly advancementEffects: ReadonlyMap<string, LoadedRuleContribution>;
  readonly storyTransitions: ReadonlyMap<
    ContentStoryTransitionId,
    LoadedStoryTransitionContribution
  >;
  readonly battleParticipants: ReadonlyMap<
    string,
    readonly LoadedRuleContribution[]
  >;
  readonly departureEffects: ReadonlyMap<
    string,
    readonly LoadedRuleContribution[]
  >;
}

export interface ContentRuntime {
  readonly packs: ReadonlyMap<ContentPackId, LoadedPackSummary>;
  readonly definitions: ContentDefinitionRegistry;
  readonly rules: ContentRuleRegistry;
  readonly lifecycles: ReadonlyMap<ContentPackId, ContentPackLifecycle>;
}

export interface ContentPackLoader {
  load(requested: readonly ContentPackId[]): Promise<ContentRuntime>;
}

export type ContentPackValidationCode =
  | "dependency-cycle"
  | "duplicate-definition"
  | "duplicate-manifest-id"
  | "duplicate-rule-owner"
  | "invalid-manifest-entry"
  | "manifest-dependencies-mismatch"
  | "manifest-id-mismatch"
  | "manifest-version-mismatch"
  | "missing-pack";

export class ContentPackValidationError extends Error {
  readonly code: ContentPackValidationCode;

  constructor(code: ContentPackValidationCode, message: string) {
    super(message);
    this.name = "ContentPackValidationError";
    this.code = code;
  }
}
