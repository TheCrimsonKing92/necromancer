import {
  allWounds,
  bodyConditionPercentage,
  combinedWoundEffects,
} from "../game/anatomy";
import { ADVANCEMENTS } from "../game/advancements";
import {
  ATTRIBUTES,
  ATTRIBUTE_IDS,
  MUNDANE_SKILLS,
  MUNDANE_SKILL_IDS,
  skillRankLabel,
} from "../game/character";
import { TRADITIONS } from "../game/content";
import {
  effectiveAttack,
  effectiveDefense,
  effectiveOccultPower,
  getFleeChance,
} from "../game/engine";
import {
  ITEMS,
  equippedWeapon,
  itemCount,
  offHandStrikeDamage,
} from "../game/items";
import { experienceProgress, romanLevel } from "../game/progression";
import { statusPreview } from "../game/statuses";
import type { Combatant, Player } from "../game/types";
import { escapeHtml } from "./html";
import { renderCompactKnowledgeLink } from "./knowledge-disclosure";
import {
  combinedWoundEffectLabels,
  recoveryBurdenLabel,
} from "./wound-presentation";

export const percentage = (value: number, maximum: number): number => {
  if (maximum <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / maximum) * 100)));
};

const renderMeter = (
  label: string,
  value: number,
  maximum: number,
  tone: "health" | "spirit" | "ward" | "experience",
): string => `
  <div class="meter meter--${tone}">
    <div class="meter__labels">
      <span>${escapeHtml(label)}</span>
      <strong>${value}${tone === "ward" ? "" : ` / ${maximum}`}</strong>
    </div>
    <div
      class="meter__track"
      role="progressbar"
      aria-label="${escapeHtml(label)}"
      aria-valuemin="0"
      aria-valuemax="${maximum}"
      aria-valuenow="${value}"
    >
      <span class="meter__fill" style="--meter-fill: ${percentage(value, maximum) / 100}"></span>
    </div>
  </div>
`;

export const renderStatuses = (combatant: Combatant): string =>
  combatant.statuses.length
    ? `<div class="status-list" aria-label="Status effects">
        ${combatant.statuses
          .map(
            (status) =>
              `<span class="status status--${status.id}">${escapeHtml(statusPreview(status))}</span>`,
          )
          .join("")}
      </div>`
    : "";

export const renderBattleSummary = (player: Player): string => {
  const wounds = allWounds(player);
  return `
    <section class="battle-summary" aria-label="Current combat condition">
      <div><span>Health</span><strong>${player.hp} / ${player.maxHp}</strong></div>
      <div><span>Spirit</span><strong>${player.spirit} / ${player.maxSpirit}</strong></div>
      <div><span>Ward</span><strong>${player.ward}</strong></div>
      <div><span>Wounds</span><strong>${wounds.length}</strong></div>
      ${renderStatuses(player)}
    </section>
  `;
};

