import type { EngineResult, GameState, RunState } from "../../types";
import {
  learnWorldFact,
  recordWorldBelief,
  recordWorldClaim,
  recordWorldEvidence,
  recordWorldProvenance,
} from "../../world/state";
import { createBonebinderAdvancementState } from "./advancement-persistence";
import { createBonebinderServant } from "./servant";
import type { BonebinderServantState } from "./types";

export const DITCH_HAND_SERVANT_ID = "servant:ditch-hand";
export const DITCH_HAND_PROVENANCE_ID = "provenance:ditch-hand-body";
export const DITCH_HAND_CLAIM_ID = "claim:burial-crews:ditch-hand-body";
export const DITCH_HAND_RECOGNITION_EVIDENCE_ID =
  "evidence:eda-pell:ditch-hand-body";

export const createDitchHandServant = (): BonebinderServantState =>
  createBonebinderServant({
    id: DITCH_HAND_SERVANT_ID,
    useName: "Ditch-Hand",
    continuity: "made-continuity",
    bodyIdentity: {
      status: "partially-identified",
      knownName: null,
      recognitionMarks: [
        "county burial seal beneath the right collar",
        "old mending along the left collarbone",
      ],
    },
    worldReferences: {
      provenanceId: DITCH_HAND_PROVENANCE_ID,
      claimIds: [DITCH_HAND_CLAIM_ID],
      recognitionEvidenceIds: [DITCH_HAND_RECOGNITION_EVIDENCE_ID],
    },
    maxHp: 20,
    attack: 4,
    defense: 1,
    bodyScale: 0.86,
    somaticMemories: [
      {
        id: "memory:ditch-hand:pallbearer",
        workReference: "county-pallbearer",
        confidence: "reliable",
      },
    ],
  });

const ensureDitchHandWorldRecords = (run: RunState): void => {
  if (!run.world.provenance.some(({ id }) => id === DITCH_HAND_PROVENANCE_ID)) {
    recordWorldProvenance(run.world, {
      id: DITCH_HAND_PROVENANCE_ID,
      subjectId: "body:ditch-hand",
      subjectKind: "body",
      originFactId: null,
      claimantIds: ["burial-crews"],
      custody: [
        {
          custodianId: "eda-pell",
          basis: "permission",
          status: "current",
          originFactId: null,
        },
      ],
      tags: [
        "county-burial-seal",
        "authorized-road-labor",
        "corporeal-servant",
      ],
    });
  }
  if (!run.world.claims.some(({ id }) => id === DITCH_HAND_CLAIM_ID)) {
    recordWorldClaim(run.world, {
      id: DITCH_HAND_CLAIM_ID,
      claimantId: "burial-crews",
      subjectId: "body:ditch-hand",
      kind: "custody",
      status: "recognized",
      basisFactIds: [],
    });
  }
};

export const initializeDitchHandPractice = (run: RunState): boolean => {
  if (run.practiceStates?.bonebinder?.servant) return false;
  ensureDitchHandWorldRecords(run);
  run.practiceStates = {
    ...run.practiceStates,
    bonebinder: {
      servant: createDitchHandServant(),
      advancement: createBonebinderAdvancementState(),
    },
  };
  return true;
};

export const beginDitchHandPractice = (state: GameState): EngineResult => {
  if (!state.run) return { state, error: "No active journey was found." };
  const next = structuredClone(state);
  if (!initializeDitchHandPractice(next.run!)) {
    return { state, error: "A persistent servant is already recorded." };
  }
  return { state: next };
};

export const recognizeDitchHand = (state: GameState): EngineResult => {
  const servant = state.run?.practiceStates?.bonebinder?.servant ?? null;
  if (!state.run || servant?.identity.id !== DITCH_HAND_SERVANT_ID) {
    return { state, error: "Ditch-Hand is not present to recognize." };
  }
  const next = structuredClone(state);
  const run = next.run!;
  ensureDitchHandWorldRecords(run);
  learnWorldFact(run.world, "ditch-hand-body-recognized");
  recordWorldEvidence(run.world, {
    id: DITCH_HAND_RECOGNITION_EVIDENCE_ID,
    factId: "ditch-hand-body-recognized",
    kind: "body",
    custodianId: "eda-pell",
    strength: 2,
    provenanceId: DITCH_HAND_PROVENANCE_ID,
  });
  recordWorldBelief(
    run.world,
    "eda-pell",
    "ditch-hand-body-recognized",
    "accepted",
    [DITCH_HAND_RECOGNITION_EVIDENCE_ID],
  );
  return {
    state: next,
    message:
      "Eda identifies the burial seal and mended collarbone; her recognition is recorded as evidence.",
  };
};
