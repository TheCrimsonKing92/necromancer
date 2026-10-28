import type {
  StoryApproachAxis,
  StoryApproachCatalog,
  StoryApproachFacetDefinition,
  StoryApproachIndex,
  StoryApproachReadContext,
  StoryApproachSurfaceStatus,
  StoryApproachView,
  StoryPreparationSummaryEntry,
} from "../game/story-approaches";
import {
  storyApproachById,
  storyApproachIsBrowsable,
  storyApproachesForFacet,
} from "../game/story-approaches";
import type { StoryApproachResolutionReadout } from "../game/story-approach-resolution";
import { escapeHtml } from "./html";
import type { StoryApproachExplorerState } from "./story-approach-state";
export { DEFAULT_STORY_APPROACH_EXPLORER_STATE } from "./story-approach-state";
export type { StoryApproachExplorerState } from "./story-approach-state";

export interface StoryApproachExplorerMarkupInput {
  readonly catalog: StoryApproachCatalog;
  readonly index: StoryApproachIndex;
  readonly context: StoryApproachReadContext;
  readonly state: StoryApproachExplorerState;
  readonly prepared: readonly StoryPreparationSummaryEntry[];
  readonly resolutions: ReadonlyMap<string, StoryApproachResolutionReadout>;
  readonly status?: StoryApproachSurfaceStatus;
}

const facetsForAxis = (
  catalog: StoryApproachCatalog,
  axis: StoryApproachAxis,
): readonly StoryApproachFacetDefinition[] => {
  if (axis === "objective") return catalog.objectives;
  if (axis === "capability") return catalog.capabilities;
  return catalog.targets;
};

const visibleApproachesForFacet = (
  index: StoryApproachIndex,
  context: StoryApproachReadContext,
  axis: StoryApproachAxis,
  facetId: string,
): StoryApproachView[] => storyApproachesForFacet(
  index,
  context,
  axis,
  facetId,
).filter(storyApproachIsBrowsable).sort((left, right) =>
  Number(left.availability.state !== "available") -
  Number(right.availability.state !== "available")
);

const stateLabel: Record<StoryApproachView["availability"]["state"], string> = {
  available: "Available",
  "needs-preparation": "Needs preparation",
  inapplicable: "Not applicable here",
  "opportunity-closed": "Opportunity closed",
};

const renderApproachRow = (
  approach: StoryApproachView,
  selected: boolean,
  resolution: StoryApproachResolutionReadout | undefined,
): string => {
  return `<button class="approach-option" type="button" data-action="select-story-approach" data-approach-id="${escapeHtml(approach.id)}" aria-pressed="${selected}"><strong>${escapeHtml(approach.label)}</strong><span>${escapeHtml(approach.lead)}</span>${resolution ? `<span class="approach-option__method">Uses ${escapeHtml(resolution.summary)}</span>` : ""}${approach.tempo ? `<span class="approach-option__tempo">${escapeHtml(approach.tempo.label)}</span>` : ""}<span class="approach-option__state">${escapeHtml(stateLabel[approach.availability.state])}</span></button>`;
};

const renderApproachPreview = (
  approach: StoryApproachView | undefined,
  resolution: StoryApproachResolutionReadout | undefined,
): string => {
  if (!approach) {
    return `<div class="approach-preview approach-preview--empty"><p>Select an approach to inspect what it attempts and what it immediately asks of you.</p></div>`;
  }
  const available = approach.availability.state === "available";
  return `<section class="approach-preview" aria-labelledby="approach-preview-title"><p class="eyebrow">${escapeHtml(approach.timing)} approach</p><h3 id="approach-preview-title" tabindex="-1">${escapeHtml(approach.label)}</h3><p>${escapeHtml(approach.detail)}</p>${resolution ? `<div class="approach-preview__resolution"><span>How it resolves</span><strong>${escapeHtml(resolution.method)}</strong><p>${escapeHtml(resolution.detail)}</p></div>` : ""}${approach.tempo ? `<div class="approach-preview__tempo"><span>Scene pressure</span><strong>${escapeHtml(approach.tempo.label)}</strong><p>${escapeHtml(approach.tempo.detail)}</p></div>` : ""}${approach.knownImmediateCost ? `<div class="approach-preview__cost"><strong>Known immediate cost</strong><p>${escapeHtml(approach.knownImmediateCost)}</p></div>` : ""}${!available && approach.availability.reason ? `<p class="approach-preview__unavailable"><strong>${escapeHtml(stateLabel[approach.availability.state])}.</strong> ${escapeHtml(approach.availability.reason)}</p>` : ""}<button type="button" data-action="confirm-story-approach" data-approach-id="${escapeHtml(approach.id)}"${available ? "" : " disabled"}>Confirm approach</button></section>`;
};

