import {
  allWounds,
  bodyConditionPercentage,
  combinedWoundEffects,
} from "../game/anatomy";
import {
  ATTRIBUTES,
  ATTRIBUTE_IDS,
  MUNDANE_SKILLS,
  MUNDANE_SKILL_IDS,
  skillRankLabel,
} from "../game/character";
import {
  availableDisciplinePoints,
} from "../game/advancements";
import {
  effectiveAttack,
  effectiveDefense,
  effectiveOccultPower,
  getFleeChance,
} from "../game/engine";
import { carryCapacity, carriedWeight } from "../game/items";
import { experienceProgress, romanLevel } from "../game/progression";
import type { GameState } from "../game/types";
import {
  renderAdvancementOffer,
  renderPresentedAdvancement,
} from "./advancement-render";
import { escapeHtml } from "./html";
import { renderKnowledgeDisclosure } from "./knowledge-disclosure";
import type { RenderContext } from "./render-context";
import { STAT_KNOWLEDGE } from "./stat-knowledge";

const renderResourceKnowledge = (
  id: string,
  label: string,
  value: string,
  description: string,
  detail?: string,
): string =>
  renderKnowledgeDisclosure({
    id: `stats-${id}`,
    label,
    value,
    description,
    detail,
  });

export const renderStatsSurface = (
  state: GameState,
  context: RenderContext,
): string => {
  const player = state.run?.player;
  if (!player || !context.statsOpen) return "";

  const experience = experienceProgress(player);
  const wounds = allWounds(player);
  const woundImpact = combinedWoundEffects(player);
  const disciplinePoints = availableDisciplinePoints(player);
  const pane = context.statsPane ?? "disciplines";

  return `
    <aside
      id="stats-surface"
      class="stats-surface"
      data-stats-surface
      aria-labelledby="stats-title"
    >
      <div class="stats-surface__heading">
        <div>
          <p class="eyebrow">The living instrument</p>
          <h1 id="stats-title" data-stats-title tabindex="-1">Stats &amp; disciplines</h1>
          <p>${escapeHtml(player.name)} · Level ${romanLevel(player.level)}</p>
        </div>
        <button
          class="result-card__dismiss stats-surface__close"
          type="button"
          data-action="close-stats"
          aria-label="Close stats and disciplines"
        ><span aria-hidden="true">×</span></button>
      </div>

      <nav class="stats-surface__tabs" role="tablist" aria-label="Stats sections">
        <button
          id="stats-character-tab"
          class="stats-surface__tab ${pane === "character" ? "is-selected" : ""}"
          type="button"
          role="tab"
          data-action="show-stats-pane"
          data-stats-pane-id="character"
          aria-selected="${pane === "character"}"
          aria-controls="stats-character-pane"
        >Character</button>
        <button
          id="stats-disciplines-tab"
          class="stats-surface__tab ${pane === "disciplines" ? "is-selected" : ""}"
          type="button"
          role="tab"
          data-action="show-stats-pane"
          data-stats-pane-id="disciplines"
          aria-selected="${pane === "disciplines"}"
          aria-controls="stats-disciplines-pane"
        >Disciplines${disciplinePoints > 0 ? ` · ${disciplinePoints}` : ""}</button>
      </nav>

      <div
        id="stats-${pane}-pane"
        class="stats-surface__pane"
        data-stats-pane="${pane}"
        role="tabpanel"
        aria-labelledby="stats-${pane}-tab"
      >
      ${
        pane === "character"
          ? `

      <section class="stats-section" aria-labelledby="stats-resources-heading">
        <div class="stats-section__heading">
          <h2 id="stats-resources-heading">Present condition</h2>
          <span data-discipline-points-summary>${disciplinePoints > 0 ? `${disciplinePoints} unspent discipline ${disciplinePoints === 1 ? "point" : "points"}` : "No unspent discipline points"}</span>
        </div>
        <div class="stats-card-grid stats-card-grid--resources">
          ${renderResourceKnowledge(
            "health",
            "Health",
            `${player.hp} / ${player.maxHp}`,
            STAT_KNOWLEDGE.health.description,
            STAT_KNOWLEDGE.health.detail,
          )}
          ${renderResourceKnowledge(
            "spirit",
            "Spirit",
            `${player.spirit} / ${player.maxSpirit}`,
            STAT_KNOWLEDGE.spirit.description,
            STAT_KNOWLEDGE.spirit.detail,
          )}
          ${renderResourceKnowledge(
            "ward",
            "Ward",
            String(player.ward),
            STAT_KNOWLEDGE.ward.description,
            STAT_KNOWLEDGE.ward.detail,
          )}
          ${renderResourceKnowledge(
            "experience",
            "Experience",
            `${experience.earned} / ${experience.required}`,
            STAT_KNOWLEDGE.experience.description,
            `${player.xp} total experience · ${experience.remaining} until the next level.`,
          )}
        </div>
      </section>

      <section class="stats-section" aria-labelledby="stats-attributes-heading">
        <div class="stats-section__heading">
          <h2 id="stats-attributes-heading">Attributes</h2>
          <span>Innate and trained capability</span>
        </div>
        <div class="stats-card-grid">
          ${ATTRIBUTE_IDS.map((id) =>
            renderKnowledgeDisclosure({
              id: `stats-attribute-${id}`,
              label: ATTRIBUTES[id].label,
              value: String(player.attributes[id]),
              description: ATTRIBUTES[id].description,
            }),
          ).join("")}
        </div>
      </section>

      <section class="stats-section" aria-labelledby="stats-skills-heading">
        <div class="stats-section__heading">
          <h2 id="stats-skills-heading">Mundane skills</h2>
          <span>Ordinary work still decides who survives</span>
        </div>
        <div class="stats-card-grid">
          ${MUNDANE_SKILL_IDS.map((id) =>
            renderKnowledgeDisclosure({
              id: `stats-skill-${id}`,
              label: MUNDANE_SKILLS[id].label,
              value: `${player.skills[id]} · ${skillRankLabel(player.skills[id])}`,
              description: MUNDANE_SKILLS[id].description,
              detail: `Usually tested with ${ATTRIBUTES[MUNDANE_SKILLS[id].usualAttribute].label}.`,
            }),
          ).join("")}
        </div>
      </section>

      <section class="stats-section" aria-labelledby="stats-derived-heading">
        <div class="stats-section__heading">
          <h2 id="stats-derived-heading">Current capabilities</h2>
          <span>Equipment, wounds, and statuses included</span>
        </div>
        <div class="stats-card-grid">
          ${renderResourceKnowledge(
            "physical-power",
            "Physical power",
            String(effectiveAttack(player)),
            STAT_KNOWLEDGE.physicalPower.description,
            woundImpact.attackPenalty > 0
              ? `Reduced by ${woundImpact.attackPenalty} from wounds.`
              : STAT_KNOWLEDGE.physicalPower.detail,
          )}
          ${renderResourceKnowledge(
            "occult-power",
            "Occult power",
            String(effectiveOccultPower(player)),
            STAT_KNOWLEDGE.occultPower.description,
            woundImpact.attackPenalty > 0
              ? `Reduced by ${woundImpact.attackPenalty} from wounds.`
              : STAT_KNOWLEDGE.occultPower.detail,
          )}
          ${renderResourceKnowledge(
            "defense",
            "Defense",
            String(effectiveDefense(player)),
            STAT_KNOWLEDGE.defense.description,
            woundImpact.defensePenalty > 0
              ? `Reduced by ${woundImpact.defensePenalty} from wounds.`
              : STAT_KNOWLEDGE.defense.detail,
          )}
          ${renderResourceKnowledge(
            "flee",
            "Flee chance",
            `${getFleeChance(player)}%`,
            STAT_KNOWLEDGE.fleeChance.description,
            woundImpact.fleePenalty > 0
              ? `Reduced by ${woundImpact.fleePenalty} points from wounds.`
              : STAT_KNOWLEDGE.fleeChance.detail,
          )}
          ${renderResourceKnowledge(
            "body",
            "Body condition",
            `${bodyConditionPercentage(player)}%`,
            STAT_KNOWLEDGE.body.description,
            `${wounds.length} recorded ${wounds.length === 1 ? "wound" : "wounds"} and ${player.scars.length} ${player.scars.length === 1 ? "scar" : "scars"}.`,
          )}
          ${renderResourceKnowledge(
            "load",
            "Load",
            `${carriedWeight(player).toFixed(1)} / ${carryCapacity(player)}`,
            STAT_KNOWLEDGE.load.description,
            STAT_KNOWLEDGE.load.detail,
          )}
        </div>
      </section>
      `
          : `
            <div data-advancement-result-slot>${renderPresentedAdvancement(state)}</div>
            ${renderAdvancementOffer(state, context.selectedAdvancementId)}
          `
      }
      </div>
    </aside>
  `;
};
