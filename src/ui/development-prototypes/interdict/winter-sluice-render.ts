import type {
  TacticalSceneAction,
  TacticalSceneEvent,
  TacticalSceneProjection,
  TacticalSceneSubject,
} from "../../../game/tactical-scene";
import { WINTER_SLUICE_INTRODUCTION } from "../../../game/development-prototypes/interdict/winter-sluice-copy";
import { escapeHtml } from "../../html";
import { renderTacticalCourseContent } from "../../tactical-course-render";
import {
  renderTacticalSubjectAttention,
  tacticalSubjectAccessibleLabel,
  tacticalSubjectAttentionAttribute,
} from "../../tactical-subject-attention";

const toneClass = (tone: TacticalSceneSubject["tone"]): string =>
  `interdict-sluice--tone-${tone}`;

const renderSubject = (
  subject: TacticalSceneSubject,
  selected: boolean,
  seenAttentionKeys?: ReadonlySet<string>,
): string => {
  const visualState = subject.visualState
    ? ` data-visual-state="${escapeHtml(subject.visualState)}"`
    : "";
  return `
    <li class="interdict-sluice__subject-node" style="--scene-x:${subject.placement.x}%;--scene-y:${subject.placement.y}%;--scene-depth:${subject.placement.depth}" data-depth="${subject.placement.depth}">
      <button
        class="interdict-sluice__subject ${toneClass(subject.tone)}${selected ? " is-selected" : ""}"
        type="button"
        data-action="select-tactical-subject"
        data-tactical-subject-id="${escapeHtml(subject.id)}"
        aria-pressed="${selected ? "true" : "false"}"
        aria-label="${escapeHtml(tacticalSubjectAccessibleLabel(subject, seenAttentionKeys))}"${visualState}${tacticalSubjectAttentionAttribute(subject, seenAttentionKeys)}
      >
        <span class="interdict-sluice__plinth" aria-hidden="true"></span>
        <span class="interdict-sluice__figure" aria-hidden="true">${escapeHtml(subject.glyph)}</span>
        <span class="interdict-sluice__subject-copy">
          <strong>${escapeHtml(subject.label)}</strong>
          <span>${escapeHtml(subject.status)}</span>
        </span>
        ${renderTacticalSubjectAttention(subject, seenAttentionKeys)}
      </button>
    </li>`;
};

const renderAction = (action: TacticalSceneAction): string => {
  const unavailable = action.availability.state === "unavailable";
  const reasonId = `interdict-action-${action.id}-reason`;
  return `
    <li class="interdict-sluice__action-card" data-action-kind="${action.kind}">
      <button
        class="tactical-course interdict-sluice__action-button"
        type="button"
        data-action="act-tactical-prototype"
        data-tactical-action-id="${escapeHtml(action.id)}"
        data-activation-kind="${escapeHtml(action.activation.kind)}"
        ${unavailable ? `disabled aria-describedby="${escapeHtml(reasonId)}"` : ""}
      >${renderTacticalCourseContent(action)}</button>
      ${unavailable
        ? `<p class="interdict-sluice__unavailable" id="${escapeHtml(reasonId)}"><span aria-hidden="true">×</span> ${escapeHtml(action.availability.reason)}</p>`
        : ""}
    </li>`;
};

const renderEventLedger = (projection: TacticalSceneProjection): string => {
  if (projection.events.length === 0) {
    return `<p class="interdict-sluice__quiet">No course has yet changed the scene.</p>`;
  }
  return `<ol class="interdict-sluice__events">
    ${projection.events.map((event) => `<li>
      <span>${escapeHtml(event.eyebrow)}</span>
      <strong>${escapeHtml(event.title)}</strong>
      ${event.result ? `<p class="interdict-sluice__event-result">${escapeHtml(event.result)}</p>` : ""}
    </li>`).join("")}
  </ol>`;
};

const renderMillerExchange = (): string => `
  <section class="interdict-sluice__exchange" aria-labelledby="interdict-miller-exchange-title">
    <p class="eyebrow">AT THE LOCKED YARD</p>
    <h3 id="interdict-miller-exchange-title" data-result-title tabindex="-1">The miller keeps his keys in hand.</h3>
    <blockquote>
      <p>‘That wall has outlived three warnings. If the town wants my winter stores spent on it, the town will pay—or name the law that takes them.’</p>
      <cite>The miller</cite>
    </blockquote>
    <p>Choose what claim you will put against his.</p>
  </section>`;

const renderFeaturedEvent = (event: TacticalSceneEvent): string => `
  <section class="interdict-sluice__featured-outcome story-outcome" aria-labelledby="interdict-featured-outcome-title">
    <p class="eyebrow">${escapeHtml(event.eyebrow)}</p>
    <h3 id="interdict-featured-outcome-title" data-result-title tabindex="-1">${escapeHtml(event.title)}</h3>
    <p>${escapeHtml(event.detail)}</p>
    ${event.result ? `<p class="interdict-sluice__featured-result">${escapeHtml(event.result)}</p>` : ""}
  </section>`;

