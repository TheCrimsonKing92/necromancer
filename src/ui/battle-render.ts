import {
  allWounds,
  bodyConditionPercentage,
  isCombatantStanding,
} from "../game/anatomy";
import {
  advancementModifier,
  advancementSourcesForAction,
} from "../game/advancements";
import { braceWardFromAttributes } from "../game/character";
import { ACTIONS, getPlayerActionIds } from "../game/content";
import {
  breachAnswerBonusFor,
  graveWardenBattleSummary,
} from "../game/content-packs/grave-warden-runtime";
import {
  enemyIntentsFor,
  type EnemyIntent,
} from "../game/enemy-actions";
import { WAKE_VARIANTS } from "../game/encounters";
import {
  effectiveOccultPower,
  getActionUnavailableReason,
  getFleeChance,
  getHitChance,
  getLivingEnemies,
  heldSpiritAvailable,
  eligibleWoundResponses,
  playerBattleActionIds,
  workedAroundChoiceRequired,
  woundResponseLabel,
} from "../game/engine";
import {
  ITEMS,
  equippedWeapon,
  offHandStrikeDamage,
} from "../game/items";
import type {
  ActionId,
  Combatant,
  GameState,
  Player,
} from "../game/types";
import {
  percentage,
  renderBattleSummary,
  renderPlayerAside,
  renderStatuses,
} from "./combatant-render";
import { escapeHtml } from "./html";
import { renderMissingState } from "./missing-state-render";
import type { RenderContext } from "./render-context";
import {
  loadedServantDirectionRequired,
  renderLoadedServantCommands,
  renderLoadedServantDossier,
} from "./bonebinder-surface-loader";
import {
  renderBattleLog,
  renderBattleLogPatchMarkup,
  type BattleLogPatchMarkup,
} from "./battle-log-render";

export { renderBattleLog } from "./battle-log-render";

const renderEnemy = (
  enemy: Combatant,
  selectedTargetId: string | undefined,
  intent: EnemyIntent | undefined,
): string => {
  const selected = enemy.id === selectedTargetId;
  const defeated = !isCombatantStanding(enemy);
  const wounds = allWounds(enemy);
  const manifestation = enemy.anatomy === "manifestation";
  const formRule =
    enemy.materiality === "incorporeal"
      ? "Incorporeal · sheds half of physical damage"
      : "Corporeal";

  return `
    <button
      class="enemy-card ${selected ? "is-selected" : ""} ${defeated ? "is-defeated" : ""}"
      type="button"
      data-action="select-target"
      data-target-id="${escapeHtml(enemy.id)}"
      aria-pressed="${selected}"
      ${defeated ? "disabled" : ""}
    >
      <span class="enemy-card__target">${selected ? "Targeted" : defeated ? "Defeated" : "Choose target"}</span>
      <span class="enemy-card__name">${escapeHtml(enemy.name)}</span>
      <span class="enemy-card__title">${escapeHtml(enemy.title)}</span>
      <span class="enemy-card__health">
        <span style="--meter-fill: ${percentage(enemy.hp, enemy.maxHp) / 100}"></span>
      </span>
      <span class="enemy-card__numbers">${enemy.hp} / ${enemy.maxHp} Health${enemy.ward > 0 ? ` · ${enemy.ward} Ward` : ""}</span>
      <span class="enemy-card__injury">${escapeHtml(formRule)} · ${bodyConditionPercentage(enemy)}% ${manifestation ? "form" : "body"} condition · ${wounds.length} ${wounds.length === 1 ? manifestation ? "disruption" : "wound" : manifestation ? "disruptions" : "wounds"}</span>
      ${renderStatuses(enemy)}
      ${
        intent
          ? `<span class="enemy-intent">
              <span class="enemy-intent__label">Next action</span>
              <strong>${escapeHtml(intent.action)}</strong>
              <span class="enemy-intent__telegraph">${escapeHtml(intent.telegraph)}</span>
              <span class="enemy-intent__effects">${intent.effects.map((effect) => escapeHtml(effect)).join(" · ")}</span>
            </span>`
          : ""
      }
    </button>
  `;
};

