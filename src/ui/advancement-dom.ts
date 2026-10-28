import {
  availableDisciplinePoints,
  advancementTreeFor,
  isAdvancementId,
} from "../game/advancements";
import { isAdvancementExpressionId } from "../game/advancement-readiness";
import {
  chooseAdvancement,
  prepareAdvancementExpression,
} from "../game/engine";
import type {
  AdvancementId,
  EngineResult,
  GameState,
} from "../game/types";
import {
  renderAdvancementConfirmation,
  renderAdvancementOffer,
  renderPresentedAdvancement,
} from "./advancement-render";
import { renderStatsSurface } from "./stats-render";

const parsedElement = (markup: string): HTMLElement | null => {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.firstElementChild as HTMLElement | null;
};

const nodeByAdvancementId = (
  root: ParentNode,
  id: AdvancementId,
): HTMLElement | undefined =>
  [...root.querySelectorAll<HTMLElement>(
    '[data-action="select-advancement"]',
  )].find((node) => node.dataset.advancementId === id);

const replaceContentsWhenChanged = (
  current: HTMLElement,
  fresh: HTMLElement,
): void => {
  if (current.innerHTML !== fresh.innerHTML) {
    current.innerHTML = fresh.innerHTML;
  }
};

const patchStatsSections = (
  currentSurface: HTMLElement,
  freshSurface: HTMLElement,
): void => {
  for (const current of currentSurface.querySelectorAll<HTMLElement>(
    ".stats-section[aria-labelledby]",
  )) {
    const labelledBy = current.getAttribute("aria-labelledby");
    const fresh = [...freshSurface.querySelectorAll<HTMLElement>(
      ".stats-section[aria-labelledby]",
    )].find(
      (candidate) => candidate.getAttribute("aria-labelledby") === labelledBy,
    );
    if (fresh) replaceContentsWhenChanged(current, fresh);
  }
};

const patchStatsControl = (root: HTMLElement, state: GameState): void => {
  const control = root.querySelector<HTMLElement>("[data-stats-control]");
  const player = state.run?.player;
  if (!control || !player) return;
  const points = availableDisciplinePoints(player);
  control.classList.toggle("header-stats--available", points > 0);
  control.querySelector("[data-stats-points-badge]")?.remove();
  if (points <= 0) return;
  const badge = document.createElement("span");
  badge.dataset.statsPointsBadge = "";
  badge.setAttribute(
    "aria-label",
    `${points} unspent discipline ${points === 1 ? "point" : "points"}`,
  );
  badge.textContent = String(points);
  control.append(badge);
};

