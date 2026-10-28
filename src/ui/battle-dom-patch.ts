const copyAttribute = (
  current: Element,
  next: Element,
  name: string,
): void => {
  const value = next.getAttribute(name);
  if (value === null) {
    if (current.hasAttribute(name)) current.removeAttribute(name);
  } else if (current.getAttribute(name) !== value) {
    current.setAttribute(name, value);
  }
};

const replaceContents = (
  currentRoot: ParentNode,
  nextRoot: ParentNode,
  selector: string,
): boolean => {
  const current = currentRoot.querySelector<HTMLElement>(selector);
  const next = nextRoot.querySelector<HTMLElement>(selector);
  if (!current || !next) return false;
  if (current.innerHTML !== next.innerHTML) {
    current.innerHTML = next.innerHTML;
  }
  return true;
};

const syncOptional = (
  currentParent: HTMLElement,
  nextParent: HTMLElement,
  selector: string,
): void => {
  const current = currentParent.querySelector<HTMLElement>(selector);
  const next = nextParent.querySelector<HTMLElement>(selector);
  if (current && next) {
    if (current.outerHTML !== next.outerHTML) {
      current.replaceWith(next.cloneNode(true));
    }
  } else if (current) {
    current.remove();
  } else if (next) {
    currentParent.append(next.cloneNode(true));
  }
};

const patchMeter = (
  currentDossier: HTMLElement,
  nextDossier: HTMLElement,
  tone: string,
): void => {
  const selector = `.meter--${tone}`;
  const current = currentDossier.querySelector<HTMLElement>(selector);
  const next = nextDossier.querySelector<HTMLElement>(selector);

  if (!current && next) {
    const experience =
      currentDossier.querySelector<HTMLElement>(".meter--experience");
    if (experience) experience.before(next.cloneNode(true));
    else currentDossier.append(next.cloneNode(true));
    return;
  }
  if (current && !next) {
    current.remove();
    return;
  }
  if (!current || !next) return;

  replaceContents(current, next, ".meter__labels");
  const currentTrack =
    current.querySelector<HTMLElement>(".meter__track");
  const nextTrack = next.querySelector<HTMLElement>(".meter__track");
  const currentFill =
    current.querySelector<HTMLElement>(".meter__fill");
  const nextFill = next.querySelector<HTMLElement>(".meter__fill");
  if (!currentTrack || !nextTrack || !currentFill || !nextFill) return;

  for (const name of [
    "aria-label",
    "aria-valuemin",
    "aria-valuemax",
    "aria-valuenow",
  ]) {
    copyAttribute(currentTrack, nextTrack, name);
  }
  const currentScale = currentFill.style.getPropertyValue("--meter-fill");
  const nextScale = nextFill.style.getPropertyValue("--meter-fill");
  if (currentScale !== nextScale) {
    currentFill.style.setProperty("--meter-fill", nextScale);
  }
};

const patchActions = (
  currentRoot: ParentNode,
  nextRoot: ParentNode,
): boolean => {
  const currentSection =
    currentRoot.querySelector<HTMLElement>(".action-section");
  const nextSection =
    nextRoot.querySelector<HTMLElement>(".action-section");
  if (!currentSection || !nextSection) return false;

  replaceContents(currentSection, nextSection, ".section-heading");
  const currentActions =
    currentSection.querySelectorAll<HTMLElement>("[data-action-id]");
  const nextActions =
    nextSection.querySelectorAll<HTMLElement>("[data-action-id]");
  if (currentActions.length !== nextActions.length) {
    if (currentSection.innerHTML !== nextSection.innerHTML) {
      currentSection.innerHTML = nextSection.innerHTML;
    }
    return true;
  }

  for (const nextAction of nextActions) {
    const id = nextAction.dataset.actionId;
    const currentAction = [...currentActions].find(
      (candidate) => candidate.dataset.actionId === id,
    );
    if (!currentAction) {
      if (currentSection.innerHTML !== nextSection.innerHTML) {
        currentSection.innerHTML = nextSection.innerHTML;
      }
      return true;
    }
    if (currentAction.innerHTML !== nextAction.innerHTML) {
      currentAction.innerHTML = nextAction.innerHTML;
    }
    for (const name of ["class", "disabled", "aria-disabled"]) {
      copyAttribute(currentAction, nextAction, name);
    }
  }

  syncOptional(currentSection, nextSection, ".latest-exchange-link");
  return true;
};

const patchBattleLog = (
  currentRoot: HTMLElement,
  nextRoot: DocumentFragment,
): void => {
  const currentMain =
    currentRoot.querySelector<HTMLElement>(".battle-main");
  const nextMain = nextRoot.querySelector<HTMLElement>(".battle-main");
  if (!currentMain || !nextMain) return;

  const currentLog =
    currentMain.querySelector<HTMLElement>(".battle-log");
  const nextLog = nextMain.querySelector<HTMLElement>(".battle-log");
  if (!currentLog && nextLog) {
    currentMain.append(nextLog.cloneNode(true));
    return;
  }
  if (currentLog && !nextLog) {
    currentLog.remove();
    return;
  }
  if (!currentLog || !nextLog) return;

  replaceContents(currentLog, nextLog, ".section-heading");
  const currentList = currentLog.querySelector<HTMLOListElement>("ol");
  const nextList = nextLog.querySelector<HTMLOListElement>("ol");
  if (!currentList || !nextList) return;

  const nextIds = new Set(
    [...nextList.children].map((entry) =>
      (entry as HTMLElement).dataset.logId,
    ),
  );
  for (const entry of [...currentList.children]) {
    if (!nextIds.has((entry as HTMLElement).dataset.logId)) entry.remove();
  }
  const currentIds = new Set(
    [...currentList.children].map((entry) =>
      (entry as HTMLElement).dataset.logId,
    ),
  );
  for (const entry of [...nextList.children]) {
    const id = (entry as HTMLElement).dataset.logId;
    if (!currentIds.has(id)) currentList.append(entry.cloneNode(true));
  }
};