const actionDescriptionForPlayer = (
  player: Player,
  actionId: ActionId,
): string => {
  const action = ACTIONS[actionId];

  if (actionId === "strike") {
    const weapon = equippedWeapon(player);
    const offHand = offHandStrikeDamage(player);
    const offHandItem =
      offHand > 0 && player.equipment.offHand
        ? ITEMS[player.equipment.offHand]
        : null;
    const pairedStrike =
      offHandItem && offHand > 0
        ? ` ${offHandItem.name} follows from the off hand for +${offHand}, bringing the strike to ${weapon.baseDamage + offHand}.`
        : "";
    return `${weapon.strikeLead} for ${weapon.baseDamage} base ${weapon.damageType} damage.${pairedStrike} Accuracy is tested; the act is free.`;
  }

  if (actionId === "guard") {
    const criticalWard =
      player.hp * 2 < player.maxHp
        ? advancementModifier(player, "brace-critical-ward")
        : 0;
    const ward =
      braceWardFromAttributes(player.attributes) + criticalWard;
    const needed = Math.max(0, ward - player.ward);
    return needed > 0
      ? `Set your breath and stance against the next blow: raise Ward by ${needed}, to the Brace threshold of ${ward}${criticalWard > 0 ? " while you are below half Health" : ""}. Repeated uses do not stack it.`
      : `Your ${player.ward} Ward already meets the Brace threshold of ${ward}; bracing again adds no Ward.`;
  }

  if (actionId === "black-tonic") {
    const power = ITEMS["black-tonic"].consumable?.power ?? 10;
    const healing = Math.min(power, player.maxHp - player.hp);
    return healing > 0
      ? `Drink bitter spirits, iron, and poppy to restore ${healing} Health now. Wounds remain.`
      : "Your Health is already full. Drinking it now would not mend any wound.";
  }

  if (actionId === "spirit-lash") {
    const ward = 1 + advancementModifier(player, "spirit-lash-ward");
    const damage =
      (ACTIONS[actionId].attack?.baseDamage ?? 0) +
      advancementModifier(player, "spirit-lash-damage");
    return `Drive a borrowed soul through one enemy with ${damage} base occult damage. On a hit, draw ${ward} Ward from the crossing.`;
  }

  if (actionId === "borrowed-might") {
    const wardBuffer = advancementModifier(
      player,
      "borrowed-might-ward-buffer",
    );
    const buffered = wardBuffer > 0 ? Math.min(2, player.ward) : 0;
    return `Invite a dead strength the body can barely hold. Deal severe occult damage.${wardBuffer > 0 ? ` Your present Ward would take ${buffered} of the 2 strain first; any remainder costs Health and torso condition and may leave spirit-bruised ribs.` : " Lose up to 2 Health and torso condition; the first use also leaves spirit-bruised ribs that require safe rest."}`;
  }

  if (actionId === "raise-shade") {
    const duration = 3 + advancementModifier(player, "shade-duration");
    const attack =
      Math.max(2, effectiveOccultPower(player) - 1) +
      advancementModifier(player, "shade-attack");
    const finalService =
      advancementModifier(player, "shade-final-service") > 0;
    return `Give a roadside dead enough shape for ${duration} rounds. It rises with ${attack} Attack and reaches for the weakest enemy after you act.${finalService ? " When its time expires, it attacks once more before losing shape." : ""}`;
  }

  if (actionId === "grave-salt") {
    const quench =
      advancementModifier(
        player,
        "grave-salt-quench-burning",
      ) > 0;
    return `Salt certainty out of one enemy; on a hit, reduce its Defense and Evasion for 3 rounds.${quench ? " A Burning target loses the status and adds its remaining damage to the blow, up to 6." : ""}`;
  }

  if (actionId === "corpsefire") {
    const damage =
      (ACTIONS[actionId].attack?.baseDamage ?? 0) +
      advancementModifier(player, "corpsefire-base-damage");
    const duration =
      2 + advancementModifier(player, "corpsefire-duration");
    const exposed = advancementModifier(
      player,
      "corpsefire-exposed",
    );
    const blocksRecovery =
      advancementModifier(
        player,
        "corpsefire-block-recovery",
      ) > 0;
    return `Unstopper cold grave-light: on a hit, deal ${damage} base occult damage and burn the target for ${duration} rounds${blocksRecovery ? ", preventing Health recovery while it burns" : ""}${exposed > 0 ? `, also inflicting Exposed ${exposed} for the same duration` : ""}.`;
  }

  return action.description;
};

