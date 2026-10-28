import { hasAdvancementRule } from "../../advancements";
import { statusFor } from "../../combat-math";
import { witnessMessage } from "../../witness";
import type {
  AdvancementExpressionId,
  Combatant,
  RunState,
  StatusEffect,
} from "../../types";
import {
  addLog,
  addOrRefreshStatus,
  livingEnemies,
} from "../../engine/combat-state";

const markExpressionUsed = (
  run: RunState,
  expression: AdvancementExpressionId,
): void => {
  const battle = run.battle!;
  const state = battle.advancementState ??= { usedExpressions: [] };
  if (!state.usedExpressions.includes(expression)) {
    state.usedExpressions.push(expression);
  }
};

const expressionUsed = (
  run: RunState,
  expression: AdvancementExpressionId,
): boolean =>
  run.battle?.advancementState?.usedExpressions.includes(expression) ?? false;

const defeatedWithBurning = (
  run: RunState,
  defeatedEnemyIds: readonly string[],
): { enemy: Combatant; burning: StatusEffect } | null => {
  const defeated = new Set(defeatedEnemyIds);
  for (const enemy of run.battle?.enemies ?? []) {
    if (!defeated.has(enemy.id)) continue;
    const burning = statusFor(enemy, "burning");
    if (burning && burning.turns > 0) return { enemy, burning };
  }
  return null;
};

const decantRemainder = (
  run: RunState,
  source: Combatant,
  burning: StatusEffect,
): boolean => {
  if (
    !hasAdvancementRule(run.player, "decant-the-remainder") ||
    expressionUsed(run, "decant-the-remainder")
  ) return false;

  const recovered = Math.min(
    2,
    burning.turns,
    run.player.maxSpirit - run.player.spirit,
  );
  if (recovered <= 0) return false;
  run.player.spirit += recovered;
  markExpressionUsed(run, "decant-the-remainder");
  addLog(
    run.battle!,
    witnessMessage(
      "player",
      `${source.name} fails before the cold reduction is spent. ${run.player.name} draws the remainder under glass and recovers ${recovered} Spirit.`,
    ),
  );
  return true;
};

const carryReduction = (
  run: RunState,
  source: Combatant,
  burning: StatusEffect,
): boolean => {
  if (
    !hasAdvancementRule(run.player, "carry-the-reduction") ||
    expressionUsed(run, "carry-the-reduction")
  ) return false;

  const candidates = livingEnemies(run.battle!);
  const target = candidates.find((enemy) => !statusFor(enemy, "burning")) ??
    candidates[0];
  if (!target) return false;
  addOrRefreshStatus(target, { ...burning });
  markExpressionUsed(run, "carry-the-reduction");
  addLog(
    run.battle!,
    witnessMessage(
      "player",
      `Cold flame leaves ${source.name} unfinished and enters ${target.name}. The reduction continues for ${burning.turns} ${burning.turns === 1 ? "round" : "rounds"}.`,
    ),
  );
  return true;
};

export const resolveRendererResidue = (
  run: RunState,
  defeatedEnemyIds: readonly string[],
): void => {
  if (run.player.tradition !== "thaumaturgist" || !run.battle) return;
  const residue = defeatedWithBurning(run, defeatedEnemyIds);
  if (!residue) return;
  if (decantRemainder(run, residue.enemy, residue.burning)) return;
  carryReduction(run, residue.enemy, residue.burning);
};
