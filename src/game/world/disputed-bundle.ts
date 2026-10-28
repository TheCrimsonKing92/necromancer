import { resolveMundaneCheck } from "../checks";
import type {
  RunState,
  StoryEffect,
  WorldClaimState,
  WorldFactId,
} from "../types";
import {
  adjustWorldStanding,
  learnWorldFact,
  recordWorldBelief,
  recordWorldClaim,
  recordWorldEvidence,
  recordWorldFact,
  recordWorldProvenance,
  recordWorldRelationship,
  transferWorldCustody,
} from "./state";

export type DisputedBundleEffect = Extract<
  StoryEffect,
  | "inspect-disputed-bundle"
  | "leave-bundle-with-burial-crew"
  | "release-bundle-to-broker"
>;

export const DISPUTED_BUNDLE_PROVENANCE_ID =
  "provenance:disputed-bundle";
export const DISPUTED_BUNDLE_EVIDENCE_ID =
  "evidence:disputed-bundle-trace";

const burialClaimId = "claim:burial-crews:disputed-bundle";
const brokerClaimId =
  "claim:reliquary-brokers:disputed-bundle";

const rememberFlag = (run: RunState, flag: string): void => {
  if (!run.flags.includes(flag)) run.flags.push(flag);
};

const baselineOriginFor = (run: RunState): WorldFactId =>
  run.world.playerKnowledge.includes("roadside-bundle-examined")
    ? "roadside-bundle-examined"
    : "bundle-trace-points-to-broker";

const ensureClaim = (
  run: RunState,
  claim: WorldClaimState,
): void => {
  if (!run.world.claims.some(({ id }) => id === claim.id)) {
    recordWorldClaim(run.world, claim);
  }
};

const ensureBundleWorldState = (run: RunState): void => {
  recordWorldFact(run.world, "bundle-trace-points-to-broker");
  recordWorldBelief(
    run.world,
    "oren-vask",
    "bundle-trace-points-to-broker",
    "accepted",
  );
  recordWorldBelief(
    run.world,
    "eda-pell",
    "bundle-trace-points-to-broker",
    "rumor",
  );

  if (
    !run.world.provenance.some(
      ({ id }) => id === DISPUTED_BUNDLE_PROVENANCE_ID,
    )
  ) {
    recordWorldProvenance(run.world, {
      id: DISPUTED_BUNDLE_PROVENANCE_ID,
      subjectId: "washed-blackcloth-bundle",
      subjectKind: "item",
      originFactId: "bundle-trace-points-to-broker",
      claimantIds: ["burial-crews", "reliquary-brokers"],
      custody: [
        {
          custodianId: "burial-crews",
          basis: "law",
          status: "current",
          originFactId: baselineOriginFor(run),
        },
      ],
      tags: ["sealed", "blackcloth", "roadside-dispute"],
    });
  }

  ensureClaim(run, {
    id: burialClaimId,
    claimantId: "burial-crews",
    subjectId: "washed-blackcloth-bundle",
    kind: "custody",
    status: "asserted",
    basisFactIds: [],
  });
  ensureClaim(run, {
    id: brokerClaimId,
    claimantId: "reliquary-brokers",
    subjectId: "washed-blackcloth-bundle",
    kind: "ownership",
    status: "asserted",
    basisFactIds: ["bundle-trace-points-to-broker"],
  });

  const relationshipOrigin = baselineOriginFor(run);
  recordWorldRelationship(run.world, {
    id: "relationship:eda-pell:burial-crews",
    fromId: "eda-pell",
    toId: "burial-crews",
    kind: "employment",
    status: "active",
    originFactId: relationshipOrigin,
  });
  recordWorldRelationship(run.world, {
    id: "relationship:oren-vask:reliquary-brokers",
    fromId: "oren-vask",
    toId: "reliquary-brokers",
    kind: "membership",
    status: "active",
    originFactId: relationshipOrigin,
  });
};

