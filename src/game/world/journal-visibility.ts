import type {
  RunState,
  WorldClaimState,
  WorldEvidenceState,
  WorldFactId,
  WorldRelationshipState,
  WorldRelationId,
} from "../types";
import {
  DISPUTED_BUNDLE_EVIDENCE_ID,
  DISPUTED_BUNDLE_PROVENANCE_ID,
} from "./disputed-bundle";
import { currentCustodianOf } from "./state";

const JOURNAL_ACTOR_VISIBILITY = [
  { id: "iven-saye", knownWhen: ["dealt-with-iven"] },
  {
    id: "north-road-households",
    knownWhen: ["shared-mourning-fire"],
  },
  {
    id: "burial-crews",
    knownWhen: [
      "aided-county-burial",
      "gave-use-name-to-burial-crews",
      "roadside-bundle-examined",
      "bundle-left-under-burial-custody",
      "bundle-released-to-broker",
    ],
  },
  {
    id: "eda-pell",
    knownWhen: [
      "roadside-bundle-examined",
      "bundle-left-under-burial-custody",
      "bundle-released-to-broker",
    ],
  },
  {
    id: "reliquary-brokers",
    knownWhen: [
      "roadside-bundle-examined",
      "bundle-left-under-burial-custody",
      "bundle-released-to-broker",
    ],
  },
  {
    id: "oren-vask",
    knownWhen: [
      "roadside-bundle-examined",
      "bundle-left-under-burial-custody",
      "bundle-released-to-broker",
    ],
  },
] as const satisfies readonly {
  id: WorldRelationId;
  knownWhen: readonly WorldFactId[];
}[];

export type JournalVisibleActorId =
  (typeof JOURNAL_ACTOR_VISIBILITY)[number]["id"];

export type JournalConcernId =
  | "escaped-names"
  | "witnessed-rendering"
  | "disputed-bundle";

export interface JournalCustodyVisibility {
  provenanceId: typeof DISPUTED_BUNDLE_PROVENANCE_ID;
  custodianId: WorldRelationId;
}

export interface JournalWorldVisibility {
  actorIds: JournalVisibleActorId[];
  relationships: WorldRelationshipState[];
  evidence: WorldEvidenceState[];
  claims: WorldClaimState[];
  custody: JournalCustodyVisibility[];
  concernIds: JournalConcernId[];
}

const knowsAny = (
  run: RunState,
  factIds: readonly WorldFactId[],
): boolean =>
  factIds.some((factId) => run.world.playerKnowledge.includes(factId));

const knowsBundle = (run: RunState): boolean =>
  knowsAny(run, [
    "roadside-bundle-examined",
    "bundle-left-under-burial-custody",
    "bundle-released-to-broker",
  ]);

const visibleActorIdsFor = (
  run: RunState,
): JournalVisibleActorId[] =>
  JOURNAL_ACTOR_VISIBILITY.filter(({ knownWhen }) =>
    knowsAny(run, knownWhen),
  ).map(({ id }) => id);

const visibleRelationshipsFor = (
  run: RunState,
): WorldRelationshipState[] =>
  knowsBundle(run)
    ? run.world.relationships.filter(
        ({ id }) =>
          id === "relationship:eda-pell:burial-crews" ||
          id === "relationship:oren-vask:reliquary-brokers",
      )
    : [];

const visibleEvidenceFor = (run: RunState): WorldEvidenceState[] =>
  run.world.playerKnowledge.includes("roadside-bundle-examined")
    ? run.world.evidence.filter(
        ({ id }) => id === DISPUTED_BUNDLE_EVIDENCE_ID,
      )
    : [];

const visibleClaimsFor = (run: RunState): WorldClaimState[] =>
  knowsBundle(run)
    ? run.world.claims.filter(
        ({ id, subjectId }) =>
          subjectId === "washed-blackcloth-bundle" &&
          (id === "claim:burial-crews:disputed-bundle" ||
            id === "claim:reliquary-brokers:disputed-bundle"),
      )
    : [];

const visibleCustodyFor = (
  run: RunState,
): JournalCustodyVisibility[] => {
  if (
    !knowsBundle(run) ||
    !run.world.provenance.some(
      ({ id }) => id === DISPUTED_BUNDLE_PROVENANCE_ID,
    )
  ) {
    return [];
  }

  const custodianId = currentCustodianOf(
    run.world,
    DISPUTED_BUNDLE_PROVENANCE_ID,
  );
  return custodianId
    ? [{ provenanceId: DISPUTED_BUNDLE_PROVENANCE_ID, custodianId }]
    : [];
};

const visibleConcernIdsFor = (run: RunState): JournalConcernId[] => {
  const ids: JournalConcernId[] = [];
  if (
    run.world.playerKnowledge.includes("saint-orra-unbound") &&
    run.world.activePressures.some(
      ({ id, status }) =>
        id === "north-vey:escaped-names" && status === "active",
    )
  ) {
    ids.push("escaped-names");
  }
  if (
    run.world.playerKnowledge.includes("hollis-vane-rendered") &&
    run.flags.some(
      (flag) =>
        flag.startsWith("hollis-rendering:") &&
        flag.endsWith(":witnessed"),
    )
  ) {
    ids.push("witnessed-rendering");
  }
  if (
    run.world.playerKnowledge.includes("roadside-bundle-examined") &&
    !run.world.playerKnowledge.includes(
      "bundle-left-under-burial-custody",
    ) &&
    !run.world.playerKnowledge.includes("bundle-released-to-broker")
  ) {
    ids.push("disputed-bundle");
  }
  return ids;
};

export const journalWorldVisibilityFor = (
  run: RunState,
): JournalWorldVisibility => ({
  actorIds: visibleActorIdsFor(run),
  relationships: visibleRelationshipsFor(run),
  evidence: visibleEvidenceFor(run),
  claims: visibleClaimsFor(run),
  custody: visibleCustodyFor(run),
  concernIds: visibleConcernIdsFor(run),
});

export const journalWorldVisibilityCount = (
  visibility: JournalWorldVisibility,
): number =>
  visibility.actorIds.length +
  visibility.relationships.length +
  visibility.evidence.length +
  visibility.claims.length +
  visibility.custody.length +
  visibility.concernIds.length;

export const journalWorldEntryCountFor = (run: RunState): number =>
  journalWorldVisibilityCount(journalWorldVisibilityFor(run));