const battleActionDescription = (
  state: GameState,
  actionId: ActionId,
): string => {
  const action = ACTIONS[actionId];
  const baseDescription = state.run
    ? actionDescriptionForPlayer(state.run.player, actionId)
    : action.description;
  return actionId === "flee" && state.run
    ? `${baseDescription} Current chance: ${getFleeChance(state.run.player)}%.`
    : baseDescription;
};

const battleActionHitChance = (
  state: GameState,
  actionId: ActionId,
  target: Combatant | undefined,
): number | null => {
  const action = ACTIONS[actionId];
  if (
    !action.requiresTarget ||
    (actionId !== "strike" && !action.attack) ||
    !target ||
    !state.run
  ) return null;
  const damageType =
    actionId === "strike"
      ? equippedWeapon(state.run.player).damageType
      : (action.attack?.damageType ?? "occult");
  return getHitChance(state.run.player, target, damageType);
};

const renderAction = (
  state: GameState,
  actionId: ActionId,
  target: Combatant | undefined,
): string => {
  const action = ACTIONS[actionId];
  const unavailableReason = getActionUnavailableReason(
    state,
    actionId,
    target?.id,
  );
  const targetReason =
    action.requiresTarget && !target ? "Choose a living enemy first." : null;
  const disabledReason = unavailableReason ?? targetReason;
  const baseDescription = battleActionDescription(state, actionId);
  const crossingBonus =
    actionId === "answer-the-breach" && target && state.run
      ? breachAnswerBonusFor(state.run, target.id)
      : 0;
  const description = crossingBonus > 0
    ? `${baseDescription} You have this enemy’s crossing recorded: +${crossingBonus} damage. Committing the act erases the record.`
    : baseDescription;
  const hitChance = battleActionHitChance(
    state,
    actionId,
    target,
  );
  const sources = state.run
    ? advancementSourcesForAction(state.run.player, actionId)
    : [];

  if (actionId === "field-splint" && state.run) {
    const wounds = eligibleWoundResponses(state.run.player);
    return `
      <div class="combat-action combat-action--wound-response">
        <span class="combat-action__top"><strong>Field Splint</strong><span>1 binding</span></span>
        <span class="combat-action__description">${escapeHtml(description)}</span>
        ${
          disabledReason
            ? `<span class="combat-action__unavailable">Unavailable · ${escapeHtml(disabledReason)}</span>`
            : `<span class="combat-action__choices">${wounds.map((wound) => `<button type="button" data-action="battle-action" data-action-id="field-splint" data-wound-id="${escapeHtml(wound.id)}">Brace ${escapeHtml(woundResponseLabel(state.run!.player, wound))}</button>`).join("")}</span>`
        }
      </div>
    `;
  }

  return `
    <button
      class="combat-action ${action.tradition ? "combat-action--tradition" : ""}"
      type="button"
      data-action="battle-action"
      data-action-id="${action.id}"
      ${disabledReason ? "disabled" : ""}
    >
      <span class="combat-action__top">
        <strong>${escapeHtml(action.shortLabel)}</strong>
        <span>${action.spiritCost > 0 ? `${action.spiritCost} Spirit` : "free"}</span>
      </span>
      <span class="combat-action__description">${escapeHtml(description)}${
        hitChance === null
          ? ""
          : ` <span class="combat-action__hit-chance">Current hit chance: <span data-target-hit-chance>${hitChance}</span>%.</span>`
      }</span>
      ${disabledReason ? `<span class="combat-action__unavailable">Unavailable · ${escapeHtml(disabledReason)}</span>` : ""}
      ${
        sources.length > 0
          ? `<span class="combat-action__sources"><span>${sources.length === 1 ? "Discipline" : "Disciplines"}</span>${sources.map((source) => escapeHtml(source.name)).join(" · ")}</span>`
          : ""
      }
    </button>
  `;
};

export const battleTargetDescriptionUpdates = (
  state: GameState,
  selectedTargetId: string | undefined,
): { actionId: ActionId; hitChance: number }[] => {
  const run = state.run;
  if (!run) return [];

  const living = getLivingEnemies(state);
  const selectedTarget =
    living.find((enemy) => enemy.id === selectedTargetId) ?? living[0];

  return playerBattleActionIds(
    run.player,
    getPlayerActionIds(run.player.tradition),
  ).flatMap((actionId) =>
    ACTIONS[actionId].requiresTarget &&
      (actionId === "strike" || Boolean(ACTIONS[actionId].attack))
      ? [
          {
            actionId,
            hitChance:
              battleActionHitChance(
                state,
                actionId,
                selectedTarget,
              ) ?? 0,
          },
        ]
      : [],
  );
};

