const FOCUS_ID_KEYS = [
  "itemId",
  "slot",
  "woundId",
  "choiceId",
  "advancementId",
  "resultId",
  "resultKind",
  "actionId",
  "targetId",
  "approachId",
  "approachFacetId",
  "approachAxis",
] as const;

type FocusIdKey = (typeof FOCUS_ID_KEYS)[number];

export interface FocusKey {
  action: string;
  ids: Partial<Record<FocusIdKey, string>>;
}

export type FocusIntent =
  | "page"
  | "result"
  | "panel"
  | "panel-result"
  | "act"
  | "preserve"
  | { kind: "knowledge"; id: string }
  | { kind: "restore"; key: FocusKey };

export const focusKeyFor = (
  action: string,
  ids: FocusKey["ids"] = {},
): FocusKey => ({ action, ids });

export const captureFocusKey = (
  element: Element | null,
): FocusKey | undefined => {
  if (!(element instanceof HTMLElement) || !element.dataset.action) {
    return undefined;
  }

  const ids: FocusKey["ids"] = {};
  for (const key of FOCUS_ID_KEYS) {
    const value = element.dataset[key];
    if (value) ids[key] = value;
  }

  return focusKeyFor(element.dataset.action, ids);
};

const focusTargetForKey = (
  root: HTMLElement,
  key: FocusKey,
): HTMLElement | null => {
  const candidates = [
    ...root.querySelectorAll<HTMLElement>("[data-action]"),
  ];
  let exactMatch: HTMLElement | null = null;
  for (const candidate of candidates) {
    if (candidate.dataset.action !== key.action) continue;
    if (
      Object.entries(key.ids).every(
        ([id, value]) => candidate.dataset[id] === value,
      )
    ) {
      exactMatch = candidate;
      break;
    }
  }

  if (exactMatch && !exactMatch.matches(":disabled")) return exactMatch;

  const related = candidates.filter(
    (candidate) =>
      candidate.dataset.action === key.action &&
      !candidate.matches(":disabled"),
  );
  if (!exactMatch) return related[0] ?? null;

  const exactIndex = candidates.indexOf(exactMatch);
  return (
    related.find(
      (candidate) => candidates.indexOf(candidate) > exactIndex,
    ) ??
    related.at(-1) ??
    null
  );
};

export const focusAfterRender = (
  root: HTMLElement,
  intent: FocusIntent,
  preservedKey?: FocusKey,
): HTMLElement | null => {
  if (intent === "page") {
    return root.querySelector<HTMLElement>("[data-page-title]");
  }
  if (intent === "result") {
    return (
      root.querySelector<HTMLElement>("[data-result-title]") ??
      root.querySelector<HTMLElement>("[data-page-title]")
    );
  }
  if (intent === "panel") {
    return root.querySelector<HTMLElement>("[data-stats-title]");
  }
  if (intent === "panel-result") {
    return (
      root.querySelector<HTMLElement>("[data-stats-result-title]") ??
      root.querySelector<HTMLElement>("[data-stats-title]")
    );
  }
  if (intent === "act") {
    return (
      root.querySelector<HTMLElement>("[data-action-heading]") ??
      root.querySelector<HTMLElement>("[data-page-title]")
    );
  }
  if (typeof intent === "object" && intent.kind === "knowledge") {
    return (
      [...root.querySelectorAll<HTMLElement>("[aria-controls]")].find(
        (candidate) =>
          candidate.getAttribute("aria-controls") === intent.id,
      ) ?? root.querySelector<HTMLElement>("[data-stats-title]")
    );
  }

  const key =
    intent === "preserve"
      ? preservedKey
      : typeof intent === "object" && intent.kind === "restore"
        ? intent.key
        : undefined;
  return (
    (key ? focusTargetForKey(root, key) : null) ??
    root.querySelector<HTMLElement>("[data-page-title]")
  );
};

export const documentTitleFor = (pageTitle: string | null): string =>
  pageTitle && pageTitle !== "Necromancer"
    ? `${pageTitle} · Necromancer`
    : "Necromancer";

export const completeDomUpdate = (
  root: HTMLElement,
  intent: FocusIntent,
  preservedKey?: FocusKey,
): void => {
  if (intent === "result") {
    root
      .querySelector<HTMLElement>("[data-tactical-outcome-slot] .story-outcome, .story-outcome")
      ?.classList.add("result-card--entering");
  }
  const pageTitle =
    root.querySelector<HTMLElement>("[data-page-title]")?.textContent ?? null;
  document.title = documentTitleFor(pageTitle);
  window.requestAnimationFrame(() => {
    focusAfterRender(root, intent, preservedKey)?.focus({
      preventScroll: true,
    });
  });
};
