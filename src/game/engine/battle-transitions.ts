import { fleePenaltyFromWounds } from "../anatomy";
import { fleeChanceFromAttributes } from "../character";
import { ACTIONS, getPlayerActionIds } from "../content";
import { WAKE_VARIANTS } from "../encounters";
import { itemCount } from "../items";
import { rollInteger } from "../random";
import { witnessMessage } from "../witness";
import { synchronizeCampaignContinuity } from "../campaign-continuity";
import {
  allocateServantCommand,
  completeServantCommand,
  getServantCommandUnavailableReason,
  servantDirectionRequiredFor,
  syncPersistentServantFromBattle,
} from "../content-packs/bonebinder-runtime";
import type { ServantCommandId } from "../practices/bonebinder/types";
import type {
  ActionId,
  BattleState,
  Combatant,
  EngineResult,
  GameState,
  Player,
} from "../types";
import {
  finishBattleIfNeeded,
  resolveAllies,
  resolveEnemyTurn,
  settleCombatEffects,
  tickRoundStatuses,
} from "./battle-lifecycle";
import {
  recoverSpiritFromDefeats,
  redeemBattleMercy,
} from "./departure-recovery";
import { addLog, livingEnemies } from "./combat-state";
import { requireTarget, usePlayerAction } from "./player-actions";
import {
  advancementBattleState,
  canCommitActionSpirit,
  clearPendingPlayerAction,
  commitActionSpirit,
  markAbortUsed,
  pendingAttackCheck,
  prepareAbortableAction,
} from "./action-contingency";
import {
  applyFieldSplint,
  chooseWorkedAroundWound,
  fieldSplintUnavailableReason,
  playerBattleActionIds,
  recordWorkedAroundUse,
} from "./wound-response";
import {
  closeGateUnavailableReason,
  thresholdSealUnavailableReason,
} from "../content-packs/grave-warden-runtime";

const standingEnemyIds = (battle: BattleState): string[] =>
  livingEnemies(battle).map((enemy) => enemy.id);

const defeatedSince = (
  battle: BattleState,
  standingBefore: readonly string[],
): string[] => {
  const standing = new Set(standingEnemyIds(battle));
  return standingBefore.filter((id) => !standing.has(id));
};

export const getActionUnavailableReason = (
  state: GameState,
  actionId: ActionId,
  targetId?: string,
): string | null => {
  const run = state.run;
  const battle = run?.battle;
  const action = ACTIONS[actionId];

  if (state.screen !== "battle" || !run || !battle || battle.outcome) {
    return "No active battle.";
  }

  if (advancementBattleState(battle).pendingPlayerAction) {
    return "Resolve the suspended working first.";
  }

  const servantName = servantDirectionRequiredFor(run);
  if (servantName) return `Direct ${servantName} before taking your act.`;

  if (
    !playerBattleActionIds(
      run.player,
      getPlayerActionIds(run.player.tradition),
    ).includes(actionId)
  ) {
    return "Your practice cannot use that action.";
  }

  if (
    action.tradition &&
    action.tradition !== run.player.tradition
  ) {
    return "Your practice cannot use that action.";
  }

  if (!canCommitActionSpirit(run.player, action.spiritCost)) {
    return `Requires ${action.spiritCost} Spirit.`;
  }

  if (
    actionId === "black-tonic" &&
    itemCount(run.player.inventory, "black-tonic") < 1
  ) {
    return "No black tonic remains.";
  }

  if (actionId === "black-tonic" && run.player.hp >= run.player.maxHp) {
    return "You are already at full Health.";
  }

  if (actionId === "field-splint") {
    return fieldSplintUnavailableReason(run.player, battle);
  }

  if (actionId === "set-threshold-seal") {
    return thresholdSealUnavailableReason(run, targetId);
  }

  if (actionId === "close-the-gate") {
    return closeGateUnavailableReason(run, targetId);
  }

  return null;
};

export const getFleeChance = (player: Player): number =>
  Math.max(
    10,
    fleeChanceFromAttributes(player.attributes) -
      fleePenaltyFromWounds(player),
  );

