export type TraditionId =
  | "medium"
  | "summoner"
  | "thaumaturgist"
  | "grave-warden";
export type AttributeId =
  | "strength"
  | "dexterity"
  | "vitality"
  | "intelligence"
  | "willpower"
  | "charisma";
export type CharacterAttributes = Record<AttributeId, number>;
export type MundaneSkillId =
  | "athletics"
  | "medicine"
  | "survival"
  | "perception"
  | "persuasion"
  | "barter";
export type MundaneSkills = Record<MundaneSkillId, number>;
export type AdvancementId =
  | "two-way-passage"
  | "longer-leash"
  | "colder-furnace"
  | "hardened-vessel"
  | "deepened-well"
  | "echoing-passage"
  | "shared-hunger"
  | "white-ash"
  | "grave-callus"
  | "second-breath"
  | "tempered-passage"
  | "last-command"
  | "white-quench"
  | "last-stance"
  | "death-dividend"
  | "field-medicine"
  | "roadcraft"
  | "plain-dealing"
  | "cold-furnace-method"
  | "working-contingency"
  | "departure-disposition"
  | "letter-of-service"
  | "called-counsel"
  | "set-the-frame"
  | "residue-disposition"
  | "threshold-discipline"
  | "field-splint"
  | "worked-around";
export type AdvancementExpressionId =
  | "cold-furnace-white-quench"
  | "cold-furnace-long-reduction"
  | "abort-the-working"
  | "held-measure"
  | "bank-the-departure"
  | "open-hand"
  | "decant-the-remainder"
  | "carry-the-reduction"
  | "invitation-to-breach"
  | "closed-gate";
export type AdvancementRuleId =
  | "abort-the-working"
  | "held-measure"
  | "bank-the-departure"
  | "open-hand"
  | "letter-of-service"
  | "called-counsel"
  | "set-the-frame"
  | "decant-the-remainder"
  | "carry-the-reduction"
  | "invitation-to-breach"
  | "closed-gate"
  | "field-splint"
  | "worked-around";
export type AdvancementClassification =
  | "active"
  | "passive"
  | "transform"
  | "reaction"
  | "rank";
export type AdvancementReadinessKind = "practice" | "universal";
export interface AdvancementExpressionDefinition {
  id: AdvancementExpressionId;
  name: string;
  classification: AdvancementClassification;
  description: string;
  effectText: string;
  effect: AdvancementEffect;
}
export type AdvancementDuality =
  | {
      kind: "doctrine";
      group: string;
    }
  | {
      kind: "prepared";
      readiness: AdvancementReadinessKind;
      expressions: [
        AdvancementExpressionDefinition,
        AdvancementExpressionDefinition,
      ];
    };
export interface AdvancementReadinessState {
  practice: AdvancementExpressionId[];
  universal: AdvancementExpressionId[];
}
export type AdvancementBranchId =
  | "tradition"
  | "body"
  | "necromancy"
  | "mundane";
export type EncounterId =
  | "ossuary-road"
  | "saint-orra"
  | "black-mile-wake";
export type WakeVariantId =
  | "bell-widow"
  | "name-thieves"
  | "bone-procession"
  | "reliquary-poachers"
  | "reeve-patrol";
export type RoadEventId =
  | "mourning-caravan"
  | "hedge-surgeon"
  | "ditch-burial"
  | "disputed-bundle";
export type WorldFactionId =
  | "county-reeves"
  | "burial-crews"
  | "reliquary-brokers"
  | "north-road-households";
export type WorldPersonId = "iven-saye" | "eda-pell" | "oren-vask";
export type WorldRelationId = WorldFactionId | WorldPersonId;
export type WorldFactId =
  | "hollis-vane-dead"
  | "hollis-vane-rendered"
  | "saint-orra-unbound"
  | "shared-mourning-fire"
  | "aided-county-burial"
  | "gave-use-name-to-burial-crews"
  | "dealt-with-iven"
  | "roadside-bundle-examined"
  | "bundle-trace-points-to-broker"
  | "bundle-left-under-burial-custody"
  | "bundle-released-to-broker"
  | "ditch-hand-body-recognized";
