import { hasAdvancementRule } from "../../advancements";
import type { Combatant, RunState, WitnessSegment } from "../../types";
import { witnessMessage } from "../../witness";
import { spendPreparation } from "../../campaign-preparations";
import {
  addLog,
  addOrRefreshStatus,
  grantWard,
} from "../../engine/combat-state";
import {
  BASE_SEAL_CAPACITY,
  createGraveWardenBattleState,
} from "./practice-state";
import type {
  GraveWardenBattleState,
  ThresholdSealState,
} from "./types";

export const MAX_BREACH_RECOVERIES = 2;

export const graveWardenBattleState = (
  run: RunState,
): GraveWardenBattleState | null =>
  run.player.tradition === "grave-warden" && run.battle
    ? run.battle.practiceStates?.graveWarden ?? null
    : null;

const requireGraveWardenBattleState = (
  run: RunState,
): GraveWardenBattleState | null => {
  if (run.player.tradition !== "grave-warden" || !run.battle) return null;
  run.battle.practiceStates ??= {};
  return (run.battle.practiceStates.graveWarden ??=
    createGraveWardenBattleState());
};

export const initializeGraveWardenBattle = (run: RunState): void => {
  if (run.player.tradition !== "grave-warden" || !run.battle) return;
  run.battle.practiceStates ??= {};
  const state = createGraveWardenBattleState();
  run.battle.practiceStates.graveWarden = state;
  if (
    run.battle.encounterId === "saint-orra" &&
    run.flags.includes("grave-warden-road-seal") &&
    !run.flags.includes("preparation-spent:grave-warden-road-seal")
  ) {
    const target = run.battle.enemies[0];
    if (!target) return;
    state.seals.push({
      id: state.nextSealId,
      targetId: target.id,
      integrity: 1,
      maxIntegrity: 1,
      breached: false,
    });
    state.nextSealId += 1;
    state.sealsPlaced = 1;
    spendPreparation(run, "grave-warden-road-seal");
    addLog(
      run.battle,
      witnessMessage(
        "player",
        `The line kept from the road closes once around ${target.name}. One fold stands between its custody and breach.`,
      ),
    );
  }
};

const sealCapacity = (run: RunState): number =>
  run.practiceStates?.graveWarden?.sealCapacity ?? BASE_SEAL_CAPACITY;

export const thresholdSealFor = (
  run: RunState,
  targetId: string,
): ThresholdSealState | undefined =>
  graveWardenBattleState(run)?.seals.find(
    (seal) => seal.targetId === targetId,
  );

export const thresholdSealUnavailableReason = (
  run: RunState,
  targetId?: string,
): string | null => {
  const state = graveWardenBattleState(run);
  if (!state) return "Only a Grave Warden can set a threshold seal.";
  if (state.sealsPlaced >= sealCapacity(run)) {
    return "Both field seals have already been committed in this encounter.";
  }
  if (
    targetId &&
    state.seals.some((seal) => seal.targetId === targetId)
  ) {
    return "That enemy already bears a threshold seal. Follow or close it before setting another.";
  }
  return null;
};

export const setThresholdSeal = (
  run: RunState,
  target: Combatant,
): void => {
  const battle = run.battle;
  const state = requireGraveWardenBattleState(run);
  if (!battle || !state) return;

  if (
    state.sealsPlaced >= sealCapacity(run) ||
    state.seals.some((seal) => seal.targetId === target.id)
  ) return;

  const invitation = hasAdvancementRule(
    run.player,
    "invitation-to-breach",
  );
  const integrity = invitation ? 1 : 2;
  state.seals.push({
    id: state.nextSealId,
    targetId: target.id,
    integrity,
    maxIntegrity: integrity,
    breached: false,
  });
  state.nextSealId += 1;
  state.sealsPlaced += 1;

  const event = witnessMessage(
    "player",
    `${run.player.name} closes a measured line around ${target.name}. The threshold seal will break after ${integrity === 1 ? "one trespass" : "two trespasses"}.`,
  );
  if (invitation) {
    event.segments.push({
      type: "skill",
      skill: "Invitation to Breach",
      effect:
        "the seal is left deliberately thin; whatever crosses it will disclose its footing.",
    });
  }
  addLog(battle, event);
};

