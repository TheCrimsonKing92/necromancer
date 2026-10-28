import { advancementModifier } from "../advancements";
import {
  isCombatantStanding,
  untreatedBleeding,
} from "../anatomy";
import {
  damageWitness,
  defeatTransitionSegment,
} from "../combat-witness";
import { dealDamage } from "../damage-resolution";
import { enemyAttackFor } from "../enemy-actions";
import { WAKE_VARIANTS } from "../encounters";
import {
  VAULT_LOOT,
  VICTORY_LOOT,
  addItem,
} from "../items";
import { awardExperience } from "../progression";
import {
  witnessHealthLoss,
  witnessMessage,
  witnessReward,
  witnessStatus,
} from "../witness";
import { learnWorldFact } from "../world/state";
import { synchronizeCampaignContinuity } from "../campaign-continuity";
import {
  completeServantCommand,
  interposingServantFor,
  raisePreparedInterpositionWard,
  resolvePersistentServantCommand,
  resolveQueuedServantCounsel,
  syncPersistentServantFromBattle,
} from "../content-packs/bonebinder-runtime";
import type {
  Ally,
  BattleState,
  Combatant,
  GameState,
  Player,
  RunState,
  StatusEffect,
  TemporaryAlly,
  WitnessSegment,
} from "../types";
import {
  addLog,
  addOrRefreshStatus,
  advancementWitnessSegments,
  grantWard,
  isVaultBattle,
  isWakeBattle,
  livingEnemies,
  recoverHealth,
} from "./combat-state";
import { resolveThresholdSealBreach } from "../content-packs/grave-warden-runtime";
import {
  clearWoundResponses,
  tickWoundResponses,
} from "./wound-response";
import { clearBattleDepartureRecovery } from "./departure-recovery";

const ROAD_VICTORY_XP = 20;
const VAULT_VICTORY_XP = 35;
const WAKE_VICTORY_XP = 25;

const lowestHealthEnemy = (
  battle: BattleState,
): Combatant | undefined =>
  livingEnemies(battle).sort((left, right) => {
    if (left.hp !== right.hp) return left.hp - right.hp;
    return left.maxHp - right.maxHp;
  })[0];

interface AllyAttackSpec {
  action: string;
  witnessAction: string;
  failedHarvest: string;
  returningWarmth: string;
}

const allyAttackFor = (ally: Ally): AllyAttackSpec => {
  if (ally.anatomy === "quadruped") {
    return {
      action: "a shade’s bite",
      witnessAction: "a smoke-thin bite",
      failedHarvest:
        "the shade’s jaws close on nothing living enough to feed the leash.",
      returningWarmth: "warmth follows the shade’s teeth back along the leash",
    };
  }

  return {
    action: "a shade’s grasp",
    witnessAction: "a wordless grasp",
    failedHarvest:
      "the shade’s hand closes on nothing living enough to feed the leash.",
    returningWarmth: "warmth follows the shade’s hand back along the leash",
  };
};

const resolveAllyAttack = (
  run: RunState,
  ally: Ally,
  finalService = false,
): boolean => {
  const battle = run.battle;
  const target = battle ? lowestHealthEnemy(battle) : undefined;
  if (!battle || !target) return false;
  const attack = allyAttackFor(ally);
  const result = dealDamage(
    battle,
    ally,
    target,
    1,
    "occult",
    attack.action,
  );
  const healthReturn = advancementModifier(
    run.player,
    "shade-health-return",
  );
  const healthBefore = run.player.hp;
  if (result.damage > 0 && healthReturn > 0) {
    recoverHealth(run.player, healthReturn);
  }
  const healthRestored = run.player.hp - healthBefore;
  const followUp: WitnessSegment[] = [
    ...(healthReturn > 0
      ? advancementWitnessSegments(
          run.player,
          "shade-health-return",
          () =>
            result.damage <= 0
              ? attack.failedHarvest
              : healthRestored > 0
                ? `${attack.returningWarmth}; ${run.player.name} recovers ${healthRestored} Health.`
                : `warmth strains at the leash, but ${run.player.name} has no hunger left to fill.`,
        )
      : []),
    ...(finalService
      ? advancementWitnessSegments(
          run.player,
          "shade-final-service",
          () =>
            "the outline fails, but the last command reaches its mark before dissolution.",
        )
      : []),
  ];
  addLog(
    battle,
    damageWitness(
      "player",
      attack.witnessAction,
      ally,
      target,
      result,
      followUp,
    ),
  );
  return true;
};