const renderIntroduction = (): string => `
  <section class="interdict-sluice__introduction" aria-labelledby="interdict-sluice-introduction-title">
    <div class="interdict-sluice__opening-copy">
      <p class="eyebrow">${escapeHtml(WINTER_SLUICE_INTRODUCTION.eyebrow)}</p>
      <h2 id="interdict-sluice-introduction-title">A captive below the wheel. Winter above the roofs.</h2>
      ${WINTER_SLUICE_INTRODUCTION.paragraphs
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("")}
    </div>
    <div class="interdict-sluice__voices" aria-label="The people before you">
      ${WINTER_SLUICE_INTRODUCTION.voices.map((voice) => `
        <blockquote>
          <p>‘${escapeHtml(voice.quote)}’</p>
          <cite>${escapeHtml(voice.speaker)}</cite>
        </blockquote>`).join("")}
    </div>
  </section>`;

/**
 * Pure semantic renderer for the noncanonical proof. The board's positioned
 * buttons are also its ordered subject list, so pointer placement never hides
 * a second interaction grammar from keyboard, touch, or reading layouts.
 */
export const renderInterdictWinterSluice = (
  projection: TacticalSceneProjection,
  selectedSubjectId?: string,
  seenAttentionKeys?: ReadonlySet<string>,
): string => {
  const selected = projection.subjects.find(({ id }) => id === selectedSubjectId) ??
    projection.subjects[0];
  if (!selected) return "";
  const selectedActions = projection.actions.filter(
    ({ subjectId }) => subjectId === selected.id,
  );
  const millerExchangeOpen = selected.id === "miller" && selectedActions.some(
    ({ id }) => id === "buy-mill-stores",
  );
  const latestEvent = projection.events.at(-1)?.subjectId === selected.id
    ? projection.events.at(-1)
    : undefined;
  return `
    <section class="interdict-sluice" data-tactical-scene="${escapeHtml(projection.id)}" data-phase="${escapeHtml(projection.phase)}" aria-labelledby="interdict-sluice-title">
      <header class="interdict-sluice__header">
        <div>
          <p class="eyebrow">${escapeHtml(projection.eyebrow)}</p>
          <h1 id="interdict-sluice-title" data-page-title tabindex="-1">${escapeHtml(projection.title)}</h1>
          <p class="interdict-sluice__summary">${escapeHtml(projection.summary)}</p>
        </div>
        <dl class="interdict-sluice__measures" aria-label="Known scene conditions">
          ${projection.measures.map((measure) => `
            <div class="${toneClass(measure.tone)}">
              <dt>${escapeHtml(measure.label)}</dt>
              <dd>${escapeHtml(measure.value)}</dd>
            </div>`).join("")}
        </dl>
      </header>

      ${projection.resolved ? "" : renderIntroduction()}

      <div class="interdict-sluice__workspace">
        <div class="interdict-sluice__board-viewport" tabindex="0" aria-label="Scrollable view of the winter sluice">
          <p class="interdict-sluice__survey-hint" aria-hidden="true">Swipe to survey the full scene <span>→</span></p>
          <div class="interdict-sluice__board" role="group" aria-label="Winter sluice scene subjects">
            <p class="visually-hidden">${escapeHtml(projection.background.alt)}</p>
            <div class="interdict-sluice__terrain" aria-hidden="true">
              <span class="interdict-sluice__river"></span>
              <span class="interdict-sluice__sluice-wall"></span>
              <span class="interdict-sluice__mill-wheel"></span>
              <span class="interdict-sluice__lower-bank"></span>
              <span class="interdict-sluice__burial-rise"></span>
              <span class="interdict-sluice__aspect-light"></span>
            </div>
            <h2 class="visually-hidden">Scene subjects</h2>
            <ol class="interdict-sluice__subjects">
              ${projection.subjects.map((subject) => renderSubject(subject, subject.id === selected.id, seenAttentionKeys)).join("")}
            </ol>
            <p class="interdict-sluice__board-key" aria-hidden="true">fixed isometric field · positions express authored relations, not range</p>
          </div>
        </div>

        <aside class="interdict-sluice__inspector" aria-labelledby="interdict-subject-title">
          <p class="eyebrow">${escapeHtml(selected.kind)} · ${escapeHtml(selected.status)}</p>
          <h2 id="interdict-subject-title">${escapeHtml(selected.label)}</h2>
          <p>${escapeHtml(selected.description)}</p>
          ${millerExchangeOpen
            ? renderMillerExchange()
            : latestEvent ? renderFeaturedEvent(latestEvent) : ""}
          <div class="interdict-sluice__action-section">
            <h3>${projection.resolved ? "Scene settled" : "Courses from this subject"}</h3>
            ${selectedActions.length > 0
              ? `<ul class="interdict-sluice__actions">${selectedActions.map(renderAction).join("")}</ul>`
              : `<p class="interdict-sluice__quiet">${projection.resolved ? "No obsolete preparation remains actionable." : "Observe another represented subject for its authored courses."}</p>`}
          </div>
        </aside>
      </div>

      <div class="interdict-sluice__lower-panels">
        <section aria-labelledby="interdict-relations-title">
          <p class="eyebrow">CAUSAL FIELD</p>
          <h2 id="interdict-relations-title">What reaches what</h2>
          <ul class="interdict-sluice__connections">
            ${projection.connections.map((connection) => `<li data-connection-state="${connection.state}">
              <span aria-hidden="true"></span>
              <strong>${escapeHtml(connection.label)}</strong>
            </li>`).join("")}
          </ul>
        </section>
        <section aria-labelledby="interdict-ledger-title">
          <p class="eyebrow">AUTHORITATIVE CHANGES</p>
          <h2 id="interdict-ledger-title">What the scene now remembers</h2>
          ${renderEventLedger(projection)}
        </section>
      </div>
    </section>`;
};
