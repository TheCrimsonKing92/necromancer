import { currentCustodianOf } from "../../world/state";
import type {
  WorldClaimState,
  WorldEvidenceState,
  WorldProvenanceState,
  WorldRelationId,
  WorldState,
} from "../../types";
import type { BonebinderServantState } from "./types";

export interface ServantWorldContext {
  provenance: WorldProvenanceState | null;
  claims: readonly WorldClaimState[];
  recognitionEvidence: readonly WorldEvidenceState[];
  currentCustodianId: WorldRelationId | null;
  unresolvedReferenceIds: readonly string[];
}

export const resolveServantWorldContext = (
  servant: BonebinderServantState,
  world: WorldState,
): ServantWorldContext => {
  const { worldReferences } = servant;
  const provenance =
    world.provenance.find(
      ({ id }) => id === worldReferences.provenanceId,
    ) ?? null;
  const claims = worldReferences.claimIds.flatMap((claimId) => {
    const claim = world.claims.find(({ id }) => id === claimId);
    return claim ? [claim] : [];
  });
  const recognitionEvidence =
    worldReferences.recognitionEvidenceIds.flatMap((evidenceId) => {
      const evidence = world.evidence.find(
        ({ id }) => id === evidenceId,
      );
      return evidence ? [evidence] : [];
    });
  const resolvedIds = new Set([
    ...(provenance ? [provenance.id] : []),
    ...claims.map(({ id }) => id),
    ...recognitionEvidence.map(({ id }) => id),
  ]);
  const unresolvedReferenceIds = [
    worldReferences.provenanceId,
    ...worldReferences.claimIds,
    ...worldReferences.recognitionEvidenceIds,
  ].filter((id) => !resolvedIds.has(id));

  return {
    provenance,
    claims,
    recognitionEvidence,
    currentCustodianId: provenance
      ? currentCustodianOf(world, provenance.id)
      : null,
    unresolvedReferenceIds,
  };
};
