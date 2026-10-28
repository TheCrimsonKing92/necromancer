import { ITEMS } from "../game/items";
import type { StoryRewardReference } from "../game/types";
import { escapeHtml } from "./html";

export const renderResultDismissButton = (
  kind: "story-choice" | "advancement",
  resultId: string,
  title: string,
): string => `
  <button
    class="result-card__dismiss"
    type="button"
    data-action="dismiss-result"
    data-result-kind="${kind}"
    data-result-id="${escapeHtml(resultId)}"
    aria-label="Dismiss result: ${escapeHtml(title)}"
  >
    <span aria-hidden="true">×</span>
  </button>
`;

export const renderOutcomeRewards = (
  rewards: StoryRewardReference[],
  idPrefix: string,
): string => {
  if (rewards.length === 0) return "";
  return `
    <ul class="story-outcome__rewards" aria-label="Reward details">
      ${rewards
        .map((reward, index) => {
          const item = reward.kind === "item" ? ITEMS[reward.itemId] : null;
          const label =
            reward.kind === "item"
              ? `${item!.name}${(reward.quantity ?? 1) > 1 ? ` ×${reward.quantity}` : ""}`
              : reward.label;
          const description =
            reward.kind === "item" ? item!.description : reward.description;
          const disclosureId = `${idPrefix}-reward-${index}`;
          return `
            <li class="outcome-reward__item">
              <button
                class="outcome-reward"
                type="button"
                popovertarget="${escapeHtml(disclosureId)}"
                aria-haspopup="dialog"
                aria-label="Inspect ${escapeHtml(label)}"
              >
                <span>${escapeHtml(label)}</span>
                <span class="outcome-reward__mark" aria-hidden="true">?</span>
              </button>
              <div
                class="knowledge-popover"
                id="${escapeHtml(disclosureId)}"
                popover
                role="dialog"
                aria-label="${escapeHtml(label)} details"
              >
                <p class="eyebrow">Known to you</p>
                <strong>${escapeHtml(label)}</strong>
                <p>${escapeHtml(description)}</p>
                <button
                  class="text-button knowledge-popover__close"
                  type="button"
                  popovertarget="${escapeHtml(disclosureId)}"
                  popovertargetaction="hide"
                >Close</button>
              </div>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
};