const renderApproachStatus = (
  status: StoryApproachSurfaceStatus | undefined,
): string => status
  ? `<aside class="approach-status" data-approach-status data-status-tone="${escapeHtml(status.tone ?? "steady")}"><p class="eyebrow">${escapeHtml(status.eyebrow)}</p><strong>${escapeHtml(status.title)}</strong><p>${escapeHtml(status.detail)}</p></aside>`
  : "";

const featuredPracticeApproach = (
  catalog: StoryApproachCatalog,
  index: StoryApproachIndex,
  context: StoryApproachReadContext,
): StoryApproachView | undefined => catalog.approaches
  .filter(({ prominence }) => prominence === "practice")
  .map(({ id }) => storyApproachById(index, context, id))
  .find((approach) => approach !== undefined &&
    storyApproachIsBrowsable(approach));

const renderFeaturedPractice = (
  approach: StoryApproachView | undefined,
  resolution: StoryApproachResolutionReadout | undefined,
): string => {
  if (!approach) return "";
  const capability = approach.capabilities[0];
  if (!capability) return "";
  return `<article class="approach-featured"><div><p class="eyebrow">Your practice sees another course</p><h3>${escapeHtml(approach.label)}</h3><p>${escapeHtml(approach.lead)}</p><div class="approach-featured__facts">${resolution ? `<span>${escapeHtml(resolution.summary)}</span>` : ""}${approach.tempo ? `<span>${escapeHtml(approach.tempo.label)}</span>` : ""}</div></div><button type="button" data-action="open-featured-story-approach" data-approach-id="${escapeHtml(approach.id)}" data-approach-facet-id="${escapeHtml(capability)}">Consider this approach</button></article>`;
};

export const renderStoryPreparationSummary = (
  entries: readonly StoryPreparationSummaryEntry[],
  featuredPreparationId?: string,
): string => {
  if (entries.length === 0) return "";
  const featured = entries.find(
    (entry) => entry.id === featuredPreparationId && entry.outcome,
  );
  const outcome = featured?.outcome
    ? `<section class="story-preparation-outcome story-outcome" data-preparation-outcome data-preparation-id="${escapeHtml(featured.id)}"><button class="result-card__dismiss" type="button" data-action="dismiss-story-approach-outcome" aria-label="Dismiss result: ${escapeHtml(featured.outcome.title)}"><span aria-hidden="true">×</span></button><p class="eyebrow">${escapeHtml(featured.outcome.eyebrow)}</p><h2 data-result-title tabindex="-1">${escapeHtml(featured.outcome.title)}</h2><p class="story-outcome__body">${escapeHtml(featured.outcome.body)}</p><p class="story-outcome__result">${escapeHtml(featured.outcome.result)}</p></section>`
    : "";
  const summaryEntries = featured
    ? entries.filter((entry) => entry.id !== featured.id)
    : entries;
  const summary = summaryEntries.length === 0
    ? ""
    : `<section class="story-preparation-summary" aria-labelledby="story-preparation-title"><div class="story-preparation-summary__heading"><p class="eyebrow">Work secured</p><h2 id="story-preparation-title">What now favors the town</h2></div><ul>${summaryEntries.map((entry) => `<li data-preparation-id="${escapeHtml(entry.id)}"${entry.tone ? ` data-preparation-tone="${escapeHtml(entry.tone)}"` : ""}><span class="story-preparation-summary__mark" aria-hidden="true"></span><span class="story-preparation-summary__copy"><strong>${escapeHtml(entry.label)}</strong>${entry.detail ? `<span>${escapeHtml(entry.detail)}</span>` : ""}</span></li>`).join("")}</ul></section>`;
  return `${outcome}${summary}`;
};

