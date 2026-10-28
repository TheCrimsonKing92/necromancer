import type {
  TacticalSceneAction,
  TacticalSceneProjection,
  TacticalSceneSubject,
} from "../../../game/tactical-scene";
import { FAILING_CONDUIT_INTRODUCTION } from "../../../game/development-prototypes/siege-sovereign/failing-conduit-copy";
import { escapeHtml } from "../../html";
import { renderTacticalCourseContent } from "../../tactical-course-render";
import {
  renderTacticalSubjectAttention,
  tacticalSubjectAccessibleLabel,
  tacticalSubjectAttentionAttribute,
} from "../../tactical-subject-attention";

const renderIntroduction = (): string => `<section class="siege-conduit__introduction" aria-labelledby="siege-conduit-introduction-title">
  <div>
    <p class="eyebrow">${escapeHtml(FAILING_CONDUIT_INTRODUCTION.eyebrow)}</p>
    <h2 id="siege-conduit-introduction-title">${escapeHtml(FAILING_CONDUIT_INTRODUCTION.title)}</h2>
    ${FAILING_CONDUIT_INTRODUCTION.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
  </div>
  <div class="siege-conduit__voices" aria-label="The people before you">
    ${FAILING_CONDUIT_INTRODUCTION.voices.map(({ speaker, quote }) => `<blockquote><p>‘${escapeHtml(quote)}’</p><cite>${escapeHtml(speaker)}</cite></blockquote>`).join("")}
  </div>
</section>`;

const renderSubject = (
  subject: TacticalSceneSubject,
  selected: boolean,
  seenAttentionKeys?: ReadonlySet<string>,
): string => `
  <li
    class="siege-conduit__anchor siege-conduit__anchor--${escapeHtml(subject.kind)} siege-conduit__anchor--${escapeHtml(subject.tone)}"
    style="--scene-x:${subject.placement.x}%;--scene-y:${subject.placement.y}%;--scene-depth:${subject.placement.depth}"
  >
    <button
      id="siege-subject-${escapeHtml(subject.id)}"
      class="siege-conduit__subject${selected ? " siege-conduit__subject--selected" : ""}"
      type="button"
      data-action="select-tactical-subject"
      data-tactical-subject-id="${escapeHtml(subject.id)}"
      aria-pressed="${selected}"
      aria-label="${escapeHtml(tacticalSubjectAccessibleLabel(subject, seenAttentionKeys))}"${tacticalSubjectAttentionAttribute(subject, seenAttentionKeys)}
    >
      <span class="siege-conduit__glyph" aria-hidden="true">${escapeHtml(subject.glyph)}</span>
      <span class="siege-conduit__subject-copy">
        <strong>${escapeHtml(subject.label)}</strong>
        <small>${escapeHtml(subject.status)}</small>
      </span>
      ${renderTacticalSubjectAttention(subject, seenAttentionKeys)}
    </button>
  </li>`;

const renderAction = (action: TacticalSceneAction): string => {
  const unavailable = action.availability.state === "unavailable";
  const reason = unavailable ? action.availability.reason : "";
  return `
    <li class="siege-conduit__action siege-conduit__action--${escapeHtml(action.kind)}">
      <button
        class="tactical-course siege-conduit__action-button"
        type="button"
        data-action="act-tactical-prototype"
        data-tactical-action-id="${escapeHtml(action.id)}"
        ${unavailable ? "disabled aria-disabled=\"true\"" : ""}
      >
        ${renderTacticalCourseContent(action)}
      </button>
      ${reason ? `<p class="siege-conduit__unavailable">Unavailable: ${escapeHtml(reason)}</p>` : ""}
    </li>`;
};

const renderFeaturedEvent = (event: TacticalSceneProjection["events"][number]): string => `
  <section class="siege-conduit__featured-event story-outcome" aria-labelledby="siege-conduit-featured-event-title">
    <p class="eyebrow">${escapeHtml(event.eyebrow)}</p>
    <h3 id="siege-conduit-featured-event-title" data-result-title tabindex="-1">${escapeHtml(event.title)}</h3>
    <p>${escapeHtml(event.detail)}</p>
    ${event.result ? `<p class="siege-conduit__event-result">${escapeHtml(event.result)}</p>` : ""}
  </section>`;

