import { describe, expect, it } from "vitest";
import {
  chooseAdvancement,
  createCharacter,
  prepareAdvancementExpression,
} from "../game/engine";
import { experienceForLevel } from "../game/progression";
import type { GameState, TraditionId } from "../game/types";
import {
  renderAdvancementConfirmation,
  renderAdvancementOffer,
} from "./advancement-render";

const leveledState = (
  tradition: TraditionId,
  level: number,
): GameState => {
  const state = createCharacter("Mara", tradition, 1).state;
  state.run!.player.level = level;
  state.run!.player.xp = experienceForLevel(level);
  return state;
};

describe("advancement presentation", () => {
  it("separates practice, body, necromancy, and mundane branches", () => {
    const markup = renderAdvancementOffer(
      leveledState("medium", 2),
    );

    expect(markup).toContain("Medium practice");
    expect(markup).toContain("The body");
    expect(markup).toContain("Necromancy");
    expect(markup).toContain("Mundane training");
    expect(markup).toContain("Field Medicine");
    expect(markup).toContain("Roadcraft");
    expect(markup).toContain("Plain Dealing");
  });

  it("renders prerequisite chains as a visible hierarchy", () => {
    const markup = renderAdvancementOffer(leveledState("medium", 4));

    expect(markup).toContain(
      'aria-label="Disciplines opened by Two-way Passage"',
    );
    expect(markup).toContain(
      'aria-label="Disciplines opened by Echoing Passage"',
    );
    expect(markup).toContain("Foundation discipline");
  });

  it("explains a selected discipline's position and immediate descendants", () => {
    const state = leveledState("medium", 4);
    const selected = renderAdvancementConfirmation(state, "echoing-passage");

    expect(selected).toContain("Follows Two-way Passage");
    expect(selected).toContain("Opens Tempered Passage");
    expect(renderAdvancementConfirmation(state)).not.toContain(
      "place in the tree",
    );
  });

  it("compares prepared expressions before claiming and readies them afterward", () => {
    let state = leveledState("thaumaturgist", 2);

    const unselected = renderAdvancementOffer(state);
    const selected = renderAdvancementConfirmation(
      state,
      "cold-furnace-method",
    );

    expect(unselected).not.toContain("Claim White Quench");
    expect(selected).toContain("Claim Cold Furnace");
    expect(selected).toContain(
      "Grave Salt consumes Burning on a hit",
    );
    expect(selected).toContain(
      "Both expressions are learned; readiness may be changed at a safe pause.",
    );

    state = chooseAdvancement(
      state,
      "cold-furnace-method",
    ).state;
    state = prepareAdvancementExpression(
      state,
      "cold-furnace-long-reduction",
    ).state;
    const learned = renderAdvancementConfirmation(
      state,
      "cold-furnace-method",
    );
    expect(learned).toContain("Ready White Quench");
    expect(learned).toContain("Readied");
    expect(learned).toContain("1 / 2 practice slots occupied");
  });
});
