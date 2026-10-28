import { describe, expect, it } from "vitest";
import { chooseStoryChoice, createCharacter } from "../game/engine";
import { renderApp } from "./render";

describe("existing story choice contract", () => {
  it("keeps ordinary scenes on one delegated authored-choice surface", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.screen = "story";
    state.storyId = "road-aftermath";

    const markup = renderApp(state, { hasSave: true });

    expect(markup.match(/data-story-choice-list/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Available choices"');
    expect(markup).toContain(
      'data-action="choose-story" data-choice-id="question-hollis"',
    );
    expect(markup).toContain(
      'data-action="choose-story" data-choice-id="leave-aftermath"',
    );
    expect(markup).not.toContain("data-story-approach-explorer");
  });

  it("removes a resolved interaction while retaining its result and onward decision", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.screen = "story";
    state.storyId = "road-aftermath";

    const resolved = chooseStoryChoice(state, "question-hollis").state;
    const markup = renderApp(resolved, { hasSave: true });

    expect(markup).not.toContain('data-choice-id="question-hollis"');
    expect(markup).toContain('data-story-outcome-slot');
    expect(markup).toContain("Hollis speaks with your teeth.");
    expect(markup).toContain(
      'data-action="choose-story" data-choice-id="leave-aftermath"',
    );
  });
});
