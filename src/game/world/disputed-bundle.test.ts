import { describe, expect, it } from "vitest";
import { resolveMundaneCheck } from "../checks";
import { chooseStoryChoice, createCharacter } from "../engine";
import { ROAD_EVENTS, roadEventParagraphsFor } from "../road-events";
import type { GameState, RunState } from "../types";
import {
  currentCustodianOf,
  journalWorldReadModelFor,
  recordWorldBelief,
  recordWorldClaim,
  recordWorldEvidence,
} from "../world";
import {
  DISPUTED_BUNDLE_EVIDENCE_ID,
  DISPUTED_BUNDLE_PROVENANCE_ID,
} from "./disputed-bundle";

const disputedBundleState = (): GameState => {
  const state = createCharacter(
    "Mara Vale",
    "medium",
    "female",
    42,
  ).state;
  state.storyId = "road-interlude";
  state.run!.roadEvent = "disputed-bundle";
  return state;
};

const seedFor = (
  run: RunState,
  success: boolean,
): number => {
  for (let index = 1; index < 1000; index += 1) {
    const seed = Math.imul(index, 0x9e3779b1) >>> 0;
    if (
      resolveMundaneCheck(seed, run.player, {
        skill: "perception",
        difficulty: 5,
      }).success === success
    ) {
      return seed;
    }
  }
  throw new Error("No deterministic check seed found.");
};

describe("the disputed roadside bundle", () => {
  it("lets two witnesses revise the same trace differently", () => {
    let state = disputedBundleState();
    state.run!.seed = seedFor(state.run!, true);

    state = chooseStoryChoice(
      state,
      "inspect-disputed-bundle",
    ).state;

    expect(state.run!.world.playerKnowledge).toContain(
      "bundle-trace-points-to-broker",
    );
    expect(state.run!.world.beliefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          holderId: "eda-pell",
          factId: "bundle-trace-points-to-broker",
          certainty: "credible",
        }),
        expect.objectContaining({
          holderId: "oren-vask",
          factId: "bundle-trace-points-to-broker",
          certainty: "accepted",
        }),
      ]),
    );
    expect(state.run!.world.evidence).toContainEqual(
      expect.objectContaining({
        id: DISPUTED_BUNDLE_EVIDENCE_ID,
        strength: 2,
      }),
    );
  });

  it("keeps an inconclusive examination uncertain without inventing punishment", () => {
    let state = disputedBundleState();
    state.run!.seed = seedFor(state.run!, false);

    state = chooseStoryChoice(
      state,
      "inspect-disputed-bundle",
    ).state;

    expect(state.run!.world.playerKnowledge).toContain(
      "roadside-bundle-examined",
    );
    expect(state.run!.world.playerKnowledge).not.toContain(
      "bundle-trace-points-to-broker",
    );
    expect(state.run!.world.beliefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          holderId: "eda-pell",
          certainty: "rumor",
        }),
        expect.objectContaining({
          holderId: "oren-vask",
          certainty: "accepted",
        }),
      ]),
    );
    expect(state.run!.flags).not.toContain("road-interlude-delay");
  });

  it("records a custody decision with or without inspection", () => {
    let burialState = disputedBundleState();
    burialState = chooseStoryChoice(
      burialState,
      "leave-bundle-with-burial-crew",
    ).state;
    expect(
      currentCustodianOf(
        burialState.run!.world,
        DISPUTED_BUNDLE_PROVENANCE_ID,
      ),
    ).toBe("burial-crews");
    expect(burialState.run!.world.playerKnowledge).toContain(
      "bundle-left-under-burial-custody",
    );
    expect(burialState.run!.flags).toContain(
      "story-choice:road-interlude:release-bundle-to-broker",
    );

    let brokerState = disputedBundleState();
    brokerState = chooseStoryChoice(
      brokerState,
      "release-bundle-to-broker",
    ).state;
    expect(
      currentCustodianOf(
        brokerState.run!.world,
        DISPUTED_BUNDLE_PROVENANCE_ID,
      ),
    ).toBe("reliquary-brokers");
    expect(brokerState.run!.world.playerKnowledge).toContain(
      "bundle-released-to-broker",
    );
    expect(
      roadEventParagraphsFor(
        ROAD_EVENTS["disputed-bundle"],
        brokerState.run!,
      ).join(" "),
    ).toContain("Oren Vask sets the sealed bundle");
  });

  it("projects only allowlisted, player-known world records", () => {
    let state = disputedBundleState();
    state.run!.seed = seedFor(state.run!, false);
    state = chooseStoryChoice(
      state,
      "inspect-disputed-bundle",
    ).state;

    recordWorldBelief(
      state.run!.world,
      "county-reeves",
      "hollis-vane-rendered",
      "accepted",
    );
    recordWorldEvidence(state.run!.world, {
      id: "evidence:hidden-reeve-copy",
      factId: "hollis-vane-rendered",
      kind: "record",
      custodianId: "county-reeves",
      strength: 3,
      provenanceId: null,
    });
    recordWorldClaim(state.run!.world, {
      id: "claim:hidden-county-file",
      claimantId: "county-reeves",
      subjectId: "hollis-file",
      kind: "custody",
      status: "recognized",
      basisFactIds: ["hollis-vane-rendered"],
    });

    const journal = journalWorldReadModelFor(state.run!);
    const serialized = JSON.stringify(journal);
    expect(journal.actors.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "eda-pell",
        "oren-vask",
        "burial-crews",
        "reliquary-brokers",
      ]),
    );
    expect(journal.evidence[0]?.kind).toBe("Inconclusive trace");
    expect(serialized).not.toContain("hidden-reeve-copy");
    expect(serialized).not.toContain("hidden-county-file");
    expect(serialized).not.toContain("accepted");
    expect(serialized).not.toContain("strength");
  });
});
