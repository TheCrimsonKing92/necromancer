import { describe, expect, it } from "vitest";
import { mundaneCheckChance, resolveMundaneCheck } from "./checks";
import { createCharacter } from "./engine";

describe("mundane checks", () => {
  it("uses familiar attributes and skill ranks in one bounded scale", () => {
    const medium = createCharacter(
      "Mara",
      "medium",
      "female",
      17,
    ).state.run!.player;
    const summoner = createCharacter(
      "Corren",
      "summoner",
      "male",
      17,
    ).state.run!.player;

    expect(
      mundaneCheckChance(medium, { skill: "persuasion" }),
    ).toBe(85);
    expect(
      mundaneCheckChance(summoner, { skill: "persuasion" }),
    ).toBe(35);
    expect(
      mundaneCheckChance(medium, {
        skill: "persuasion",
        difficulty: 500,
      }),
    ).toBe(15);
  });

  it("is deterministic and advances its seed", () => {
    const player = createCharacter(
      "Mara",
      "medium",
      "female",
      17,
    ).state.run!.player;
    const first = resolveMundaneCheck(9981, player, {
      skill: "perception",
    });
    const repeated = resolveMundaneCheck(9981, player, {
      skill: "perception",
    });

    expect(repeated).toEqual(first);
    expect(first.seed).not.toBe(9981);
    expect(first.success).toBe(first.roll <= first.chance);
  });
});
