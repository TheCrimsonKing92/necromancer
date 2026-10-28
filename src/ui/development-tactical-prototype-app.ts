import type {
  TacticalSceneProjection,
  TacticalScenePrototype,
  TacticalSceneTransition,
} from "../game/tactical-scene";
import type { StorageLike } from "../game/persistence/save-metadata";
import { captureFocusKey, completeDomUpdate, focusKeyFor } from "./focus-management";

type DevelopmentPrototypeId = "siege-sovereign" | "interdict";

interface TacticalPrototypeAdapter {
  readonly id: DevelopmentPrototypeId;
  readonly label: string;
  createState(): unknown;
  project(state: unknown): TacticalSceneProjection;
  act(state: unknown, actionId: string): TacticalSceneTransition<unknown>;
  render(
    projection: TacticalSceneProjection,
    selectedSubjectId?: string,
    seenAttentionKeys?: ReadonlySet<string>,
  ): string;
}

const adapt = <State>(
  id: DevelopmentPrototypeId,
  label: string,
  prototype: TacticalScenePrototype<State>,
  render: (
    projection: TacticalSceneProjection,
    selectedSubjectId?: string,
    seenAttentionKeys?: ReadonlySet<string>,
  ) => string,
): TacticalPrototypeAdapter => ({
  id,
  label,
  createState: prototype.createState,
  project: (state) => prototype.project(state as State),
  act: (state, actionId) => prototype.act(state as State, actionId),
  render,
});

const loadAdapter = async (
  id: DevelopmentPrototypeId,
): Promise<TacticalPrototypeAdapter> => {
  if (id === "siege-sovereign") {
    const [domain, presentation] = await Promise.all([
      import("../game/development-prototypes/siege-sovereign/failing-conduit"),
      import("./development-prototypes/siege-sovereign/failing-conduit-render"),
      import("../styles/development-prototypes/siege-sovereign/failing-conduit.css"),
      import("../styles/tactical-course.css"),
      import("../styles/tactical-subject-attention.css"),
    ]);
    return adapt(
      id,
      "Siege Sovereign · The Failing Conduit",
      domain.SIEGE_SOVEREIGN_FAILING_CONDUIT,
      presentation.renderSiegeSovereignFailingConduit,
    );
  }
  const [domain, presentation] = await Promise.all([
    import("../game/development-prototypes/interdict/winter-sluice"),
    import("./development-prototypes/interdict/winter-sluice-render"),
    import("../styles/development-prototypes/interdict/winter-sluice.css"),
    import("../styles/tactical-course.css"),
    import("../styles/tactical-subject-attention.css"),
  ]);
  return adapt(
    id,
    "Interdict · The Winter Sluice",
    domain.INTERDICT_WINTER_SLUICE_PROTOTYPE,
    presentation.renderInterdictWinterSluice,
  );
};

const isDevelopmentPrototypeId = (
  value: string | undefined,
): value is DevelopmentPrototypeId =>
  value === "siege-sovereign" || value === "interdict";

export class DevelopmentTacticalPrototypeApp {
  private state: unknown;
  private selectedSubjectId?: string;
  private readonly seenAttentionKeys = new Set<string>();

  private constructor(
    private readonly root: HTMLElement,
    private readonly storage: StorageLike,
    private readonly adapter: TacticalPrototypeAdapter,
  ) {
    this.state = adapter.createState();
  }

  static async mount(
    root: HTMLElement,
    storage: StorageLike,
    id: string | undefined,
  ): Promise<DevelopmentTacticalPrototypeApp | undefined> {
    if (!isDevelopmentPrototypeId(id)) return undefined;
    const app = new DevelopmentTacticalPrototypeApp(
      root,
      storage,
      await loadAdapter(id),
    );
    app.root.addEventListener("click", app.handleClick);
    app.renderPage();
    return app;
  }