export const renderBattleActionGrid = (
  state: GameState,
  selectedTargetId: string | undefined,
): string => {
  const run = state.run;
  if (!run) return "";
  const pending = run.battle?.advancementState?.pendingPlayerAction;
  if (pending) {
    const action = ACTIONS[pending.actionId];
    const target = run.battle?.enemies.find(
      (enemy) => enemy.id === pending.targetId,
    );
    return `
      <div class="combat-reaction" role="group" aria-label="Abort the Working">
        <p class="combat-reaction__eyebrow">Abort the Working</p>
        <h3>${escapeHtml(pending.hit ? "The working will take hold." : "The working has gone wide.")}</h3>
        <p>${escapeHtml(`${action.label}${target ? ` against ${target.name}` : ""} has been tested. Break it now, or permit its consequences.`)}</p>
        <div class="combat-reaction__actions">
          <button type="button" data-action="pending-player-action" data-decision="continue">Let it proceed</button>
          <button type="button" data-action="pending-player-action" data-decision="abort">Abort it</button>
        </div>
      </div>
    `;
  }
  if (run.battle && workedAroundChoiceRequired(run.player, run.battle)) {
    const wounds = eligibleWoundResponses(run.player);
    return `
      <div class="combat-reaction" role="group" aria-label="Worked Around">
        <p class="combat-reaction__eyebrow">Worked Around</p>
        <h3>Choose what the body will refuse.</h3>
        <p>One wound may be worked around for this encounter. If its part is called upon, recovery will take longer.</p>
        <div class="combat-reaction__actions combat-reaction__actions--wounds">
          ${wounds.map((wound) => `<button type="button" data-action="worked-around-choice" data-wound-id="${escapeHtml(wound.id)}">${escapeHtml(woundResponseLabel(run.player, wound))}</button>`).join("")}
          <button type="button" data-action="worked-around-choice">Leave them as they are</button>
        </div>
      </div>
    `;
  }

  const mercy = run.battle?.advancementState?.departureRecovery?.mercyTokens ?? 0;
  const spiritRoom = Math.max(0, run.player.maxSpirit - run.player.spirit);
  const redeemable = Math.min(mercy, spiritRoom);
  const mercyControl = mercy > 0
    ? `<div class="combat-reaction combat-reaction--mercy">
        <p class="combat-reaction__eyebrow">Bank the Departure · Mercy ${mercy} / 2</p>
        <p>${redeemable > 0 ? `${redeemable} held ${redeemable === 1 ? "departure can" : "departures can"} return as Spirit before you act.` : "Your Spirit has no room for what is held."}</p>
        ${redeemable > 0 ? `<div class="combat-reaction__actions"><button type="button" data-action="redeem-mercy" data-amount="1">Redeem 1</button>${redeemable > 1 ? `<button type="button" data-action="redeem-mercy" data-amount="${redeemable}">Redeem all</button>` : ""}</div>` : ""}
      </div>`
    : "";

  const living = getLivingEnemies(state);
  const selectedTarget =
    living.find((enemy) => enemy.id === selectedTargetId) ?? living[0];

  return mercyControl + playerBattleActionIds(
    run.player,
    getPlayerActionIds(run.player.tradition),
  )
    .map((actionId) => renderAction(state, actionId, selectedTarget))
    .join("");
};

const renderBattleDecision = (
  state: GameState,
  selectedTargetId: string | undefined,
): string => {
  const run = state.run;
  const battle = run?.battle;
  if (!run || !battle) return "";
  const preActReaction = Boolean(
    battle.advancementState?.pendingPlayerAction ||
      workedAroundChoiceRequired(run.player, battle),
  );
  const directionRequired =
    loadedServantDirectionRequired(state) && !preActReaction;
  const servantCommands = renderLoadedServantCommands(
    state,
    selectedTargetId,
  );
  const actionSection = directionRequired
    ? ""
    : `<section class="action-section" aria-labelledby="action-heading">
        <div class="section-heading">
          <h2 id="action-heading" data-action-heading tabindex="-1">${preActReaction ? "Before you act" : "Choose your act"}</h2>
          <span>${preActReaction ? "Settle what is already in motion" : "Enemies act after every action"}</span>
        </div>
        <div class="action-grid">
          ${renderBattleActionGrid(state, selectedTargetId)}
        </div>
        ${battle.log.length > 0 ? `<a class="latest-exchange-link" href="#witness-latest">Read the latest exchange ↓</a>` : ""}
      </section>`;

  return `<div data-battle-decision>
    ${preActReaction ? actionSection : servantCommands}
    ${preActReaction ? servantCommands : actionSection}
  </div>`;
};

