import { allWounds, woundEffects } from "../anatomy";
import { hasAdvancementRule } from "../advancements";
import { getBodyPartLabel } from "../anatomy";
import { itemCount, removeItem } from "../items";
import type {
  ActionId,
  BattleState,
  Player,
  Wound,
} from "../types";
import { advancementBattleState } from "./action-contingency";

const hasNumericalPenalty = (wound: Wound): boolean => {
  const effects = woundEffects(wound);
  return (
    effects.attackPenalty > 0 ||
    effects.defensePenalty > 0 ||
    effects.fleePenalty > 0
  );
};

export const eligibleWoundResponses = (player: Player): Wound[] =>
  allWounds(player).filter(
    (wound) =>
      (wound.part === "leftArm" ||
        wound.part === "rightArm" ||
        wound.part === "leftLeg" ||
        wound.part === "rightLeg") &&
      hasNumericalPenalty(wound),
  );

export const playerBattleActionIds = (
  player: Player,
  base: ActionId[],
): ActionId[] => {
  const actions = [...base.slice(0, -1)];
  if (hasAdvancementRule(player, "closed-gate")) {
    actions.push("close-the-gate");
  }
  if (hasAdvancementRule(player, "field-splint")) {
    actions.push("field-splint");
  }
  actions.push(base.at(-1)!);
  return actions;
};

export const fieldSplintUnavailableReason = (
  player: Player,
  battle: BattleState,
): string | null => {
  if (!hasAdvancementRule(player, "field-splint")) {
    return "Field Splint has not been learned.";
  }
  if (advancementBattleState(battle).fieldSplintUsed) {
    return "Field Splint has already been used in this encounter.";
  }
  if (itemCount(player.inventory, "linen-binding") < 1) {
    return "No clean linen binding remains.";
  }
  if (eligibleWoundResponses(player).length === 0) {
    return "No penalized arm or leg wound can be braced.";
  }
  return null;
};

export const applyFieldSplint = (
  player: Player,
  battle: BattleState,
  woundId: string | undefined,
): { wound?: Wound; error?: string } => {
  const unavailable = fieldSplintUnavailableReason(player, battle);
  if (unavailable) return { error: unavailable };
  const wound = eligibleWoundResponses(player).find(
    (candidate) => candidate.id === woundId,
  );
  if (!wound) return { error: "Choose an eligible arm or leg wound." };

  removeItem(player.inventory, "linen-binding");
  wound.combatPenaltyReduction = Math.max(
    1,
    wound.combatPenaltyReduction ?? 0,
  );
  wound.combatPenaltyReductionTurns = 2;
  wound.recoveryBurden = (wound.recoveryBurden ?? 0) + 1;
  advancementBattleState(battle).fieldSplintUsed = true;
  return { wound };
};

export const workedAroundChoiceRequired = (
  player: Player,
  battle: BattleState,
): boolean => {
  const state = advancementBattleState(battle);
  return (
    hasAdvancementRule(player, "worked-around") &&
    !state.workedAroundResolved &&
    eligibleWoundResponses(player).length > 0
  );
};

export const chooseWorkedAroundWound = (
  player: Player,
  battle: BattleState,
  woundId?: string,
): { wound?: Wound; error?: string } => {
  if (!workedAroundChoiceRequired(player, battle)) {
    return { error: "No wound awaits this preparation." };
  }
  const state = advancementBattleState(battle);
  if (!woundId) {
    state.workedAroundResolved = true;
    return {};
  }
  const wound = eligibleWoundResponses(player).find(
    (candidate) => candidate.id === woundId,
  );
  if (!wound) return { error: "Choose an eligible wound." };
  wound.combatPenaltyReduction = Math.max(
    1,
    wound.combatPenaltyReduction ?? 0,
  );
  delete wound.combatPenaltyReductionTurns;
  state.workedAroundWoundId = wound.id;
  state.workedAroundResolved = true;
  return { wound };
};

export const recordWorkedAroundUse = (
  player: Player,
  battle: BattleState,
  actionId: ActionId,
): void => {
  const state = advancementBattleState(battle);
  if (!state.workedAroundWoundId || state.workedAroundBurdenApplied) return;
  const wound = allWounds(player).find(
    (candidate) => candidate.id === state.workedAroundWoundId,
  );
  if (!wound) return;
  const usesPart =
    actionId === "strike"
      ? wound.part === "leftArm" || wound.part === "rightArm"
      : actionId === "flee"
        ? wound.part === "leftLeg" || wound.part === "rightLeg"
        : false;
  if (!usesPart) return;
  wound.recoveryBurden = (wound.recoveryBurden ?? 0) + 1;
  state.workedAroundBurdenApplied = true;
};

export const tickWoundResponses = (player: Player): void => {
  for (const wound of allWounds(player)) {
    if (wound.combatPenaltyReductionTurns === undefined) continue;
    wound.combatPenaltyReductionTurns -= 1;
    if (wound.combatPenaltyReductionTurns <= 0) {
      delete wound.combatPenaltyReduction;
      delete wound.combatPenaltyReductionTurns;
    }
  }
};

export const clearWoundResponses = (player: Player): void => {
  for (const wound of allWounds(player)) {
    delete wound.combatPenaltyReduction;
    delete wound.combatPenaltyReductionTurns;
  }
};

export const woundResponseLabel = (
  player: Player,
  wound: Wound,
): string =>
  `${wound.label} — ${getBodyPartLabel(wound.part, player.anatomy)}`;
