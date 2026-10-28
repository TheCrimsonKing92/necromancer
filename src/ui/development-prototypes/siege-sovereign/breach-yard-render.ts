import type {
  BreachYardCellProjection,
  BreachYardProjection,
} from "../../../game/development-prototypes/siege-sovereign/breach-yard";
import { escapeHtml } from "../../html";
import {
  actionProofGlyph,
  renderActionProofFigure,
  type ActionProofFigureTone,
} from "../action-proof-art";
import {
  renderActionProofTarget,
  renderActionProofTargetingPanel,
} from "../action-proof-targeting-render";

interface BreachYardLandmark {
  readonly desktop: readonly [x: number, y: number];
  readonly mobile: readonly [x: number, y: number];
}

// These coordinates project authored domain locations onto their painted
// counterparts. They communicate no access or range rules; the domain remains
// the authority for adjacency and available actions.
const BREACH_YARD_LANDMARKS: Readonly<Record<BreachYardCellProjection["id"], BreachYardLandmark>> = {
  "west-gate": { desktop: [16, 68], mobile: [28, 72] },
  "timber-stack": { desktop: [28, 60], mobile: [40, 64] },
  "upper-walk": { desktop: [33, 48], mobile: [27, 31] },
  "broken-arch": { desktop: [44, 55], mobile: [47, 45] },
  "shoring-line": { desktop: [60, 42], mobile: [66, 34] },
  culvert: { desktop: [60, 73], mobile: [58, 60] },
  "mason-post": { desktop: [80, 63], mobile: [75, 50] },
  "east-road": { desktop: [88, 72], mobile: [78, 72] },
};

const MOVE_ZONE_BY_TERRAIN = {
  open: [10, 6],
  cover: [9, 6],
  elevated: [9, 5],
  hazard: [10, 6],
  objective: [11, 6],
} as const;

const formationSlot = (index: number, count: number): { readonly offset: number; readonly depth: number } => {
  if (count <= 3) return { offset: index - (count - 1) / 2, depth: 0 };
  const columns = count === 4 ? 2 : 3;
  const row = Math.floor(index / columns);
  const rowCount = Math.min(columns, count - row * columns);
  return { offset: index % columns - (rowCount - 1) / 2, depth: row * 7.2 };
};

type BreachYardAction = BreachYardProjection["actions"][number];

const breachYardActionGlyph = (id: string): string => id === "direct-servant"
  ? "◆"
  : actionProofGlyph(id);

const renderCell = (cell: BreachYardCellProjection, actions: readonly BreachYardAction[]): string => {
  const landmark = BREACH_YARD_LANDMARKS[cell.id];
  const [moveWidth, moveHeight] = MOVE_ZONE_BY_TERRAIN[cell.terrain];
  const figures = cell.occupants.map((occupant, index) => {
    const intent = occupant.intent;
    const { offset, depth } = formationSlot(index, cell.occupants.length);
    return `${renderActionProofFigure({
      id: occupant.visualId ?? occupant.id,
      label: occupant.label,
      tone: occupant.tone as ActionProofFigureTone,
      offset,
      style: `--figure-depth:${depth}rem`,
      poseId: occupant.poseId,
      health: occupant.currentHealth !== undefined && occupant.maxHealth !== undefined
        ? { current: occupant.currentHealth, max: occupant.maxHealth }
        : undefined,
      healthVisibility: occupant.tone === "danger" ? "persistent" : "disclosure",
      subjectId: occupant.id,
    })}${actions.flatMap((action) => action.targets?.filter(({ id }) => id === occupant.id).map((target) => renderActionProofTarget(action.id, target, offset, depth)) ?? []).join("")}${intent ? `<span class="action-stage__intent${landmark.desktop[0] >= 70 ? " action-stage__intent--west" : ""}" style="--intent-offset:${offset};--intent-depth:${depth}rem">${escapeHtml(intent)}</span>` : ""}`;
  }).join("");

  const siteSubjectId = `site:${cell.id}`;
  const siteActions = actions.filter(({ presentation }) => presentation.subjectId === siteSubjectId);
  const siteTargetControls = actions.flatMap((action) => action.targets?.filter(({ id }) => id === cell.id).map((target) => renderActionProofTarget(action.id, target)) ?? []).join("");
  const siteSubject = siteActions.length
    ? `<button class="breach-yard__site-subject" type="button" data-action="select-action-proof-subject" data-action-proof-subject-id="${siteSubjectId}" aria-expanded="false" aria-controls="action-proof-subject-${siteSubjectId}" aria-label="Examine ${escapeHtml(cell.label)}"><span>${escapeHtml(cell.label)}</span></button>`
    : "";

  return `<li class="action-stage__position action-stage__position--${cell.terrain}" data-stage-cell-id="${cell.id}" style="--stage-x:${landmark.desktop[0]}%;--stage-y:${landmark.desktop[1]}%;--stage-mobile-x:${landmark.mobile[0]}%;--stage-mobile-y:${landmark.mobile[1]}%;--move-width:${moveWidth};--move-height:${moveHeight};--figure-spacing:${cell.occupants.length >= 2 ? 8.4 : 5}rem">
    <span class="action-stage__ground" aria-hidden="true"></span>
    ${cell.adjacent ? `<button class="action-stage__move action-stage__move--zone" type="button" data-action="move-action-proof" data-destination-id="${cell.id}" data-move-label="${escapeHtml(`${cell.label} · 1 exchange`)}" aria-label="Go to ${escapeHtml(cell.label)}. One exchange."><span class="sr-only">Go to ${escapeHtml(cell.label)}. One exchange.</span></button>` : ""}
    ${siteSubject}${siteTargetControls}
    ${figures}
  </li>`;
};

