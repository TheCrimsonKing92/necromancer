import type {
  WorldBeliefCertainty,
  WorldBeliefState,
  WorldClaimState,
  WorldEvidenceState,
  WorldFactionId,
  WorldFactId,
  WorldPressureState,
  WorldProvenanceState,
  WorldRelationId,
  WorldRelationshipState,
  WorldState,
} from "../types";
import {
  WORLD_FACTION_IDS,
  WORLD_RELATION_IDS,
  isWorldRelationId,
} from "./actor-identifiers";
import { isWorldFactId } from "./fact-identifiers";

const PRESSURE_BINDINGS = {
  escapedNames: {
    id: "north-vey:escaped-names",
    scopeId: "north-vey",
    stakeholderIds: ["north-road-households", "burial-crews"],
  },
  countyNotice: {
    id: "north-vey:county-notice",
    scopeId: "north-vey",
    stakeholderIds: ["county-reeves"],
  },
} as const satisfies Record<
  keyof WorldState["pressures"],
  {
    id: string;
    scopeId: string;
    stakeholderIds: WorldRelationId[];
  }
>;

const boundedStanding = (value: number): number =>
  Math.max(-3, Math.min(3, Math.trunc(value)));

const boundedPressure = (value: number): number =>
  Math.max(0, Math.min(9, Math.trunc(value)));

const beliefRank: Record<WorldBeliefCertainty, number> = {
  rumor: 0,
  credible: 1,
  accepted: 2,
};

const uniqueFacts = (value: unknown): WorldFactId[] =>
  Array.isArray(value)
    ? [...new Set(value.filter(isWorldFactId))]
    : [];

const pressureRecordFor = (
  pressure: keyof WorldState["pressures"],
  intensity: number,
): WorldPressureState => {
  const definition = PRESSURE_BINDINGS[pressure];
  return {
    id: definition.id,
    scopeId: definition.scopeId,
    intensity: boundedPressure(intensity),
    stakeholderIds: [...definition.stakeholderIds],
    sourceFactIds: [],
    status: intensity > 0 ? "active" : "resolved",
  };
};

export const createWorldState = (): WorldState => ({
  pressures: {
    escapedNames: 0,
    countyNotice: 0,
  },
  standing: Object.fromEntries(
    WORLD_RELATION_IDS.map((id) => [id, 0]),
  ) as Record<WorldRelationId, number>,
  facts: [],
  playerKnowledge: [],
  knowledge: Object.fromEntries(
    WORLD_FACTION_IDS.map((id) => [id, []]),
  ) as unknown as Record<WorldFactionId, WorldFactId[]>,
  beliefs: [],
  evidence: [],
  provenance: [],
  claims: [],
  relationships: [],
  activePressures: [
    pressureRecordFor("escapedNames", 0),
    pressureRecordFor("countyNotice", 0),
  ],
});

const normalizeBeliefs = (
  value: unknown,
): WorldBeliefState[] => {
  if (!Array.isArray(value)) return [];
  const beliefs: WorldBeliefState[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("holderId" in candidate) ||
      !isWorldRelationId(candidate.holderId) ||
      !("factId" in candidate) ||
      !isWorldFactId(candidate.factId)
    ) {
      continue;
    }
    const certainty =
      "certainty" in candidate &&
      (candidate.certainty === "rumor" ||
        candidate.certainty === "credible" ||
        candidate.certainty === "accepted")
        ? candidate.certainty
        : "credible";
    const id =
      "id" in candidate && typeof candidate.id === "string"
        ? candidate.id
        : `belief:${candidate.holderId}:${candidate.factId}`;
    const basisEvidenceIds: string[] = [];
    if (
      "basisEvidenceIds" in candidate &&
      Array.isArray(candidate.basisEvidenceIds)
    ) {
      for (const evidenceId of candidate.basisEvidenceIds) {
        if (
          typeof evidenceId === "string" &&
          !basisEvidenceIds.includes(evidenceId)
        ) {
          basisEvidenceIds.push(evidenceId);
        }
      }
    }
    beliefs.push({
      id,
      holderId: candidate.holderId,
      factId: candidate.factId,
      certainty,
      basisEvidenceIds,
    });
  }
  return beliefs.filter(
    (belief, index) =>
      beliefs.findIndex((candidate) => candidate.id === belief.id) ===
      index,
  );
};

