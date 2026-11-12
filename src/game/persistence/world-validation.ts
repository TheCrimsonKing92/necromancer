import type { WorldFactId, WorldRelationId } from "../types";
import {
  WORLD_FACTION_IDS,
  WORLD_RELATION_IDS,
} from "../world/actor-identifiers";
import { WORLD_FACT_IDS } from "../world/fact-identifiers";
import { isFiniteNumber, isRecord } from "./validation-primitives";

export const isWorldFact = (
  value: unknown,
): value is WorldFactId =>
  typeof value === "string" &&
  WORLD_FACT_IDS.includes(value as WorldFactId);

const isWorldRelationId = (value: unknown): boolean =>
  typeof value === "string" &&
  WORLD_RELATION_IDS.includes(value as WorldRelationId);

const isWorldBelief = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldRelationId(value.holderId) &&
  isWorldFact(value.factId) &&
  (value.certainty === "rumor" ||
    value.certainty === "credible" ||
    value.certainty === "accepted") &&
  Array.isArray(value.basisEvidenceIds) &&
  value.basisEvidenceIds.every(
    (evidenceId) => typeof evidenceId === "string",
  );

const isWorldEvidence = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldFact(value.factId) &&
  (value.kind === "witness" ||
    value.kind === "body" ||
    value.kind === "object" ||
    value.kind === "record" ||
    value.kind === "occult-trace") &&
  (value.custodianId === null ||
    isWorldRelationId(value.custodianId)) &&
  (value.strength === 1 ||
    value.strength === 2 ||
    value.strength === 3) &&
  (value.provenanceId === null ||
    typeof value.provenanceId === "string");

const isWorldCustodyEntry = (value: unknown): boolean =>
  isRecord(value) &&
  isWorldRelationId(value.custodianId) &&
  (value.basis === "claim" ||
    value.basis === "law" ||
    value.basis === "permission" ||
    value.basis === "possession") &&
  (value.status === "current" ||
    value.status === "transferred" ||
    value.status === "lost") &&
  (value.originFactId === null ||
    isWorldFact(value.originFactId));

const isWorldProvenance = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.subjectId === "string" &&
  (value.subjectKind === "person" ||
    value.subjectKind === "body" ||
    value.subjectKind === "item" ||
    value.subjectKind === "place" ||
    value.subjectKind === "record") &&
  (value.originFactId === null ||
    isWorldFact(value.originFactId)) &&
  Array.isArray(value.claimantIds) &&
  value.claimantIds.every(isWorldRelationId) &&
  Array.isArray(value.custody) &&
  value.custody.every(isWorldCustodyEntry) &&
  Array.isArray(value.tags) &&
  value.tags.every((tag) => typeof tag === "string");

const isWorldClaim = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldRelationId(value.claimantId) &&
  typeof value.subjectId === "string" &&
  (value.kind === "ownership" ||
    value.kind === "custody" ||
    value.kind === "authority" ||
    value.kind === "identity") &&
  (value.status === "asserted" ||
    value.status === "recognized" ||
    value.status === "disputed" ||
    value.status === "released") &&
  Array.isArray(value.basisFactIds) &&
  value.basisFactIds.every(isWorldFact);

const isWorldRelationship = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldRelationId(value.fromId) &&
  isWorldRelationId(value.toId) &&
  (value.kind === "membership" ||
    value.kind === "employment" ||
    value.kind === "kinship" ||
    value.kind === "custody" ||
    value.kind === "obligation") &&
  (value.status === "active" ||
    value.status === "strained" ||
    value.status === "ended") &&
  (value.originFactId === null ||
    isWorldFact(value.originFactId));

const isWorldPressure = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.scopeId === "string" &&
  isFiniteNumber(value.intensity) &&
  Array.isArray(value.stakeholderIds) &&
  value.stakeholderIds.every(isWorldRelationId) &&
  Array.isArray(value.sourceFactIds) &&
  value.sourceFactIds.every(isWorldFact) &&
  (value.status === "active" || value.status === "resolved");

export const isWorldState = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const {
    pressures,
    standing,
    facts,
    playerKnowledge,
    knowledge,
    beliefs,
    evidence,
    provenance,
    claims,
    relationships,
    activePressures,
  } = value;

  return (
    isRecord(pressures) &&
    isFiniteNumber(pressures.escapedNames) &&
    isFiniteNumber(pressures.countyNotice) &&
    isRecord(standing) &&
    WORLD_RELATION_IDS.every(
      (id) =>
        standing[id] === undefined ||
        isFiniteNumber(standing[id]),
    ) &&
    Array.isArray(facts) &&
    facts.every(isWorldFact) &&
    (playerKnowledge === undefined ||
      (Array.isArray(playerKnowledge) &&
        playerKnowledge.every(isWorldFact))) &&
    isRecord(knowledge) &&
    WORLD_FACTION_IDS.every((id) => {
      const knownFacts = knowledge[id];
      return Array.isArray(knownFacts) && knownFacts.every(isWorldFact);
    }) &&
    (beliefs === undefined ||
      (Array.isArray(beliefs) && beliefs.every(isWorldBelief))) &&
    (evidence === undefined ||
      (Array.isArray(evidence) && evidence.every(isWorldEvidence))) &&
    (provenance === undefined ||
      (Array.isArray(provenance) &&
        provenance.every(isWorldProvenance))) &&
    (claims === undefined ||
      (Array.isArray(claims) && claims.every(isWorldClaim))) &&
    (relationships === undefined ||
      (Array.isArray(relationships) &&
        relationships.every(isWorldRelationship))) &&
    (activePressures === undefined ||
      (Array.isArray(activePressures) &&
        activePressures.every(isWorldPressure)))
  );
};