const actionFacts = (action: BreachYardAction): string => [
  `<span><b>Capability</b>${escapeHtml(action.presentation.capability)}</span>`,
  `<span><b>Prospect</b>${escapeHtml(action.presentation.prospect)}</span>`,
  `<span><b>Time</b>${escapeHtml(action.presentation.time)}</span>`,
  ...(action.cost ? [`<span><b>Cost</b>${escapeHtml(action.cost)}</span>`] : []),
].join("");

const renderContextAction = (action: BreachYardAction): string => `<button
  class="breach-yard__context-action"
  type="button"
  data-action="${action.targets?.length ? "select-action-proof" : "act-action-proof"}"
  data-action-proof-id="${escapeHtml(action.id)}"
  data-action-label="${escapeHtml(action.label)}"
  data-action-detail="${escapeHtml(action.detail)}"
  ${action.targets?.length ? 'aria-pressed="false"' : ""}>
  <span class="breach-yard__context-glyph" aria-hidden="true">${breachYardActionGlyph(action.id)}</span>
  <span><strong>${escapeHtml(action.label)}</strong><small>${escapeHtml(action.detail)}</small></span>
  <span class="breach-yard__action-facts">${actionFacts(action)}</span>
  ${action.presentation.knownRisk ? `<span class="breach-yard__known-risk"><b>Known risk</b>${escapeHtml(action.presentation.knownRisk)}</span>` : ""}
</button>`;

const renderAbility = (action: BreachYardAction): string => {
  const unavailable = !action.available;
  const detail = unavailable ? action.reason ?? "Unavailable here." : action.detail;
  return `<button
    class="breach-yard__ability"
    type="button"
    data-action="${action.targets?.length ? "select-action-proof" : "act-action-proof"}"
    data-action-proof-id="${escapeHtml(action.id)}"
    data-action-label="${escapeHtml(action.label)}"
    data-action-detail="${escapeHtml(action.detail)}"
    ${action.targets?.length ? 'aria-pressed="false"' : ""}
    ${unavailable ? "disabled" : ""}
    aria-label="${escapeHtml(`${action.label}. ${detail} ${action.presentation.capability}. Prospect ${action.presentation.prospect}. ${action.presentation.time}.`)}">
    <span aria-hidden="true">${breachYardActionGlyph(action.id)}</span>
    <strong>${escapeHtml(action.label)}</strong>
    <span class="breach-yard__ability-detail" role="tooltip">${escapeHtml(detail)}<small>${escapeHtml(`${action.presentation.capability} · ${action.presentation.prospect} · ${action.presentation.time}`)}</small></span>
  </button>`;
};

const renderSubjectPanel = ({
  id,
  eyebrow,
  title,
  body,
  actions,
}: {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly actions: readonly BreachYardAction[];
}): string => `<aside
  class="breach-yard__subject-panel"
  id="action-proof-subject-${escapeHtml(id)}"
  data-action-proof-subject-panel="${escapeHtml(id)}"
  data-subject-announcement="${escapeHtml(`${title}. ${body}`)}"
  aria-labelledby="action-proof-subject-${escapeHtml(id)}-title"
  hidden>
  <button class="breach-yard__subject-close" type="button" data-action="close-action-proof-subject" aria-label="Close ${escapeHtml(title)}">×</button>
  <p class="eyebrow">${escapeHtml(eyebrow)}</p>
  <h2 id="action-proof-subject-${escapeHtml(id)}-title">${escapeHtml(title)}</h2>
  <p>${escapeHtml(body)}</p>
  ${actions.length ? `<div class="breach-yard__context-actions">${actions.map(renderContextAction).join("")}</div>` : ""}
</aside>`;

const endingCopy = (resolved: NonNullable<BreachYardProjection["resolved"]>): string => resolved === "secured"
  ? "The yard is secured."
  : resolved === "withdrawn"
    ? "You leave the yard."
    : "The rescue line fails.";

