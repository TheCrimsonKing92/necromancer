import {
  storySceneFor,
  TRADITIONS,
  storyChoicesFor,
  storyChoiceDetailFor,
  storyChoiceIsComplete,
  storyChoiceLabelFor,
  storyEyebrowFor,
  storyOutcomeDismissalFlag,
  storyTitleFor,
} from "../game/content";
import { MUNDANE_SKILLS } from "../game/character";
import { WAKE_VARIANTS } from "../game/encounters";
import { itemCount } from "../game/items";
import type { GameState, StoryChoice } from "../game/types";
import { escapeHtml } from "./html";
import { renderMissingState } from "./missing-state-render";
import { renderPlayerAsideContents } from "./combatant-render";
import {
  DEFAULT_STORY_APPROACH_EXPLORER_STATE,
  type StoryApproachExplorerState,
} from "./story-approach-state";
import { renderLoadedStoryApproachSurface } from "./story-approach-render-runtime";
import { renderLoadedDevelopmentProofEpilogue } from "./development-proof-render-runtime";
import { renderStoryOutcome } from "./story-outcome-render";

export type StoryPatchMarkup = readonly [
  eyebrow: string,
  title: string,
  copy: string,
  outcome: string,
  approaches: string,
  choices: string,
  dossier: string,
];

export const renderStoryPatchMarkup = (
  state: GameState,
  explorerState: StoryApproachExplorerState = DEFAULT_STORY_APPROACH_EXPLORER_STATE,
  showDevelopmentEpilogue = false,
): StoryPatchMarkup | null => {
  const run = state.run;
  const scene = state.storyId ? storySceneFor(state.storyId) : undefined;
  if (!run || !scene) return null;
  const wakeVariant =
    scene.id === "black-mile-wake" && run.wakeVariant
      ? WAKE_VARIANTS[run.wakeVariant]
      : null;
  const choices = storyChoicesFor(scene, run).filter(
    (choice) =>
      !choice.tradition || choice.tradition === run.player.tradition,
  );
  const completionPrefix = `story-choice:${scene.id}:`;
  const latestOutcomeChoice = [...run.flags]
    .reverse()
    .filter((flag) => flag.startsWith(completionPrefix))
    .map((flag) =>
      choices.find(
        (choice) => choice.id === flag.slice(completionPrefix.length),
      ),
    )
    .find(
      (choice): choice is StoryChoice => Boolean(choice?.outcome),
    );
  const outcomeDismissed = latestOutcomeChoice
    ? run.flags.includes(
        storyOutcomeDismissalFlag(scene.id, latestOutcomeChoice.id),
      )
    : false;
  const outcome = outcomeDismissed
    ? undefined
    : latestOutcomeChoice?.outcome;
  const visibleChoices = choices.filter(
    (choice) => !storyChoiceIsComplete(scene.id, choice, run),
  );
  return [
    escapeHtml(wakeVariant?.eyebrow ?? storyEyebrowFor(scene, run)),
    escapeHtml(wakeVariant?.title ?? storyTitleFor(scene, run)),
    scene
            .paragraphs(run)
            .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
            .join(""),
    (outcome
            ? renderStoryOutcome(state, latestOutcomeChoice!)
            : "") + renderLoadedDevelopmentProofEpilogue(showDevelopmentEpilogue),
    renderLoadedStoryApproachSurface(state, explorerState),
    visibleChoices
            .map((choice, index) => {
              const completed = storyChoiceIsComplete(
                scene.id,
                choice,
                run,
              );
              const unavailableReason =
                (choice.effect === "shatter-seal" ||
                  choice.effect === "wake-severing" ||
                  choice.effect === "grave-warden-road-seal") &&
                run.player.spirit < 1
                  ? "Requires 1 Spirit."
                  : choice.effect === "summoner-hound" &&
                      itemCount(
                        run.player.inventory,
                        "hound-tooth",
                      ) < 1
                    ? "Requires one ash-hound tooth."
                    : choice.effect === "trade-for-surgery" &&
                        itemCount(
                          run.player.inventory,
                          "ossuary-ichor",
                        ) < 1
                      ? "Requires one ampoule of ossuary ichor."
                      : null;
              const disabledReason = completed
                ? "Already completed."
                : unavailableReason;
              const metadata = [
                choice.tradition
                  ? `<span class="choice__tag choice__tag--tradition">${escapeHtml(TRADITIONS[choice.tradition].name)} practice</span>`
                  : "",
                choice.skill
                  ? `<span class="choice__tag">${escapeHtml(MUNDANE_SKILLS[choice.skill].label)}</span>`
                  : "",
                choice.mode === "interaction" && choice.optional !== false
                  ? `<span class="choice__tag ${completed ? "choice__tag--complete" : ""}">${completed ? "Completed" : "Optional action"}</span>`
                  : "",
                choice.signal && !completed
                  ? `<span class="choice__tag choice__tag--caution">${choice.signal === "risk" ? "Uncertain risk" : "Tradeoff"}</span>`
                  : "",
              ].join("");

              return `<button class="choice ${completed ? "choice--completed" : ""}" type="button" data-action="choose-story" data-choice-id="${escapeHtml(choice.id)}" ${disabledReason ? "disabled" : ""}><span class="choice__index">0${index + 1}</span><span class="choice__body">${metadata ? `<span class="choice__meta">${metadata}</span>` : ""}<strong>${escapeHtml(storyChoiceLabelFor(choice, run))}</strong><span class="choice__detail">${escapeHtml(storyChoiceDetailFor(choice, run))}</span>${unavailableReason ? `<span class="choice__unavailable">Unavailable · ${escapeHtml(unavailableReason)}</span>` : ""}</span><span class="choice__arrow" aria-hidden="true">${completed ? "✓" : "→"}</span></button>`;
            })
            .join(""),
    renderPlayerAsideContents(run.player),
  ];
};

export const renderStory = (
  state: GameState,
  explorerState: StoryApproachExplorerState = DEFAULT_STORY_APPROACH_EXPLORER_STATE,
  showDevelopmentEpilogue = false,
): string => {
  const markup = renderStoryPatchMarkup(
    state,
    explorerState,
    showDevelopmentEpilogue,
  );
  if (!markup) return renderMissingState();
  const [eyebrow, title, copy, outcome, approaches, choices, dossier] = markup;
  const tacticalScene = import.meta.env.DEV
    ? (globalThis as { __renderNecromancerTacticalScene?: (state: GameState, selected?: string, outcome?: string) => string })
        .__renderNecromancerTacticalScene?.(state, undefined, outcome) ?? ""
    : "";
  const tacticalHost = tacticalScene
    ? `<div data-story-tactical-host>${tacticalScene}</div>`
    : "";
  const outcomeSurface = tacticalScene ? "" : outcome;
  const choiceSurface = tacticalScene
    ? `<div data-story-choice-list aria-label="Available choices" hidden></div>`
    : `<div class="choice-list" data-story-choice-list aria-label="Available choices">${choices}</div>`;
  return `<main class="game-layout"><article class="story-panel"><p class="eyebrow" data-story-eyebrow>${eyebrow}</p><h1 data-page-title tabindex="-1">${title}</h1><div class="story-copy" data-story-copy>${copy}</div><div data-story-outcome-slot>${outcomeSurface}</div>${tacticalHost}<div data-story-approach-host>${approaches}</div>${choiceSurface}</article><aside class="dossier">${dossier}</aside></main>`;
};
