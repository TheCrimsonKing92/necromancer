import { describe, expect, it } from "vitest";

import {
  advancementDefinitionsFor,
  advancementTreeFor,
  applyAdvancement,
} from "../../advancements";
import { createCharacter } from "../../engine";

describe("Bonebinder advancement visibility", () => {
  it("uses practice compatibility without labeling the nodes as Summoner doctrines", () => {
    const summoner = createCharacter(
      "Mara",
      "summoner",
      "female",
      13,
    ).state.run!.player;
    const medium = createCharacter(
      "Mara",
      "medium",
      "female",
      13,
    ).state.run!.player;

    const bonebinderNodes = advancementDefinitionsFor(summoner).filter(
      ({ id }) => id === "letter-of-service" || id === "called-counsel",
    );
    expect(bonebinderNodes).toHaveLength(2);
    expect(bonebinderNodes.every(({ practice }) => practice === "bonebinder")).toBe(
      true,
    );
    expect(bonebinderNodes.every(({ tradition }) => tradition === undefined)).toBe(
      true,
    );
    expect(
      advancementDefinitionsFor(medium).some(
        ({ id }) => id === "letter-of-service" || id === "called-counsel",
      ),
    ).toBe(false);
  });

  it("locks the other doctrine permanently after one is learned", () => {
    const player = createCharacter(
      "Mara",
      "summoner",
      "female",
      13,
    ).state.run!.player;
    player.level = 2;
    applyAdvancement(player, "letter-of-service");

    const counsel = advancementTreeFor(player).find(
      ({ definition }) => definition.id === "called-counsel",
    );
    expect(counsel).toMatchObject({
      status: "locked",
      reason: expect.stringContaining("Excluded by Letter of Service"),
    });
  });
});