const normalizeEvidence = (
  value: unknown,
): WorldEvidenceState[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("id" in candidate) ||
      typeof candidate.id !== "string" ||
      !("factId" in candidate) ||
      !isWorldFactId(candidate.factId) ||
      !("kind" in candidate) ||
      (candidate.kind !== "witness" &&
        candidate.kind !== "body" &&
        candidate.kind !== "object" &&
        candidate.kind !== "record" &&
        candidate.kind !== "occult-trace")
    ) {
      return [];
    }
    const custodianId =
      "custodianId" in candidate &&
      isWorldRelationId(candidate.custodianId)
        ? candidate.custodianId
        : null;
    const strength =
      "strength" in candidate &&
      (candidate.strength === 1 ||
        candidate.strength === 2 ||
        candidate.strength === 3)
        ? candidate.strength
        : 1;
    const provenanceId =
      "provenanceId" in candidate &&
      typeof candidate.provenanceId === "string"
        ? candidate.provenanceId
        : null;
    return [{
      id: candidate.id,
      factId: candidate.factId,
      kind: candidate.kind,
      custodianId,
      strength,
      provenanceId,
    }];
  }).filter(
    (evidence, index, all) =>
      all.findIndex((candidate) => candidate.id === evidence.id) ===
      index,
  );
};

const arrayOrEmpty = <T>(value: T[] | undefined): T[] =>
  Array.isArray(value) ? value : [];

export const normalizeWorldState = (world: WorldState): WorldState => {
  world.facts = uniqueFacts(world.facts);
  world.playerKnowledge = uniqueFacts(world.playerKnowledge);

  for (const relationId of WORLD_RELATION_IDS) {
    world.standing[relationId] = boundedStanding(
      Number.isFinite(world.standing[relationId])
        ? world.standing[relationId]
        : 0,
    );
  }
  for (const factionId of WORLD_FACTION_IDS) {
    world.knowledge[factionId] = uniqueFacts(
      world.knowledge[factionId],
    );
  }

  world.pressures.escapedNames = boundedPressure(
    world.pressures.escapedNames,
  );
  world.pressures.countyNotice = boundedPressure(
    world.pressures.countyNotice,
  );
  world.beliefs = normalizeBeliefs(world.beliefs);
  world.evidence = normalizeEvidence(world.evidence);
  world.provenance = arrayOrEmpty(world.provenance);
  world.claims = arrayOrEmpty(world.claims);
  world.relationships = arrayOrEmpty(world.relationships);
  world.activePressures = arrayOrEmpty(world.activePressures);

  for (const factionId of WORLD_FACTION_IDS) {
    for (const factId of world.knowledge[factionId]) {
      recordWorldBelief(world, factionId, factId, "accepted");
    }
  }
  for (const belief of world.beliefs) {
    if (
      WORLD_FACTION_IDS.includes(belief.holderId as WorldFactionId)
    ) {
      const factionId = belief.holderId as WorldFactionId;
      if (!world.knowledge[factionId].includes(belief.factId)) {
        world.knowledge[factionId].push(belief.factId);
      }
    }
  }

  for (const pressure of Object.keys(
    PRESSURE_BINDINGS,
  ) as (keyof WorldState["pressures"])[]) {
    syncLegacyPressure(world, pressure);
  }
  return world;
};

export const recordWorldFact = (
  world: WorldState,
  fact: WorldFactId,
): void => {
  if (!world.facts.includes(fact)) world.facts.push(fact);
};