export const renderStoryApproachExplorer = ({
  catalog,
  index,
  context,
  state,
  prepared,
  resolutions,
  status,
}: StoryApproachExplorerMarkupInput): string => {
  const summary = renderStoryPreparationSummary(
    prepared,
    state.featuredPreparationId,
  );
  if (!state.open) {
    const invitation = catalog.invitation;
    const actionLabel = invitation?.actionLabel ?? "Browse every approach";
    const views = catalog.approaches.map(({ id }) =>
      storyApproachById(index, context, id));
    const canBrowse = views.some((approach) =>
      approach !== undefined && storyApproachIsBrowsable(approach));
    const featured = featuredPracticeApproach(catalog, index, context);
    const browse = canBrowse
      ? `<button class="approach-explorer-toggle" type="button" data-action="open-story-approach-explorer" aria-expanded="false" aria-controls="story-approach-explorer">${escapeHtml(actionLabel)}</button>`
      : "";
    return `${summary}<section class="approach-preparation-surface">${renderApproachStatus(status)}${invitation ? `<div class="approach-invitation" aria-labelledby="approach-invitation-title"><p class="eyebrow">${escapeHtml(invitation.eyebrow)}</p><h2 id="approach-invitation-title">${escapeHtml(invitation.title)}</h2><p>${escapeHtml(invitation.detail)}</p>${renderFeaturedPractice(featured, featured ? resolutions.get(featured.id) : undefined)}${browse}</div>` : `${renderFeaturedPractice(featured, featured ? resolutions.get(featured.id) : undefined)}${browse}`}</section>`;
  }

  const facets = facetsForAxis(catalog, state.axis).filter(
    ({ id }) => visibleApproachesForFacet(index, context, state.axis, id).length > 0,
  );
  const selectedFacet = facets.some(({ id }) => id === state.facetId)
    ? state.facetId
    : facets[0]?.id;
  const approaches = selectedFacet
    ? visibleApproachesForFacet(index, context, state.axis, selectedFacet)
    : [];
  const selectedApproach =
    state.selectedApproachId &&
    approaches.some(({ id }) => id === state.selectedApproachId)
    ? storyApproachById(index, context, state.selectedApproachId)
    : undefined;

  return `${summary}${renderApproachStatus(status)}<section id="story-approach-explorer" class="approach-explorer" data-story-approach-explorer aria-labelledby="story-approach-explorer-title"><div class="approach-explorer__heading"><div><p class="eyebrow">Every course still open</p><h2 id="story-approach-explorer-title" tabindex="-1">Explore another approach</h2></div><button type="button" data-action="close-story-approach-explorer">Close</button></div><div class="approach-explorer__axes" role="group" aria-label="Browse approaches"><button type="button" data-action="set-story-approach-axis" data-approach-axis="objective" aria-pressed="${state.axis === "objective"}">By objective</button><button type="button" data-action="set-story-approach-axis" data-approach-axis="capability" aria-pressed="${state.axis === "capability"}">By capability</button><button type="button" data-action="set-story-approach-axis" data-approach-axis="target" aria-pressed="${state.axis === "target"}">By target</button></div><div class="approach-explorer__body"><nav class="approach-facets" aria-label="${escapeHtml(state.axis)} categories">${facets.map((facet) => `<button type="button" data-action="select-story-approach-facet" data-approach-axis="${state.axis}" data-approach-facet-id="${escapeHtml(facet.id)}" aria-current="${facet.id === selectedFacet ? "true" : "false"}"><strong>${escapeHtml(facet.label)}</strong>${facet.description ? `<span>${escapeHtml(facet.description)}</span>` : ""}</button>`).join("")}</nav><div class="approach-explorer__results" aria-live="off">${approaches.length > 0 ? approaches.map((approach) => renderApproachRow(approach, approach.id === state.selectedApproachId, resolutions.get(approach.id))).join("") : `<p>No authored approach is available under this heading.</p>`}</div>${renderApproachPreview(selectedApproach, selectedApproach ? resolutions.get(selectedApproach.id) : undefined)}</div></section>`;
};
