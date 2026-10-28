import { describe, expect, it } from "vitest";

import { createBonebinderServant } from "./servant";
import {
  availableSomaticCounselActions,
  selectSomaticCounselAction,
  type SomaticMemoryActionProfile,
} from "./counsel";

const PROFILES: readonly SomaticMemoryActionProfile[] = [
  {
    workReference: "county-pallbearer",
    actionIds: ["brace", "shove", "guarded-movement"],
  },
  {
    workReference: "grave-cutter",
    actionIds: ["brace", "weapon-technique"],
  },
];

const createServant = () => {
  const servant = createBonebinderServant({
    id: "servant-counsel",
    useName: "Ditch-Hand",
    continuity: "made-continuity",
    bodyIdentity: {
      status: "partially-identified",
      knownName: null,
      recognitionMarks: [],
    },
    worldReferences: {
      provenanceId: "provenance:servant-counsel",
      claimIds: [],
      recognitionEvidenceIds: [],
    },
    maxHp: 20,
    attack: 4,
    defense: 1,
  });
  servant.somaticMemories = [
    {
      id: "memory:pallbearer",
      workReference: "county-pallbearer",
      confidence: "reliable",
    },
    {
      id: "memory:cutter",
      workReference: "grave-cutter",
      confidence: "trace",
    },
  ];
  return servant;
};

describe("Called Counsel somatic action selection", () => {
  it("derives a stable action set from authored body memories", () => {
    const servant = createServant();

    expect(
      availableSomaticCounselActions(servant, PROFILES).map(
        ({ actionId, memoryId }) => [actionId, memoryId],
      ),
    ).toEqual([
      ["brace", "memory:pallbearer"],
      ["guarded-movement", "memory:pallbearer"],
      ["shove", "memory:pallbearer"],
      ["weapon-technique", "memory:cutter"],
    ]);
  });

  it("is deterministic for the same state and seed", () => {
    const options = {
      servant: createServant(),
      profiles: PROFILES,
      previousActionId: null,
      selectionSeed: 17,
    } as const;

    expect(selectSomaticCounselAction(options)).toEqual(
      selectSomaticCounselAction(options),
    );
  });

  it("cannot repeat the same counsel action consecutively", () => {
    const servant = createServant();
    const first = selectSomaticCounselAction({
      servant,
      profiles: PROFILES,
      previousActionId: null,
      selectionSeed: 0,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = selectSomaticCounselAction({
      servant,
      profiles: PROFILES,
      previousActionId: first.selected.actionId,
      selectionSeed: 0,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.selected.actionId).not.toBe(first.selected.actionId);
    expect(second.available).not.toContainEqual(
      expect.objectContaining({ actionId: first.selected.actionId }),
    );
  });

  it("refuses counsel when the only bodily motion would repeat", () => {
    const servant = createServant();
    servant.somaticMemories = [
      {
        id: "memory:brace",
        workReference: "brace-only",
        confidence: "ingrained",
      },
    ];

    expect(
      selectSomaticCounselAction({
        servant,
        profiles: [
          { workReference: "brace-only", actionIds: ["brace"] },
        ],
        previousActionId: "brace",
        selectionSeed: 4,
      }),
    ).toMatchObject({
      ok: false,
      reason: "no-eligible-nonrepeating-action",
    });
  });

  it("removes motions whose required limbs have been destroyed", () => {
    const servant = createServant();
    servant.combatant.body.leftArm.condition = 0;
    servant.combatant.body.rightArm.condition = 0;
    servant.combatant.body.leftLeg.condition = 0;
    servant.combatant.body.rightLeg.condition = 0;

    expect(
      availableSomaticCounselActions(servant, PROFILES).map(
        ({ actionId }) => actionId,
      ),
    ).toEqual(["brace"]);
  });
});
