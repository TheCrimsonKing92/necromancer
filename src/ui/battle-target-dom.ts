import type { GameState } from "../game/types";
import {
  battleTargetDescriptionUpdates,
  renderBattleActionGrid,
} from "./battle-render";

export const patchBattleTargetSelection = (
  root: HTMLElement,
  state: GameState,
  selectedTargetId: string | undefined,
): boolean => {
  const targetCards = root.querySelectorAll<HTMLElement>(
    '[data-action="select-target"]',
  );
  const actionGrid = root.querySelector<HTMLElement>(".action-grid");
  if (targetCards.length === 0 || !actionGrid) return false;

  for (const card of targetCards) {
    const selected = card.dataset.targetId === selectedTargetId;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
    const label = card.querySelector<HTMLElement>(".enemy-card__target");
    if (label && !card.hasAttribute("disabled")) {
      label.textContent = selected ? "Targeted" : "Choose target";
    }
  }

  for (const update of battleTargetDescriptionUpdates(
    state,
    selectedTargetId,
  )) {
    const hitChance = actionGrid.querySelector<HTMLElement>(
      `[data-action-id="${update.actionId}"] [data-target-hit-chance]`,
    );
    if (!hitChance) {
      actionGrid.innerHTML = renderBattleActionGrid(
        state,
        selectedTargetId,
      );
      return true;
    }
    const nextHitChance = String(update.hitChance);
    if (hitChance.textContent !== nextHitChance) {
      hitChance.textContent = nextHitChance;
    }
  }
  return true;
};