export type WorldBeliefCertainty = "rumor" | "credible" | "accepted";
export type WorldEvidenceKind =
  | "witness"
  | "body"
  | "object"
  | "record"
  | "occult-trace";
export type WorldClaimKind =
  | "ownership"
  | "custody"
  | "authority"
  | "identity";
export type WorldSubjectKind =
  | "person"
  | "body"
  | "item"
  | "place"
  | "record";

export interface WorldBeliefState {
  id: string;
  holderId: WorldRelationId;
  factId: WorldFactId;
  certainty: WorldBeliefCertainty;
  basisEvidenceIds: string[];
}

export interface WorldEvidenceState {
  id: string;
  factId: WorldFactId;
  kind: WorldEvidenceKind;
  custodianId: WorldRelationId | null;
  strength: 1 | 2 | 3;
  provenanceId: string | null;
}

export interface WorldCustodyEntry {
  custodianId: WorldRelationId;
  basis: "claim" | "law" | "permission" | "possession";
  status: "current" | "transferred" | "lost";
  originFactId: WorldFactId | null;
}

export interface WorldProvenanceState {
  id: string;
  subjectId: string;
  subjectKind: WorldSubjectKind;
  originFactId: WorldFactId | null;
  claimantIds: WorldRelationId[];
  custody: WorldCustodyEntry[];
  tags: string[];
}

export interface WorldClaimState {
  id: string;
  claimantId: WorldRelationId;
  subjectId: string;
  kind: WorldClaimKind;
  status: "asserted" | "recognized" | "disputed" | "released";
  basisFactIds: WorldFactId[];
}

export interface WorldRelationshipState {
  id: string;
  fromId: WorldRelationId;
  toId: WorldRelationId;
  kind:
    | "membership"
    | "employment"
    | "kinship"
    | "custody"
    | "obligation";
  status: "active" | "strained" | "ended";
  originFactId: WorldFactId | null;
}

export interface WorldPressureState {
  id: string;
  scopeId: string;
  intensity: number;
  stakeholderIds: WorldRelationId[];
  sourceFactIds: WorldFactId[];
  status: "active" | "resolved";
}

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

export type ActionId =
  | "strike"
  | "guard"
  | "black-tonic"
  | "flee"
  | "spirit-lash"
  | "borrowed-might"
  | "raise-shade"
  | "soul-tithe"
  | "grave-salt"
  | "corpsefire"
  | "set-threshold-seal"
  | "answer-the-breach"
  | "close-the-gate"
  | "field-splint";

export type StatusId =
  | "bleeding"
  | "burning"
  | "exposed"
  | "forewarned";
export type CombatantKind = "player" | "enemy" | "ally";
export type LogTone = "system" | "player" | "enemy" | "reward";
export type BodyPartId =
  | "head"
  | "torso"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";
export type AnatomyId = "humanoid" | "quadruped" | "manifestation";
export type MaterialityId = "corporeal" | "incorporeal";
export type DamageTypeId = "physical" | "occult";
export type InjuryProfileId =
  | "impact"
  | "edge"
  | "puncture"
  | "bite"
  | "grave-salt"
  | "cold-fire"
  | "spectral";

export interface AttackProfile {
  baseDamage: number;
  damageType: DamageTypeId;
  injuryProfile: InjuryProfileId;
  traumaBonus: number;
}

export type WoundSeverity = "minor" | "serious" | "grievous";
export type WoundCareId = "binding" | "rest";
export type ItemKind =
  | "weapon"
  | "armor"
  | "charm"
  | "consumable"
  | "material";
export type EquipmentSlot =
  | "mainHand"
  | "offHand"
  | "head"
  | "torso"
  | "arms"
  | "legs"
  | "charm";