export const resolveAllies = (run: RunState): void => {
  const battle = run.battle;
  if (!battle) return;

  const temporary = battle.allies.filter(
    (ally): ally is TemporaryAlly =>
      ally.lifetime.kind === "temporary",
  );
  for (const ally of temporary) {
    if (!resolveAllyAttack(run, ally)) break;
    ally.lifetime.remainingTurns -= 1;
    if (
      ally.lifetime.remainingTurns <= 0 &&
      advancementModifier(run.player, "shade-final-service") > 0
    ) {
      resolveAllyAttack(run, ally, true);
    }
  }
  const counsel = resolveQueuedServantCounsel(run);
  if (!counsel.handled) {
    resolvePersistentServantCommand(run);
  }
  if (!counsel.preserveThroughEnemyAnswer) completeServantCommand(run, true);
  syncPersistentServantFromBattle(run);

  const expired = battle.allies.filter(
    (ally) =>
      ally.lifetime.kind === "temporary" &&
      ally.lifetime.remainingTurns <= 0,
  );
  battle.allies = battle.allies.filter(
    (ally) =>
      ally.lifetime.kind === "persistent" ||
      ally.lifetime.remainingTurns > 0,
  );

  for (const ally of expired) {
    addLog(
      battle,
      witnessMessage(
        "system",
        `${ally.name} loses its shape and gutters out.`,
      ),
    );
  }
};

export const resolveEnemyTurn = (run: RunState): void => {
  const battle = run.battle;
  if (!battle) return;

  for (const enemy of livingEnemies(battle)) {
    if (!isCombatantStanding(run.player)) break;

    const attack = enemyAttackFor(enemy, battle.round);
    resolveThresholdSealBreach(run, enemy);
    const interposingServant = interposingServantFor(run);
    const target = interposingServant ?? run.player;
    if (interposingServant) {
      raisePreparedInterpositionWard(run, interposingServant);
    }
    const result = dealDamage(
      battle,
      enemy,
      target,
      attack.baseDamage,
      attack.damageType ?? "physical",
      attack.name,
      attack.traumaBonus ?? 0,
      attack.injuryProfile,
    );
    addLog(
      battle,
      damageWitness(
        "enemy",
        attack.name,
        enemy,
        target,
        result,
      ),
    );

    if (
      result.hit &&
      attack.exposed &&
      isCombatantStanding(target)
    ) {
      const exposed: StatusEffect = {
        id: "exposed",
        turns: attack.exposed.turns,
        potency: attack.exposed.potency,
      };
      addOrRefreshStatus(target, exposed);
      addLog(
        battle,
        witnessStatus("enemy", {
          lead: attack.exposed.lead,
          target: target.name,
          status: exposed.id,
          potency: exposed.potency,
          turns: exposed.turns,
        }),
      );
    }

    if (
      attack.spiritDrain &&
      result.damage > 0 &&
      target === run.player &&
      isCombatantStanding(run.player)
    ) {
      const drained = Math.min(
        attack.spiritDrain,
        run.player.spirit,
      );
      run.player.spirit -= drained;
      addLog(
        battle,
        witnessMessage(
          "enemy",
          drained > 0
            ? `The Cantor Without Tongue swallows ${drained} Spirit with the stolen syllable.`
            : "The Cantor Without Tongue searches the stolen syllable for Spirit and finds only an emptied chamber.",
        ),
      );
    }

    if (attack.wardCompanions) {
      const recipients = livingEnemies(battle).filter(
        (candidate) => candidate.id !== enemy.id,
      );
      const warded = recipients.filter((recipient) => {
        const grant = grantWard(
          recipient,
          attack.wardCompanions!,
        );
        return grant.gained > 0;
      });
      if (warded.length > 0) {
        addLog(
          battle,
          witnessMessage(
            "enemy",
            `The First Pallbearer recites the order of burial. ${warded.map((recipient) => recipient.name).join(" and ")} ${warded.length === 1 ? "draws" : "draw"} ${attack.wardCompanions} Ward from the empty bier.`,
          ),
        );
      }
    }
  }
};

const tickStatuses = (
  battle: BattleState,
  combatant: Combatant,
): void => {
  for (const status of combatant.statuses) {
    if (
      isCombatantStanding(combatant) &&
      (status.id === "bleeding" || status.id === "burning")
    ) {
      combatant.hp = Math.max(0, combatant.hp - status.potency);
      const event = witnessHealthLoss(
        combatant.kind === "enemy" ? "player" : "enemy",
        {
          target: combatant.name,
          amount: status.potency,
          cause:
            status.id === "burning" ? "burning" : "bleeding",
        },
      );
      if (!isCombatantStanding(combatant)) {
        event.segments.push(
          defeatTransitionSegment(combatant, "health"),
        );
      }
      addLog(battle, event);
    }

    status.turns -= 1;
  }

  combatant.statuses = combatant.statuses.filter(
    (status) => status.turns > 0,
  );

  const woundBleeding = untreatedBleeding(combatant);
  if (isCombatantStanding(combatant) && woundBleeding > 0) {
    combatant.hp = Math.max(0, combatant.hp - woundBleeding);
    const event = witnessHealthLoss(
      combatant.kind === "enemy" ? "player" : "enemy",
      {
        target: combatant.name,
        amount: woundBleeding,
        cause: "untreated-wounds",
      },
    );
    if (!isCombatantStanding(combatant)) {
      event.segments.push(
        defeatTransitionSegment(combatant, "health"),
      );
    }
    addLog(battle, event);
  }
};