const setClaimStatus = (
  run: RunState,
  id: string,
  status: WorldClaimState["status"],
  basisFactId: WorldFactId,
): void => {
  const claim = run.world.claims.find(
    (candidate) => candidate.id === id,
  );
  if (!claim) return;
  claim.status = status;
  if (!claim.basisFactIds.includes(basisFactId)) {
    claim.basisFactIds.push(basisFactId);
  }
};

const settleWithBurialCrew = (run: RunState): void => {
  const factId = "bundle-left-under-burial-custody";
  learnWorldFact(run.world, factId);
  recordWorldBelief(run.world, "eda-pell", factId, "accepted");
  recordWorldBelief(run.world, "oren-vask", factId, "accepted");
  setClaimStatus(run, burialClaimId, "recognized", factId);
  setClaimStatus(run, brokerClaimId, "disputed", factId);
  adjustWorldStanding(run.world, "burial-crews", 1);
  adjustWorldStanding(run.world, "reliquary-brokers", -1);
  rememberFlag(run, "disputed-bundle-settled:burial");
  rememberFlag(
    run,
    "story-choice:road-interlude:release-bundle-to-broker",
  );
};

const settleWithBroker = (run: RunState): void => {
  const factId = "bundle-released-to-broker";
  learnWorldFact(run.world, factId);
  recordWorldBelief(run.world, "eda-pell", factId, "accepted");
  recordWorldBelief(run.world, "oren-vask", factId, "accepted");
  transferWorldCustody(
    run.world,
    DISPUTED_BUNDLE_PROVENANCE_ID,
    "reliquary-brokers",
    "permission",
    factId,
  );
  const evidence = run.world.evidence.find(
    ({ id }) => id === DISPUTED_BUNDLE_EVIDENCE_ID,
  );
  if (evidence) evidence.custodianId = "reliquary-brokers";
  setClaimStatus(run, burialClaimId, "released", factId);
  setClaimStatus(run, brokerClaimId, "recognized", factId);
  adjustWorldStanding(run.world, "burial-crews", -1);
  adjustWorldStanding(run.world, "reliquary-brokers", 1);
  rememberFlag(run, "disputed-bundle-settled:broker");
  rememberFlag(
    run,
    "story-choice:road-interlude:leave-bundle-with-burial-crew",
  );
};

const inspectBundle = (run: RunState): void => {
  const attempt = resolveMundaneCheck(run.seed, run.player, {
    skill: "perception",
    difficulty: 5,
  });
  run.seed = attempt.seed;
  learnWorldFact(run.world, "roadside-bundle-examined");
  recordWorldEvidence(run.world, {
    id: DISPUTED_BUNDLE_EVIDENCE_ID,
    factId: "bundle-trace-points-to-broker",
    kind: "object",
    custodianId: "burial-crews",
    strength: attempt.success ? 2 : 1,
    provenanceId: DISPUTED_BUNDLE_PROVENANCE_ID,
  });
  if (attempt.success) {
    learnWorldFact(run.world, "bundle-trace-points-to-broker");
    recordWorldBelief(
      run.world,
      "eda-pell",
      "bundle-trace-points-to-broker",
      "credible",
      [DISPUTED_BUNDLE_EVIDENCE_ID],
    );
  }
  recordWorldBelief(
    run.world,
    "oren-vask",
    "bundle-trace-points-to-broker",
    "accepted",
    [DISPUTED_BUNDLE_EVIDENCE_ID],
  );
  rememberFlag(
    run,
    `bundle-inspection-result:${attempt.success ? "success" : "failure"}:${attempt.chance}:${attempt.roll}`,
  );
};

export const resolveDisputedBundleChoice = (
  run: RunState,
  effect: DisputedBundleEffect,
): void => {
  ensureBundleWorldState(run);
  if (effect === "inspect-disputed-bundle") {
    inspectBundle(run);
  } else if (effect === "leave-bundle-with-burial-crew") {
    settleWithBurialCrew(run);
  } else {
    settleWithBroker(run);
  }
};