export type ItemId =
  | "ritual-knife"
  | "bone-wand"
  | "iron-sickle"
  | "mortuary-mallet"
  | "warding-awl"
  | "gravecloth-coat"
  | "binder-wraps"
  | "apothecary-apron"
  | "burial-hood"
  | "hooked-knife"
  | "road-leathers"
  | "ash-hide-boots"
  | "grave-iron-mask"
  | "saint-bone-charm"
  | "debtor-tally"
  | "ossuary-ichor"
  | "black-tonic"
  | "linen-binding"
  | "hound-tooth"
  | "grave-salt"
  | "mortuary-tallow"
  | "vigil-cordial"
  | "carrier-harness"
  | "grave-copper"
  | "orra-crozier";

export interface StatusEffect {
  id: StatusId;
  turns: number;
  potency: number;
  preventsHealthRecovery?: boolean;
}

export interface Wound {
  id: string;
  part: BodyPartId;
  severity: WoundSeverity;
  label: string;
  bleed: number;
  care: WoundCareId;
  treated: boolean;
  source: string;
  /** Temporary combat relief; recovery burden remains after it expires. */
  combatPenaltyReduction?: number;
  combatPenaltyReductionTurns?: number;
  recoveryBurden?: number;
}

export interface Scar {
  id: string;
  part: BodyPartId;
  label: string;
  source: string;
  conditionPenalty: number;
}

export interface BodyPartState {
  id: BodyPartId;
  condition: number;
  maxCondition: number;
  wounds: Wound[];
}

export type BodyState = Record<BodyPartId, BodyPartState>;

export type NaturalArmor = Partial<Record<BodyPartId, number>>;

export interface Combatant {
  id: string;
  name: string;
  kind: CombatantKind;
  title: string;
  /** Stable physical rules; generated IDs never determine these mechanics. */
  formId?: import("./combatants/forms").CombatantFormId;
  /** Stable defaults shared by encounter-local instances. */
  archetypeId?: import("./combatants/archetypes").CombatantArchetypeId;
  /** Grammar and defeat language, independent of encounter-local naming. */
  identityProfileId?: import("./combatants/identity-profiles").CombatantIdentityProfileId;
  /** Explicit action cycle; legacy saves may omit it and are normalized. */
  cadenceId?: import("./enemy-actions/cadences").EnemyCadenceId;
  anatomy: AnatomyId;
  materiality: MaterialityId;
  materialityLabel?: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  ward: number;
  statuses: StatusEffect[];
  body: BodyState;
  naturalArmor: NaturalArmor;
  naturalArmorLabel?: string;
  vitalParts?: BodyPartId[];
  bodyDamageModifiers?: Partial<Record<DamageTypeId, number>>;
}

export type InventoryState = Partial<Record<ItemId, number>>;
export type EquipmentState = Record<EquipmentSlot, ItemId | null>;
export type CharacterSex = "male" | "female" | "other";

export type EconomyMarketId = "north-vey-reliquary";
export type EconomyServiceId = "graveglass-ward";

export interface MarketActivityState {
  purchases: Partial<Record<ItemId, number>>;
  services: Partial<Record<EconomyServiceId, number>>;
}

export interface EconomyState {
  markets: Partial<Record<EconomyMarketId, MarketActivityState>>;
}

export interface Player extends Combatant {
  kind: "player";
  sex: CharacterSex;
  tradition: TraditionId;
  level: number;
  xp: number;
  obols: number;
  advancements: AdvancementId[];
  advancementReadiness?: AdvancementReadinessState;
  scars: Scar[];
  attributes: CharacterAttributes;
  skills: MundaneSkills;
  spirit: number;
  maxSpirit: number;
  inventory: InventoryState;
  equipment: EquipmentState;
}

export interface TemporaryAlly extends Combatant {
  kind: "ally";
  lifetime: {
    kind: "temporary";
    remainingTurns: number;
  };
}

export interface PersistentAlly extends Combatant {
  kind: "ally";
  lifetime: {
    kind: "persistent";
    servantId: string;
  };
}

export type Ally = TemporaryAlly | PersistentAlly;

export interface BattleLogEntry {
  id: number;
  round: number;
  tone: LogTone;
  text: string;
  event?: WitnessEvent;
}

export type WitnessHealthCause =
  | "burning"
  | "bleeding"
  | "untreated-wounds"
  | "lingering-trauma";

