import { describe, expect, it } from "vitest";
import { chooseStoryChoice, createCharacter } from "../engine";
import { chooseStoryChoice as chooseStoryChoiceTransition } from "./story-choice-transitions";

describe("story choice transitions", () => {
  it("re-exports the same transition function through the engine facade", () => {
    expect(chooseStoryChoice).toBe(chooseStoryChoiceTransition);
  });

  it("rejects an unavailable choice without changing the story state", () => {
    const { state } = createCharacter("Mara", "medium", 1);
    const before = structuredClone(state);
    expect(state.screen).toBe("story");
    expect(state.storyId).toBe("weary-traveler");

    const result = chooseStoryChoice(state, "unavailable-story-choice");

    expect(result.error).toBe("That path is not available.");
    expect(result.state).toBe(state);
    expect(result.state).toEqual(before);
    expect(state).toEqual(before);
  });
});