export const tickRoundStatuses = (run: RunState): void => {
  const battle = run.battle;
  if (!battle) return;

  tickStatuses(battle, run.player);
  tickWoundResponses(run.player);
  battle.enemies.forEach((enemy) => tickStatuses(battle, enemy));
  battle.allies.forEach((ally) => tickStatuses(battle, ally));
  completeServantCommand(run, true);
  syncPersistentServantFromBattle(run);
};

export const settleCombatEffects = (
  battle: BattleState,
  player: Player,
): void => {
  const lingeringDamage = player.statuses.reduce((total, status) => {
    if (status.id === "bleeding" || status.id === "burning") {
      return total + status.potency * status.turns;
    }
    return total;
  }, 0);
  const paid = Math.min(
    lingeringDamage,
    Math.max(0, player.hp - 1),
  );

  if (paid > 0) {
    player.hp -= paid;
    addLog(
      battle,
      witnessHealthLoss("enemy", {
        target: player.name,
        amount: paid,
        cause: "lingering-trauma",
      }),
    );
  }

  player.statuses = [];
  player.ward = 0;
  clearWoundResponses(player);
  clearBattleDepartureRecovery(battle);
};

export const finishBattleIfNeeded = (
  state: GameState,
): boolean => {
  const run = state.run;
  const battle = run?.battle;
  if (!run || !battle || battle.outcome) return Boolean(battle?.outcome);

  if (!isCombatantStanding(run.player)) {
    battle.outcome = "defeat";
    const defeatText =
      battle.encounterId === "saint-orra"
        ? "The counting room closes its many jaws, and your name enters the account without appeal."
        : battle.encounterId === "black-mile-wake"
          ? battle.variantId
            ? WAKE_VARIANTS[battle.variantId].defeatTitle
            : "The Black Mile keeps what followed you from the vault."
          : "The road tilts, the rain goes quiet, and Maldirin closes over you.";
    addLog(battle, witnessMessage("system", defeatText));
    state.screen = "ending";
    state.ending = "defeat";
    state.storyId = null;
    run.player.statuses = [];
    run.player.ward = 0;
    clearWoundResponses(run.player);
    clearBattleDepartureRecovery(battle);
    completeServantCommand(run);
    syncPersistentServantFromBattle(run, true);
    synchronizeCampaignContinuity(state);
    return true;
  }

  if (livingEnemies(battle).length === 0) {
    const vaultVictory = isVaultBattle(battle);
    const wakeVictory = isWakeBattle(battle);
    const wakeVariant =
      wakeVictory && battle.variantId
        ? WAKE_VARIANTS[battle.variantId]
        : null;
    const victoryXp = wakeVictory
      ? WAKE_VICTORY_XP
      : vaultVictory
        ? VAULT_VICTORY_XP
        : ROAD_VICTORY_XP;
    const loot = wakeVariant
      ? wakeVariant.rewards
      : vaultVictory
        ? VAULT_LOOT
        : VICTORY_LOOT;
    settleCombatEffects(battle, run.player);
    completeServantCommand(run);
    syncPersistentServantFromBattle(run, true);
    battle.outcome = "victory";
    if (battle.encounterId === "ossuary-road") {
      learnWorldFact(run.world, "hollis-vane-dead");
    } else if (battle.encounterId === "saint-orra") {
      learnWorldFact(run.world, "saint-orra-unbound");
    }
    run.battlesWon += 1;
    const experience = awardExperience(run.player, victoryXp);
    for (const reward of loot) {
      addItem(
        run.player.inventory,
        reward.itemId,
        reward.quantity,
      );
    }
    addLog(
      battle,
      witnessReward({
        opening:
          wakeVariant?.victoryOpening ??
          (vaultVictory
            ? "Saint Orra’s account closes."
            : "The road is yours."),
        experience: victoryXp,
        lootVerb: vaultVictory || wakeVariant ? "take" : "salvage",
        loot: wakeVariant
          ? wakeVariant.rewards.map(
              (reward) => reward.witnessName,
            )
          : vaultVictory
            ? [
                "her grave-iron mask",
                "a saint-bone charm",
                "her last debtor’s tally",
                "two ampoules of ossuary ichor",
                "clean linen",
              ]
            : [
                "Hollis’s knife",
                "road leathers",
                "ash-hide boots",
                "clean linen",
                "two hound teeth",
              ],
        levelReached:
          experience.levelsGained > 0
            ? experience.level
            : undefined,
      }),
    );
    state.screen = "ending";
    state.ending = "victory";
    state.storyId = null;
    synchronizeCampaignContinuity(state);
    return true;
  }

  return false;
};
