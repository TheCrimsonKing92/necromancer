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
  formId?: import("../combatants/forms").CombatantFormId;
  /** Stable defaults shared by encounter-local instances. */
  archetypeId?: import("../combatants/archetypes").CombatantArchetypeId;
  /** Grammar and defeat language, independent of encounter-local naming. */
  identityProfileId?: import("../combatants/identity-profiles").CombatantIdentityProfileId;
  /** Explicit action cycle; legacy saves may omit it and are normalized. */
  cadenceId?: import("../enemy-actions/cadences").EnemyCadenceId;
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
