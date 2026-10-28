import { activeStoryApproachFor } from "../content-packs/story-approach-runtime";
import { resolveContentStoryTransition } from "../content-packs/story-runtime-port";
import type { StoryApproachId } from "../story-approaches";
import type { EngineResult, GameState, StoryChoice } from "../types";

export const chooseStoryApproach = (
  state: GameState,
  approachId: StoryApproachId,
): EngineResult => {
  if (state.screen !== "story" || !state.storyId || !state.run) {
    return { state, error: "There is no open situation to approach." };
  }
  const approach = activeStoryApproachFor(state.storyId, state.run, approachId);
  if (!approach) return { state, error: "That approach is not present here." };
  if (approach.availability.state !== "available") {
    return {
      state,
      error: approach.availability.reason ?? "That approach is not available.",
    };
  }

  const next = structuredClone(state);
  const run = next.run!;
  const choice: StoryChoice = {
    id: approach.id,
    effect: approach.transitionId,
    label: approach.label,
    detail: approach.detail,
    mode: "interaction",
  };
  const resolved = resolveContentStoryTransition(approach.transitionId, {
    state: next,
    run,
    choice,
  });
  if (!resolved) {
    return { state, error: "That approach has no loaded transition." };
  }
  if (resolved.error) return { state, error: resolved.error };
  return { state: next, message: resolved.message };
};
