import type { GameState, StoryChoice } from "../game/types";
import { escapeHtml } from "./html";
import { renderOutcomeRewards, renderResultDismissButton } from "./result-render";

export const renderStoryOutcome = (
  state: GameState,
  choice: StoryChoice,
): string => {
  const run = state.run;
  const outcome = choice.outcome;
  if (!run || !outcome) return "";
  const title = typeof outcome.title === "function" ? outcome.title(run) : outcome.title;
  const rewards = outcome.rewards === undefined
    ? []
    : typeof outcome.rewards === "function"
      ? outcome.rewards(run)
      : outcome.rewards;
  return `<section class="story-outcome">${renderResultDismissButton("story-choice", choice.id, title)}<p class="eyebrow">${escapeHtml(outcome.eyebrow)}</p><h2 data-result-title tabindex="-1">${escapeHtml(title)}</h2><p class="story-outcome__body">${escapeHtml(typeof outcome.body === "function" ? outcome.body(run) : outcome.body)}</p><p class="story-outcome__result">${escapeHtml(outcome.result(run))}</p>${renderOutcomeRewards(rewards, `${state.storyId}-${choice.id}`)}</section>`;
};
