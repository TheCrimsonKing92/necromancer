import type { GameState } from "../game/types";
import { renderBattleLog } from "./battle-log-render";
import { renderPlayerAside } from "./combatant-render";
import { escapeHtml } from "./html";
import { renderMissingState } from "./missing-state-render";
import { loadedEndingContentFor } from "./ending-surface-loader";

export const renderEnding = (state: GameState): string => {
  const run = state.run;
  const content = loadedEndingContentFor(state);
  if (!run || !state.ending || !content) return renderMissingState();

  return `
    <main class="ending">
      <section class="ending__panel ending__panel--${state.ending}">
        <p class="eyebrow">${escapeHtml(content.eyebrow)}</p>
        <h1 data-page-title tabindex="-1">${escapeHtml(content.title)}</h1>
        <p class="ending__body">${escapeHtml(content.body)}</p>
        ${renderBattleLog(state, "final")}
        <p class="ending__note">${escapeHtml(content.note)}</p>
        <div class="ending__actions">
          ${
            content.continueLabel
              ? `<button class="button button--primary" type="button" data-action="continue-journey">
                  ${escapeHtml(content.continueLabel)}
                </button>`
              : ""
          }
          <button class="button button--secondary" type="button" data-action="open-inventory">
            Inspect body & equipment
          </button>
          <button class="button button--secondary" type="button" data-action="go-home">
            Return to title
          </button>
        </div>
      </section>
      ${renderPlayerAside(run.player)}
    </main>
  `;
};
