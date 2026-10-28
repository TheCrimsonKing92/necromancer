import { hasAdvancementRule } from "../advancements";
import { ACTIONS } from "../content";
import {
  rollAttackCheck,
  type AttackCheck,
} from "../damage-resolution";
import { equippedWeapon } from "../items";
import type {
  ActionId,
  BattleAdvancementState,
  BattleState,
  Combatant,
  Player,
} from "../types";

export const advancementBattleState = (
  battle: BattleState,
): BattleAdvancementState => {
  battle.advancementState ??= { usedExpressions: [] };
  battle.advancementState.usedExpressions ??= [];
  return battle.advancementState;
};

export const hasUsedExpression = (
  battle: BattleState,
  expression: "abort-the-working" | "held-measure",
): boolean =>
  advancementBattleState(battle).usedExpressions.includes(expression);

const useExpression = (
  battle: BattleState,
  expression: "abort-the-working" | "held-measure",
): void => {
  const used = advancementBattleState(battle).usedExpressions;
  if (!used.includes(expression)) used.push(expression);
};

export const heldSpiritAvailable = (
  player: Player,
  battle: BattleState,
): boolean =>
  player.spirit > 0 &&
  hasAdvancementRule(player, "held-measure") &&
  !hasUsedExpression(battle, "held-measure");

export const spendableSpirit = (
  player: Player,
  battle: BattleState,
): number =>
  Math.max(0, player.spirit - (heldSpiritAvailable(player, battle) ? 1 : 0));

export const canCommitActionSpirit = (
  player: Player,
  cost: number,
): boolean => player.spirit >= cost;

export const commitActionSpirit = (
  player: Player,
  battle: BattleState,
  cost: number,
): { usedHeldMeasure: boolean } => {
  const usedHeldMeasure =
    cost > spendableSpirit(player, battle) && heldSpiritAvailable(player, battle);
  player.spirit -= cost;
  if (usedHeldMeasure) useExpression(battle, "held-measure");
  return { usedHeldMeasure };
};

export const prepareAbortableAction = (
  battle: BattleState,
  player: Player,
  actionId: ActionId,
  target: Combatant | undefined,
): boolean => {
  const action = ACTIONS[actionId];
  if (
    !target ||
    !action.requiresTarget ||
    !hasAdvancementRule(player, "abort-the-working") ||
    hasUsedExpression(battle, "abort-the-working")
  ) {
    return false;
  }

  const damageType =
    actionId === "strike"
      ? equippedWeapon(player).damageType
      : action.attack?.damageType;
  if (!damageType) return false;

  const check = rollAttackCheck(battle, player, target, damageType);
  advancementBattleState(battle).pendingPlayerAction = {
    actionId,
    targetId: target.id,
    ...check,
  };
  return true;
};

export const pendingAttackCheck = (
  battle: BattleState,
): AttackCheck | undefined => {
  const pending = advancementBattleState(battle).pendingPlayerAction;
  if (
    pending?.chance === undefined ||
    pending.roll === undefined ||
    pending.hit === undefined
  ) {
    return undefined;
  }
  return {
    chance: pending.chance,
    roll: pending.roll,
    hit: pending.hit,
  };
};

export const clearPendingPlayerAction = (battle: BattleState): void => {
  delete advancementBattleState(battle).pendingPlayerAction;
};

export const markAbortUsed = (battle: BattleState): void => {
  useExpression(battle, "abort-the-working");
  clearPendingPlayerAction(battle);
};
