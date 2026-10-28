import type { GameState } from "../game/types";
import type { RenderContext } from "./render-context";
import { renderHeaderContents } from "./shell-render";
import { renderStoryPatchMarkup } from "./story-render";
import type { StoryApproachExplorerState } from "./story-approach-state";

export const patchStoryDom = (
  root: HTMLElement,
  previousState: GameState,
  nextState: GameState,
  context: RenderContext,
  explorerState?: StoryApproachExplorerState,
): boolean => {
  const current = root.querySelector<HTMLElement>(".game-layout");
  const next = renderStoryPatchMarkup(
    nextState,
    explorerState,
    context.ephemeralJourneyComplete,
  );
  const currentHeader = root.querySelector<HTMLElement>(".site-header");
  if (!current || !next || !currentHeader) return false;
  const previousFlags = previousState.run?.flags ?? [];
  const nextFlags = nextState.run?.flags ?? [];
  const dismissalOnly =
    nextFlags.length === previousFlags.length + 1 &&
    nextFlags.at(-1)?.startsWith("story-outcome-dismissed:");
  const selectors = [
    "[data-story-eyebrow]",
    "[data-page-title]",
    "[data-story-copy]",
    "[data-story-outcome-slot]",
    "[data-story-approach-host]",
    "[data-story-choice-list]",
    ".dossier",
  ];
  for (let index = 0; index < selectors.length; index += 1) {
    const selector = selectors[index]!;
    const element = current.querySelector<HTMLElement>(selector);
    if (!element) return false;
    if (!dismissalOnly || index === 3) element.innerHTML = next[index]!;
  }
  if (dismissalOnly) {
    const tacticalOutcome = current.querySelector<HTMLElement>("[data-tactical-outcome-slot]");
    if (tacticalOutcome) tacticalOutcome.innerHTML = next[3] ?? "";
  }
  if (import.meta.env.DEV && !dismissalOnly) {
    const tacticalHost = current.querySelector<HTMLElement>("[data-story-tactical-host]");
    const selectedSubjectId = tacticalHost
      ?.querySelector<HTMLElement>('[data-action="select-tactical-subject"][aria-pressed="true"]')
      ?.dataset.tacticalSubjectId;
    if (tacticalHost) {
      tacticalHost.innerHTML = (globalThis as {
        __renderNecromancerTacticalScene?: (state: GameState, selected?: string, outcome?: string) => string;
      }).__renderNecromancerTacticalScene?.(nextState, selectedSubjectId, next[3] ?? "") ?? "";
      current.querySelector<HTMLElement>("[data-story-outcome-slot]")!.innerHTML = "";
    }
  }
  if (!dismissalOnly) {
    currentHeader.innerHTML = renderHeaderContents(nextState, context);
  }
  return true;
};