const escapeWitness = (
  battle: BattleState,
  success: boolean,
): string => {
  if (battle.encounterId === "saint-orra") {
    return success
      ? "You shoulder through the jawbone stair before the counting room can close its mouth. Saint Orra keeps the vault; you keep your name."
      : "The jawbone walls bite down on the stair. Every exit recites the balance still owed.";
  }
  if (battle.encounterId === "black-mile-wake") {
    const variant = battle.variantId
      ? WAKE_VARIANTS[battle.variantId]
      : null;
    if (variant) {
      return success
        ? variant.escapeSuccess
        : variant.escapeFailure;
    }
  }
  return success
    ? "You reach the ditch, crawl through the grave silt, and leave the toll collectors behind in the rain."
    : "The hound cuts off the ditch. Your escape costs the turn.";
};

export const resolveBattleAction = (
  state: GameState,
  actionId: ActionId,
  targetId?: string,
): EngineResult => {
  const unavailable = getActionUnavailableReason(state, actionId, targetId);
  if (unavailable) return { state, error: unavailable };

  const next = structuredClone(state);
  const run = next.run;
  const battle = run?.battle;
  if (!run || !battle) {
    return { state, error: "No active battle." };
  }

  const action = ACTIONS[actionId];
  const target = requireTarget(battle, targetId);
  if (action.requiresTarget && !target) {
    return { state, error: "Choose a living enemy first." };
  }

  const commitment = commitActionSpirit(
    run.player,
    battle,
    action.spiritCost,
  );
  if (commitment.usedHeldMeasure) {
    addLog(
      battle,
      witnessMessage(
        "player",
        `${run.player.name} breaks the held measure. What was kept apart completes the working.`,
      ),
    );
  }

  if (prepareAbortableAction(battle, run.player, actionId, target)) {
    return { state: next };
  }

  recordWorkedAroundUse(run.player, battle, actionId);

  if (actionId === "field-splint") {
    const result = applyFieldSplint(run.player, battle, targetId);
    if (result.error || !result.wound) {
      return { state, error: result.error ?? "The splint could not be set." };
    }
    addLog(
      battle,
      witnessMessage(
        "player",
        `${run.player.name} binds ${result.wound.label.toLowerCase()} against the work ahead. The limb holds for now; its recovery will not be hurried.`,
      ),
    );
    const standingBeforeAllies = standingEnemyIds(battle);
    resolveAllies(run);
    recoverSpiritFromDefeats(
      run,
      defeatedSince(battle, standingBeforeAllies),
    );
    if (finishBattleIfNeeded(next)) {
      return { state: next };
    }
  } else if (actionId === "flee") {
    const attempt = rollInteger(battle.seed, 1, 100);
    battle.seed = attempt.seed;

    const escapeChance = getFleeChance(run.player);

    if (attempt.value <= escapeChance) {
      settleCombatEffects(battle, run.player);
      syncPersistentServantFromBattle(run, true);
      completeServantCommand(run);
      battle.outcome = "fled";
      addLog(
        battle,
        witnessMessage(
          "system",
          escapeWitness(battle, true),
        ),
      );
      next.screen = "ending";
      next.ending = "fled";
      next.storyId = null;
      synchronizeCampaignContinuity(next);
      return { state: next };
    }

    addLog(
      battle,
      witnessMessage(
        "system",
        escapeWitness(battle, false),
      ),
    );
  } else {
    const standingBeforeAction = standingEnemyIds(battle);
    usePlayerAction(run, actionId, target);
    resolveAllies(run);
    recoverSpiritFromDefeats(
      run,
      defeatedSince(battle, standingBeforeAction),
    );

    if (finishBattleIfNeeded(next)) {
      return { state: next };
    }
  }

  const standingBeforeStatuses = standingEnemyIds(battle);
  resolveEnemyTurn(run);
  tickRoundStatuses(run);
  recoverSpiritFromDefeats(
    run,
    defeatedSince(battle, standingBeforeStatuses),
  );

  if (!finishBattleIfNeeded(next)) {
    battle.round += 1;
  }

  return { state: next };
};

