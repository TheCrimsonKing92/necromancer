import { worldHasFact } from "../world/state";
import type {
  ActiveStoryId,
  RunState,
  StoryChoice,
  StoryScene,
} from "../types";

export const storyChoiceCompletionFlag = (
  sceneId: ActiveStoryId,
  choiceId: string,
): string => `story-choice:${sceneId}:${choiceId}`;

export const storyChoiceIsComplete = (
  sceneId: ActiveStoryId,
  choice: StoryChoice,
  run: RunState,
): boolean => {
  if (choice.mode !== "interaction") return false;
  if (
    run.flags.includes(
      storyChoiceCompletionFlag(sceneId, choice.id),
    )
  ) {
    return true;
  }

  // During the v4 world-model pass, this act briefly used the legacy
  // hound-rendering choice ID. The world fact is the durable record of
  // the new deed and prevents an in-progress testament from repeating it.
  return (
    choice.effect === "thaumaturgist-render" &&
    worldHasFact(run.world, "hollis-vane-rendered")
  );
};

export const storyOutcomeDismissalFlag = (
  sceneId: ActiveStoryId,
  choiceId: string,
): string => `story-outcome-dismissed:${sceneId}:${choiceId}`;

export const storyChoicesFor = (
  scene: StoryScene,
  run: RunState,
) => {
  const choices = typeof scene.choices === "function"
    ? scene.choices(run)
    : scene.choices;
  return choices.filter(
    (choice) => !choice.presentWhen || choice.presentWhen(run),
  );
};

export const storyChoiceLabelFor = (
  choice: StoryChoice,
  run: RunState,
): string =>
  typeof choice.label === "function"
    ? choice.label(run)
    : choice.label;

export const storyChoiceDetailFor = (
  choice: StoryChoice,
  run: RunState,
): string =>
  typeof choice.detail === "function"
    ? choice.detail(run)
    : choice.detail;

export const storyEyebrowFor = (
  scene: StoryScene,
  run: RunState,
): string =>
  typeof scene.eyebrow === "function"
    ? scene.eyebrow(run)
    : scene.eyebrow;

export const storyTitleFor = (
  scene: StoryScene,
  run: RunState,
): string =>
  typeof scene.title === "function"
    ? scene.title(run)
    : scene.title;
