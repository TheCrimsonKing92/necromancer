import {
  clearSaveKeys,
  readSaveMetadata,
  type SaveMetadata,
  type StorageLike,
} from "../game/persistence/save-metadata";
import { renderBootstrapApp } from "./bootstrap-render";
import { completeDomUpdate } from "./focus-management";
import type { PlayableAdmissionIntent } from "./playable-admission";
import { savedAtLabel } from "./save-presentation";

export class NecromancerBootstrap {
  private metadata: SaveMetadata | null;
  private admitting = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly storage: StorageLike,
  ) {
    this.metadata = readSaveMetadata(storage);
  }

  mount(): void {
    this.root.addEventListener("click", this.handleClick);
    this.render();
  }

  private handleClick = async (event: MouseEvent): Promise<void> => {
    const origin =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-action]")
        : null;
    if (!origin || this.admitting) return;

    switch (origin.dataset.action) {
      case "start-new":
        if (this.metadata) {
          this.render("Reset the current campaign before beginning another.");
          break;
        }
        await this.admitPlayableRuntime("start-new", origin);
        break;
      case "continue":
        await this.admitPlayableRuntime("continue", origin);
        break;
      case "open-chronicle":
        await this.openChronicle(origin);
        break;
      case "close-chronicle":
        this.render();
        break;
      case "delete-save":
        this.deleteSavedGame();
        break;
      case "start-fire-road-prototype":
      case "start-action-prototype":
      case "start-tactical-prototype":
        if (import.meta.env.DEV) {
          this.admitting = true;
          try {
            const development = await import("./bootstrap-development-action");
            if (!await development.admitDevelopmentPrototype(
              this.root,
              this.storage,
              origin,
            )) throw new Error("Unknown development proof.");
            this.root.removeEventListener("click", this.handleClick);
          } catch {
            this.admitting = false;
            this.render("The development proof could not be opened.");
          }
        }
        break;
    }
  };

  private async admitPlayableRuntime(
    intent: Exclude<PlayableAdmissionIntent, "home">,
    origin: HTMLElement,
  ): Promise<void> {
    this.admitting = true;
    this.showAdmissionPending(origin, intent);
    let runtime: typeof import("./app");
    try {
      runtime = await import("./app");
    } catch {
      this.admitting = false;
      this.render("The testament could not be opened.");
      return;
    }
    this.root.removeEventListener("click", this.handleClick);
    const app = new runtime.NecromancerApp(this.root, this.storage, {
      savedAt: this.metadata?.savedAt,
    });
    await app.mount({ intent });
  }

  private async openChronicle(origin: HTMLElement): Promise<void> {
    origin.setAttribute("aria-busy", "true");
    try {
      const chronicle = await import("./chronicle-surface");
      this.root.innerHTML = chronicle.renderSavedChronicle(this.storage);
      completeDomUpdate(this.root, "page");
    } catch {
      this.render("The Chronicle could not be opened.");
    }
  }

  private showAdmissionPending(
    origin: HTMLElement,
    intent: Exclude<PlayableAdmissionIntent, "home">,
  ): void {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>(
      ".home__actions button, .save-note button",
    )) {
      button.disabled = true;
    }
    origin.setAttribute("aria-busy", "true");
    const notice = this.root.querySelector<HTMLElement>(".notice");
    if (notice) {
      notice.classList.add("notice--visible");
      notice.textContent =
        intent === "continue"
          ? "Reading the last testament."
          : "Opening the unsigned testament.";
    }
  }

  private deleteSavedGame(): void {
    if (
      !window.confirm(
        "Reset this campaign? Its current testament, world state, and Chronicle will be erased from this browser.",
      )
    ) return;
    const cleared = clearSaveKeys(this.storage);
    if (cleared) this.metadata = null;
    this.render(
      cleared
        ? "The campaign has been erased."
        : "The browser refused to erase the campaign.",
    );
  }

  private render(message?: string): void {
    this.root.innerHTML = renderBootstrapApp({
      hasSave: Boolean(this.metadata),
      savedLabel: this.metadata
        ? savedAtLabel(this.metadata.savedAt)
        : undefined,
      message,
      developmentTools: import.meta.env.DEV,
    });
    completeDomUpdate(this.root, "page");
  }
}
