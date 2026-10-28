export {
  allocateServantCommand,
  completeServantCommand,
  deployBonebinderServant,
  deployPersistentServantForBattle,
  getServantCommandUnavailableReason,
  interposingServantFor,
  resolvePersistentServantCommand,
  syncPersistentServantFromBattle,
} from "./battle";

export {
  DITCH_HAND_CLAIM_ID,
  DITCH_HAND_PROVENANCE_ID,
  DITCH_HAND_RECOGNITION_EVIDENCE_ID,
  DITCH_HAND_SERVANT_ID,
  beginDitchHandPractice,
  createDitchHandServant,
  initializeDitchHandPractice,
  recognizeDitchHand,
} from "./ditch-hand";

export {
  installDitchHandFixture,
  recognizeDitchHandFixture,
} from "./fixture";

export { bonebinderStateFor } from "./practice-state";

export {
  SERVANT_COMMANDS,
  issueServantCommand,
  type IssueServantCommandFailure,
  type IssueServantCommandResult,
  type ServantCommandDefinition,
} from "./commands";

export {
  SERVANT_SERVICE_PURPOSES,
  assessServantCompactOrder,
  createServantCompact,
  type ServantCompact,
  type ServantCompactOrder,
  type ServantCompactOrderAssessment,
  type ServantCompactOrderOutcome,
  type ServantServicePurposeDefinition,
  type ServantServicePurposeId,
  type ServantServiceTag,
} from "./compact";

export {
  SOMATIC_MEMORY_ACTION_PROFILES,
  availableSomaticCounselActions,
  selectSomaticCounselAction,
  type SelectSomaticCounselOptions,
  type SelectSomaticCounselResult,
  type SomaticCounselActionId,
  type SomaticCounselCandidate,
  type SomaticMemoryActionProfile,
} from "./counsel";

export {
  assessLetterOfServiceOrder,
  bonebinderDoctrineFor,
  configureServantCompact,
  prepareCalledCounsel,
  previousCounselActionFor,
  type AssessLetterOfServiceResult,
  type BonebinderDoctrineId,
  type BonebinderDoctrineSelection,
  type ConfigureServantCompactResult,
  type PrepareCalledCounselResult,
} from "./advancement-state";

export {
  createBonebinderAdvancementState,
  isBonebinderAdvancementState,
  normalizeBonebinderAdvancementState,
  type BonebinderAdvancementState,
  type BonebinderCounselHistoryEntry,
} from "./advancement-persistence";

export {
  assessServantRepairNeeds,
  repairServant,
  type ServantRepairRequest,
  type ServantRepairResult,
} from "./repairs";

export {
  createBonebinderServant,
  type CreateBonebinderServantOptions,
} from "./servant";

export {
  resolveServantWorldContext,
  type ServantWorldContext,
} from "./world-context";

export type {
  BodyIdentityStatus,
  BonebinderPracticeState,
  BonebinderServantState,
  PersistentServantCombatant,
  ServantCapabilityId,
  ServantCommand,
  ServantCommandId,
  ServantCommandState,
  ServantCommandTargetKind,
  ServantContinuityKind,
  ServantIdentity,
  ServantRepairNeed,
  ServantRepairRecord,
  ServantRepairState,
  ServantSomaticMemory,
  ServantWorldReferences,
} from "./types";