export const resolveThresholdSealBreach = (
  run: RunState,
  enemy: Combatant,
): void => {
  const battle = run.battle;
  const state = requireGraveWardenBattleState(run);
  const seal = state?.seals.find(
    (candidate) =>
      candidate.targetId === enemy.id && candidate.integrity > 0,
  );
  if (!battle || !state || !seal) return;

  seal.integrity -= 1;
  seal.breached = true;
  const invitation = hasAdvancementRule(
    run.player,
    "invitation-to-breach",
  );
  const segments: WitnessSegment[] = [];

  if (invitation) {
    addOrRefreshStatus(enemy, { id: "exposed", potency: 1, turns: 2 });
    segments.push({
      type: "skill",
      skill: "Invitation to Breach",
      effect: `${enemy.name} crosses the weakened line and stands Exposed 1 for 2 rounds.`,
    });
  } else {
    const ward = grantWard(run.player, 1);
    segments.push({
      type: "text",
      text:
        ward.gained > 0
          ? `${enemy.name} crosses the seal. One fold closes behind the attack as ${ward.gained} Ward around ${run.player.name}; Ward rises from ${ward.before} to ${ward.after}. The attack continues.`
          : `${enemy.name} crosses the seal. One fold closes behind the attack, but no more Ward can settle around ${run.player.name}. The attack continues.`,
    });
  }

  if (
    seal.integrity === 0 &&
    state.breachRecoveries < MAX_BREACH_RECOVERIES &&
    run.player.spirit < run.player.maxSpirit
  ) {
    run.player.spirit += 1;
    state.breachRecoveries += 1;
    segments.push({
      type: "text",
      text: `The completed seal releases 1 Spirit back to ${run.player.name}.`,
    });
  }

  segments.push({
    type: "text",
    text:
      seal.integrity > 0
        ? `One fold of the seal remains, holding a record of the crossing.`
        : `The spent seal retains the enemy’s crossing.`,
  });
  addLog(battle, { tone: "player", segments });
};

export interface BreachAnswer {
  bonusDamage: number;
  detail?: string;
}

export const breachAnswerBonusFor = (
  run: RunState,
  targetId: string,
): number =>
  graveWardenBattleState(run)?.seals.some(
    (seal) => seal.targetId === targetId && seal.breached,
  )
    ? 3
    : 0;

export const commitBreachAnswer = (
  run: RunState,
  target: Combatant,
): BreachAnswer => {
  const state = requireGraveWardenBattleState(run);
  const index = state?.seals.findIndex(
    (seal) => seal.targetId === target.id && seal.breached,
  );
  if (!state || index === undefined || index < 0) return { bonusDamage: 0 };

  state.seals.splice(index, 1);
  return {
    bonusDamage: 3,
    detail:
      "The force follows the enemy’s recorded crossing, adding 3 damage before the seal loses the route",
  };
};

export const closeGateUnavailableReason = (
  run: RunState,
  targetId?: string,
): string | null => {
  if (!hasAdvancementRule(run.player, "closed-gate")) {
    return "Closed Gate has not been prepared.";
  }
  const state = graveWardenBattleState(run);
  const liveSeal = state?.seals.some((seal) => seal.integrity > 0);
  if (!liveSeal) return "No unbroken threshold seal remains to close.";
  if (
    targetId &&
    !state?.seals.some(
      (seal) => seal.targetId === targetId && seal.integrity > 0,
    )
  ) {
    return "The selected enemy bears no unbroken seal to close.";
  }
  return null;
};

export const closeTheGate = (run: RunState, target: Combatant): void => {
  const battle = run.battle;
  const state = requireGraveWardenBattleState(run);
  const index = state?.seals.findIndex(
    (seal) => seal.targetId === target.id && seal.integrity > 0,
  );
  if (!battle || !state || index === undefined || index < 0) return;

  state.seals.splice(index, 1);
  const ward = grantWard(run.player, 4);
  addLog(battle, {
    tone: "player",
    segments: [
      {
        type: "skill",
        skill: "Closed Gate",
        effect:
          ward.gained > 0
            ? `${run.player.name} folds the untested seal inward as ${ward.gained} Ward.`
            : `${run.player.name} closes the untested seal. Full Ward leaves its protection nowhere to settle.`,
      },
    ],
  });
};

export const graveWardenBattleSummary = (run: RunState): string | null => {
  const state = graveWardenBattleState(run);
  if (!state) return null;
  const live = state.seals.filter((seal) => seal.integrity > 0).length;
  const breached = state.seals.filter((seal) => seal.breached).length;
  return `Threshold seals: ${live} standing · ${breached} crossings recorded · ${Math.max(0, sealCapacity(run) - state.sealsPlaced)} uncommitted.`;
};
