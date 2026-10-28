import type { ActionId, AdvancementId } from "../types";

export const PRACTICE_IDS = [
  "medium",
  "bonebinder",
  "renderer",
  "grave-warden",
  "ferryman",
] as const;

export type PracticeId = (typeof PRACTICE_IDS)[number];

export const PRACTICE_CAPABILITY_IDS = [
  "host-dead-initiative",
  "receive-dead-testimony",
  "recognize-foreign-initiative",
  "command-dead-initiative",
  "maintain-corporeal-servant",
  "read-somatic-memory",
  "verify-mortuary-provenance",
  "diagnose-death-altered-matter",
  "render-death-altered-matter",
  "preserve-mortuary-evidence",
  "establish-mortuary-seal",
  "diagnose-continuity-breach",
  "stabilize-body-continuity",
  "mark-dead-passage",
  "close-dead-passage",
  "conduct-dead-initiative",
] as const;

export type PracticeCapabilityId =
  (typeof PRACTICE_CAPABILITY_IDS)[number];

export type PracticeImplementationState =
  | "prototype-playable"
  | "vertical-slice"
  | "foundation-only"
  | "deferred";

export type PracticeLocus =
  | "living-self"
  | "prepared-remains"
  | "death-altered-matter"
  | "continuity-and-custody"
  | "passage-and-thresholds";

export type PracticeVerb =
  | "host"
  | "bind"
  | "render"
  | "keep"
  | "conduct";

export type PracticeSpiritCadenceId =
  | "bounded-hosting"
  | "servant-upkeep"
  | "banked-preparation"
  | "breached-seal"
  | "completed-passage";

export type PracticeSocialTag =
  | "dead-testimony"
  | "hosting-scars"
  | "visible-corporeal-servant"
  | "claimed-remains"
  | "rendering-residue"
  | "mortuary-service"
  | "boundary-work"
  | "custody-work"
  | "safe-conduct"
  | "disturbed-threshold";

export type PlannedPracticeActionId =
  | "admit-guest"
  | "command-servant"
  | "repair-servant"
  | "prepare-mortuary-mixture"
  | "set-mortuary-seal"
  | "mark-last-passage";

export type PracticeStartingKitId =
  | "medium-prototype-kit"
  | "bonebinder-kit"
  | "renderer-kit"
  | "grave-warden-kit"
  | "ferryman-kit";

export type PracticeAdvancementBranchId =
  | "medium-hospitality"
  | "medium-usurpation"
  | "medium-chorus"
  | "bonebinder-compact"
  | "bonebinder-impression"
  | "bonebinder-echo-work"
  | "renderer-preservation"
  | "renderer-rendering"
  | "renderer-cold-furnace"
  | "grave-warden-threshold"
  | "grave-warden-custody"
  | "grave-warden-revision"
  | "ferryman-return"
  | "ferryman-exile"
  | "ferryman-roadwork";

export interface PracticeGrantReferences {
  /**
   * Existing production actions usable without changing the current resolver.
   * Planned actions remain separate so the registry cannot imply playability.
   */
  implementedActionIds: readonly ActionId[];
  plannedActionIds: readonly PlannedPracticeActionId[];
  startingKitId: PracticeStartingKitId;
  implementedAdvancementIds: readonly AdvancementId[];
  advancementBranchIds: readonly PracticeAdvancementBranchId[];
}

export interface PracticeDefinition {
  id: PracticeId;
  name: string;
  ownedVerb: PracticeVerb;
  locus: PracticeLocus;
  recurringQuestion: string;
  implementation: PracticeImplementationState;
  spiritCadence: PracticeSpiritCadenceId;
  capabilities: readonly PracticeCapabilityId[];
  socialTags: readonly PracticeSocialTag[];
  grants: PracticeGrantReferences;
}

export interface PracticeCapabilitySource {
  capabilities: readonly PracticeCapabilityId[];
}
