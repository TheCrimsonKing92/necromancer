import type { BattleLogEntry, EngineResult } from "../game/types";
import { witnessPresentation } from "../game/witness";

export const mountWitnessAnnouncer = (root: HTMLElement): HTMLElement => {
  const announcer = document.createElement("div");
  announcer.className = "visually-hidden";
  announcer.dataset.appAnnouncer = "witness";
  announcer.setAttribute("role", "status");
  announcer.setAttribute("aria-live", "polite");
  announcer.setAttribute("aria-atomic", "true");
  root.after(announcer);
  return announcer;
};

export const announceNewWitness = (
  announcer: HTMLElement | undefined,
  previousLog: BattleLogEntry[],
  result: EngineResult,
): void => {
  const nextLog = result.state.run?.battle?.log;
  if (!announcer || !nextLog) return;
  const previousIds = new Set(previousLog.map((entry) => entry.id));
  const additions = nextLog.filter((entry) => !previousIds.has(entry.id));
  if (additions.length === 0) return;
  announcer.textContent = "";
  window.requestAnimationFrame(() => {
    announcer.textContent = additions
      .map((entry) => witnessPresentation(entry).text)
      .join(" ");
  });
};
