import { describe, expect, it } from "vitest";
import { chooseStoryChoice, createCharacter } from "../game/engine";
import { beginDitchHandPractice } from "../game/practices/bonebinder";
import { renderApp } from "./render";

describe("burial-cut presentation", () => {
  it("shows the governing mundane skill for each check", () => {
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    state = chooseStoryChoice(state, "burial-cut").state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain(">Perception</span>");
    expect(markup).toContain(">Athletics</span>");
    expect(markup).toContain(">Persuasion</span>");
    expect(markup).toContain(
      "Offer Mara Vale freely and ask leave",
    );
  });

  it("keeps the resolved check beside its dismissible outcome and onward route", () => {
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    state = chooseStoryChoice(state, "burial-cut").state;
    state = chooseStoryChoice(state, "read-washout").state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain('data-action="dismiss-result"');
    expect(markup).toContain("Take the crew’s lower road");
    expect(markup).not.toContain("Take the bier’s low corner");
    expect(markup).not.toContain("Give the foreman your use-name");
  });

  it("presents Ditch-Hand as a Bonebinder capability, not a mundane check", () => {
    let state = beginDitchHandPractice(
      createCharacter(
        "Mara Vale",
        "summoner",
        "female",
        42,
      ).state,
    ).state;
    state = chooseStoryChoice(state, "burial-cut").state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("Give Ditch-Hand the low corner");
    expect(markup).toContain("Bonebinder practice");
    expect(markup).not.toContain(
      'data-choice-id="ditch-hand-bier" data-skill=',
    );
  });
});