export const patchAdvancementTransition = (
  root: HTMLElement,
  state: GameState,
  selectedId: string,
): boolean => {
  if (!isAdvancementId(selectedId)) return false;
  const currentSurface = root.querySelector<HTMLElement>(
    "[data-stats-surface]",
  );
  const currentPanel = root.querySelector<HTMLElement>(
    ".advancement-panel",
  );
  const currentResult = root.querySelector<HTMLElement>(
    "[data-advancement-result-slot]",
  );
  const currentConfirmation = root.querySelector<HTMLElement>(
    "[data-advancement-confirmation]",
  );
  if (
    !currentSurface ||
    !currentPanel ||
    !currentResult ||
    !currentConfirmation
  ) return false;

  const freshPanel = parsedElement(renderAdvancementOffer(state, selectedId));
  const freshSurface = parsedElement(
    renderStatsSurface(state, {
      hasSave: true,
      statsOpen: true,
      selectedAdvancementId: selectedId,
    }),
  );
  const freshConfirmation = freshPanel?.querySelector<HTMLElement>(
    "[data-advancement-confirmation]",
  );
  if (!freshPanel || !freshSurface || !freshConfirmation) return false;

  const currentNodes = [
    ...currentPanel.querySelectorAll<HTMLElement>(
      '[data-action="select-advancement"]',
    ),
  ];
  const replacements = currentNodes.map((current) => {
    const id = current.dataset.advancementId;
    return isAdvancementId(id)
      ? { current, fresh: nodeByAdvancementId(freshPanel, id) }
      : { current, fresh: undefined };
  });
  if (replacements.some(({ fresh }) => !fresh)) return false;

  patchStatsSections(currentSurface, freshSurface);
  patchStatsControl(root, state);

  const currentPoints = currentPanel.querySelector<HTMLElement>(
    "[data-advancement-points]",
  );
  const freshPoints = freshPanel.querySelector<HTMLElement>(
    "[data-advancement-points]",
  );
  if (currentPoints && freshPoints) {
    currentPoints.className = freshPoints.className;
    currentPoints.textContent = freshPoints.textContent;
  }

  for (const currentBranch of currentPanel.querySelectorAll<HTMLElement>(
    "[data-advancement-branch]",
  )) {
    const branch = currentBranch.dataset.advancementBranch;
    const freshBranch = [
      ...freshPanel.querySelectorAll<HTMLElement>(
        "[data-advancement-branch]",
      ),
    ].find((candidate) => candidate.dataset.advancementBranch === branch);
    const currentLearned = currentBranch.querySelector<HTMLElement>(
      "[data-advancement-branch-learned]",
    );
    const freshLearned = freshBranch?.querySelector<HTMLElement>(
      "[data-advancement-branch-learned]",
    );
    if (currentLearned && freshLearned) {
      currentLearned.textContent = freshLearned.textContent;
    }
  }

  for (const { current, fresh } of replacements) {
    if (fresh && current.outerHTML !== fresh.outerHTML) {
      current.replaceWith(fresh);
    }
  }
  replaceContentsWhenChanged(currentConfirmation, freshConfirmation);
  currentResult.innerHTML = renderPresentedAdvancement(state);
  return true;
};

export const patchAdvancementSelection = (
  root: HTMLElement,
  state: GameState,
  selectedId: AdvancementId,
): boolean => {
  const confirmation = root.querySelector<HTMLElement>(
    "[data-advancement-confirmation]",
  );
  if (!confirmation) return false;

  for (const node of root.querySelectorAll<HTMLElement>(
    '[data-action="select-advancement"]',
  )) {
    const selected = node.dataset.advancementId === selectedId;
    node.classList.toggle("is-selected", selected);
    node.setAttribute("aria-pressed", String(selected));
    const marker = node.querySelector<HTMLElement>(
      ".choice__arrow",
    );
    if (marker) {
      marker.textContent = node.classList.contains(
        "advancement-choice--learned",
      )
        ? "✓"
        : selected
          ? "•"
          : "→";
    }
  }
  confirmation.innerHTML = renderAdvancementConfirmation(
    state,
    selectedId,
  );
  return true;
};

export const advancementSelectionFromElement = (
  state: GameState,
  origin: HTMLElement,
): AdvancementId | undefined => {
  const id = origin.dataset.advancementId;
  if (
    !isAdvancementId(id) ||
    !state.run ||
    !advancementTreeFor(state.run.player).some(
      ({ definition }) => definition.id === id,
    )
  ) {
    return undefined;
  }
  return id;
};

export const advancementTransitionFromElement = (
  state: GameState,
  origin: HTMLElement,
):
  | {
      advancementId: AdvancementId;
      result: EngineResult;
    }
  | undefined => {
  const advancementId = origin.dataset.advancementId;
  if (!isAdvancementId(advancementId)) return undefined;

  if (origin.dataset.action === "prepare-advancement-expression") {
    const expressionId = origin.dataset.expressionId;
    if (!isAdvancementExpressionId(expressionId)) return undefined;
    return {
      advancementId,
      result: prepareAdvancementExpression(state, expressionId),
    };
  }
  return {
    advancementId,
    result: chooseAdvancement(state, advancementId),
  };
};
