import type { GameState } from "../game/types";
import {
  changedInventorySections,
  renderInventoryPatchMarkup,
} from "./inventory-fragments";

export const patchInventoryDom = (
  root: HTMLElement,
  previousState: GameState,
  nextState: GameState,
): boolean => {
  const current = root.querySelector<HTMLElement>(".inventory-page");
  const changedSections = changedInventorySections(previousState, nextState);
  const next = renderInventoryPatchMarkup(nextState, changedSections);
  if (!current || !next) {
    return false;
  }
  const summary = current.querySelector<HTMLElement>(".inventory-summary");
  if (!summary) return false;

  const currentWorkbench = current.querySelector<HTMLElement>(
    ".inventory-workbench",
  );
  if (!currentWorkbench) return false;

  const currentSections = [
    ...currentWorkbench.querySelectorAll<HTMLElement>(
      ":scope > .inventory-section[aria-labelledby]",
    ),
  ];
  summary.innerHTML = next.summary;
  for (const nextSection of next.sections) {
    const section = currentSections.find(
      (candidate) =>
        candidate.getAttribute("aria-labelledby") === nextSection.labelledBy,
    );
    if (!section) return false;
    section.innerHTML = nextSection.contents;
  }
  return true;
};
