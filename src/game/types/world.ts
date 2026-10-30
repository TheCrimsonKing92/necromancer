export type EncounterId =
  | "ossuary-road"
  | "saint-orra"
  | "black-mile-wake";
export type WakeVariantId =
  | "bell-widow"
  | "name-thieves"
  | "bone-procession"
  | "reliquary-poachers"
  | "reeve-patrol";
export type RoadEventId =
  | "mourning-caravan"
  | "hedge-surgeon"
  | "ditch-burial"
  | "disputed-bundle";
export type WorldFactionId =
  | "county-reeves"
  | "burial-crews"
  | "reliquary-brokers"
  | "north-road-households";
export type WorldPersonId = "iven-saye" | "eda-pell" | "oren-vask";
export type WorldRelationId = WorldFactionId | WorldPersonId;
export type WorldFactId =
  | "hollis-vane-dead"
  | "hollis-vane-rendered"
  | "saint-orra-unbound"
  | "shared-mourning-fire"
  | "aided-county-burial"
  | "gave-use-name-to-burial-crews"
  | "dealt-with-iven"
  | "roadside-bundle-examined"
  | "bundle-trace-points-to-broker"
  | "bundle-left-under-burial-custody"
  | "bundle-released-to-broker"
  | "ditch-hand-body-recognized";
export type WorldBeliefCertainty = "rumor" | "credible" | "accepted";
export type WorldEvidenceKind =
  | "witness"
  | "body"
  | "object"
  | "record"
  | "occult-trace";
export type WorldClaimKind =
  | "ownership"
  | "custody"
  | "authority"
  | "identity";
export type WorldSubjectKind =
  | "person"
  | "body"
  | "item"
  | "place"
  | "record";

export interface WorldBeliefState {
  id: string;
  holderId: WorldRelationId;
  factId: WorldFactId;
  certainty: WorldBeliefCertainty;
  basisEvidenceIds: string[];
}

export interface WorldEvidenceState {
  id: string;
  factId: WorldFactId;
  kind: WorldEvidenceKind;
  custodianId: WorldRelationId | null;
  strength: 1 | 2 | 3;
  provenanceId: string | null;
}

export interface WorldCustodyEntry {
  custodianId: WorldRelationId;
  basis: "claim" | "law" | "permission" | "possession";
  status: "current" | "transferred" | "lost";
  originFactId: WorldFactId | null;
}

export interface WorldProvenanceState {
  id: string;
  subjectId: string;
  subjectKind: WorldSubjectKind;
  originFactId: WorldFactId | null;
  claimantIds: WorldRelationId[];
  custody: WorldCustodyEntry[];
  tags: string[];
}

export interface WorldClaimState {
  id: string;
  claimantId: WorldRelationId;
  subjectId: string;
  kind: WorldClaimKind;
  status: "asserted" | "recognized" | "disputed" | "released";
  basisFactIds: WorldFactId[];
}

export interface WorldRelationshipState {
  id: string;
  fromId: WorldRelationId;
  toId: WorldRelationId;
  kind:
    | "membership"
    | "employment"
    | "kinship"
    | "custody"
    | "obligation";
  status: "active" | "strained" | "ended";
  originFactId: WorldFactId | null;
}

export interface WorldPressureState {
  id: string;
  scopeId: string;
  intensity: number;
  stakeholderIds: WorldRelationId[];
  sourceFactIds: WorldFactId[];
  status: "active" | "resolved";
}
