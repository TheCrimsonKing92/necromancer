import { isCombatantStanding } from "./anatomy";
import {
  enemyTechniqueIdFor,
  legacyCadenceIdFor,
} from "./enemy-actions/cadences";
import type {
  EnemyAttackSpec,
  EnemyIntent,
} from "./enemy-actions/contracts";
import { ENEMY_TECHNIQUES } from "./enemy-actions/techniques";
import type { BattleState, Combatant } from "./types";

export type {
  EnemyAttackSpec,
  EnemyIntent,
} from "./enemy-actions/contracts";
export { validateEnemyActionCatalogs } from "./enemy-actions/cadences";

export const enemyAttackFor = (
  enemy: Combatant,
  round: number,
): EnemyAttackSpec => {
  const technique: EnemyAttackSpec =
    ENEMY_TECHNIQUES[
      enemyTechniqueIdFor(
        enemy.cadenceId ?? legacyCadenceIdFor(enemy.id),
        round,
      )
    ];
  return technique.exposed
    ? { ...technique, exposed: { ...technique.exposed } }
    : { ...technique };
};

const intentEffects = (attack: EnemyAttackSpec): string[] => {
  const effects: string[] = [
    `${attack.damageType === "occult" ? "Occult" : "Physical"} attack`,
  ];
  if ((attack.traumaBonus ?? 0) >= 2) {
    effects.push("High wound risk");
  } else if ((attack.traumaBonus ?? 0) > 0) {
    effects.push("Raised wound risk");
  }
  if (attack.exposed) {
    effects.push(
      `Exposes ${attack.exposed.potency} for ${attack.exposed.turns} rounds on hit`,
    );
  }
  if (attack.spiritDrain) {
    effects.push(
      `Drains ${attack.spiritDrain} Spirit through damage`,
    );
  }
  if (attack.wardCompanions) {
    effects.push(
      `Grants ${attack.wardCompanions} Ward to companions`,
    );
  }
  return effects;
};

export const enemyIntentFor = (
  enemy: Combatant,
  round: number,
): EnemyIntent => {
  const attack = enemyAttackFor(enemy, round);
  return {
    enemyId: enemy.id,
    enemyName: enemy.name,
    action: attack.name,
    telegraph: attack.telegraph,
    damageType: attack.damageType ?? "physical",
    effects: intentEffects(attack),
  };
};

export const enemyIntentsFor = (
  battle: BattleState,
): EnemyIntent[] =>
  battle.enemies
    .filter(isCombatantStanding)
    .map((enemy) => enemyIntentFor(enemy, battle.round));
