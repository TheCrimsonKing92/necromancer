import {
  advancementTreeFor,
  getAdvancementOffer,
  getPresentedAdvancement,
  type AdvancementNodeState,
} from "../game/advancements";
import {
  advancementReadinessCapacity,
  readiedAdvancementExpressions,
} from "../game/advancement-readiness";
import { advancementPresentationLocation } from "../game/advancement-presentation-location";
import { TRADITIONS } from "../game/content";
import { romanLevel } from "../game/progression";
import type {
  AdvancementBranchId,
  AdvancementId,
  GameState,
  Player,
} from "../game/types";
import {
  renderAdvancementBranchTree,
  renderAdvancementPosition,
} from "./advancement-tree-render";
import { escapeHtml } from "./html";
import { renderResultDismissButton } from "./result-render";

const ADVANCEMENT_BRANCH_LABELS: Record<AdvancementBranchId, string> = {
  tradition: "Practice",
  body: "The body",
  necromancy: "Necromancy",
  mundane: "Mundane training",
};

const renderPreparedExpressions = (
  state: GameState,
  player: Player,
  node: AdvancementNodeState,
): string => {
  const duality = node.definition.duality;
  if (duality?.kind !== "prepared") return "";

  const readyIds = readiedAdvancementExpressions(player);
  const canChange =
    node.status === "learned" &&
    Boolean(advancementPresentationLocation(state)) &&
    player.hp > 0;
  const used = player.advancementReadiness?.[duality.readiness]
    .length ?? 0;
  const capacity = advancementReadinessCapacity(
    player,
    duality.readiness,
  );

  return `
    <section class="advancement-expressions" aria-label="${escapeHtml(node.definition.name)} expressions">
      <div class="advancement-expressions__heading">
        <strong>Prepared expressions</strong>
        <small>${used} / ${capacity} ${escapeHtml(duality.readiness)} slots occupied</small>
      </div>
      <div class="advancement-expressions__grid">
        ${duality.expressions
          .map((expression) => {
            const ready = readyIds.includes(expression.id);
            return `
              <article class="advancement-expression ${ready ? "is-ready" : ""}">
                <p class="eyebrow">${escapeHtml(expression.classification)}</p>
                <h4>${escapeHtml(expression.name)}</h4>
                <p>${escapeHtml(expression.description)}</p>
                <p class="advancement-confirmation__effect">${escapeHtml(expression.effectText)}</p>
                ${
                  node.status === "learned"
                    ? `<button
                        class="button ${ready ? "" : "button--primary"}"
                        type="button"
                        data-action="prepare-advancement-expression"
                        data-advancement-id="${node.definition.id}"
                        data-expression-id="${expression.id}"
                        ${ready || !canChange ? "disabled" : ""}
                      >
                        ${ready ? "Readied" : `Ready ${escapeHtml(expression.name)}`}
                      </button>`
                    : ""
                }
              </article>
            `;
          })
          .join("")}
      </div>
      <small>Both expressions are learned. Only one expression from this discipline may be readied at a time.</small>
    </section>
  `;
};

export const renderAdvancementConfirmation = (
  state: GameState,
  selectedId?: AdvancementId,
): string => {
  const player = state.run?.player;
  if (!player || !selectedId) {
    return `
      <div class="advancement-confirmation__empty">
        <p>Select a discipline to inspect its effect, requirements, and descendants.</p>
      </div>
    `;
  }

  const nodes = advancementTreeFor(player);
  const node = nodes.find(
    ({ definition }) => definition.id === selectedId,
  );
  if (!node) return "";
  const offer = getAdvancementOffer(state);
  const canClaim =
    node.status === "available" &&
    Boolean(
      offer?.nodes.some(
        ({ definition, status }) =>
          definition.id === selectedId && status === "available",
      ),
    );
  const statusExplanation =
    node.status === "learned"
      ? node.definition.duality?.kind === "prepared"
        ? "Learned. Its readied expression is active."
        : "Already learned. Its effect is active."
      : node.status === "locked"
        ? node.reason
        : offer
          ? "Available to claim."
          : "Available at the next safe pause outside combat.";

  return `
    <div class="advancement-confirmation__content">
      <p class="eyebrow">${node.definition.branch === "tradition" ? "Practice discipline" : `${ADVANCEMENT_BRANCH_LABELS[node.definition.branch]} discipline`}</p>
      <h3>${escapeHtml(node.definition.name)}</h3>
      <p>${escapeHtml(node.definition.description)}</p>
      ${renderAdvancementPosition(node, nodes)}
      <p class="advancement-confirmation__effect">${escapeHtml(node.definition.effectText)}</p>
      <p class="advancement-confirmation__status">${escapeHtml(statusExplanation ?? "")}</p>
      ${renderPreparedExpressions(state, player, node)}
      ${
        canClaim
          ? `<div class="advancement-confirmation__actions">
              <button
                class="button button--primary"
                type="button"
                data-action="confirm-advancement"
                data-advancement-id="${node.definition.id}"
              >
                Claim ${escapeHtml(node.definition.name)}
              </button>
              <small>${
                node.definition.duality?.kind === "prepared"
                  ? "Both expressions are learned; readiness may be changed at a safe pause."
                  : node.definition.duality?.kind === "doctrine"
                    ? "This doctrine excludes its alternative until retrained through the world."
                    : "This choice is permanent for this testament."
              }</small>
            </div>`
          : ""
      }
    </div>
  `;
};

