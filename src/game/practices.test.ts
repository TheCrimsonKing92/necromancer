import { describe, expect, it } from "vitest";
import {
  PRACTICES,
  PRACTICE_IDS,
  getPractice,
  hasPracticeCapability,
  practiceForPrototypeTradition,
  prototypeTraditionHasCapability,
} from "./practices";

describe("practice registry", () => {
  it("defines the save-compatible registry with distinct verbs and loci", () => {
    const practices = PRACTICE_IDS.map(getPractice);

    expect(practices.map(({ name }) => name)).toEqual([
      "Medium",
      "Bonebinder",
      "Renderer",
      "Grave Warden",
      "Ferryman",
    ]);
    expect(
      new Set(practices.map(({ ownedVerb }) => ownedVerb)).size,
    ).toBe(practices.length);
    expect(new Set(practices.map(({ locus }) => locus)).size).toBe(
      practices.length,
    );
    expect(
      new Set(practices.map(({ spiritCadence }) => spiritCadence))
        .size,
    ).toBe(practices.length);
  });

  it("keeps unfinished practices out of the playable registry state", () => {
    expect(PRACTICES.medium.implementation).toBe(
      "prototype-playable",
    );
    expect(PRACTICES.bonebinder.implementation).toBe(
      "vertical-slice",
    );
    expect(PRACTICES.renderer.implementation).toBe(
      "vertical-slice",
    );
    expect(PRACTICES["grave-warden"].implementation).toBe(
      "vertical-slice",
    );
    expect(PRACTICES.ferryman.implementation).toBe("deferred");

    expect(
      PRACTICES.bonebinder.grants.implementedActionIds,
    ).toEqual([]);
    expect(
      PRACTICES["grave-warden"].grants.implementedActionIds,
    ).toEqual(["set-threshold-seal", "answer-the-breach"]);
    expect(PRACTICES.ferryman.grants.implementedActionIds).toEqual(
      [],
    );
  });

  it("queries explicit capabilities rather than practice identity", () => {
    expect(
      hasPracticeCapability(
        "bonebinder",
        "maintain-corporeal-servant",
      ),
    ).toBe(true);
    expect(
      hasPracticeCapability("renderer", "receive-dead-testimony"),
    ).toBe(false);
    expect(
      hasPracticeCapability(
        {
          capabilities: ["verify-mortuary-provenance"],
        },
        "verify-mortuary-provenance",
      ),
    ).toBe(true);
  });
});

describe("prototype tradition compatibility", () => {
  it("maps stable save IDs to their conceptual practices", () => {
    expect(practiceForPrototypeTradition("medium").id).toBe(
      "medium",
    );
    expect(practiceForPrototypeTradition("summoner").id).toBe(
      "bonebinder",
    );
    expect(
      practiceForPrototypeTradition("thaumaturgist").id,
    ).toBe("renderer");
    expect(
      practiceForPrototypeTradition("grave-warden").id,
    ).toBe("grave-warden");
  });

  it("does not pretend the prototype summoner has a corporeal servant", () => {
    expect(
      prototypeTraditionHasCapability(
        "summoner",
        "command-dead-initiative",
      ),
    ).toBe(true);
    expect(
      prototypeTraditionHasCapability(
        "summoner",
        "maintain-corporeal-servant",
      ),
    ).toBe(false);
  });
});