export const renderPlayerAsideContents = (
  player: Player,
  allyNotes: string[] = [],
): string => {
  const wounds = allWounds(player);
  const woundImpact = combinedWoundEffects(player);
  const woundConsequences = combinedWoundEffectLabels(player);
  const weapon = equippedWeapon(player);
  const offHandDamage = offHandStrikeDamage(player);
  const offHandItemId = player.equipment.offHand;
  const offHand = offHandItemId ? ITEMS[offHandItemId] : undefined;
  const progress = experienceProgress(player);
  const disciplines = player.advancements.map((id) => ADVANCEMENTS[id]);

  return `
      <p class="eyebrow">The living instrument</p>
      <div class="dossier__title">
        <div>
          <h2>${escapeHtml(player.name)}</h2>
          <p>${escapeHtml(TRADITIONS[player.tradition].epithet)}</p>
        </div>
        <span class="level-seal" aria-label="Level ${player.level}">${romanLevel(player.level)}</span>
      </div>
      ${renderMeter("Health", player.hp, player.maxHp, "health")}
      ${renderMeter("Spirit", player.spirit, player.maxSpirit, "spirit")}
      ${player.ward > 0 ? renderMeter("Ward", player.ward, 12, "ward") : ""}
      ${renderMeter(`Experience · ${player.xp} total`, progress.earned, progress.required, "experience")}
      ${renderStatuses(player)}
      <div class="dossier__capabilities">
        <span>Attributes</span>
        <div class="capability-grid">
          ${ATTRIBUTE_IDS.map(
            (id) =>
              renderCompactKnowledgeLink({
                id: `stats-attribute-${id}`,
                label: ATTRIBUTES[id].label,
                value: String(player.attributes[id]),
                description: ATTRIBUTES[id].description,
              }),
          ).join("")}
        </div>
      </div>
      <div class="dossier__capabilities">
        <span>Mundane skills</span>
        <div class="skill-list">
          ${MUNDANE_SKILL_IDS.map(
            (id) =>
              renderCompactKnowledgeLink({
                id: `stats-skill-${id}`,
                label: MUNDANE_SKILLS[id].label,
                value: `${player.skills[id]} · ${skillRankLabel(player.skills[id])}`,
                description: MUNDANE_SKILLS[id].description,
              }),
          ).join("")}
        </div>
      </div>
      ${
        disciplines.length > 0
          ? `<div class="dossier__disciplines">
              <span>Disciplines</span>
              <ul>
                ${disciplines
                  .map(
                    (discipline) => `
                      <li>
                        <strong>${escapeHtml(discipline.name)}</strong>
                        <small>${escapeHtml(discipline.effectText)}</small>
                      </li>
                    `,
                  )
                  .join("")}
              </ul>
            </div>`
          : ""
      }
      <dl class="stat-list">
        <div><dt>Physical power</dt><dd>${effectiveAttack(player)}${woundImpact.attackPenalty > 0 ? ` <small>−${woundImpact.attackPenalty} wounds</small>` : ""}</dd></div>
        <div><dt>Occult power</dt><dd>${effectiveOccultPower(player)}${woundImpact.attackPenalty > 0 ? ` <small>−${woundImpact.attackPenalty} wounds</small>` : ""}</dd></div>
        <div><dt>Defense</dt><dd>${effectiveDefense(player)}${woundImpact.defensePenalty > 0 ? ` <small>−${woundImpact.defensePenalty} wounds</small>` : ""}</dd></div>
        <div><dt>Flee chance</dt><dd>${getFleeChance(player)}%${woundImpact.fleePenalty > 0 ? ` <small>−${woundImpact.fleePenalty} points</small>` : ""}</dd></div>
        <div><dt>Readied</dt><dd>${escapeHtml(weapon.name)}</dd></div>
        ${
          offHand
            ? `<div><dt>Off hand</dt><dd>${escapeHtml(offHand.name)}${offHandDamage > 0 ? ` <small>+${offHandDamage} strike damage</small>` : ""}</dd></div>`
            : ""
        }
        <div><dt>Body</dt><dd>${bodyConditionPercentage(player)}%</dd></div>
        <div><dt>Wounds / scars</dt><dd>${wounds.length} / ${player.scars.length}</dd></div>
        <div><dt>Black tonic</dt><dd>${itemCount(player.inventory, "black-tonic")}</dd></div>
        <div><dt>Next level</dt><dd>${progress.remaining} xp</dd></div>
      </dl>
      ${
        wounds.length > 0
          ? `<p class="${woundConsequences.length > 0 ? "dossier__warning" : "dossier__notice"}">${
              woundConsequences.length > 0
                ? `Wound effects: ${escapeHtml(woundConsequences.join(" · "))}. ${escapeHtml(recoveryBurdenLabel(player))}.`
                : `No immediate combat penalty. ${escapeHtml(recoveryBurdenLabel(player))}.`
            }</p>`
          : ""
      }
      ${allyNotes
        .map(
          (note) =>
            `<div class="ally-note"><span aria-hidden="true">✦</span>${escapeHtml(note)}</div>`,
        )
        .join("")}
  `;
};

export const renderPlayerAside = (
  player: Player,
  allyNotes: string[] = [],
): string => `
  <aside class="dossier">
    ${renderPlayerAsideContents(player, allyNotes)}
  </aside>
`;
