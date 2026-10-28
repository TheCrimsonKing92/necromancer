import {
  advancementModifier,
  advancementSources,
} from "../advancements";
import { createBody, createWound, isCombatantStanding } from "../anatomy";
import { braceWardFromAttributes } from "../character";
import { effectiveOccultPower, statusFor } from "../combat-math";
import { damageWitness } from "../combat-witness";
import {
  dealActionDamage,
  dealDamage,
  type AttackCheck,
} from "../damage-resolution";
import {
  ITEMS,
  equippedWeapon,
  offHandStrikeDamage,
  removeItem,
} from "../items";
import { witnessMessage } from "../witness";
import {
  closeTheGate,
  commitBreachAnswer,
  setThresholdSeal,
} from "../content-packs/grave-warden-runtime";
import type {
  ActionId,
  AdvancementId,
  Ally,
  BattleState,
  Combatant,
  RunState,
  StatusEffect,
  TemporaryAlly,
  WitnessSegment,
} from "../types";
import {
  MAX_WARD,
  addLog,
  addOrRefreshStatus,
  advancementWitnessSegments,
  grantWard,
  recoverHealth,
  spiritLashWardWitness,
} from "./combat-state";

export const requireTarget = (
  battle: BattleState,
  targetId: string | undefined,
): Combatant | undefined =>
  targetId
    ? battle.enemies.find(
        (enemy) => enemy.id === targetId && isCombatantStanding(enemy),
      )
    : undefined;