export const renderBattleDirectionPatchMarkup = (
  state: GameState,
  context: RenderContext,
  logAlreadyRendered: boolean,
): { decision: string; log: BattleLogPatchMarkup } => {
  const living = getLivingEnemies(state);
  const selectedTargetId = living.some(
    (enemy) => enemy.id === context.selectedTargetId,
  )
    ? context.selectedTargetId
    : living[0]?.id;
  return {
    decision: renderBattleDecision(state, selectedTargetId),
    log: renderBattleLogPatchMarkup(state, logAlreadyRendered),
  };
};

export const renderBattle = (
  state: GameState,
  context: RenderContext,
): string => {
  const run = state.run;
  const battle = run?.battle;
  if (!run || !battle) return renderMissingState();

  const living = getLivingEnemies(state);
  const selectedTargetId = living.some(
    (enemy) => enemy.id === context.selectedTargetId,
  )
    ? context.selectedTargetId
    : living[0]?.id;
  const intents = new Map(
    enemyIntentsFor(battle).map((intent) => [intent.enemyId, intent]),
  );
  const allyNotes = battle.allies.map(
    (ally) =>
      ally.lifetime.kind === "temporary"
        ? `${ally.name} · ${ally.lifetime.remainingTurns} ${ally.lifetime.remainingTurns === 1 ? "round" : "rounds"} remain`
        : `${ally.name} · persistent corporeal servant · ${ally.hp} / ${ally.maxHp} Health`,
  );
  if (heldSpiritAvailable(run.player, battle)) {
    allyNotes.unshift("Held Measure · 1 Spirit reserved");
  }
  const mercy = battle.advancementState?.departureRecovery?.mercyTokens ?? 0;
  if (mercy > 0) allyNotes.unshift(`Mercy · ${mercy} / 2 held`);
  const thresholdSummary = graveWardenBattleSummary(run);
  if (thresholdSummary) allyNotes.unshift(thresholdSummary);
  const wakeVariant = battle.variantId
    ? WAKE_VARIANTS[battle.variantId]
    : null;
  const battleEyebrow =
    battle.encounterId === "saint-orra"
      ? "Saint Orra’s Vault"
      : battle.encounterId === "black-mile-wake"
        ? wakeVariant?.eyebrow ?? "Black Mile · What Followed"
        : "Ossuary Road";
  const battleTitle =
    battle.encounterId === "saint-orra"
      ? "Every debt wants a body."
      : battle.encounterId === "black-mile-wake"
        ? wakeVariant?.battleTitle ??
          "The Black Mile finishes what the vault began."
        : "Violence has the floor.";
  return `
    <main class="battle-page">
      <section class="battle-main">
        ${renderBattleSummary(run.player)}
        <div class="battle-heading">
          <div>
            <p class="eyebrow">${escapeHtml(battleEyebrow)} · Round ${battle.round}</p>
            <h1 data-page-title tabindex="-1">${escapeHtml(battleTitle)}</h1>
          </div>
          <span class="turn-seal" aria-label="Round ${battle.round}">${String(battle.round).padStart(2, "0")}</span>
        </div>

        <section class="enemy-section" aria-labelledby="enemy-heading">
          <div class="section-heading">
            <h2 id="enemy-heading">Opposition</h2>
            <span>${living.length} standing</span>
          </div>
          <div class="enemy-grid ${battle.enemies.length === 1 ? "enemy-grid--single" : ""}">
            ${battle.enemies
              .map((enemy) =>
                renderEnemy(
                  enemy,
                  selectedTargetId,
                  intents.get(enemy.id),
                ),
              )
              .join("")}
          </div>
        </section>

        ${renderBattleDecision(state, selectedTargetId)}
        ${renderLoadedServantDossier(state)}

        ${renderBattleLog(state)}
      </section>
      ${renderPlayerAside(run.player, allyNotes)}
    </main>
  `;
};
