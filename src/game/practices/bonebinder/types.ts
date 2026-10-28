import type {
  BodyPartId,
  Combatant,
  WorldClaimState,
  WorldEvidenceState,
  WorldProvenanceState,
  Wound,
} from "../../types";
import type { BonebinderAdvancementState } from "./advancement-persistence";

export type PersistentServantCombatant = Omit<
  Combatant,
  "kind" | "materiality"
> & {
  kind: "ally";
  materiality: "corporeal";
  lifetime: {
    kind: "persistent";
    servantId: string;
  };
};

export type ServantContinuityKind =
  | "made-continuity"
  | "recalled-initiative"
  | "uncertain";

export type BodyIdentityStatus =
  | "identified"
  | "partially-identified"
  | "unidentified"
  | "composite";

export interface ServantIdentity {
  id: string;
  useName: string;
  continuity: ServantContinuityKind;
  bodyIdentity: {
    status: BodyIdentityStatus;
    knownName: string | null;
    recognitionMarks: readonly string[];
  };
}

/**
 * Links into canonical WorldState records. Ownership, authorization, custody,
 * and recognition are resolved from those records rather than copied here.
 */
export interface ServantWorldReferences {
  provenanceId: WorldProvenanceState["id"];
  claimIds: readonly WorldClaimState["id"][];
  recognitionEvidenceIds: readonly WorldEvidenceState["id"][];
}

export type ServantCommandId =
  | "await"
  | "counsel"
  | "guard"
  | "interpose"
  | "harry"
  | "labor"
  | "withdraw";

export type ServantCommandTargetKind =
  | "none"
  | "combatant"
  | "optional-combatant"
  | "task";

export type ServantCapabilityId =
  | "guard"
  | "interpose"
  | "harry"
  | "corporeal-labor";

export interface ServantCommand {
  id: ServantCommandId;
  targetReference: string | null;
  issuedAtReference: string | null;
}

export interface ServantCommandState {
  sequence: number;
  current: ServantCommand;
}

export interface ServantRepairRecord {
  id: string;
  part: BodyPartId;
  conditionRestored: number;
  healthRestored: number;
  stabilizedWoundId: string | null;
  materialReferences: readonly string[];
  performedAtReference: string | null;
}

export interface ServantRepairState {
  sequence: number;
  history: readonly ServantRepairRecord[];
}

export interface ServantSomaticMemory {
  id: string;
  workReference: string;
  confidence: "trace" | "reliable" | "ingrained";
}

export interface BonebinderServantState {
  identity: ServantIdentity;
  combatant: PersistentServantCombatant;
  worldReferences: ServantWorldReferences;
  capabilities: readonly ServantCapabilityId[];
  somaticMemories: readonly ServantSomaticMemory[];
  command: ServantCommandState;
  repairs: ServantRepairState;
}

export interface BonebinderPracticeState {
  servant: BonebinderServantState | null;
  advancement: BonebinderAdvancementState;
}

export interface ServantRepairNeed {
  part: BodyPartId;
  missingCondition: number;
  wounds: readonly Wound[];
}
