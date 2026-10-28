import { describe, expect, it } from "vitest";
import { beginNewGame, chooseStoryChoice } from "../game/engine";
import { experienceForLevel } from "../game/progression";
import {
  resolveThresholdSealBreach,
  setThresholdSeal,
} from "../game/practices/grave-warden";
import { renderAdvancementOffer } from "./advancement-render";
import { createPlayableCharacter } from "./character-creation-transition";
import { renderApp } from "./render";

describe("Grave Warden presentation", () => {
  it("presents four starting practices under the player-facing ontology", () => {
    const markup = renderApp(beginNewGame(), { hasSave: false });

    expect(markup).toContain("Choose a practice");
    expect(markup).toContain("Grave Warden");
    expect(markup).toContain("The Kept Threshold");
    expect(markup).toContain('value="grave-warden"');
    expect(markup.match(/name="tradition"/g)).toHaveLength(4);
    expect(markup).not.toContain("Choose a tradition");
  });

  it("renders seal custody as state, not as a false attack roll", async () => {
    let state = (await createPlayableCharacter(
      "Mara Vale",
      "grave-warden",
      "female",
    )).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    const target = state.run!.battle!.enemies[0]!;
    setThresholdSeal(state.run!, target);
    resolveThresholdSealBreach(state.run!, target);

    const markup = renderApp(state, { hasSave: true });
    const marker = markup.indexOf('data-action-id="set-threshold-seal"');
    const start = markup.lastIndexOf("<button", marker);
    const end = markup.indexOf("</button>", marker);
    const sealAction = markup.slice(start, end + "</button>".length);

    expect(markup).toContain("Threshold seals: 1 standing");
    expect(markup).toContain("Follow the crossing");
    expect(markup).toContain("crossing recorded: +3 damage");
    expect(sealAction).toContain("That enemy already bears a threshold seal");
    expect(sealAction).not.toContain("Current hit chance");
  });

  it("shows the real prepared-expression fork in the discipline tree", async () => {
    const state = (await createPlayableCharacter(
      "Mara Vale",
      "grave-warden",
      "female",
    )).state;
    state.storyId = "road-aftermath";
    state.run!.player.level = 2;
    state.run!.player.xp = experienceForLevel(2);

    const markup = renderAdvancementOffer(state, "threshold-discipline");

    expect(markup).toContain("Grave Warden practice");
    expect(markup).toContain("Terms of Crossing");
    expect(markup).toContain("Invitation to Breach");
    expect(markup).toContain("Closed Gate");
    expect(markup).toContain('aria-label="Selected discipline"');
  });
});
