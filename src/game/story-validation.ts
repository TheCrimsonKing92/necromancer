import {
  STORY_EFFECT_IDS,
  STORY_IDS,
  type RunState,
  type StoryChoice,
  type StoryEffect,
  type StoryId,
  type StoryScene,
} from "./types";

export interface StoryValidationSample {
  name: string;
  run: RunState;
}

const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const resolveText = (
  value: string | ((run: RunState) => string),
  run: RunState,
): string => (typeof value === "function" ? value(run) : value);

const choiceSignature = (choice: StoryChoice): string =>
  [
    choice.effect,
    choice.tradition ?? "*",
    choice.skill ?? "*",
    choice.mode ?? "transition",
  ].join(":");

export const validateStoryScenes = (
  scenes: Record<StoryId, StoryScene>,
  samples: StoryValidationSample[],
): string[] => {
  const errors = new Set<string>();
  const sceneKeys = Object.keys(scenes);
  const knownScenes = new Set<string>(STORY_IDS);
  const knownEffects = new Set<string>(STORY_EFFECT_IDS);
  const usedEffects = new Set<StoryEffect>();

  for (const sceneId of STORY_IDS) {
    if (!sceneKeys.includes(sceneId)) {
      errors.add(`Missing story scene: ${sceneId}.`);
    }
  }
  for (const sceneId of sceneKeys) {
    if (!knownScenes.has(sceneId)) {
      errors.add(`Unknown story scene: ${sceneId}.`);
    }
  }
  if (samples.length === 0) {
    errors.add("Story validation requires at least one run sample.");
  }

  for (const sceneId of STORY_IDS) {
    const scene = scenes[sceneId];
    if (!scene) continue;
    if (scene.id !== sceneId) {
      errors.add(
        `Story scene key ${sceneId} declares mismatched id ${scene.id}.`,
      );
    }

    const signatures = new Map<string, string>();
    for (const sample of samples) {
      try {
        const eyebrow = resolveText(scene.eyebrow, sample.run);
        const title = resolveText(scene.title, sample.run);
        const paragraphs = scene.paragraphs(sample.run);
        const choices =
          typeof scene.choices === "function"
            ? scene.choices(sample.run)
            : scene.choices;

        if (!isNonEmpty(eyebrow)) {
          errors.add(
            `${sceneId} has an empty eyebrow for ${sample.name}.`,
          );
        }
        if (!isNonEmpty(title)) {
          errors.add(
            `${sceneId} has an empty title for ${sample.name}.`,
          );
        }
        if (
          !Array.isArray(paragraphs) ||
          paragraphs.length === 0 ||
          paragraphs.some((paragraph) => !isNonEmpty(paragraph))
        ) {
          errors.add(
            `${sceneId} has empty narrative copy for ${sample.name}.`,
          );
        }
        if (!Array.isArray(choices) || choices.length === 0) {
          errors.add(
            `${sceneId} has no choices for ${sample.name}.`,
          );
          continue;
        }

        const ids = new Set<string>();
        for (const choice of choices) {
          const choicePath = `${sceneId}.${choice.id || "<empty>"}`;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(choice.id)) {
            errors.add(`${choicePath} has an invalid choice id.`);
          }
          if (ids.has(choice.id)) {
            errors.add(
              `${sceneId} repeats choice id ${choice.id} for ${sample.name}.`,
            );
          }
          ids.add(choice.id);

          if (!knownEffects.has(choice.effect)) {
            errors.add(
              `${choicePath} uses unknown effect ${String(choice.effect)}.`,
            );
          } else {
            usedEffects.add(choice.effect as StoryEffect);
          }

          const signature = choiceSignature(choice);
          const previousSignature = signatures.get(choice.id);
          if (
            previousSignature &&
            previousSignature !== signature
          ) {
            errors.add(
              `${choicePath} changes its mechanical identity between authored branches.`,
            );
          } else {
            signatures.set(choice.id, signature);
          }

          if (!isNonEmpty(resolveText(choice.label, sample.run))) {
            errors.add(
              `${choicePath} has an empty label for ${sample.name}.`,
            );
          }
          if (!isNonEmpty(resolveText(choice.detail, sample.run))) {
            errors.add(
              `${choicePath} has empty detail for ${sample.name}.`,
            );
          }

          const rewards =
            choice.outcome?.rewards === undefined
              ? []
              : typeof choice.outcome.rewards === "function"
                ? choice.outcome.rewards(sample.run)
                : choice.outcome.rewards;
          for (const reward of rewards) {
            if (
              reward.kind === "effect" &&
              (!isNonEmpty(reward.label) ||
                !isNonEmpty(reward.description))
            ) {
              errors.add(
                `${choicePath} has incomplete reward-detail copy for ${sample.name}.`,
              );
            }
            if (
              reward.kind === "item" &&
              reward.quantity !== undefined &&
              (!Number.isInteger(reward.quantity) ||
                reward.quantity < 1)
            ) {
              errors.add(
                `${choicePath} has an invalid reward quantity for ${sample.name}.`,
              );
            }
          }

          const mode = choice.mode ?? "transition";
          if (mode === "interaction" && !choice.outcome) {
            errors.add(
              `${choicePath} is an interaction without a featured outcome.`,
            );
          }
          if (mode === "transition" && choice.outcome) {
            errors.add(
              `${choicePath} navigates away but declares an outcome card.`,
            );
          }

          if (choice.outcome) {
            const outcomeTitle = resolveText(
              choice.outcome.title,
              sample.run,
            );
            const body = resolveText(
              choice.outcome.body,
              sample.run,
            );
            const result = choice.outcome.result(sample.run);
            if (
              !isNonEmpty(choice.outcome.eyebrow) ||
              !isNonEmpty(outcomeTitle) ||
              !isNonEmpty(body) ||
              !isNonEmpty(result)
            ) {
              errors.add(
                `${choicePath} has incomplete outcome copy for ${sample.name}.`,
              );
            }
          }
        }
      } catch (error) {
        errors.add(
          `${sceneId} failed to render for ${sample.name}: ${
            error instanceof Error ? error.message : String(error)
          }.`,
        );
      }
    }
  }

  for (const effect of STORY_EFFECT_IDS) {
    if (!usedEffects.has(effect)) {
      errors.add(`Story effect ${effect} is not used by any scene.`);
    }
  }

  return [...errors];
};

export const assertValidStoryScenes = (
  scenes: Record<StoryId, StoryScene>,
  samples: StoryValidationSample[],
): void => {
  const errors = validateStoryScenes(scenes, samples);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
};