export type WitnessSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "damage";
      actor: string;
      action?: string;
      actionLead?: string;
      attackDetail?: string;
      verb?: string;
      target: string;
      targetPossessive?: string;
      location: BodyPartId;
      locationLabel?: string;
      damage: number;
      wardAbsorbed: number;
      armorAbsorbed: number;
      protectionLabel?: string;
      resistanceAbsorbed?: number;
      resistanceLabel?: string;
      woundLabel?: string;
    }
  | {
      type: "miss";
      actor: string;
      action: string;
      target: string;
      text: string;
      chance: number;
      roll: number;
    }
  | {
      type: "transition";
      entity: string;
      transition: "defeated";
      cause: "health" | "vital-region";
      text: string;
    }
  | {
      type: "status";
      lead?: string;
      target: string;
      status: StatusId;
      potency: number;
      turns: number;
    }
  | {
      type: "health-loss";
      target: string;
      amount: number;
      cause: WitnessHealthCause;
    }
  | {
      type: "reward";
      opening: string;
      experience: number;
      lootVerb: "take" | "salvage";
      loot: string[];
      levelReached?: number;
    }
  | {
      type: "skill";
      skill: string;
      effect: string;
    };

export interface WitnessEvent {
  tone: LogTone;
  segments: WitnessSegment[];
}

export interface BattleState {
  encounterId: EncounterId;
  variantId: WakeVariantId | null;
  round: number;
  seed: number;
  enemies: Combatant[];
  allies: Ally[];
  log: BattleLogEntry[];
  outcome: BattleOutcome;
  nextWoundId: number;
  advancementState?: BattleAdvancementState;
  practiceStates?: {
    graveWarden?: import("./practices/grave-warden/types").GraveWardenBattleState;
  };
}

export interface PendingPlayerAction {
  actionId: ActionId;
  targetId?: string;
  chance?: number;
  roll?: number;
  hit?: boolean;
}

export interface BattleAdvancementState {
  usedExpressions: AdvancementExpressionId[];
  pendingPlayerAction?: PendingPlayerAction;
  setTheFrameRound?: number;
  fieldSplintUsed?: boolean;
  workedAroundWoundId?: string;
  workedAroundBurdenApplied?: boolean;
  workedAroundResolved?: boolean;
  departureRecovery?: import("./departure-recovery").DepartureRecoveryState;
}

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
    bonebinder?: import("./practices/bonebinder/types").BonebinderPracticeState;
    graveWarden?: import("./practices/grave-warden/types").GraveWardenPracticeState;
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

export interface TraditionDefinition {
  id: TraditionId;
  name: string;
  epithet: string;
  description: string;
  doctrine: string;
  occultAttribute: AttributeId;
  startingAttributes: CharacterAttributes;
  startingSkills: MundaneSkills;
  startingSpirit: number;
  actions: [ActionId, ActionId];
}

export type AdvancementModifierId =
  | "spirit-lash-ward"
  | "spirit-lash-damage"
  | "borrowed-might-ward-buffer"
  | "shade-attack"
  | "shade-duration"
  | "shade-health-return"
  | "shade-final-service"
  | "corpsefire-duration"
  | "corpsefire-base-damage"
  | "corpsefire-block-recovery"
  | "corpsefire-exposed"
  | "grave-salt-quench-burning"
  | "recovery-condition"
  | "scar-condition-penalty-reduction"
  | "brace-critical-ward"
  | "mercy-spirit"
  | "overflow-spirit-ward";

export interface AdvancementEffect {
  maxHp?: number;
  maxSpirit?: number;
  skills?: Partial<MundaneSkills>;
  modifiers?: Partial<Record<AdvancementModifierId, number>>;
  rules?: AdvancementRuleId[];
}

export interface AdvancementDefinition {
  id: AdvancementId;
  branch: AdvancementBranchId;
  minimumLevel: number;
  cost: number;
  prerequisites: AdvancementId[];
  name: string;
  tradition?: TraditionId;
  practice?: import("./practices/types").PracticeId;
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
