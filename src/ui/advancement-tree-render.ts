import { ADVANCEMENTS, type AdvancementNodeState } from "../game/advancements";
import { TRADITIONS } from "../game/content";
import { getPractice } from "../game/practices";
import type {
  AdvancementBranchId,
  AdvancementId,
  Player,
} from "../game/types";
import { escapeHtml } from "./html";

const BRANCH_LABELS: Record<AdvancementBranchId, string> = {
  tradition: "Practice",
  body: "The body",
  necromancy: "Necromancy",
  mundane: "Mundane training",
};

const prerequisiteTrail = (
  player: Player,
  advancementId: AdvancementId,
): AdvancementId[] => {
  const definition = ADVANCEMENTS[advancementId];
  const trail = definition.prerequisites.flatMap((prerequisiteId) => [
    ...prerequisiteTrail(player, prerequisiteId),
    prerequisiteId,
  ]);
  return [...new Set(trail)].filter((id) =>
    player.advancements.includes(id),
  );
};

const renderPrerequisiteTrail = (
  player: Player,
  node: AdvancementNodeState,
): string => {
  const required = node.definition.prerequisites;
  if (required.length === 0) {
    return `<span class="advancement-choice__trail">Foundation discipline</span>`;
  }

  const learnedTrail = prerequisiteTrail(player, node.definition.id);
  const trail = [...learnedTrail, ...required].filter(
    (id, index, ids) => ids.indexOf(id) === index,
  );
  return `
    <span class="advancement-choice__trail" aria-label="Prerequisite path">
      ${trail
        .map((id) => {
          const learned = player.advancements.includes(id);
          return `<span class="${learned ? "is-learned" : ""}">${escapeHtml(ADVANCEMENTS[id].name)}</span>`;
        })
        .join('<span aria-hidden="true"> → </span>')}
    </span>
  `;
};

const renderAdvancementNode = (
  player: Player,
  node: AdvancementNodeState,
  index: number,
  selectedId?: AdvancementId,
): string => {
  const { definition, reason, status } = node;
  const category = definition.tradition
    ? `${TRADITIONS[definition.tradition].name} practice`
    : definition.practice
      ? `${getPractice(definition.practice).name} practice`
      : BRANCH_LABELS[definition.branch];
  const practiceSpecific = Boolean(
    definition.tradition || definition.practice,
  );
  const statusLabel =
    status === "learned"
      ? "Learned"
      : status === "available"
        ? `${definition.cost} point`
        : "Locked";
  const selected = selectedId === definition.id;

  return `
    <button
      class="advancement-choice advancement-choice--${status} ${selected ? "is-selected" : ""} ${practiceSpecific ? "advancement-choice--tradition" : ""}"
      type="button"
      data-action="select-advancement"
      data-advancement-id="${definition.id}"
      aria-pressed="${selected}"
    >
      <span class="advancement-choice__index">${String(index + 1).padStart(2, "0")}</span>
      <span class="advancement-choice__body">
        <span class="advancement-choice__meta">
          <span class="choice__tag ${practiceSpecific ? "choice__tag--tradition" : ""}">${escapeHtml(category)}</span>
          <span class="choice__tag choice__tag--${status}">${escapeHtml(statusLabel)}</span>
        </span>
        <strong>${escapeHtml(definition.name)}</strong>
        <span>${escapeHtml(definition.description)}</span>
        ${renderPrerequisiteTrail(player, node)}
        ${reason ? `<small>${escapeHtml(reason)}</small>` : ""}
      </span>
      <span class="choice__arrow" aria-hidden="true">${status === "learned" ? "✓" : selected ? "•" : "→"}</span>
    </button>
  `;
};

interface RenderedBranchTree {
  markup: string;
  nextIndex: number;
}

export const renderAdvancementBranchTree = (
  player: Player,
  nodes: AdvancementNodeState[],
  startIndex: number,
  selectedId?: AdvancementId,
): RenderedBranchTree => {
  const ids = new Set(nodes.map(({ definition }) => definition.id));
  const children = new Map<AdvancementId, AdvancementNodeState[]>();
  const roots: AdvancementNodeState[] = [];

  for (const node of nodes) {
    const parentId = node.definition.prerequisites.find((id) => ids.has(id));
    if (!parentId) {
      roots.push(node);
      continue;
    }
    const siblings = children.get(parentId) ?? [];
    siblings.push(node);
    children.set(parentId, siblings);
  }

  let nextIndex = startIndex;
  const renderNode = (node: AdvancementNodeState): string => {
    const index = nextIndex++;
    const descendants = children.get(node.definition.id) ?? [];
    return `
      <li class="advancement-tree-node">
        ${renderAdvancementNode(player, node, index, selectedId)}
        ${
          descendants.length > 0
            ? `<ol class="advancement-tree__children" aria-label="Disciplines opened by ${escapeHtml(node.definition.name)}">
                ${descendants.map(renderNode).join("")}
              </ol>`
            : ""
        }
      </li>
    `;
  };

  return {
    markup: `<ol class="advancement-tree__roots">${roots.map(renderNode).join("")}</ol>`,
    nextIndex,
  };
};

export const renderAdvancementPosition = (
  node: AdvancementNodeState,
  nodes: AdvancementNodeState[],
): string => {
  const parents = node.definition.prerequisites.map(
    (id) => ADVANCEMENTS[id].name,
  );
  const descendants = nodes
    .filter(({ definition }) =>
      definition.prerequisites.includes(node.definition.id),
    )
    .map(({ definition }) => definition.name);
  const position =
    parents.length > 0
      ? `Follows ${parents.join(" and ")}`
      : "Foundation discipline";
  const opens =
    descendants.length > 0
      ? `Opens ${descendants.join(" and ")}`
      : "No later discipline descends from it";

  return `
    <dl class="advancement-position">
      <div><dt>Position</dt><dd>${escapeHtml(position)}</dd></div>
      <div><dt>Leads to</dt><dd>${escapeHtml(opens)}</dd></div>
    </dl>
  `;
};
