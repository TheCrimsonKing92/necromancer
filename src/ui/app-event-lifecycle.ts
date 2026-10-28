export interface AppEventHandlers {
  readonly click: (event: MouseEvent) => void;
  readonly keydown: (event: KeyboardEvent) => void;
  readonly disclosureEntry: (event: Event) => void;
  readonly submit: (event: SubmitEvent) => void;
}

export const bindAppEvents = (
  root: HTMLElement,
  handlers: AppEventHandlers,
): (() => void) => {
  root.addEventListener("click", handlers.click);
  root.addEventListener("keydown", handlers.keydown);
  root.addEventListener("focusin", handlers.disclosureEntry);
  root.addEventListener("pointerover", handlers.disclosureEntry);
  root.addEventListener("submit", handlers.submit);
  return () => unbindAppEvents(root, handlers);
};

export const unbindAppEvents = (
  root: HTMLElement,
  handlers: AppEventHandlers,
): void => {
  root.removeEventListener("click", handlers.click);
  root.removeEventListener("keydown", handlers.keydown);
  root.removeEventListener("focusin", handlers.disclosureEntry);
  root.removeEventListener("pointerover", handlers.disclosureEntry);
  root.removeEventListener("submit", handlers.submit);
};
