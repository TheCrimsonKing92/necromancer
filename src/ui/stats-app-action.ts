import { availableDisciplinePoints } from "../game/advancements";
import type { AdvancementId, GameState } from "../game/types";
import { completeDomUpdate, focusKeyFor } from "./focus-management";
import type { StatsPane } from "./render-context";
import {
  ensureStatsSurface,
  patchStatsPane,
  patchStatsSurface,
} from "./stats-surface-loader";

interface StatsActionContext {
  root: HTMLElement;
  state: GameState;
  hasSave: boolean;
  selectedAdvancementId?: AdvancementId;
}

export const openStatsAppSurface = async (
  context: StatsActionContext,
  currentPane: StatsPane,
  origin: HTMLElement,
): Promise<{ pane: StatsPane; patched: boolean }> => {
  const player = context.state.run?.player;
  if (!player) return { pane: currentPane, patched: false };
  const pane =
    availableDisciplinePoints(player) > 0 ? "disciplines" : currentPane;
  await ensureStatsSurface();
  const patched = patchStatsSurface(context.root, context.state, {
    hasSave: context.hasSave,
    statsOpen: true,
    statsPane: pane,
    selectedAdvancementId: context.selectedAdvancementId,
  });
  if (patched) {
    completeDomUpdate(
      context.root,
      origin.dataset.knowledgeId
        ? { kind: "knowledge", id: origin.dataset.knowledgeId }
        : "panel",
    );
  }
  return { pane, patched };
};

export const changeStatsAppPane = (
  context: StatsActionContext,
  currentPane: StatsPane,
  origin: HTMLElement,
): { pane: StatsPane; patched: boolean } | undefined => {
  const pane = origin.dataset.statsPaneId;
  if (
    (pane !== "character" && pane !== "disciplines") ||
    pane === currentPane
  ) return undefined;
  return {
    pane,
    patched: patchStatsPane(context.root, context.state, {
      hasSave: context.hasSave,
      statsOpen: true,
      statsPane: pane,
      selectedAdvancementId: context.selectedAdvancementId,
    }),
  };
};

export const closeStatsAppSurface = (
  context: StatsActionContext,
): boolean => {
  const focusIntent = { kind: "restore" as const, key: focusKeyFor("open-stats") };
  const patched = patchStatsSurface(context.root, context.state, {
    hasSave: context.hasSave,
    statsOpen: false,
  });
  if (patched) completeDomUpdate(context.root, focusIntent);
  return patched;
};

export const moveStatsTabFromKey = (
  root: HTMLElement,
  event: KeyboardEvent,
): boolean => {
  const tab =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>('[role="tab"][data-stats-pane-id]')
      : null;
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    return false;
  }
  const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"][data-stats-pane-id]')];
  const current = tabs.indexOf(tab);
  const next =
    event.key === "Home"
      ? tabs[0]
      : event.key === "End"
        ? tabs.at(-1)
        : tabs[(current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
  if (!next) return false;
  event.preventDefault();
  next.focus();
  next.click();
  return true;
};