export const usePlayerAction = (
  run: RunState,
  actionId: ActionId,
  target: Combatant | undefined,
  committedCheck?: AttackCheck,
): void => {
  const battle = run.battle;
  if (!battle) return;

  switch (actionId) {
    case "strike": {
      if (!target) return;
      const weapon = equippedWeapon(run.player);
      const offHandDamage = offHandStrikeDamage(run.player);
      const offHandItemId = run.player.equipment.offHand;
      const offHand = offHandItemId
        ? ITEMS[offHandItemId]
        : undefined;
      const result = dealDamage(
        battle,
        run.player,
        target,
        weapon.baseDamage + offHandDamage,
        weapon.damageType,
        weapon.name,
        weapon.traumaBonus,
        weapon.injuryProfile,
        committedCheck,
      );
      addLog(
        battle,
        damageWitness(
          "player",
          weapon.name,
          run.player,
          target,
          result,
          [],
          offHandDamage > 0 && offHand
            ? `${offHand.name} follows close behind, adding ${offHandDamage} damage to the committed strike`
            : undefined,
        ),
      );
      break;
    }
    case "guard": {
      const wardBefore = run.player.ward;
      const criticalWard =
        run.player.hp * 2 < run.player.maxHp
          ? advancementModifier(
              run.player,
              "brace-critical-ward",
            )
          : 0;
      const braceThreshold =
        braceWardFromAttributes(run.player.attributes) + criticalWard;
      run.player.ward = Math.max(
        run.player.ward,
        Math.min(MAX_WARD, braceThreshold),
      );
      const wardGained = run.player.ward - wardBefore;
      addLog(
        battle,
        witnessMessage(
          "player",
          wardGained > 0
            ? `${run.player.name} makes a hard stillness of the body and raises ${wardGained} Ward.`
            : `${run.player.name} settles behind the Ward already raised. Brace adds no further protection.`,
        ),
      );
      if (criticalWard > 0 && wardGained > 0) {
        addLog(battle, {
          tone: "player",
          segments: advancementWitnessSegments(
            run.player,
            "brace-critical-ward",
            () =>
              `pain strips the stance to what still holds; its threshold rises by ${criticalWard}.`,
          ),
        });
      }
      break;
    }
    case "black-tonic": {
      const tonic = ITEMS["black-tonic"];
      const healing = tonic.consumable?.power ?? 10;
      const healed = recoverHealth(run.player, healing);
      removeItem(run.player.inventory, "black-tonic");
      addLog(
        battle,
        witnessMessage(
          "player",
          healed > 0
            ? `${run.player.name} drinks the black tonic and recovers ${healed} Health.`
            : `${run.player.name} drinks the black tonic, but no Health returns.`,
        ),
      );
      break;
    }
    case "spirit-lash": {
      if (!target) return;
      const wardBefore = run.player.ward;
      const damageBonus = advancementModifier(
        run.player,
        "spirit-lash-damage",
      );
      const result = dealActionDamage(
        battle,
        run.player,
        target,
        "spirit-lash",
        "Spirit Lash",
        damageBonus,
        committedCheck,
      );
      const wardDraw =
        1 + advancementModifier(run.player, "spirit-lash-ward");
      const wardGrant = result.hit
        ? grantWard(run.player, wardDraw)
        : {
            before: wardBefore,
            requested: wardDraw,
            gained: 0,
            after: wardBefore,
          };
      const wardSources = advancementSources(
        run.player,
        "spirit-lash-ward",
      );
      const wardWitness: WitnessSegment =
        wardSources.length > 0
          ? {
              type: "skill",
              skill: wardSources
                .map((definition) => definition.name)
                .join(" / "),
              effect: spiritLashWardWitness(
                run.player,
                wardGrant,
              ),
            }
          : {
              type: "text",
              text: spiritLashWardWitness(
                run.player,
                wardGrant,
              ),
            };
      addLog(
        battle,
        damageWitness(
          "player",
          "Spirit Lash",
          run.player,
          target,
          result,
          result.hit
            ? [
                wardWitness,
                ...advancementWitnessSegments(
                  run.player,
                  "spirit-lash-damage",
                  (amount) =>
                    `the returning soul passes through twice; its second departure drives ${amount} more force into the wound.`,
                ),
              ]
            : [],
        ),
      );
      break;
    }
    case "borrowed-might": {
      if (!target) return;
      const result = dealActionDamage(
        battle,
        run.player,
        target,
        "borrowed-might",
        "Borrowed Might",
        0,
        committedCheck,
      );
      const torso = run.player.body.torso;
      const wardBuffer = advancementModifier(
        run.player,
        "borrowed-might-ward-buffer",
      );
      const wardSpent =
        wardBuffer > 0 ? Math.min(2, run.player.ward) : 0;
      run.player.ward -= wardSpent;
      const strain = Math.min(
        2 - wardSpent,
        Math.max(0, run.player.hp - 1),
        Math.max(0, torso.condition - 1),
      );
      run.player.hp -= strain;
      torso.condition -= strain;
      const existingStrain = torso.wounds.some(
        (wound) => wound.source === "Borrowed Might",
      );
      if (strain > 0 && !existingStrain) {
        const wound = createWound(
          `w${battle.nextWoundId}`,
          "torso",
          "minor",
          "Borrowed Might",
          "Spirit-bruised ribs",
          "humanoid",
          "rest",
        );
        battle.nextWoundId += 1;
        torso.wounds.push(wound);
      }
      addLog(
        battle,
        damageWitness(
          "player",
          "Borrowed Might",
          run.player,
          target,
          result,
          [
            ...advancementWitnessSegments(
              run.player,
              "borrowed-might-ward-buffer",
              () =>
                wardSpent > 0
                  ? `${wardSpent} Ward takes the dead weight before it reaches ${run.player.name}’s body.`
                  : "no Ward stands ready to take the dead weight.",
            ),
            {
              type: "text",
              text:
                strain <= 0
                  ? `${run.player.name} keeps the borrowed strength outside the flesh.`
                  : existingStrain
                    ? `The borrowed body buckles again: ${run.player.name} loses ${strain} Health and torso condition. The old spirit-bruise deepens without opening another wound.`
                    : `The borrowed body buckles: ${run.player.name} loses ${strain} Health and torso condition. Spirit-bruised ribs will need a safe rest before they can close.`,
            },
          ],
        ),
      );
      break;
    }
    case "raise-shade": {
      const durationBonus = advancementModifier(
        run.player,
        "shade-duration",
      );
      const attackBonus = advancementModifier(
        run.player,
        "shade-attack",
      );
      const duration = 3 + durationBonus;
      const attack =
        Math.max(2, effectiveOccultPower(run.player) - 1) +
        attackBonus;
      const bindingSources = new Map<
        AdvancementId,
        WitnessSegment
      >();
      for (const modifier of [
        "shade-attack",
        "shade-duration",
      ] as const) {
        for (const definition of advancementSources(
          run.player,
          modifier,
        )) {
          bindingSources.set(definition.id, {
            type: "skill",
            skill: definition.name,
            effect: `the binding holds farther from your body; the shade rises with ${attack} Attack and ${duration} rounds of borrowed shape.`,
          });
        }
      }
      const existing = battle.allies.find(
        (ally): ally is TemporaryAlly =>
          ally.id === "bound-shade" &&
          ally.lifetime.kind === "temporary",
      );
      if (existing) {
        existing.attack = attack;
        existing.lifetime.remainingTurns = duration;
        addLog(battle, {
          tone: "player",
          segments: [
            {
              type: "text",
              text: `${run.player.name} binds the fraying shade for ${duration} more rounds.`,
            },
            ...bindingSources.values(),
          ],
        });
      } else {
        const shade: Ally = {
          id: "bound-shade",
          name: "Bound shade",
          kind: "ally",
          title: "Conscripted dead",
          anatomy: "manifestation",
          materiality: "incorporeal",
          materialityLabel: "The shade’s borrowed outline",
          hp: 1,
          maxHp: 1,
          attack,
          defense: 0,
          ward: 0,
          statuses: [],
          body: createBody(0.35),
          naturalArmor: {},
          lifetime: {
            kind: "temporary",
            remainingTurns: duration,
          },
        };
        battle.allies.push(shade);
        addLog(battle, {
          tone: "player",
          segments: [
            {
              type: "text",
              text: `${run.player.name} gives a roadside ghost enough shape to hate.`,
            },
            ...bindingSources.values(),
          ],
        });
      }
      break;
    }
    case "soul-tithe": {
      if (!target) return;
      const result = dealActionDamage(
        battle,
        run.player,
        target,
        "soul-tithe",
        "Soul Tithe",
        0,
        committedCheck,
      );
      const healed = result.hit
        ? recoverHealth(run.player, 3)
        : 0;
      addLog(
        battle,
        damageWitness(
          "player",
          "Soul Tithe",
          run.player,
          target,
          result,
          result.hit
            ? [
                {
                  type: "text",
                  text:
                    healed > 0
                      ? `${healed} Health follows the tithe back to ${run.player.name}.`
                      : `The tithe returns empty; no Health reaches ${run.player.name}.`,
                },
              ]
            : [],
        ),
      );
      break;
    }
    case "grave-salt": {
      if (!target) return;
      const burning = statusFor(target, "burning");
      const canQuench =
        advancementModifier(
          run.player,
          "grave-salt-quench-burning",
        ) > 0;
      const quenchDamage =
        canQuench && burning
          ? Math.min(6, burning.potency * burning.turns)
          : 0;
      const result = dealActionDamage(
        battle,
        run.player,
        target,
        "grave-salt",
        "Grave Salt",
        quenchDamage,
        committedCheck,
      );
      const followUp: WitnessSegment[] = [];
      if (result.hit && burning && canQuench) {
        target.statuses = target.statuses.filter(
          (status) => status !== burning,
        );
        followUp.push(
          ...advancementWitnessSegments(
            run.player,
            "grave-salt-quench-burning",
            () =>
              `salt collapses the remaining cold flame into the blow, adding ${quenchDamage} force; Burning ends.`,
          ),
        );
      }
      if (result.hit && isCombatantStanding(target)) {
        const exposed: StatusEffect = {
          id: "exposed",
          turns: 3,
          potency: 2,
        };
        addOrRefreshStatus(target, exposed);
        followUp.push({
          type: "status",
          lead: "Its defenses blister away:",
          target: target.name,
          status: exposed.id,
          potency: exposed.potency,
          turns: exposed.turns,
        });
      }
      addLog(
        battle,
        damageWitness(
          "player",
          "Grave Salt",
          run.player,
          target,
          result,
          followUp,
        ),
      );
      break;
    }
    case "corpsefire": {
      if (!target) return;
      const baseDamageAdjustment = advancementModifier(
        run.player,
        "corpsefire-base-damage",
      );
      const result = dealActionDamage(
        battle,
        run.player,
        target,
        "corpsefire",
        "Corpsefire",
        baseDamageAdjustment,
        committedCheck,
      );
      const followUp: WitnessSegment[] = [];
      if (result.hit && isCombatantStanding(target)) {
        const duration =
          2 +
          advancementModifier(
            run.player,
            "corpsefire-duration",
          );
        const blocksRecovery =
          advancementModifier(
            run.player,
            "corpsefire-block-recovery",
          ) > 0;
        const burning: StatusEffect = {
          id: "burning",
          turns: duration,
          potency: 2,
          ...(blocksRecovery
            ? { preventsHealthRecovery: true }
            : {}),
        };
        addOrRefreshStatus(target, burning);
        followUp.push({
          type: "status",
          lead: "Cold flame clings to the wound:",
          target: target.name,
          status: burning.id,
          potency: burning.potency,
          turns: burning.turns,
        });
        followUp.push(
          ...advancementWitnessSegments(
            run.player,
            "corpsefire-duration",
            (amount) =>
              blocksRecovery
                ? `the reduced flame settles deeper; for ${amount} additional ${amount === 1 ? "round" : "rounds"}, the wound cannot close around it.`
                : `the visible fire fails, but cold flame remains in the wound for ${amount} additional ${amount === 1 ? "round" : "rounds"}.`,
          ),
        );
        const exposedPotency = advancementModifier(
          run.player,
          "corpsefire-exposed",
        );
        if (exposedPotency > 0) {
          const exposed: StatusEffect = {
            id: "exposed",
            turns: duration,
            potency: exposedPotency,
          };
          addOrRefreshStatus(target, exposed);
          followUp.push(
            ...advancementWitnessSegments(
              run.player,
              "corpsefire-exposed",
              (amount) =>
                `white ash settles in the corpsefire’s wake around ${target.name}: Exposed ${amount} for ${duration} ${duration === 1 ? "round" : "rounds"} (-${amount} Defense).`,
            ),
          );
        }
      }
      addLog(
        battle,
        damageWitness(
          "player",
          "Corpsefire",
          run.player,
          target,
          result,
          followUp,
        ),
      );
      break;
    }
    case "set-threshold-seal": {
      if (!target) return;
      setThresholdSeal(run, target);
      break;
    }
    case "answer-the-breach": {
      if (!target) return;
      const answer = commitBreachAnswer(run, target);
      const result = dealActionDamage(
        battle,
        run.player,
        target,
        "answer-the-breach",
        "Follow the Crossing",
        answer.bonusDamage,
        committedCheck,
      );
      addLog(
        battle,
        damageWitness(
          "player",
          "Follow the Crossing",
          run.player,
          target,
          result,
          answer.bonusDamage > 0 && !result.hit
            ? [
                {
                  type: "text",
                  text: "The seal loses its record of the crossing.",
                },
              ]
            : [],
          answer.detail,
        ),
      );
      break;
    }
    case "close-the-gate": {
      if (!target) return;
      closeTheGate(run, target);
      break;
    }
    case "flee":
      break;
  }
};
