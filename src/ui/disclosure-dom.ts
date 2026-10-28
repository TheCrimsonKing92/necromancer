export const closeKnowledgeDisclosures = (
  root: HTMLElement,
  except?: HTMLElement,
): void => {
  for (const disclosure of root.querySelectorAll<HTMLElement>(
    ".knowledge-disclosure.is-open",
  )) {
    if (disclosure === except) continue;
    disclosure.classList.remove("is-open");
    disclosure
      .querySelector<HTMLElement>('[data-action="toggle-knowledge"]')
      ?.setAttribute("aria-expanded", "false");
  }
};

export const toggleKnowledgeDisclosure = (
  root: HTMLElement,
  trigger: HTMLElement,
): void => {
  const disclosure = trigger.closest<HTMLElement>(
    ".knowledge-disclosure",
  );
  if (!disclosure) return;
  disclosure.classList.remove("is-dismissed");
  const open = !disclosure.classList.contains("is-open");
  closeKnowledgeDisclosures(root, disclosure);
  disclosure.classList.toggle("is-open", open);
  trigger.setAttribute("aria-expanded", String(open));
};

export const closeFocusedKnowledgeDisclosure = (
  root: HTMLElement,
): boolean => {
  const activeDisclosure =
    document.activeElement instanceof Element
      ? document.activeElement.closest<HTMLElement>(
          ".knowledge-disclosure",
        )
      : null;
  const disclosure =
    activeDisclosure ??
    root.querySelector<HTMLElement>(
      ".knowledge-disclosure.is-open",
    );
  if (!disclosure) return false;
  if (
    activeDisclosure &&
    activeDisclosure.classList.contains("is-dismissed") &&
    !activeDisclosure.classList.contains("is-open")
  ) {
    return false;
  }

  const trigger = disclosure.querySelector<HTMLElement>(
    '[data-action="toggle-knowledge"]',
  );
  disclosure.classList.remove("is-open");
  disclosure.classList.add("is-dismissed");
  trigger?.setAttribute("aria-expanded", "false");
  return true;
};

export const restoreKnowledgeDisclosure = (
  target: EventTarget | null,
): void => {
  if (!(target instanceof Element)) return;
  target
    .closest<HTMLElement>(".knowledge-disclosure")
    ?.classList.remove("is-dismissed");
};
