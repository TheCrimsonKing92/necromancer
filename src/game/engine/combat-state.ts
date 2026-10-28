import {
  advancementModifier,
  advancementSources,
} from "../advancements";
import { isCombatantStanding } from "../anatomy";
import { statusFor } from "../combat-math";
import { appendWitness } from "../witness";
import type {
  AdvancementModifierId,
  BattleState,
  Combatant,
  Player,
  StatusEffect,
  WitnessEvent,
  WitnessSegment,
} from "../types";

export const MAX_WARD = 12;

export interface WardGrant {
  before: number;
  requested: number;
  gained: number;
  after: number;
}

export const grantWard = (
  combatant: Combatant,
  requested: number,
): WardGrant => {
  const before = combatant.ward;
  const safeRequest = Math.max(0, requested);
  const after = Math.min(MAX_WARD, before + safeRequest);
  combatant.ward = after;
  return {
    before,
    requested: safeRequest,
    gained: after - before,
    after,
  };
};

export const additiveWardWitness = (
  source: string,
  grant: WardGrant,
): string => {
  if (grant.gained === grant.requested) {
    return `${source} adds ${grant.gained} Ward, raising your total from ${grant.before} to ${grant.after}.`;
  }
  if (grant.gained > 0) {
    return `${source} can settle only ${grant.gained} of its promised ${grant.requested} Ward, raising your total from ${grant.before} to the limit of ${grant.after}.`;
  }
  return `${source} finds your Ward already full at ${grant.after}.`;
};

export const spiritLashWardWitness = (
  player: Player,
  grant: WardGrant,
): string => {
  const crossing =
    grant.requested > 1
      ? "Both wakes seal behind the lash"
      : "The wake seals behind the lash";
  const measure =
    grant.requested > 1
      ? `${grant.requested} Ward in all`
      : `${grant.requested} Ward`;

  if (grant.gained === grant.requested) {
    return `${crossing}, leaving ${measure}. ${player.name}’s Ward rises from ${grant.before} to ${grant.after}.`;
  }
  if (grant.gained > 0) {
    return `${crossing}, but only ${grant.gained} of its ${grant.requested} Ward can settle. ${player.name}’s Ward rises from ${grant.before} to the limit of ${grant.after}.`;
  }
  return `${crossing}, but ${player.name}’s Ward is already full at ${grant.after}.`;
};

export const addLog = (
  battle: BattleState,
  event: WitnessEvent,
): void => appendWitness(battle, event);

export const advancementWitnessSegments = (
  player: Player,
  modifier: AdvancementModifierId,
  effect: (amount: number) => string,
): WitnessSegment[] =>
  advancementSources(player, modifier).map((definition) => ({
    type: "skill",
    skill: definition.name,
    effect: effect(
      definition.effect.modifiers?.[modifier] ?? 0,
    ),
  }));

export const addOrRefreshStatus = (
  combatant: Combatant,
  incoming: StatusEffect,
): void => {
  const existing = statusFor(combatant, incoming.id);

  if (!existing) {
    combatant.statuses.push({ ...incoming });
    return;
  }

  existing.turns = Math.max(existing.turns, incoming.turns);
  existing.potency = Math.max(existing.potency, incoming.potency);
  existing.preventsHealthRecovery =
    existing.preventsHealthRecovery ||
    incoming.preventsHealthRecovery;
};

export const isVaultBattle = (battle: BattleState): boolean =>
  battle.encounterId === "saint-orra";

export const isWakeBattle = (battle: BattleState): boolean =>
  battle.encounterId === "black-mile-wake";

export const livingEnemies = (
  battle: BattleState,
): Combatant[] => battle.enemies.filter(isCombatantStanding);

export const recoverHealth = (
  combatant: Combatant,
  requested: number,
): number => {
  if (
    requested <= 0 ||
    combatant.statuses.some(
      (status) => status.preventsHealthRecovery && status.turns > 0,
    )
  ) {
    return 0;
  }
  const recovered = Math.min(
    requested,
    combatant.maxHp - combatant.hp,
  );
  combatant.hp += recovered;
  return recovered;
};

export const recoverSpiritFromDefeats = (
  player: Player,
  defeated: number,
): {
  recovered: number;
  bonusRecovered: number;
  overflow: number;
  wardGained: number;
} => {
  if (defeated <= 0 || !isCombatantStanding(player)) {
    return {
      recovered: 0,
      bonusRecovered: 0,
      overflow: 0,
      wardGained: 0,
    };
  }

  const bonusPerEnemy = advancementModifier(player, "mercy-spirit");
  const potential = defeated * (1 + bonusPerEnemy);
  const spiritBefore = player.spirit;
  player.spirit = Math.min(
    player.maxSpirit,
    player.spirit + potential,
  );
  const recovered = player.spirit - spiritBefore;
  const overflow = Math.max(0, potential - recovered);
  const wardConversion = advancementModifier(
    player,
    "overflow-spirit-ward",
  );
  const wardGained =
    wardConversion > 0
      ? grantWard(
          player,
          Math.min(
            defeated * 2,
            overflow * wardConversion,
          ),
        ).gained
      : 0;
  const baseRecovered = Math.min(
    defeated,
    player.maxSpirit - spiritBefore,
  );
  return {
    recovered,
    bonusRecovered: Math.max(0, recovered - baseRecovered),
    overflow,
    wardGained,
  };
};