  private handleClick = async (event: MouseEvent): Promise<void> => {
    const origin = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-action]")
      : null;
    if (!origin) return;
    switch (origin.dataset.action) {
      case "select-tactical-subject": {
        const subjectId = origin.dataset.tacticalSubjectId;
        if (!subjectId) return;
        const subject = this.adapter.project(this.state).subjects.find(({ id }) => id === subjectId);
        if (subject?.attention) this.seenAttentionKeys.add(subject.attention.key);
        this.selectedSubjectId = subjectId;
        this.patchSceneSelection(subjectId);
        break;
      }
      case "act-tactical-prototype": {
        const actionId = origin.dataset.tacticalActionId;
        if (!actionId) return;
        const preserved = captureFocusKey(origin);
        const transition = this.adapter.act(this.state, actionId);
        if (transition.error) return;
        this.state = transition.state;
        this.patchScene();
        completeDomUpdate(
          this.root,
          transition.event ? "result" : "preserve",
          preserved,
        );
        break;
      }
      case "restart-tactical-prototype":
        this.state = this.adapter.createState();
        this.selectedSubjectId = undefined;
        this.seenAttentionKeys.clear();
        this.patchScene();
        completeDomUpdate(this.root, "page");
        break;
      case "exit-tactical-prototype": {
        this.root.removeEventListener("click", this.handleClick);
        const { NecromancerBootstrap } = await import("./bootstrap");
        new NecromancerBootstrap(this.root, this.storage).mount();
        break;
      }
    }
  };

  private sceneMarkup(): string {
    return this.adapter.render(
      this.adapter.project(this.state),
      this.selectedSubjectId,
      this.seenAttentionKeys,
    );
  }

  private patchScene(): void {
    const host = this.root.querySelector<HTMLElement>("[data-development-tactical-host]");
    if (host) host.innerHTML = this.sceneMarkup();
    else this.renderPage();
  }

  private patchSceneSelection(subjectId: string): void {
    const host = this.root.querySelector<HTMLElement>("[data-development-tactical-host]");
    if (!host) {
      this.renderPage();
      return;
    }
    const template = document.createElement("template");
    template.innerHTML = this.sceneMarkup();
    const next = template.content.firstElementChild;
    const currentInspector = host.querySelector<HTMLElement>(
      ".siege-conduit__focus, .interdict-sluice__inspector",
    );
    const nextInspector = next?.querySelector<HTMLElement>(
      ".siege-conduit__focus, .interdict-sluice__inspector",
    );
    if (!currentInspector || !nextInspector) {
      host.innerHTML = this.sceneMarkup();
    } else {
      currentInspector.replaceWith(nextInspector);
      for (const marker of host.querySelectorAll<HTMLElement>(
        "[data-tactical-subject-id]",
      )) {
        const selected = marker.dataset.tacticalSubjectId === subjectId;
        marker.setAttribute("aria-pressed", String(selected));
        marker.classList.toggle("siege-conduit__subject--selected", selected);
        marker.classList.toggle("is-selected", selected);
        if (selected) {
          const nextMarker = next?.querySelector<HTMLElement>(
            `[data-tactical-subject-id="${CSS.escape(subjectId)}"]`,
          );
          marker.removeAttribute("data-tactical-attention");
          marker.querySelector(".tactical-subject-attention")?.remove();
          if (nextMarker?.ariaLabel) marker.ariaLabel = nextMarker.ariaLabel;
        }
      }
    }
    completeDomUpdate(this.root, {
      kind: "restore",
      key: focusKeyFor("select-tactical-subject"),
    });
    window.requestAnimationFrame(() => {
      [...host.querySelectorAll<HTMLElement>("[data-tactical-subject-id]")]
        .find((candidate) => candidate.dataset.tacticalSubjectId === subjectId)
        ?.focus({ preventScroll: true });
    });
  }

  private renderPage(): void {
    this.root.innerHTML = `<div class="app-shell development-tactical-shell" data-screen="development-proof">
      <nav class="development-tactical-shell__nav" aria-label="Development proof controls">
        <strong>${this.adapter.label}</strong>
        <span>Noncanonical · not autosaved</span>
        <button type="button" data-action="restart-tactical-prototype">Reset scene</button>
        <button type="button" data-action="exit-tactical-prototype">Return to proofs</button>
      </nav>
      <main data-development-tactical-host>${this.sceneMarkup()}</main>
    </div>`;
    completeDomUpdate(this.root, "page");
  }
}
