import { describe, expect, it } from "vitest";
import { createCharacter } from "./engine";
import { pronounsForSex, useNameFor } from "./identity";

describe("character identity language", () => {
  it("keeps pronoun grammar in one sex-aware definition", () => {
    expect(pronounsForSex("male").possessiveDeterminer).toBe("his");
    expect(pronounsForSex("female").reflexive).toBe("herself");
    expect(pronounsForSex("other").object).toBe("them");
  });

  it("treats the entered character name as a use-name", () => {
    const player = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      17,
    ).state.run!.player;
    expect(useNameFor(player)).toBe("Mara Vale");
  });
});
