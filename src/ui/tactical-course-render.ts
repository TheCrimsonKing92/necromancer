import type {
  TacticalSceneAction,
  TacticalSceneKnownConsequence,
} from "../game/tactical-scene";
import { escapeHtml } from "./html";

const consequenceHeading = (
  consequence: TacticalSceneKnownConsequence,
): string => {
  switch (consequence.kind) {
    case "obligation": return "Obligation";
    case "time": return "Time";
    case "world-state": return "Scene change";
    case "exposure": return "Exposure";
  }
};

const renderResolution = (action: TacticalSceneAction): string => {
  const resolution = action.resolution;
  if (!resolution) return "";
  return `<span class="tactical-course__resolution" aria-label="Method: ${escapeHtml(resolution.method)}. Prospect: ${escapeHtml(resolution.prospect)}.">
    <span class="tactical-course__datum" data-course-method><small>Method</small><strong>${escapeHtml(resolution.method)}</strong></span>
    <span class="tactical-course__datum" data-course-prospect><small>Prospect</small><strong>${escapeHtml(resolution.prospect)}</strong></span>
  </span>`;
};

const renderTerms = (action: TacticalSceneAction): string => {
  const costs = (action.costs ?? []).map((cost) => `
    <span class="tactical-course__term tactical-course__term--cost" data-course-cost-kind="${escapeHtml(cost.kind)}" data-course-resource-id="${escapeHtml(cost.resourceId)}" aria-label="Cost: ${cost.amount} ${escapeHtml(cost.resourceLabel)}${cost.available === undefined ? "" : `. ${cost.available} ready`}">
      <small>Cost</small>
      <strong>${cost.amount} ${escapeHtml(cost.resourceLabel)}</strong>
      ${cost.available === undefined ? "" : `<span class="tactical-course__term-availability">${cost.available} ready</span>`}
    </span>`);
  const consequences = (action.knownConsequences ?? []).map((consequence) => `
    <span class="tactical-course__consequence">
      <span class="tactical-course__term tactical-course__term--${escapeHtml(consequence.kind)}" data-course-consequence-kind="${escapeHtml(consequence.kind)}" aria-label="${escapeHtml(consequenceHeading(consequence))}: ${escapeHtml(consequence.label)}">
        <small>${consequenceHeading(consequence)}</small>
        <strong>${escapeHtml(consequence.label)}</strong>
      </span>
      ${consequence.detail ? `<span class="tactical-course__term-detail">${escapeHtml(consequence.detail)}</span>` : ""}
    </span>`);
  const terms = [...costs, ...consequences];
  return terms.length > 0
    ? `<span class="tactical-course__terms">${terms.join("")}</span>`
    : "";
};

/**
 * Shared information hierarchy for every semantic tactical course. The title
 * and authored lead come before compact rule readouts; internal action kinds
 * are deliberately omitted.
 */
export const renderTacticalCourseContent = (
  action: TacticalSceneAction,
): string => `
  <strong class="tactical-course__title">${escapeHtml(action.label)}</strong>
  <span class="tactical-course__lead">${escapeHtml(action.lead)}</span>
  ${renderResolution(action)}
  ${renderTerms(action)}
  ${action.stakes ? `<span class="tactical-course__stakes"><small>Known stakes</small><strong>${escapeHtml(action.stakes)}</strong></span>` : ""}`;