const renderEventLedger = (scene: TacticalSceneProjection): string => scene.events.length === 0
  ? ""
  : `<section class="siege-conduit__event-ledger" aria-labelledby="siege-conduit-event-ledger-title">
      <p class="eyebrow">THE WORK ALREADY DONE</p>
      <h2 id="siege-conduit-event-ledger-title">What the town now remembers</h2>
      <ol>
        ${scene.events.map((event) => `<li>
          <span>${escapeHtml(event.eyebrow)}</span>
          <strong>${escapeHtml(event.title)}</strong>
          ${event.result ? `<p class="siege-conduit__event-result">${escapeHtml(event.result)}</p>` : ""}
        </li>`).join("")}
      </ol>
    </section>`;

export const renderSiegeSovereignFailingConduit = (
  scene: TacticalSceneProjection,
  selectedSubjectId?: string,
  seenAttentionKeys?: ReadonlySet<string>,
): string => {
  const selected = scene.subjects.find(({ id }) => id === selectedSubjectId)
    ?? scene.subjects[0];
  const actions = selected
    ? scene.actions.filter(({ subjectId }) => subjectId === selected.id)
    : [];
  const latestEvent = scene.events.at(-1);
  const featuredEvent = latestEvent?.subjectId === selected?.id ? latestEvent : undefined;
  return `
    <section class="siege-conduit" aria-labelledby="siege-conduit-title" data-tactical-scene-id="${escapeHtml(scene.id)}">
      <header class="siege-conduit__header">
        <div>
          <p class="eyebrow">${escapeHtml(scene.eyebrow)}</p>
          <h1 id="siege-conduit-title" data-page-title tabindex="-1">${escapeHtml(scene.title)}</h1>
          <p>${escapeHtml(scene.summary)}</p>
        </div>
        <span class="siege-conduit__phase">${scene.phase === "arrival" ? "Before terms are sworn" : scene.phase === "terms" ? "Terms before the town" : scene.phase === "brace" ? "The Sovereign bears the span" : "The chosen cost"}</span>
      </header>

      <div class="siege-conduit__measures" aria-label="Scene condition">
        ${scene.measures.map((measure) => `
          <div class="siege-conduit__measure siege-conduit__measure--${escapeHtml(measure.tone)}">
            <span>${escapeHtml(measure.label)}</span>
            <strong>${escapeHtml(measure.value)}</strong>
          </div>`).join("")}
      </div>

      ${scene.events.length === 0 ? renderIntroduction() : ""}

      <div class="siege-conduit__workspace">
        <figure class="siege-conduit__stage" aria-labelledby="siege-conduit-stage-caption">
          <div class="siege-conduit__terrain" aria-hidden="true">
            <span class="siege-conduit__water"></span>
            <span class="siege-conduit__conduit"></span>
            <span class="siege-conduit__road"></span>
            <span class="siege-conduit__houses"></span>
          </div>
          <ol class="siege-conduit__subject-list" aria-label="Scene subjects in reading order">
            ${scene.subjects.map((subject) => renderSubject(subject, subject.id === selected?.id, seenAttentionKeys)).join("")}
          </ol>
          <figcaption id="siege-conduit-stage-caption">
            ${escapeHtml(scene.background.alt)}
          </figcaption>
        </figure>

        <aside class="siege-conduit__focus" aria-labelledby="siege-conduit-focus-title">
          ${selected ? `
            <p class="eyebrow">${escapeHtml(selected.kind)}</p>
            <h2 id="siege-conduit-focus-title">${escapeHtml(selected.label)}</h2>
            <p class="siege-conduit__status">${escapeHtml(selected.status)}</p>
            <p>${escapeHtml(selected.description)}</p>
            ${featuredEvent ? renderFeaturedEvent(featuredEvent) : ""}
            <h3>What you can do here</h3>
            <ul class="siege-conduit__actions">${actions.map(renderAction).join("")}</ul>
          ` : `<h2 id="siege-conduit-focus-title">No scene subject</h2>`}
        </aside>
      </div>

      <section class="siege-conduit__relations" aria-labelledby="siege-conduit-relations-title">
        <h2 id="siege-conduit-relations-title">What bears upon what</h2>
        <ul>
          ${scene.connections.map((connection) => `<li><strong>${escapeHtml(connection.label)}</strong><span>${escapeHtml(connection.state)}</span></li>`).join("")}
        </ul>
      </section>

      ${renderEventLedger(scene)}
    </section>`;
};
