import { describe, expect, it } from "vitest";
import { createWound } from "../anatomy";
import type { Combatant } from "../types";
import { createWorldState } from "../world";
import {
  assessServantRepairNeeds,
  createBonebinderServant,
  issueServantCommand,
  repairServant,
  resolveServantWorldContext,
  type BonebinderServantState,
} from "./bonebinder";

const createServant = (
  capabilities?: BonebinderServantState["capabilities"],
) =>
  createBonebinderServant({
    id: "servant-iven",
    useName: "Ditch-Hand",
    continuity: "made-continuity",
    bodyIdentity: {
      status: "identified",
      knownName: "Iven Saye",
      recognitionMarks: ["split left thumbnail"],
    },
    worldReferences: {
      provenanceId: "provenance:iven-saye-body",
      claimIds: ["claim:iven-saye-household"],
      recognitionEvidenceIds: ["evidence:iven-saye-body"],
    },
    maxHp: 22,
    attack: 4,
    defense: 1,
    capabilities,
  });

describe("Bonebinder persistent servant", () => {
  it("is a corporeal shared combatant with ordinary anatomy", () => {
    const servant = createServant();
    const combatant: Combatant = servant.combatant;

    expect(combatant).toMatchObject({
      id: "servant-iven",
      kind: "ally",
      anatomy: "humanoid",
      materiality: "corporeal",
      hp: 22,
      maxHp: 22,
    });
    expect(combatant.body.torso.maxCondition).toBeGreaterThan(0);
    expect("remainingTurns" in combatant).toBe(false);
    expect(servant.identity.bodyIdentity.knownName).toBe(
      "Iven Saye",
    );
    expect(servant.worldReferences.provenanceId).toBe(
      "provenance:iven-saye-body",
    );
  });

  it("resolves provenance, claims, custody, and recognition from world state", () => {
    const servant = createServant();
    const world = createWorldState();
    world.provenance.push({
      id: "provenance:iven-saye-body",
      subjectId: "body:iven-saye",
      subjectKind: "body",
      originFactId: "dealt-with-iven",
      claimantIds: ["north-road-households"],
      custody: [
        {
          custodianId: "burial-crews",
          basis: "permission",
          status: "current",
          originFactId: "dealt-with-iven",
        },
      ],
      tags: ["surrendered-remains"],
    });
    world.claims.push({
      id: "claim:iven-saye-household",
      claimantId: "north-road-households",
      subjectId: "body:iven-saye",
      kind: "ownership",
      status: "recognized",
      basisFactIds: ["dealt-with-iven"],
    });
    world.evidence.push({
      id: "evidence:iven-saye-body",
      factId: "dealt-with-iven",
      kind: "body",
      custodianId: "burial-crews",
      strength: 3,
      provenanceId: "provenance:iven-saye-body",
    });

    expect(resolveServantWorldContext(servant, world)).toMatchObject({
      provenance: {
        subjectId: "body:iven-saye",
        claimantIds: ["north-road-households"],
      },
      claims: [
        {
          id: "claim:iven-saye-household",
          status: "recognized",
        },
      ],
      recognitionEvidence: [
        {
          id: "evidence:iven-saye-body",
          kind: "body",
        },
      ],
      currentCustodianId: "burial-crews",
      unresolvedReferenceIds: [],
    });
  });

  it("derives repair needs from shared body condition and wounds", () => {
    const servant = createServant();
    const wound = createWound(
      "servant-wound-1",
      "leftArm",
      "serious",
      "road hook",
    );
    const damaged: BonebinderServantState = {
      ...servant,
      combatant: {
        ...servant.combatant,
        body: {
          ...servant.combatant.body,
          leftArm: {
            ...servant.combatant.body.leftArm,
            condition:
              servant.combatant.body.leftArm.condition - 4,
            wounds: [wound],
          },
        },
      },
    };

    expect(assessServantRepairNeeds(damaged)).toEqual([
      {
        part: "leftArm",
        missingCondition: 4,
        wounds: [wound],
      },
    ]);

    const reinforced = repairServant(damaged, {
      kind: "reinforce-part",
      repairId: "repair-1",
      part: "leftArm",
      condition: 3,
      materialReferences: ["item:binding-wire"],
      performedAtReference: "scene:tollhouse",
    });
    expect(reinforced.applied).toBe(true);
    expect(
      reinforced.servant.combatant.body.leftArm.condition,
    ).toBe(servant.combatant.body.leftArm.condition - 1);
    expect(damaged.combatant.body.leftArm.condition).toBe(
      servant.combatant.body.leftArm.condition - 4,
    );

    const stabilized = repairServant(reinforced.servant, {
      kind: "stabilize-wound",
      repairId: "repair-2",
      part: "leftArm",
      woundId: wound.id,
      materialReferences: ["item:grave-pitch"],
    });
    expect(stabilized.applied).toBe(true);
    expect(
      stabilized.servant.combatant.body.leftArm.wounds[0],
    ).toMatchObject({
      id: wound.id,
      bleed: 0,
      treated: true,
    });
    expect(stabilized.servant.repairs.history).toHaveLength(2);
  });

  it("issues typed commands only when target and capability agree", () => {
    const limited = createServant(["guard"]);

    expect(issueServantCommand(limited, "interpose", "player")).toEqual({
      ok: false,
      reason: "unsupported-command",
      servant: limited,
    });

    const full = createServant();
    expect(issueServantCommand(full, "harry")).toEqual({
      ok: false,
      reason: "missing-target",
      servant: full,
    });

    const issued = issueServantCommand(
      full,
      "harry",
      "enemy:road-reeve",
      "battle:round-2",
    );
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.servant.command).toEqual({
      sequence: 1,
      current: {
        id: "harry",
        targetReference: "enemy:road-reeve",
        issuedAtReference: "battle:round-2",
      },
    });
    expect(full.command.sequence).toBe(0);
  });
});
