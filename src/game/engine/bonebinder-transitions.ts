import type { EngineResult, GameState } from "../types";
import {
  getCalledCounselUnavailableReason,
  queueCalledCounsel,
} from "../practices/bonebinder/advancement-battle";

export const resolveCalledCounsel = (
  state: GameState,
  targetId?: string,
): EngineResult => {
  const unavailable = getCalledCounselUnavailableReason(state, targetId);
  if (unavailable) return { state, error: unavailable };

  const next = structuredClone(state);
  const run = next.run;
  const battle = run?.battle;
  if (!run || !battle) return { state, error: "No active battle." };

  if (!queueCalledCounsel(run, targetId)) {
    return { state, error: "No remembered motion could be called." };
  }
  return { state: next };
};
