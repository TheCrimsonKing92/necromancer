import { hasAdvancementRule } from "../../advancements";
import { witnessMessage } from "../../witness";
import type { Combatant, RunState } from "../../types";
import { addLog, grantWard } from "../../engine/combat-state";

export const raisePreparedInterpositionWard = (
  run: RunState,
  interposingServant: Combatant,
): void => {
  const battle = run.battle;
  if (!battle || !hasAdvancementRule(run.player, "set-the-frame")) return;

  const advancementState = battle.advancementState ??= {
    usedExpressions: [],
  };
  if (advancementState.setTheFrameRound === battle.round) return;
  advancementState.setTheFrameRound = battle.round;

  const grant = grantWard(interposingServant, 2);
  if (grant.gained <= 0) return;
  addLog(
    battle,
    witnessMessage(
      "player",
      `${interposingServant.name} sets its frame against the coming stroke. ${grant.gained} Ward closes over the prepared joints.`,
    ),
  );
};
