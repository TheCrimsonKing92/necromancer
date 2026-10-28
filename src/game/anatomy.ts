/**
 * Stable anatomy facade.
 *
 * Body definitions, wound creation, convalescence, and wound consequences
 * are separate pure domains under `anatomy/`. Existing consumers import from
 * this module so those internal boundaries can evolve without coupling the
 * engine, persistence, or UI to the catalog layout.
 */

export {
  ANATOMY_PARTS,
  BODY_PARTS,
  type AnatomyPartDefinition,
  type BodyPartDefinition,
} from "./anatomy/definitions";

export {
  createBody,
  getBodyPartLabel,
  getBodyPartShortLabel,
  pickBodyPart,
} from "./anatomy/body";

export {
  canBindWound,
  canWoundScar,
  createWound,
  getWoundCare,
  getWoundLabel,
  woundSeverityForDamage,
} from "./anatomy/wound-creation";

export {
  convalesceWounds,
  scarsForPart,
  type ConvalescenceOptions,
  type ConvalescenceResult,
} from "./anatomy/recovery";

export {
  allWounds,
  attackPenaltyFromWounds,
  bodyConditionPercentage,
  combinedWoundEffects,
  defensePenaltyFromWounds,
  fleePenaltyFromWounds,
  isCombatantStanding,
  isVitalPartDestroyed,
  recoveryStepsForWound,
  untreatedBleeding,
  woundEffects,
  type WoundEffects,
} from "./anatomy/wound-effects";
