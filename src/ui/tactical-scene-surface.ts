import { fireRoadTacticalScene } from "../game/content-packs/integration/moving-shade-fire-road/tactical-scene";
import type { GameState } from "../game/types";
import type {} from "./development-tactical-scene-runtime";
import { renderTacticalScene } from "./tactical-scene-render";
import { completeDomUpdate, focusKeyFor } from "./focus-management";

const projectionFor = (state: GameState) =>
  state.screen === "story" && state.storyId === "moving-shade:fire-road" && state.run
    ? fireRoadTacticalScene(state.run)
    : undefined;

let latestProjection: ReturnType<typeof projectionFor>;
const seenAttentionKeys = new Set<string>();

globalThis.__renderNecromancerTacticalScene = (state, selectedSubjectId, outcomeMarkup) => {
  const nextProjection = projectionFor(state);
  if (nextProjection?.id !== latestProjection?.id) seenAttentionKeys.clear();
  latestProjection = nextProjection;
  return latestProjection
    ? renderTacticalScene(latestProjection, {
      selectedSubjectId,
      outcomeMarkup,
      seenAttentionKeys,
    })
    : "";
};

document.querySelector<HTMLElement>("#app")?.addEventListener("click", (event) => {
  const origin = event.target instanceof Element
    ? event.target.closest<HTMLElement>('[data-action="select-tactical-subject"]')
    : null;
  if (!origin) return;
  const subjectId = origin.dataset.tacticalSubjectId;
  const root = document.querySelector<HTMLElement>("#app");
  const host = root?.querySelector<HTMLElement>("[data-story-tactical-host]");
  if (!subjectId || !root || !host || !latestProjection) return;
  const subject = latestProjection.subjects.find(({ id }) => id === subjectId);
  if (subject?.attention) seenAttentionKeys.add(subject.attention.key);
  const outcomeMarkup = host.querySelector<HTMLElement>("[data-tactical-outcome-slot]")?.innerHTML;
  host.innerHTML = renderTacticalScene(latestProjection, {
    selectedSubjectId: subjectId,
    outcomeMarkup,
    seenAttentionKeys,
  });
  completeDomUpdate(root, {
    kind: "restore",
    key: focusKeyFor("select-tactical-subject"),
  });
  window.requestAnimationFrame(() => {
    [...host.querySelectorAll<HTMLElement>("[data-tactical-subject-id]")]
      .find((candidate) => candidate.dataset.tacticalSubjectId === subjectId)
      ?.focus({ preventScroll: true });
  });
});

export const tacticalSceneSurfaceReady = true;
