import type { RunState, WorldRelationId } from "../types";
import { WORLD_ACTORS } from "./actors";
import {
  journalWorldVisibilityFor,
  type JournalConcernId,
  type JournalVisibleActorId,
  type JournalWorldVisibility,
} from "./journal-visibility";

export interface JournalWorldEntry {
  id: string;
  title: string;
  kind: string;
  summary: string;
}

export interface JournalWorldReadModel {
  actors: JournalWorldEntry[];
  relationships: JournalWorldEntry[];
  evidence: JournalWorldEntry[];
  claims: JournalWorldEntry[];
  custody: JournalWorldEntry[];
  concerns: JournalWorldEntry[];
}

const actorSummaries: Record<JournalVisibleActorId, string> = {
  "iven-saye":
    "A roadside barber-surgeon whose exact questions and clean instruments make his unofficial work worth the price.",
  "north-road-households":
    "Families who carry their own dead and pass news by carts, kitchens, and mourning fires.",
  "burial-crews":
    "County workers responsible for keeping bodies and uncertain grave material accounted for in transit.",
  "eda-pell":
    "A county burial driver who will carry disputed material only under a record she can defend.",
  "reliquary-brokers":
    "Licensed factors who move prepared grave goods and depend on custody records surviving inspection.",
  "oren-vask":
    "A reliquary factor who claimed the washed-out blackcloth bundle as licensed cargo from his cart.",
};

const actorRole = (id: WorldRelationId): string => {
  const actor = WORLD_ACTORS[id];
  return actor.actorKind === "person"
    ? actor.role
    : actor.institutionKind.replace("-", " ");
};

const actorEntriesFrom = (
  visibility: JournalWorldVisibility,
): JournalWorldEntry[] =>
  visibility.actorIds.map((id) => ({
    id,
    title: WORLD_ACTORS[id].name,
    kind: actorRole(id),
    summary: actorSummaries[id],
  }));

const relationshipDisclosures = {
  "relationship:eda-pell:burial-crews": {
    title: "Eda Pell · County burial crews",
    kind: "Employment",
    summary:
      "Eda drives county dead and answers for anything entered beneath her coffin boards.",
  },
  "relationship:oren-vask:reliquary-brokers": {
    title: "Oren Vask · Reliquary brokers",
    kind: "Membership",
    summary:
      "Oren trades under a reliquary license and keeps his own transfer records.",
  },
} as const;

const relationshipEntriesFrom = (
  visibility: JournalWorldVisibility,
): JournalWorldEntry[] =>
  visibility.relationships.map((relationship) => ({
    id: relationship.id,
    ...relationshipDisclosures[
      relationship.id as keyof typeof relationshipDisclosures
    ],
  }));

const evidenceEntriesFrom = (
  run: RunState,
  visibility: JournalWorldVisibility,
): JournalWorldEntry[] => {
  const traceKnown = run.world.playerKnowledge.includes(
    "bundle-trace-points-to-broker",
  );
  return visibility.evidence.map((evidence) => ({
    id: evidence.id,
    title: traceKnown
      ? "Thread beneath the bundle cord"
      : "Mud-clotted bundle cord",
    kind: traceKnown ? "Material trace" : "Inconclusive trace",
    summary: traceKnown
      ? "Blue packing thread and sheltered limestone place the bundle on Oren’s cart before the washout."
      : "Water, mud, and several old knots left no origin you could defend.",
  }));
};

const claimStatusCopy = {
  asserted: "asserts",
  recognized: "holds the recognized claim to",
  disputed: "keeps a disputed claim to",
  released: "recorded the release of",
} as const;

const claimEntriesFrom = (
  visibility: JournalWorldVisibility,
): JournalWorldEntry[] =>
  visibility.claims.map((claim) => {
    const claimant = WORLD_ACTORS[claim.claimantId].name;
    return {
      id: claim.id,
      title: `${claimant} · ${claim.kind}`,
      kind: "Recorded claim",
      summary: `${claimant} ${claimStatusCopy[claim.status]} the sealed blackcloth bundle.`,
    };
  });

const custodyEntriesFrom = (
  visibility: JournalWorldVisibility,
): JournalWorldEntry[] =>
  visibility.custody.map(({ provenanceId, custodianId }) => ({
    id: provenanceId,
    title: "Sealed blackcloth bundle",
    kind: "Current custody",
    summary: `Last recorded with ${WORLD_ACTORS[custodianId].name}. Its contents remain unopened.`,
  }));

const concernEntries: Record<JournalConcernId, JournalWorldEntry> = {
  "escaped-names": {
    id: "concern:escaped-names",
    title: "The escaped names",
    kind: "Unresolved",
    summary:
      "Names loosened beneath the tollhouse are still traveling north through inhabited country.",
  },
  "witnessed-rendering": {
    id: "concern:witnessed-rendering",
    title: "A witnessed roadside rendering",
    kind: "May travel",
    summary:
      "Someone saw Hollis Vane’s remains opened on the road. Their account may reach county ears.",
  },
  "disputed-bundle": {
    id: "concern:disputed-bundle",
    title: "The blackcloth bundle",
    kind: "Custody unresolved",
    summary:
      "Eda Pell and Oren Vask still hold competing claims to the sealed roadside bundle.",
  },
};

const concernEntriesFrom = (
  visibility: JournalWorldVisibility,
): JournalWorldEntry[] =>
  visibility.concernIds.map((id) => concernEntries[id]);

export const knownActorEntriesFor = (
  run: RunState,
): JournalWorldEntry[] =>
  actorEntriesFrom(journalWorldVisibilityFor(run));

export const knownRelationshipEntriesFor = (
  run: RunState,
): JournalWorldEntry[] =>
  relationshipEntriesFrom(journalWorldVisibilityFor(run));

export const knownEvidenceEntriesFor = (
  run: RunState,
): JournalWorldEntry[] =>
  evidenceEntriesFrom(run, journalWorldVisibilityFor(run));

export const knownClaimEntriesFor = (
  run: RunState,
): JournalWorldEntry[] =>
  claimEntriesFrom(journalWorldVisibilityFor(run));

export const knownCustodyEntriesFor = (
  run: RunState,
): JournalWorldEntry[] =>
  custodyEntriesFrom(journalWorldVisibilityFor(run));

export const activeConcernEntriesFor = (
  run: RunState,
): JournalWorldEntry[] =>
  concernEntriesFrom(journalWorldVisibilityFor(run));

export const journalWorldReadModelFor = (
  run: RunState,
): JournalWorldReadModel => {
  const visibility = journalWorldVisibilityFor(run);
  return {
    actors: actorEntriesFrom(visibility),
    relationships: relationshipEntriesFrom(visibility),
    evidence: evidenceEntriesFrom(run, visibility),
    claims: claimEntriesFrom(visibility),
    custody: custodyEntriesFrom(visibility),
    concerns: concernEntriesFrom(visibility),
  };
};
