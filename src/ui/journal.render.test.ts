import { beforeAll, describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  createCharacter,
  openJournal,
} from "../game/engine";
import { learnWorldFact } from "../game/world";
import { renderApp } from "./render";
import { ensureOptionalScreenSurface } from "./optional-screen-loader";

beforeAll(() => ensureOptionalScreenSurface());

describe("journal presentation", () => {
  it("keeps Body & equipment and Journal as sibling destinations", () => {
    const state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain('data-action="open-inventory"');
    expect(markup).toContain('data-action="open-journal"');
    expect(markup).toContain("Body &amp; equipment");
  });

  it("explains active preparations and only character-known facts", () => {
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    state.run!.flags.push("burial-tally");
    learnWorldFact(state.run!.world, "aided-county-burial");
    state.run!.world.facts.push("hollis-vane-rendered");
    state = openJournal(state).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("County funerary tally");
    expect(markup).toContain(
      "When you enter Saint Orra’s vault, it adds 3 Ward",
    );
    expect(markup).toContain("A county burial was aided");
    expect(markup).not.toContain("Hollis Vane was rendered");
    expect(markup).toContain('data-action="close-journal"');
    expect(markup).toContain(
      'data-action="journal-to-inventory"',
    );
    expect(markup).toContain("Body &amp; equipment");
  });

  it("makes outcome rewards keyboard and touch-disclosable", () => {
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    state = chooseStoryChoice(state, "burial-cut").state;
    state = chooseStoryChoice(state, "read-washout").state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("County funerary tally");
    expect(markup).toContain('class="outcome-reward"');
    expect(markup).toContain("popovertarget=");
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("popovertargetaction=\"hide\"");
    expect(markup).toContain(
      "A stamped ward token carried by county burial crews.",
    );
  });

  it("uses native disclosures for safe world records without exposing hidden state", () => {
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "disputed-bundle";
    state = chooseStoryChoice(
      state,
      "leave-bundle-with-burial-crew",
    ).state;
    state = openJournal(state).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("Known people and parties");
    expect(markup).toContain("Relationships");
    expect(markup).toContain("Evidence, claims, and custody");
    expect(markup).toContain("Active concerns");
    expect(markup).toContain(
      '<details class="journal-disclosure">',
    );
    expect(markup).toContain("Eda Pell");
    expect(markup).toContain("Sealed blackcloth bundle");
    expect(markup).not.toContain("bundle-trace-points-to-broker");
    expect(markup).not.toContain("certainty");
    expect(markup).not.toContain("strength");
    expect(markup).not.toContain("countyNotice");
  });
});
