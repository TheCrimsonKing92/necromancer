/**
 * Stable practice-domain facade.
 *
 * Current saves and playable content continue to use TraditionId. This facade
 * owns the accepted target roster and explicit compatibility with those
 * prototype IDs without making unfinished practices character-creation choices.
 */

export {
  PROTOTYPE_PRACTICE_COMPATIBILITY,
  prototypeTraditionHasCapability,
  type PrototypeCompatibilityKind,
  type PrototypePracticeCompatibility,
} from "./practices/compatibility";

export { practiceIdForPrototypeTradition } from "./practices/prototype-practice-map";

export {
  PRACTICES,
  getPractice,
  hasPracticeCapability,
  practiceForPrototypeTradition,
} from "./practices/registry";

export {
  PRACTICE_CAPABILITY_IDS,
  PRACTICE_IDS,
  type PlannedPracticeActionId,
  type PracticeAdvancementBranchId,
  type PracticeCapabilityId,
  type PracticeCapabilitySource,
  type PracticeDefinition,
  type PracticeGrantReferences,
  type PracticeId,
  type PracticeImplementationState,
  type PracticeLocus,
  type PracticeSocialTag,
  type PracticeSpiritCadenceId,
  type PracticeStartingKitId,
  type PracticeVerb,
} from "./practices/types";
