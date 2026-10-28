import { describe, expect, it } from "vitest";
import {
  combatActionHitText,
  combatActionMissText,
  hasCombatActionNarration,
  validateCombatActionNarrationCatalog,
} from "./combat-action-narration";
import { ENEMY_TECHNIQUES } from "./enemy-actions/techniques";

describe("combat action narration", () => {
  it("keeps every authored template structurally valid", () => {
    expect(validateCombatActionNarrationCatalog()).toEqual([]);
  });

  it("gives every enemy technique action-specific hit and miss language", () => {
    for (const technique of Object.values(ENEMY_TECHNIQUES)) {
      expect(
        hasCombatActionNarration(technique.name),
        `${technique.name} fell through to generic Witness copy`,
      ).toBe(true);
    }
  });

  it("renders authored action tokens without engine branching", () => {
    expect(
      combatActionHitText({
        action: "Soul Tithe",
        actor: "Mara",
        target: "Saint Orra",
      }),
    ).toBe("Mara exacts a soul-tithe from Saint Orra’s pulse");
  });

  it("shares canonical copy through explicit aliases", () => {
    expect(hasCombatActionNarration("A shade’s bite")).toBe(true);
    expect(
      combatActionMissText({
        action: "A shade’s bite",
        actor: "Ash-hound shade",
        target: "Hollis Vane",
      }),
    ).toBe(
      "Ash-hound shade bites through rain as Hollis Vane slips beyond its jaws",
    );
  });

  it("keeps uncatalogued actions legible", () => {
    expect(
      combatActionMissText({
        action: "Uncatalogued Violence",
        actor: "The Nameless",
        target: "Mara",
      }),
    ).toBe(
      "The Nameless’ uncatalogued violence fails to find Mara",
    );
  });

  it("keeps variable-location attacks neutral until damage names the body region", () => {
    const hit = combatActionHitText({
      action: "Borrowed Grief",
      actor: "The Mourner",
      target: "Thade",
    });

    expect(hit).toBe(
      "The Mourner presses borrowed grief through Thade",
    );
    expect(hit).not.toMatch(/shoulder|arm|hand|leg|head|torso/i);
  });
});