export const renderSiegeSovereignBreachYard = (scene: BreachYardProjection): string => {
  const availableActions = scene.actions.filter(({ available }) => available);
  const persistentActions = scene.actions.filter(({ presentation, id, available }) => presentation.scope === "persistent"
    && (id === "strike" || id === "direct-servant" || available));
  const contextualActions = availableActions.filter(({ presentation }) => presentation.scope === "contextual");
  const actionsForSubject = (subjectId: string): BreachYardAction[] => contextualActions
    .filter(({ presentation }) => presentation.subjectId === subjectId);
  const occupantPanels = scene.cells.flatMap((cell) => cell.occupants.map((occupant) => renderSubjectPanel({
    id: occupant.id,
    eyebrow: occupant.tone === "danger" ? "HOSTILE" : occupant.tone === "occult" ? "MORTUARY SUBJECT" : "IN THE YARD",
    title: occupant.label,
    body: occupant.subjectDetail ?? `${occupant.label} stands at ${cell.label.toLowerCase()}.`,
    actions: actionsForSubject(occupant.id),
  }))).join("");
  const sitePanels = scene.cells.flatMap((cell) => {
    const id = `site:${cell.id}`;
    const actions = actionsForSubject(id);
    if (!actions.length) return [];
    const body = cell.id === "shoring-line"
      ? `${scene.stakes[0]}. Repair here can keep the conduit off the yard.`
      : cell.id === "west-gate"
        ? "The western gate remains the only clear withdrawal from the yard."
        : `${cell.label} offers work only from this ground.`;
    return [renderSubjectPanel({ id, eyebrow: "GROUND", title: cell.label, body, actions })];
  }).join("");
  const latest = scene.eventLog.at(-1);
  return `<article class="action-stage breach-yard" data-action-proof-scene aria-labelledby="breach-yard-title">
    <section class="action-stage__frame breach-yard__frame" aria-label="The breach yard, its people, dangers, and available acts">
      <div class="action-stage__world" data-action-proof-world>
      <header class="action-stage__hud">
        <div>
          <p class="eyebrow">SIEGE SOVEREIGN DIRECT-PLAY PROOF · NONCANONICAL</p>
          <h1 id="breach-yard-title" data-page-title tabindex="-1">${escapeHtml(scene.title)}</h1>
          <p class="action-stage__summary">${escapeHtml(scene.summary)}</p>
        </div>
        <div>
          <ul class="action-stage__meters" aria-label="Necromancer condition">
            <li class="action-stage__meter">R${scene.round}</li>
            <li class="action-stage__meter">Health ${scene.player.health}</li>
            <li class="action-stage__meter">Ward ${scene.player.ward}</li>
            <li class="action-stage__meter">Spirit ${scene.player.spirit}</li>
          </ul>
          <ul class="action-stage__stakes" aria-label="The rescue line">${scene.stakes.map((stake, index) => `<li class="action-stage__stake${index === 0 ? " action-stage__stake--danger" : ""}">${escapeHtml(stake)}</li>`).join("")}</ul>
          <details class="action-stage__history">
            <summary>Witness · ${scene.eventLog.length} ${scene.eventLog.length === 1 ? "entry" : "entries"}</summary>
            <ol>${scene.eventLog.map((event) => `<li>${escapeHtml(event)}</li>`).join("")}</ol>
          </details>
        </div>
      </header>
      <div class="breach-yard__map">
        <picture>
          <source media="(max-width: 36rem)" srcset="/assets/scenes/siege-breach-yard-mobile-v2.jpg">
          <img class="action-stage__backdrop" src="/assets/scenes/siege-breach-yard-v2.jpg" width="1600" height="900" alt="" decoding="async">
        </picture>
        <span class="action-stage__veil" aria-hidden="true"></span>
        <ol class="action-stage__positions" aria-label="Positions in the breach yard">${scene.cells.map((cell) => renderCell(cell, availableActions)).join("")}</ol>
        ${occupantPanels}${sitePanels}
        ${latest ? `<p class="action-stage__latest" data-result-title tabindex="-1"><strong>Now:</strong> ${escapeHtml(latest)}</p>` : ""}
      </div>
      ${renderActionProofTargetingPanel()}
      ${scene.resolved
        ? `<div class="action-stage__ending" data-result-title tabindex="-1"><strong>${endingCopy(scene.resolved)}</strong><p>The result belongs only to this development proof.</p></div>`
        : `<nav class="breach-yard__abilities" aria-label="Your persistent abilities">${persistentActions.map(renderAbility).join("")}</nav>`}
      <p class="sr-only">Enemy intent: ${scene.enemyIntents.map(escapeHtml).join(" ")}</p>
      </div>
      <div class="action-stage__conversation-host" data-action-proof-conversation-host></div>
    </section>
  </article>`;
};
