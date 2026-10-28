import { isCombatantStanding } from "../anatomy";
import { hasAdvancementRule } from "../advancements";
import {
  beginDepartureRecoveryBattle,
  emptyDepartureRecoveryState,
  normalizeDepartureRecoveryState,
  redeemMercyTokens,
  resolveDepartureRecovery,
  type DepartureRecoveryExpression,
} from "../departure-recovery";
import { witnessMessage } from "../witness";
import { resolveRendererResidue } from "../practices/renderer/residue";
import type { BattleState, RunState } from "../types";
import {
  MAX_WARD,
  addLog,
  advancementWitnessSegments,
  livingEnemies,
  recoverSpiritFromDefeats as recoverLegacySpirit,
} from "./combat-state";

const expressionFor = (
  run: RunState,
): DepartureRecoveryExpression | null =>
  hasAdvancementRule(run.player, "bank-the-departure")
    ? "bank-the-departure"
    : hasAdvancementRule(run.player, "open-hand")
      ? "open-hand"
      : null;

const battleKeyFor = (battle: BattleState): string => {
  const saved = normalizeDepartureRecoveryState(
    battle.advancementState?.departureRecovery,
  );
  return saved.battleKey ??
    `${battle.encounterId}:${battle.variantId ?? "ordinary"}:${battle.round}:${battle.seed}`;
};

const recoverLegacy = (run: RunState, defeated: number): void => {
  const battle = run.battle;
  if (!battle) return;
  const { recovered, bonusRecovered, overflow, wardGained } =
    recoverLegacySpirit(run.player, defeated);
  if (recovered <= 0 && wardGained <= 0) return;

  addLog(battle, {
    tone: "player",
    segments: [
      ...(recovered > 0
        ? [{
            type: "text" as const,
            text: defeated === 1
              ? `Death leaves a narrow opening. ${run.player.name} recovers ${recovered} Spirit.`
              : `The fallen leave a narrow opening. ${run.player.name} recovers ${recovered} Spirit.`,
          }]
        : []),
      ...advancementWitnessSegments(
        run.player,
        "mercy-spirit",
        () => bonusRecovered > 0
          ? `the passage remains open long enough to draw ${bonusRecovered} additional Spirit.`
          : "the passage remains open, but there is no room for what follows.",
      ),
      ...(overflow > 0
        ? advancementWitnessSegments(
            run.player,
            "overflow-spirit-ward",
            () => wardGained > 0
              ? `${overflow} Spirit finds no room within; ${wardGained} Ward closes around ${run.player.name} instead.`
              : "the remainder finds Ward already full.",
          )
        : []),
    ],
  });
};

export const recoverSpiritFromDefeats = (
  run: RunState,
  defeatedEnemyIds: readonly string[],
): void => {
  const battle = run.battle;
  if (!battle || defeatedEnemyIds.length === 0) return;
  resolveRendererResidue(run, defeatedEnemyIds);
  const savedRecovery = normalizeDepartureRecoveryState(
    battle.advancementState?.departureRecovery,
  );
  const expression = savedRecovery.expression ?? expressionFor(run);
  if (!expression) {
    recoverLegacy(run, defeatedEnemyIds.length);
    return;
  }

  const advancementState = battle.advancementState ??=
    { usedExpressions: [] };
  const current = beginDepartureRecoveryBattle(
    advancementState.departureRecovery ?? emptyDepartureRecoveryState(),
    battleKeyFor(battle),
    expression,
  );
  const resolution = resolveDepartureRecovery({
    state: current,
    battleKey: current.battleKey!,
    expression,
    defeatIds: defeatedEnemyIds,
    recipientStanding: isCombatantStanding(run.player),
    spirit: run.player.spirit,
    maxSpirit: run.player.maxSpirit,
    ward: run.player.ward,
    maxWard: MAX_WARD,
  });
  advancementState.departureRecovery = resolution.state;
  run.player.spirit = resolution.spiritAfter;
  run.player.ward = resolution.wardAfter;

  if (resolution.expression === "bank-the-departure") {
    if (livingEnemies(battle).length === 0) {
      advancementState.departureRecovery = {
        ...resolution.state,
        mercyTokens: 0,
      };
      addLog(
        battle,
        witnessMessage(
          "player",
          resolution.mercyAfter > 1
            ? `No further act remains in which to keep what waits at the threshold. ${resolution.mercyAfter} held departures cross unbanked.`
            : "The last departure lingers, but no further act remains in which to keep it. It crosses unbanked.",
        ),
      );
      return;
    }
    if (resolution.mercyAdded <= 0) return;
    addLog(
      battle,
      witnessMessage(
        "player",
        `${run.player.name} keeps ${resolution.mercyAdded} departure${resolution.mercyAdded === 1 ? "" : "s"} at the threshold. Mercy ${resolution.mercyAfter} / 2.`,
      ),
    );
    return;
  }

  if (resolution.spiritRecovered > 0) {
    addLog(
      battle,
      witnessMessage(
        "player",
        `A departure crosses ${run.player.name}’s open hand. ${resolution.spiritRecovered} Spirit returns.`,
      ),
    );
  } else if (resolution.openHandTriggered) {
    addLog(
      battle,
      witnessMessage(
        "player",
        resolution.wardGained > 0
          ? `The open hand cannot hold more Spirit. The crossing leaves ${resolution.wardGained} Ward instead.`
          : "The open hand finds Spirit and Ward already full. The crossing leaves nothing behind.",
      ),
    );
  }
};

export const redeemBattleMercy = (
  run: RunState,
  requested: number,
): { recovered: number; error?: string } => {
  const battle = run.battle;
  const state = battle?.advancementState?.departureRecovery;
  if (!battle || !state) return { recovered: 0, error: "No Mercy is held." };
  const resolution = redeemMercyTokens({
    state,
    battleKey: battleKeyFor(battle),
    phase: "player-turn-start",
    requested,
    spirit: run.player.spirit,
    maxSpirit: run.player.maxSpirit,
  });
  if (resolution.mercySpent <= 0) {
    return {
      recovered: 0,
      error: run.player.spirit >= run.player.maxSpirit
        ? "Spirit is already full."
        : "No Mercy can be redeemed.",
    };
  }
  battle.advancementState!.departureRecovery = resolution.state;
  run.player.spirit = resolution.spiritAfter;
  addLog(
    battle,
    witnessMessage(
      "player",
      `${run.player.name} releases ${resolution.mercySpent} held departure${resolution.mercySpent === 1 ? "" : "s"}. ${resolution.spiritRecovered} Spirit returns; Mercy ${resolution.mercyAfter} / 2.`,
    ),
  );
  return { recovered: resolution.spiritRecovered };
};

export const clearBattleDepartureRecovery = (battle: BattleState): void => {
  if (battle.advancementState) {
    battle.advancementState.departureRecovery = emptyDepartureRecoveryState();
  }
};
