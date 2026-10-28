import { describe, expect, it } from "vitest";
import {
  getPractice,
  hasPracticeCapability,
  PRACTICE_IDS,
  PRACTICES,
  practiceForPrototypeTradition,
  PROTOTYPE_PRACTICE_COMPATIBILITY,
  prototypeTraditionHasCapability,
} from "../practices";

describe("practice registry", () => {
  it("represents the committed roster with distinct verbs and loci", () => {
    expect(PRACTICE_IDS).toEqual([
      "medium",
      "bonebinder",
      "renderer",
      "grave-warden",
      "ferryman",
    ]);

    const definitions = PRACTICE_IDS.map(getPractice);
    expect(new Set(definitions.map(({ ownedVerb }) => ownedVerb)).size).toBe(
      definitions.length,
    );
    expect(new Set(definitions.map(({ locus }) => locus)).size).toBe(
      definitions.length,
    );
    expect(
      new Set(definitions.map(({ spiritCadence }) => spiritCadence)).size,
    ).toBe(definitions.length);
  });

  it("keeps unfinished practices out of the playable implementation state", () => {
    expect(PRACTICES.medium.implementation).toBe("prototype-playable");
    expect(PRACTICES.bonebinder.implementation).toBe("vertical-slice");
    expect(PRACTICES.renderer.implementation).toBe("vertical-slice");
    expect(PRACTICES["grave-warden"].implementation).toBe("vertical-slice");
    expect(PRACTICES.ferryman.implementation).toBe("deferred");

    for (const practice of [
      PRACTICES.bonebinder,
      PRACTICES.ferryman,
    ]) {
      expect(practice.grants.implementedActionIds).toEqual([]);
      expect(practice.grants.plannedActionIds.length).toBeGreaterThan(0);
    }
    expect(PRACTICES["grave-warden"].grants).toMatchObject({
      implementedActionIds: [
        "set-threshold-seal",
        "answer-the-breach",
      ],
      plannedActionIds: [],
      implementedAdvancementIds: ["threshold-discipline"],
    });
  });

  it("queries capabilities without requiring practice-id branches", () => {
    expect(
      hasPracticeCapability("bonebinder", "maintain-corporeal-servant"),
    ).toBe(true);
    expect(
      hasPracticeCapability(
        { capabilities: ["diagnose-continuity-breach"] },
        "diagnose-continuity-breach",
      ),
    ).toBe(true);
    expect(hasPracticeCapability("medium", "mark-dead-passage")).toBe(false);
  });
});

describe("prototype practice compatibility", () => {
  it("maps legacy save identities explicitly without claiming full migration", () => {
    expect(PROTOTYPE_PRACTICE_COMPATIBILITY).toMatchObject({
      medium: {
        practiceId: "medium",
        kind: "direct-prototype",
      },
      summoner: {
        practiceId: "bonebinder",
        kind: "conceptual-predecessor",
      },
      thaumaturgist: {
        practiceId: "renderer",
        kind: "renamed-prototype",
      },
      "grave-warden": {
        practiceId: "grave-warden",
        kind: "direct-prototype",
      },
    });

    expect(practiceForPrototypeTradition("summoner").id).toBe("bonebinder");
    expect(practiceForPrototypeTradition("thaumaturgist").id).toBe("renderer");
    expect(practiceForPrototypeTradition("grave-warden").id).toBe("grave-warden");
  });

  it("exposes only capabilities current prototype mechanics actually support", () => {
    expect(
      prototypeTraditionHasCapability("summoner", "command-dead-initiative"),
    ).toBe(true);
    expect(
      prototypeTraditionHasCapability(
        "summoner",
        "maintain-corporeal-servant",
      ),
    ).toBe(false);
    expect(
      prototypeTraditionHasCapability(
        "thaumaturgist",
        "render-death-altered-matter",
      ),
    ).toBe(true);
    expect(
      prototypeTraditionHasCapability(
        "thaumaturgist",
        "preserve-mortuary-evidence",
      ),
    ).toBe(false);
  });
});
