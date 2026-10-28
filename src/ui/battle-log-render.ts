import type { BattleLogEntry, GameState } from "../game/types";
import { witnessPresentation } from "../game/witness";
import { escapeHtml } from "./html";

const visibleBattleLog = (state: GameState) =>
  (state.run?.battle?.log ?? []).slice(-10);

const renderBattleLogEntry = (entry: BattleLogEntry): string => {
  const presentation = witnessPresentation(entry);
  return `
    <li class="log-entry log-entry--${presentation.tone}" data-log-id="${entry.id}">
      <span>R${entry.round}</span>
      <p>${escapeHtml(presentation.text)}</p>
    </li>
  `;
};

export interface BattleLogPatchMarkup {
  count: number;
  entries: { id: string; markup: string }[];
  full: string;
}

export const renderBattleLogPatchMarkup = (
  state: GameState,
  logAlreadyRendered: boolean,
): BattleLogPatchMarkup => {
  const log = visibleBattleLog(state);
  return {
    count: log.length,
    entries: logAlreadyRendered
      ? log.map((entry) => ({
          id: String(entry.id),
          markup: renderBattleLogEntry(entry),
        }))
      : [],
    full: logAlreadyRendered ? "" : renderBattleLog(state),
  };
};

export const renderBattleLog = (
  state: GameState,
  mode: "active" | "final" = "active",
): string => {
  const visibleLog = visibleBattleLog(state);
  if (visibleLog.length === 0) return "";

  return `
    <section ${mode === "active" ? 'id="witness-latest"' : ""} class="battle-log ${mode === "final" ? "ending__witness" : ""}" aria-label="${mode === "final" ? "Final combat exchange" : "Battle log"}">
      <div class="section-heading">
        <h2>${mode === "final" ? "Final exchange" : "Witness"}</h2>
        <span>${mode === "final" ? "How it ended" : `Last ${visibleLog.length} entries`}</span>
      </div>
      <ol>
        ${visibleLog.map(renderBattleLogEntry).join("")}
      </ol>
    </section>
  `;
};
