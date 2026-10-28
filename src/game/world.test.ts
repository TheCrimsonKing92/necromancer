import { describe, expect, it } from "vitest";
import { createCharacter } from "./engine";
import {
  NORTH_VEY,
  WORLD_FOUNDATIONS,
  actorBelievesFact,
  adjustWorldPressure,
  adjustWorldStanding,
  createWorldState,
  factionKnows,
  practiceAttitudeFor,
  recordWorldFact,
  recordWorldClaim,
  recordWorldProvenance,
  recordWorldRelationship,
  reportFactWithEvidence,
  revealWorldFact,
  roadsideRenderingYieldChance,
  rollRoadsideRendering,
  validateWorldModel,
  wakeVariantPoolForWorld,
  worldHasFact,
} from "./world";

describe("world model", () => {
  it("defines a complete setting foundation with rare necromancy", () => {
    expect(validateWorldModel()).toEqual([]);
    expect(
      WORLD_FOUNDATIONS.some((foundation) =>
        foundation.includes("necromancers are a minority"),
      ),
    ).toBe(true);
  });

  it("rejects incomplete regional foundations", () => {
    expect(
      validateWorldModel({ ...NORTH_VEY, burialCustom: "" }),
    ).toContain(
      "North Vey requires geography, authority, and burial custom.",
    );
  });

  it("distinguishes a deed from faction knowledge of it", () => {
    const world = createWorldState();

    recordWorldFact(world, "hollis-vane-rendered");
    expect(worldHasFact(world, "hollis-vane-rendered")).toBe(true);
    expect(
      factionKnows(
        world,
        "county-reeves",
        "hollis-vane-rendered",
      ),
    ).toBe(false);
    expect(wakeVariantPoolForWorld(world)).toHaveLength(5);

    revealWorldFact(
      world,
      "county-reeves",
      "hollis-vane-rendered",
    );
    expect(
      factionKnows(
        world,
        "county-reeves",
        "hollis-vane-rendered",
      ),
    ).toBe(true);
    expect(
      actorBelievesFact(
        world,
        "county-reeves",
        "hollis-vane-rendered",
      ),
    ).toBe(true);
    expect(world.playerKnowledge).toEqual([]);
    expect(world.beliefs).toEqual([
      expect.objectContaining({
        holderId: "county-reeves",
        factId: "hollis-vane-rendered",
        certainty: "accepted",
      }),
    ]);
    expect(wakeVariantPoolForWorld(world)).toEqual([
      "reeve-patrol",
    ]);
  });

  it("keeps evidence, custody, claims, and belief separate", () => {
    const world = createWorldState();
    recordWorldFact(world, "hollis-vane-rendered");
    recordWorldProvenance(world, {
      id: "provenance:hollis-body",
      subjectId: "hollis-vane-remains",
      subjectKind: "body",
      originFactId: "hollis-vane-dead",
      claimantIds: ["north-road-households"],
      custody: [
        {
          custodianId: "county-reeves",
          basis: "law",
          status: "lost",
          originFactId: "hollis-vane-dead",
        },
      ],
      tags: ["recent-dead", "opened-on-public-road"],
    });
    recordWorldClaim(world, {
      id: "claim:county:hollis-body",
      claimantId: "county-reeves",
      subjectId: "hollis-vane-remains",
      kind: "custody",
      status: "disputed",
      basisFactIds: ["hollis-vane-dead"],
    });
    recordWorldRelationship(world, {
      id: "relationship:iven:brokers",
      fromId: "iven-saye",
      toId: "reliquary-brokers",
      kind: "obligation",
      status: "strained",
      originFactId: "dealt-with-iven",
    });

    expect(
      factionKnows(
        world,
        "county-reeves",
        "hollis-vane-rendered",
      ),
    ).toBe(false);

    reportFactWithEvidence(
      world,
      "county-reeves",
      {
        id: "evidence:hollis-witness",
        factId: "hollis-vane-rendered",
        kind: "witness",
        custodianId: "county-reeves",
        strength: 2,
        provenanceId: "provenance:hollis-body",
      },
      "credible",
    );

    expect(world.evidence).toHaveLength(1);
    expect(world.provenance).toHaveLength(1);
    expect(world.claims).toHaveLength(1);
    expect(world.relationships).toHaveLength(1);
    expect(world.beliefs[0]?.basisEvidenceIds).toEqual([
      "evidence:hollis-witness",
    ]);
    expect(world.playerKnowledge).toEqual([]);
  });

  it("models culturally variable practice reactions", () => {
    expect(
      practiceAttitudeFor("burial-crews", "bonebinder").posture,
    ).toBe("refused");
    expect(
      practiceAttitudeFor(
        "north-road-households",
        "bonebinder",
      ).posture,
    ).toBe("variable");
    expect(
      practiceAttitudeFor(
        "reliquary-brokers",
        "renderer",
      ).posture,
    ).toBe("sought");
    expect(
      practiceAttitudeFor("iven-saye", "renderer").posture,
    ).toBe("welcomed");
  });

  it("bounds standing and pressure while preserving their direction", () => {
    const world = createWorldState();

    adjustWorldStanding(world, "county-reeves", -20);
    adjustWorldStanding(world, "burial-crews", 20);
    adjustWorldPressure(world, "countyNotice", 20);
    adjustWorldPressure(world, "escapedNames", -20);

    expect(world.standing["county-reeves"]).toBe(-3);
    expect(world.standing["burial-crews"]).toBe(3);
    expect(world.pressures.countyNotice).toBe(9);
    expect(world.pressures.escapedNames).toBe(0);
    expect(
      world.activePressures.find(
        (pressure) => pressure.id === "north-vey:county-notice",
      ),
    ).toMatchObject({
      intensity: 9,
      status: "active",
      stakeholderIds: ["county-reeves"],
    });
  });

  it("makes roadside rendering reproducible and training-sensitive", () => {
    const player = createCharacter(
      "Mara",
      "thaumaturgist",
      1,
    ).state.run!.player;
    expect(
      rollRoadsideRendering(91, player),
    ).toEqual(rollRoadsideRendering(91, player));
    expect(
      roadsideRenderingYieldChance(player, 10),
    ).toBe(
      roadsideRenderingYieldChance(player) + 10,
    );

    const yields = new Set<string>();
    const witnessStates = new Set<boolean>();
    for (let seed = 1; seed <= 256; seed += 1) {
      const result = rollRoadsideRendering(seed, player);
      yields.add(result.yield);
      witnessStates.add(result.witnessed);
    }

    expect(yields).toEqual(
      new Set(["fouled", "usable", "pure"]),
    );
    expect(witnessStates).toEqual(new Set([false, true]));
  });
});