export const renderPresentedAdvancement = (state: GameState): string => {
  const definition = getPresentedAdvancement(state);
  if (!definition) return "";

  return `
    <section class="story-outcome advancement-result">
      ${renderResultDismissButton("advancement", definition.id, definition.name)}
      <p class="eyebrow">Discipline claimed</p>
      <h2 data-stats-result-title tabindex="-1">${escapeHtml(definition.name)}</h2>
      <p class="story-outcome__body">${escapeHtml(definition.resultText)}</p>
      <p class="story-outcome__result">${escapeHtml(definition.effectText)}</p>
    </section>
  `;
};

export const renderAdvancementOffer = (
  state: GameState,
  selectedId?: AdvancementId,
): string => {
  const player = state.run?.player;
  if (!player) return "";
  const points = getAdvancementOffer(state)?.points ?? 0;
  const nodes = advancementTreeFor(player);
  const branches: AdvancementBranchId[] = [
    "tradition",
    "body",
    "necromancy",
    "mundane",
  ];
  let nodeIndex = 0;

  return `
    <section class="advancement-panel" aria-labelledby="advancement-heading">
      <div class="advancement-panel__heading">
        <div>
          <p class="eyebrow">Level ${romanLevel(player.level)}</p>
          <h2 id="advancement-heading">Disciplines</h2>
        </div>
        <strong data-advancement-points class="advancement-points ${points > 0 ? "advancement-points--available" : ""}">
          ${points} unspent
        </strong>
      </div>
      <p class="advancement-panel__intro">
        Disciplines form paths within each practice. Select one to inspect its
        effect, requirements, and what it opens; claiming is a separate,
        permanent choice.
      </p>
      <div class="advancement-workspace">
        <div class="advancement-tree">
          ${branches
            .map((branch) => {
              const branchNodes = nodes.filter(
                (node) => node.definition.branch === branch,
              );
              if (branchNodes.length === 0) return "";
              const branchLabel =
                branch === "tradition"
                  ? `${TRADITIONS[player.tradition].name} practice`
                  : ADVANCEMENT_BRANCH_LABELS[branch];
              const renderedTree = renderAdvancementBranchTree(
                player,
                branchNodes,
                nodeIndex,
                selectedId,
              );
              nodeIndex = renderedTree.nextIndex;
              return `
                <section class="advancement-branch" data-advancement-branch="${branch}" aria-labelledby="advancement-${branch}">
                  <div class="advancement-branch__heading">
                    <h3 id="advancement-${branch}">${escapeHtml(branchLabel)}</h3>
                    <span data-advancement-branch-learned>${branchNodes.filter((node) => node.status === "learned").length} / ${branchNodes.length} learned</span>
                  </div>
                  <div class="advancement-grid">
                    ${renderedTree.markup}
                  </div>
                </section>
              `;
            })
            .join("")}
        </div>
        <section
          class="advancement-confirmation"
          data-advancement-confirmation
          aria-label="Selected discipline"
          aria-live="polite"
        >
          ${renderAdvancementConfirmation(state, selectedId)}
        </section>
      </div>
    </section>
  `;
};