export const resolveWorkedAroundChoice = (
  state: GameState,
  woundId?: string,
): EngineResult => {
  const next = structuredClone(state);
  const run = next.run;
  const battle = run?.battle;
  if (next.screen !== "battle" || !run || !battle) {
    return { state, error: "No active battle." };
  }
  const result = chooseWorkedAroundWound(run.player, battle, woundId);
  if (result.error) return { state, error: result.error };
  addLog(
    battle,
    witnessMessage(
      "player",
      result.wound
        ? `${run.player.name} denies ${result.wound.label.toLowerCase()} its accustomed motion. Another movement will bear the strain.`
        : `${run.player.name} leaves every wound to its ordinary burden.`,
    ),
  );
  return { state: next };
};

export const resolvePendingPlayerAction = (
  state: GameState,
  decision: "continue" | "abort",
): EngineResult => {
  const pending = state.run?.battle?.advancementState?.pendingPlayerAction;
  if (state.screen !== "battle" || !state.run?.battle || !pending) {
    return { state, error: "No working awaits a decision." };
  }

  const next = structuredClone(state);
  const run = next.run!;
  const battle = run.battle!;
  const committed = pendingAttackCheck(battle);
  const target = requireTarget(battle, pending.targetId);
  if (!committed || !target) {
    clearPendingPlayerAction(battle);
    return { state: next, error: "The suspended target is no longer present." };
  }

  if (decision === "abort") {
    markAbortUsed(battle);
    addLog(
      battle,
      witnessMessage(
        "player",
        `${run.player.name} withholds the ending stroke. The working parts without taking hold.`,
      ),
    );
  } else {
    clearPendingPlayerAction(battle);
    const standingBeforeAction = standingEnemyIds(battle);
    recordWorkedAroundUse(run.player, battle, pending.actionId);
    usePlayerAction(run, pending.actionId, target, committed);
    resolveAllies(run);
    recoverSpiritFromDefeats(
      run,
      defeatedSince(battle, standingBeforeAction),
    );
    if (finishBattleIfNeeded(next)) {
      return { state: next };
    }
  }

  if (decision === "abort") {
    const standingBeforeAllies = standingEnemyIds(battle);
    resolveAllies(run);
    recoverSpiritFromDefeats(
      run,
      defeatedSince(battle, standingBeforeAllies),
    );
    if (finishBattleIfNeeded(next)) {
      return { state: next };
    }
  }
  const standingBeforeStatuses = standingEnemyIds(battle);
  resolveEnemyTurn(run);
  tickRoundStatuses(run);
  recoverSpiritFromDefeats(
    run,
    defeatedSince(battle, standingBeforeStatuses),
  );
  if (!finishBattleIfNeeded(next)) battle.round += 1;
  return { state: next };
};

export const resolveMercyRedemption = (
  state: GameState,
  requested: number,
): EngineResult => {
  if (
    state.screen !== "battle" ||
    !state.run?.battle ||
    state.run.battle.outcome ||
    state.run.battle.advancementState?.pendingPlayerAction
  ) {
    return { state, error: "Mercy cannot be redeemed now." };
  }
  const next = structuredClone(state);
  const result = redeemBattleMercy(next.run!, requested);
  return result.error
    ? { state, error: result.error }
    : { state: next };
};

export const resolveServantBattleCommand = (
  state: GameState,
  commandId: ServantCommandId,
  targetId?: string,
): EngineResult => {
  const unavailable = getServantCommandUnavailableReason(
    state,
    commandId,
    targetId,
  );
  if (unavailable) return { state, error: unavailable };

  const next = structuredClone(state);
  const run = next.run;
  if (!run?.battle) return { state, error: "No active battle." };
  if (!allocateServantCommand(run, commandId, targetId)) {
    return { state, error: "The command could not be allocated." };
  }
  return { state: next };
};

export const getLivingEnemies = (
  state: GameState,
): Combatant[] =>
  state.run?.battle ? livingEnemies(state.run.battle) : [];