const patchDossier = (
  currentRoot: HTMLElement,
  nextRoot: DocumentFragment,
): boolean => {
  const current =
    currentRoot.querySelector<HTMLElement>(".dossier");
  const next = nextRoot.querySelector<HTMLElement>(".dossier");
  if (!current || !next) return false;

  for (const tone of ["health", "spirit", "ward", "experience"]) {
    patchMeter(current, next, tone);
  }
  replaceContents(current, next, ".stat-list");
  syncOptional(current, next, ".status-list");
  syncOptional(current, next, ".dossier__warning");
  syncOptional(current, next, ".dossier__notice");

  const currentNotes = [...current.querySelectorAll<HTMLElement>(".ally-note")];
  const nextNotes = [...next.querySelectorAll<HTMLElement>(".ally-note")];
  if (
    currentNotes.map((note) => note.outerHTML).join("") !==
    nextNotes.map((note) => note.outerHTML).join("")
  ) {
    for (const note of currentNotes) note.remove();
    for (const note of nextNotes) current.append(note.cloneNode(true));
  }
  return true;
};

const patchBattleDecision = (
  currentRoot: HTMLElement,
  nextRoot: DocumentFragment,
): boolean => {
  const current = currentRoot.querySelector<HTMLElement>(
    "[data-battle-decision]",
  );
  const next = nextRoot.querySelector<HTMLElement>(
    "[data-battle-decision]",
  );
  if (!current || !next) return false;
  const actionPresenceChanged = Boolean(
    current.querySelector(".action-section"),
  ) !== Boolean(next.querySelector(".action-section"));
  if (actionPresenceChanged) {
    if (current.innerHTML !== next.innerHTML) current.innerHTML = next.innerHTML;
    return true;
  }
  syncOptional(current, next, ".servant-command-section");
  return patchActions(current, next);
};

export const patchBattleDom = (
  root: HTMLElement,
  nextMarkup: string,
): boolean => {
  const currentShell =
    root.querySelector<HTMLElement>('.app-shell[data-screen="battle"]');
  if (!currentShell) return false;

  const template = document.createElement("template");
  template.innerHTML = nextMarkup;
  const nextShell =
    template.content.querySelector<HTMLElement>(
      '.app-shell[data-screen="battle"]',
    );
  if (!nextShell) return false;

  if (
    !replaceContents(currentShell, template.content, ".battle-heading") ||
    !replaceContents(currentShell, template.content, ".battle-summary") ||
    !replaceContents(currentShell, template.content, ".enemy-section") ||
    !patchBattleDecision(currentShell, template.content) ||
    !patchDossier(currentShell, template.content)
  ) {
    return false;
  }

  patchBattleLog(currentShell, template.content);
  copyAttribute(currentShell, nextShell, "data-tradition");
  return true;
};

export const patchBattleDirectionDom = (
  root: HTMLElement,
  nextMarkup: {
    decision: string;
    log: {
      count: number;
      entries: { id: string; markup: string }[];
      full: string;
    };
  },
): boolean => {
  const currentShell =
    root.querySelector<HTMLElement>('.app-shell[data-screen="battle"]');
  if (!currentShell) return false;
  const currentDecision =
    currentShell.querySelector<HTMLElement>("[data-battle-decision]");
  const currentMain = currentShell.querySelector<HTMLElement>(".battle-main");
  if (!currentDecision || !currentMain || !nextMarkup.decision) return false;
  if (currentDecision.outerHTML !== nextMarkup.decision) {
    currentDecision.outerHTML = nextMarkup.decision;
  }
  const currentLog = currentMain.querySelector<HTMLElement>(".battle-log");
  if (currentLog && nextMarkup.log.count > 0) {
    const count = currentLog.querySelector<HTMLElement>(".section-heading span");
    const list = currentLog.querySelector<HTMLOListElement>("ol");
    if (!count || !list) return false;
    count.textContent = `Last ${nextMarkup.log.count} entries`;
    const nextIds = new Set(nextMarkup.log.entries.map(({ id }) => id));
    for (const entry of [...list.children]) {
      if (!nextIds.has((entry as HTMLElement).dataset.logId ?? "")) {
        entry.remove();
      }
    }
    const currentIds = new Set(
      [...list.children].map((entry) => (entry as HTMLElement).dataset.logId),
    );
    for (const entry of nextMarkup.log.entries) {
      if (!currentIds.has(entry.id)) {
        list.insertAdjacentHTML("beforeend", entry.markup);
      }
    }
  } else if (currentLog) {
    currentLog.remove();
  } else if (nextMarkup.log.full) {
    currentMain.insertAdjacentHTML("beforeend", nextMarkup.log.full);
  }
  return true;
};