export const worldHasFact = (
  world: WorldState,
  fact: WorldFactId,
): boolean => world.facts.includes(fact);

export const learnWorldFact = (
  world: WorldState,
  fact: WorldFactId,
): void => {
  recordWorldFact(world, fact);
  if (!world.playerKnowledge.includes(fact)) {
    world.playerKnowledge.push(fact);
  }
};

export const playerKnows = (
  world: WorldState,
  fact: WorldFactId,
): boolean => world.playerKnowledge.includes(fact);

export const recordWorldBelief = (
  world: WorldState,
  holderId: WorldRelationId,
  factId: WorldFactId,
  certainty: WorldBeliefCertainty = "credible",
  basisEvidenceIds: string[] = [],
): WorldBeliefState => {
  const id = `belief:${holderId}:${factId}`;
  const existing = world.beliefs.find((belief) => belief.id === id);
  if (existing) {
    if (beliefRank[certainty] > beliefRank[existing.certainty]) {
      existing.certainty = certainty;
    }
    existing.basisEvidenceIds = [
      ...new Set([...existing.basisEvidenceIds, ...basisEvidenceIds]),
    ];
    return existing;
  }
  const belief: WorldBeliefState = {
    id,
    holderId,
    factId,
    certainty,
    basisEvidenceIds: [...new Set(basisEvidenceIds)],
  };
  world.beliefs.push(belief);
  return belief;
};

export const actorBelievesFact = (
  world: WorldState,
  actorId: WorldRelationId,
  factId: WorldFactId,
  minimumCertainty: WorldBeliefCertainty = "credible",
): boolean =>
  world.beliefs.some(
    (belief) =>
      belief.holderId === actorId &&
      belief.factId === factId &&
      beliefRank[belief.certainty] >= beliefRank[minimumCertainty],
  );

export const beliefsHeldBy = (
  world: WorldState,
  holderId: WorldRelationId,
): WorldBeliefState[] =>
  world.beliefs.filter((belief) => belief.holderId === holderId);

export const revealWorldFact = (
  world: WorldState,
  faction: WorldFactionId,
  fact: WorldFactId,
  disclosure: {
    certainty?: WorldBeliefCertainty;
    basisEvidenceIds?: string[];
  } = {},
): void => {
  recordWorldFact(world, fact);
  recordWorldBelief(
    world,
    faction,
    fact,
    disclosure.certainty ?? "accepted",
    disclosure.basisEvidenceIds ?? [],
  );
  if (!world.knowledge[faction].includes(fact)) {
    world.knowledge[faction].push(fact);
  }
};

export const factionKnows = (
  world: WorldState,
  faction: WorldFactionId,
  fact: WorldFactId,
): boolean =>
  actorBelievesFact(world, faction, fact, "credible") ||
  world.knowledge[faction].includes(fact);

export const recordWorldEvidence = (
  world: WorldState,
  evidence: WorldEvidenceState,
): void => {
  const existing = world.evidence.find(
    (candidate) => candidate.id === evidence.id,
  );
  if (existing) Object.assign(existing, evidence);
  else world.evidence.push(structuredClone(evidence));
};

export const evidenceForFact = (
  world: WorldState,
  factId: WorldFactId,
): WorldEvidenceState[] =>
  world.evidence.filter((evidence) => evidence.factId === factId);

export const recordWorldProvenance = (
  world: WorldState,
  provenance: WorldProvenanceState,
): void => {
  const existing = world.provenance.find(
    (candidate) => candidate.id === provenance.id,
  );
  if (existing) Object.assign(existing, structuredClone(provenance));
  else world.provenance.push(structuredClone(provenance));
};

