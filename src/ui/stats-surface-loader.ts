import type { GameState } from "../game/types";
import type { RenderContext } from "./render-context";
import { ensureStatsSurfaceStyles } from "./optional-surface-styles";

type StatsRenderer = typeof import("./stats-render")["renderStatsSurface"];

let renderer: StatsRenderer | undefined;
let loading: Promise<void> | undefined;

export const ensureStatsSurface = (): Promise<void> => {
  loading ??= Promise.all([
    ensureStatsSurfaceStyles(),
    import("./stats-render"),
  ]).then(([, module]) => {
    renderer = module.renderStatsSurface;
  });
  return loading;
};

export const renderLoadedStatsSurface = (
  state: GameState,
  context: RenderContext,
): string => renderer?.(state, context) ?? "";

const parsedStatsSurface = (
  state: GameState,
  context: RenderContext,
): HTMLElement | null => {
  if (!renderer) return null;
  const template = document.createElement("template");
  template.innerHTML = renderer(state, context).trim();
  return template.content.firstElementChild as HTMLElement | null;
};

const patchStatsControl = (
  root: HTMLElement,
  statsOpen: boolean,
): boolean => {
  const control = root.querySelector<HTMLElement>("[data-stats-control]");
  if (!control) return false;
  control.dataset.action = statsOpen ? "close-stats" : "open-stats";
  control.setAttribute("aria-expanded", String(statsOpen));
  return true;
};

export const patchStatsSurface = (
  root: HTMLElement,
  state: GameState,
  context: RenderContext,
): boolean => {
  const current = root.querySelector<HTMLElement>("[data-stats-surface]");
  if (!context.statsOpen) {
    current?.remove();
    return patchStatsControl(root, false);
  }

  const next = parsedStatsSurface(state, context);
  const footer = root.querySelector<HTMLElement>(".site-footer");
  if (!next || !footer || current) return false;
  footer.before(next);
  return patchStatsControl(root, true);
};

export const patchStatsPane = (
  root: HTMLElement,
  state: GameState,
  context: RenderContext,
): boolean => {
  const currentSurface = root.querySelector<HTMLElement>("[data-stats-surface]");
  const currentPane = currentSurface?.querySelector<HTMLElement>("[data-stats-pane]");
  const nextSurface = parsedStatsSurface(state, context);
  const nextPane = nextSurface?.querySelector<HTMLElement>("[data-stats-pane]");
  if (!currentSurface || !currentPane || !nextSurface || !nextPane) return false;

  currentPane.replaceWith(nextPane);
  const nextTabs = new Map(
    [...nextSurface.querySelectorAll<HTMLElement>("[data-stats-pane-id]")].map(
      (tab) => [tab.dataset.statsPaneId, tab],
    ),
  );
  for (const tab of currentSurface.querySelectorAll<HTMLElement>(
    "[data-stats-pane-id]",
  )) {
    const nextTab = nextTabs.get(tab.dataset.statsPaneId);
    if (!nextTab) continue;
    tab.className = nextTab.className;
    tab.setAttribute(
      "aria-selected",
      nextTab.getAttribute("aria-selected") ?? "false",
    );
    tab.textContent = nextTab.textContent;
  }
  return true;
};
