import type {
  TacticalSceneAction,
  TacticalSceneProjection,
  TacticalSceneSubject,
} from "../game/tactical-scene";
import { escapeHtml } from "./html";
import { renderTacticalCourseContent } from "./tactical-course-render";
import {
  renderTacticalSubjectAttention,
  tacticalSubjectAccessibleLabel,
  tacticalSubjectAttentionAttribute,
} from "./tactical-subject-attention";

export interface TacticalSceneRenderState {
  readonly selectedSubjectId?: string;
  readonly outcomeMarkup?: string;
  readonly seenAttentionKeys?: ReadonlySet<string>;
}

const actionFor = (
  scene: TacticalSceneProjection,
  actionId: string,
): TacticalSceneAction | undefined => scene.actions.find(({ id }) => id === actionId);

const activationAttributes = (action: TacticalSceneAction): string => {
  switch (action.activation.kind) {
    case "story-approach":
      return `data-action="open-featured-story-approach" data-approach-id="${escapeHtml(action.activation.approachId)}" data-approach-facet-id="${escapeHtml(action.activation.capabilityId)}"`;
    case "story-choice":
      return `data-action="choose-story" data-choice-id="${escapeHtml(action.activation.choiceId)}"`;
    case "prototype-transition":
      return `data-action="act-tactical-prototype"`;
  }
};

const renderSubjectMarker = (
  subject: TacticalSceneSubject,
  selected: boolean,
  seenAttentionKeys?: ReadonlySet<string>,
): string => `<button
  class="tactical-stage__marker tactical-stage__marker--${subject.kind} tactical-stage__marker--${subject.tone}"
  style="--scene-x:${subject.placement.x};--scene-y:${subject.placement.y};--scene-depth:${subject.placement.depth}"
  type="button"
  data-action="select-tactical-subject"
  data-tactical-subject-id="${escapeHtml(subject.id)}"
  ${subject.visualState ? `data-visual-state="${escapeHtml(subject.visualState)}"` : ""}
  ${tacticalSubjectAttentionAttribute(subject, seenAttentionKeys)}
  aria-pressed="${selected}"
  aria-label="${escapeHtml(tacticalSubjectAccessibleLabel(subject, seenAttentionKeys))}"
><span aria-hidden="true">${escapeHtml(subject.glyph)}</span><strong>${escapeHtml(subject.label)}</strong>${renderTacticalSubjectAttention(subject, seenAttentionKeys)}</button>`;

const renderAction = (action: TacticalSceneAction): string => {
  const disabled = action.availability.state === "unavailable";
  const reasonId = `tactical-action-${action.id}-reason`;
  return `<button class="tactical-course tactical-inspector__action" type="button" ${activationAttributes(action)} data-tactical-action-id="${escapeHtml(action.id)}"${disabled ? ` disabled aria-describedby="${escapeHtml(reasonId)}"` : ""}>${renderTacticalCourseContent(action)}${disabled ? `<span class="tactical-inspector__unavailable" id="${escapeHtml(reasonId)}">Unavailable: ${escapeHtml(action.availability.reason)}</span>` : ""}</button>`;
};

const renderActionGroup = (
  label: string,
  actions: readonly TacticalSceneAction[],
): string => actions.length > 0
  ? `<section class="tactical-inspector__action-group" aria-label="${escapeHtml(label)}"><p>${escapeHtml(label)}</p>${actions.map(renderAction).join("")}</section>`
  : "";

export const renderTacticalScene = (
  scene: TacticalSceneProjection,
  state: TacticalSceneRenderState = {},
): string => {
  const selected = scene.subjects.find(({ id }) => id === state.selectedSubjectId) ??
    scene.subjects[0];
  const actions = selected?.actionIds
    .map((id) => actionFor(scene, id))
    .filter((action): action is TacticalSceneAction => Boolean(action)) ?? [];
  const storyChoices = actions.filter(({ activation }) => activation.kind === "story-choice");
  const situatedActions = actions.filter(({ activation }) => activation.kind !== "story-choice");
  const actionMarkup = [
    renderActionGroup("The present decision", storyChoices),
    renderActionGroup("Courses from this subject", situatedActions),
  ].join("");
  const backgroundStyle = scene.background.imageUrl
    ? ` style="--tactical-scene-image:url('${escapeHtml(scene.background.imageUrl)}')"`
    : "";
  return `<section class="tactical-scene" data-tactical-scene="${escapeHtml(scene.id)}">
    <header class="tactical-scene__heading">
      <div><p class="eyebrow">${escapeHtml(scene.eyebrow)}</p><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.summary)}</p></div>
      <div class="tactical-scene__measures" aria-label="Scene state">${scene.measures.map((measure) => `<span class="tactical-measure tactical-measure--${measure.tone}"><small>${escapeHtml(measure.label)}</small><strong>${escapeHtml(measure.value)}</strong></span>`).join("")}</div>
    </header>
    <div class="tactical-scene__layout">
      <div class="tactical-stage tactical-stage--${escapeHtml(scene.background.key)}"${backgroundStyle} role="group" aria-label="${escapeHtml(scene.background.alt)}">
        <div class="tactical-stage__backdrop" aria-hidden="true"></div>
        ${scene.subjects.map((subject) => renderSubjectMarker(subject, subject.id === selected?.id, state.seenAttentionKeys)).join("")}
      </div>
      <aside class="tactical-inspector" data-tactical-inspector aria-live="polite">
        <div data-tactical-outcome-slot>${state.outcomeMarkup ?? ""}</div>
        ${selected ? `<p class="eyebrow">${escapeHtml(selected.kind)}</p><h3>${escapeHtml(selected.label)}</h3><strong class="tactical-inspector__status">${escapeHtml(selected.status)}</strong><p>${escapeHtml(selected.description)}</p><div class="tactical-inspector__actions">${actionMarkup || "<p>This subject has no open course at present.</p>"}</div>` : "<p>Select a person, place, or danger to examine it.</p>"}
      </aside>
    </div>
    <details class="tactical-scene__reading"><summary>Read the represented scene</summary><ul>${scene.subjects.map((subject) => `<li><strong>${escapeHtml(subject.label)}:</strong> ${escapeHtml(subject.status)}. ${escapeHtml(subject.description)}</li>`).join("")}</ul></details>
  </section>`;
};