export const transferWorldCustody = (
  world: WorldState,
  provenanceId: string,
  custodianId: WorldRelationId,
  basis: "claim" | "law" | "permission" | "possession",
  originFactId: WorldFactId | null = null,
): boolean => {
  const provenance = world.provenance.find(
    (candidate) => candidate.id === provenanceId,
  );
  if (!provenance) return false;
  for (const entry of provenance.custody) {
    if (entry.status === "current") entry.status = "transferred";
  }
  provenance.custody.push({
    custodianId,
    basis,
    status: "current",
    originFactId,
  });
  return true;
};

export const currentCustodianOf = (
  world: WorldState,
  provenanceId: string,
): WorldRelationId | null => {
  const custody =
    world.provenance.find(
      (candidate) => candidate.id === provenanceId,
    )?.custody ?? [];
  for (let index = custody.length - 1; index >= 0; index -= 1) {
    if (custody[index]?.status === "current") {
      return custody[index]!.custodianId;
    }
  }
  return null;
};

export const recordWorldClaim = (
  world: WorldState,
  claim: WorldClaimState,
): void => {
  const existing = world.claims.find(
    (candidate) => candidate.id === claim.id,
  );
  if (existing) Object.assign(existing, structuredClone(claim));
  else world.claims.push(structuredClone(claim));
};

export const claimsForSubject = (
  world: WorldState,
  subjectId: string,
): WorldClaimState[] =>
  world.claims.filter((claim) => claim.subjectId === subjectId);

export const recordWorldRelationship = (
  world: WorldState,
  relationship: WorldRelationshipState,
): void => {
  const existing = world.relationships.find(
    (candidate) => candidate.id === relationship.id,
  );
  if (existing) Object.assign(existing, structuredClone(relationship));
  else world.relationships.push(structuredClone(relationship));
};

export const relationshipsFor = (
  world: WorldState,
  actorId: WorldRelationId,
): WorldRelationshipState[] =>
  world.relationships.filter(
    (relationship) =>
      relationship.fromId === actorId ||
      relationship.toId === actorId,
  );

export const reportFactWithEvidence = (
  world: WorldState,
  faction: WorldFactionId,
  evidence: WorldEvidenceState,
  certainty: WorldBeliefCertainty = "credible",
): void => {
  recordWorldEvidence(world, evidence);
  revealWorldFact(world, faction, evidence.factId, {
    certainty,
    basisEvidenceIds: [evidence.id],
  });
};

export const adjustWorldStanding = (
  world: WorldState,
  relation: WorldRelationId,
  amount: number,
): void => {
  world.standing[relation] = boundedStanding(
    world.standing[relation] + amount,
  );
};

const syncLegacyPressure = (
  world: WorldState,
  pressure: keyof WorldState["pressures"],
): void => {
  const definition = PRESSURE_BINDINGS[pressure];
  const existing = world.activePressures.find(
    (candidate) => candidate.id === definition.id,
  );
  const intensity = boundedPressure(world.pressures[pressure]);
  if (existing) {
    existing.intensity = intensity;
    existing.status = intensity > 0 ? "active" : "resolved";
    return;
  }
  world.activePressures.push(pressureRecordFor(pressure, intensity));
};

export const adjustWorldPressure = (
  world: WorldState,
  pressure: keyof WorldState["pressures"],
  amount: number,
  sourceFactId?: WorldFactId,
): void => {
  world.pressures[pressure] = boundedPressure(
    world.pressures[pressure] + amount,
  );
  syncLegacyPressure(world, pressure);
  if (sourceFactId) {
    const pressureId = PRESSURE_BINDINGS[pressure].id;
    const record = world.activePressures.find(
      (candidate) => candidate.id === pressureId,
    );
    if (record && !record.sourceFactIds.includes(sourceFactId)) {
      record.sourceFactIds.push(sourceFactId);
    }
  }
};

export const activeWorldPressures = (
  world: WorldState,
  scopeId?: string,
): WorldPressureState[] =>
  world.activePressures.filter(
    (pressure) =>
      pressure.status === "active" &&
      (scopeId === undefined || pressure.scopeId === scopeId),
  );
