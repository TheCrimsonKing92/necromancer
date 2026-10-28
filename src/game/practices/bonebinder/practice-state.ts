import { isCombatantStanding } from "../../anatomy";
import type { RunState } from "../../types";
import type {
  BonebinderPracticeState,
  BonebinderServantState,
} from "./types";

export const bonebinderStateFor = (
  run: RunState,
): BonebinderPracticeState | null =>
  run.practiceStates?.bonebinder ?? null;

export const standingBonebinderServantFor = (
  run: RunState,
): BonebinderServantState | null => {
  const servant = bonebinderStateFor(run)?.servant;
  return servant && isCombatantStanding(servant.combatant)
    ? servant
    : null;
};
