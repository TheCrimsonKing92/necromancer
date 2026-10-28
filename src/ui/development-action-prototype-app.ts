import type {
  DevelopmentActionIntent,
  DevelopmentActionTransition,
} from "../game/development-action-proof";
import type { StorageLike } from "../game/persistence/save-metadata";
import { completeDomUpdate } from "./focus-management";
import {
  ACTION_PROOF_ENTRY_MOTION,
  applyActionProofMotionCues,
  motionCuesForActionProofIntent,
  type ActionProofMotionCue,
} from "./visual-rigs/action-proof-motion";
import {
  captureActionProofSpatialPositions,
  scheduleActionProofSpatialMotion,
} from "./visual-rigs/action-proof-spatial-motion";
import {
  advanceActionProofConversation,
  openActionProofConversation,
  renderActionProofConversation,
  type ActionProofConversation,
  type ActionProofConversationState,
} from "./development-prototypes/action-proof-conversation";

export type DevelopmentActionPrototypeId = "siege-breach-yard" | "fire-road-under-ash";

interface DevelopmentActionAdapter {
  readonly id: DevelopmentActionPrototypeId;
  readonly label: string;
  createState(): unknown;
  render(state: unknown): string;
  step(state: unknown, intent: DevelopmentActionIntent): DevelopmentActionTransition<unknown>;
  readonly initialConversationId?: string;
  conversation?(state: unknown, id: string): ActionProofConversation | undefined;
}

const loadAdapter = async (id: DevelopmentActionPrototypeId): Promise<DevelopmentActionAdapter> => {
  if (id === "fire-road-under-ash") {
    const [domain, presentation, conversation] = await Promise.all([
      import("../game/development-prototypes/fire-road/road-under-ash"),
      import("./development-prototypes/fire-road/road-under-ash-render"),
      import("./development-prototypes/fire-road/road-under-ash-conversations"),
      import("../styles/development-prototypes/action-proof-stage.css"),
      import("../styles/development-prototypes/visual-rig-motion.css"),
      import("../styles/development-prototypes/fire-road/road-under-ash.css"),
      import("../styles/development-prototypes/action-proof-conversation.css"),
    ]);
    return {
      id,
      label: "Fire Road · Road Under Ash",
      createState: domain.FIRE_ROAD_UNDER_ASH.createState,
      render: (state) => presentation.renderFireRoadUnderAsh(
        domain.FIRE_ROAD_UNDER_ASH.project(state as Parameters<typeof domain.FIRE_ROAD_UNDER_ASH.project>[0]),
      ),
      step: (state, intent) => domain.FIRE_ROAD_UNDER_ASH.step(
        state as Parameters<typeof domain.FIRE_ROAD_UNDER_ASH.step>[0],
        intent,
      ),
      initialConversationId: conversation.FIRE_ROAD_ARRIVAL_CONVERSATION.id,
      conversation: (_state, id) => conversation.fireRoadConversationById(id),
    };
  }
  const [domain, presentation] = await Promise.all([
    import("../game/development-prototypes/siege-sovereign/breach-yard"),
    import("./development-prototypes/siege-sovereign/breach-yard-render"),
    import("../styles/development-prototypes/action-proof-stage.css"),
    import("../styles/development-prototypes/visual-rig-motion.css"),
    import("../styles/development-prototypes/siege-sovereign/breach-yard.css"),
    import("../styles/development-prototypes/action-proof-conversation.css"),
  ]);
  return {
    id,
    label: "Siege Sovereign · Breach Yard",
    createState: domain.SIEGE_SOVEREIGN_BREACH_YARD.createState,
    render: (state) => presentation.renderSiegeSovereignBreachYard(
      domain.SIEGE_SOVEREIGN_BREACH_YARD.project(state as Parameters<typeof domain.SIEGE_SOVEREIGN_BREACH_YARD.project>[0]),
    ),
    step: (state, intent) => domain.SIEGE_SOVEREIGN_BREACH_YARD.step(
      state as Parameters<typeof domain.SIEGE_SOVEREIGN_BREACH_YARD.step>[0],
      intent,
    ),
  };
};

export const isDevelopmentActionPrototypeId = (value: string | undefined): value is DevelopmentActionPrototypeId =>
  value === "siege-breach-yard" || value === "fire-road-under-ash";

export class DevelopmentActionPrototypeApp {
  private state: unknown;
  private selectedActionId: string | undefined;
  private selectedTargetId: string | undefined;
  private selectedResolvedActionId: string | undefined;
  private selectedSubjectId: string | undefined;
  private previewedMoveId: string | undefined;
  private lastPointerType: string | undefined;
  private activeConversation: ActionProofConversationState | undefined;
  private conversationRestoreId: string | undefined;

  private constructor(
    private readonly root: HTMLElement,
    private readonly storage: StorageLike,
    private readonly adapter: DevelopmentActionAdapter,
  ) {
    this.state = adapter.createState();
  }

  static async mount(
    root: HTMLElement,
    storage: StorageLike,
    id: string | undefined,
  ): Promise<DevelopmentActionPrototypeApp | undefined> {
    if (!isDevelopmentActionPrototypeId(id)) return undefined;
    const app = new DevelopmentActionPrototypeApp(root, storage, await loadAdapter(id));
    root.addEventListener("click", app.handleClick);
    root.addEventListener("focusin", app.handleTargetPreview);
    root.addEventListener("pointerdown", app.handleMovePointerDown);
    root.addEventListener("pointerover", app.handleTargetPreview);
    app.renderPage();
    if (app.adapter.initialConversationId) app.openConversation(app.adapter.initialConversationId);
    return app;
  }

  private handleClick = async (event: MouseEvent): Promise<void> => {
    const origin = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-action]")
      : null;
    if (!origin) return;
    if (origin.closest<HTMLElement>("[data-development-action-host]")?.dataset.turnSequenceActive !== undefined) return;
    const pointerType = this.lastPointerType;
    this.lastPointerType = undefined;
    if (origin.dataset.action === "move-action-proof") {
      const destinationId = origin.dataset.destinationId;
      if (destinationId) {
        const touchLike = pointerType !== undefined && pointerType !== "mouse";
        if (touchLike && this.previewedMoveId !== destinationId) {
          this.previewMove(origin, destinationId);
          return;
        }
        this.clearMovePreview();
        this.commit({ kind: "move", destinationId });
      }
    } else if (origin.dataset.action === "act-action-proof") {
      const actionId = origin.dataset.actionProofId;
      if (actionId) this.commit({ kind: "act", actionId });
    } else if (origin.dataset.action === "select-action-proof") {
      this.selectAction(origin);
    } else if (origin.dataset.action === "select-action-proof-target") {
      this.selectTarget(origin);
    } else if (origin.dataset.action === "select-action-proof-subject") {
      this.selectSubject(origin);
    } else if (origin.dataset.action === "close-action-proof-subject") {
      this.clearSubject(true);
    } else if (origin.dataset.action === "confirm-action-proof-target") {
      if (this.selectedActionId && this.selectedTargetId) {
        this.commit({ kind: "act", actionId: this.selectedResolvedActionId ?? this.selectedActionId, targetId: this.selectedTargetId });
      }
    } else if (origin.dataset.action === "cancel-action-proof-targeting") {
      this.clearTargeting(true);
    } else if (origin.dataset.action === "open-action-proof-conversation") {
      const conversationId = origin.dataset.actionProofConversationId;
      const entityId = origin.querySelector<HTMLElement>("[data-visual-entity-id]")?.dataset.visualEntityId;
      if (conversationId) this.openConversation(conversationId, entityId);
    } else if (origin.dataset.action === "choose-action-proof-conversation") {
      const choiceId = origin.dataset.conversationChoiceId;
      if (choiceId) this.chooseConversation(choiceId);
    } else if (origin.dataset.action === "close-action-proof-conversation") {
      this.closeConversation(true);
    } else if (origin.dataset.action === "restart-action-proof") {
      this.clearTargeting();
      this.clearSubject();
      this.state = this.adapter.createState();
      this.patchScene("page", ACTION_PROOF_ENTRY_MOTION);
    } else if (origin.dataset.action === "exit-action-proof") {
      this.root.removeEventListener("click", this.handleClick);
      this.root.removeEventListener("focusin", this.handleTargetPreview);
      this.root.removeEventListener("pointerdown", this.handleMovePointerDown);
      this.root.removeEventListener("pointerover", this.handleTargetPreview);
      const { NecromancerBootstrap } = await import("./bootstrap");
      new NecromancerBootstrap(this.root, this.storage).mount();
    }
  };

  private handleMovePointerDown = (event: PointerEvent): void => {
    this.lastPointerType = event.pointerType;
    const origin = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-action="move-action-proof"]')
      : null;
    if (!origin && event.pointerType !== "mouse") this.clearMovePreview();
  };

  private conversationDefinition(): ActionProofConversation | undefined {
    return this.activeConversation
      ? this.adapter.conversation?.(this.state, this.activeConversation.conversationId)
      : undefined;
  }

  private openConversation(conversationId: string, restoreId?: string): void {
    const conversation = this.adapter.conversation?.(this.state, conversationId);
    if (!conversation) return;
    this.clearSubject();
    this.activeConversation = openActionProofConversation(conversation);
    this.conversationRestoreId = restoreId;
    this.patchConversation();
  }

  private chooseConversation(choiceId: string): void {
    const conversation = this.conversationDefinition();
    if (!conversation || !this.activeConversation) return;
    const next = advanceActionProofConversation(conversation, this.activeConversation, choiceId);
    if (!next) {
      this.closeConversation(true);
      return;
    }
    this.activeConversation = next;
    this.patchConversation();
  }

  private patchConversation(): void {
    const host = this.root.querySelector<HTMLElement>("[data-action-proof-conversation-host]");
    const world = this.root.querySelector<HTMLElement>("[data-action-proof-world]");
    const frame = this.root.querySelector<HTMLElement>(".action-stage__frame");
    const conversation = this.conversationDefinition();
    if (!host || !world || !frame || !conversation || !this.activeConversation) return;
    host.innerHTML = renderActionProofConversation(conversation, this.activeConversation);
    world.inert = true;
    world.setAttribute("aria-hidden", "true");
    frame.dataset.conversationActive = "";
    host.querySelector<HTMLElement>("#action-conversation-title")?.focus({ preventScroll: true });
  }

  private closeConversation(restoreFocus = false): void {
    const restoreId = this.conversationRestoreId;
    this.activeConversation = undefined;
    this.conversationRestoreId = undefined;
    const host = this.root.querySelector<HTMLElement>("[data-action-proof-conversation-host]");
    const world = this.root.querySelector<HTMLElement>("[data-action-proof-world]");
    const frame = this.root.querySelector<HTMLElement>(".action-stage__frame");
    if (host) host.innerHTML = "";
    if (world) {
      world.inert = false;
      world.removeAttribute("aria-hidden");
    }
    if (frame) delete frame.dataset.conversationActive;
    if (restoreFocus && restoreId) {
      this.root.querySelector<HTMLElement>(`[data-visual-entity-id="${CSS.escape(restoreId)}"]`)?.closest<HTMLElement>(".action-stage__figure")?.focus({ preventScroll: true });
    }
  }

  private previewMove(origin: HTMLElement, destinationId: string): void {
    this.clearMovePreview();
    this.previewedMoveId = destinationId;
    origin.classList.add("is-previewed");
    origin.focus({ preventScroll: true });
    const announcer = this.root.querySelector<HTMLElement>("[data-action-proof-announcer]");
    if (announcer) announcer.textContent = `${origin.getAttribute("aria-label") ?? "Move here"}. Tap again to move.`;
  }

  private clearMovePreview(): void {
    this.previewedMoveId = undefined;
    for (const move of this.root.querySelectorAll<HTMLElement>('[data-action="move-action-proof"]')) {
      move.classList.remove("is-previewed");
    }
  }

  private handleTargetPreview = (event: FocusEvent | PointerEvent): void => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-action="select-action-proof-target"]')
      : null;
    if (!target || target.hidden || target.dataset.actionProofId !== this.selectedActionId) return;
    this.updateTargetingCopy(target.dataset.targetLabel ?? "Target", target.dataset.targetDetail ?? "");
  };

  private selectAction(origin: HTMLElement): void {
    const actionId = origin.dataset.actionProofId;
    if (!actionId) return;
    if (this.selectedActionId === actionId) {
      this.clearTargeting(true);
      return;
    }
    this.clearTargeting();
    this.clearSubject();
    this.selectedActionId = actionId;
    origin.classList.add("is-selected");
    origin.setAttribute("aria-pressed", "true");
    const targets = [...this.root.querySelectorAll<HTMLElement>('[data-action="select-action-proof-target"]')]
      .filter((target) => target.dataset.actionProofId === actionId);
    for (const target of targets) target.hidden = false;
    const panel = this.root.querySelector<HTMLElement>("[data-action-proof-targeting]");
    if (panel) panel.hidden = false;
    this.updateTargetingCopy(origin.dataset.actionLabel ?? "Choose a target", origin.dataset.actionDetail ?? "Choose a marked enemy on the field.");
    targets[0]?.focus({ preventScroll: true });
  }

  private selectTarget(origin: HTMLElement): void {
    const targetId = origin.dataset.targetId;
    if (!targetId || origin.dataset.actionProofId !== this.selectedActionId) return;
    this.selectedTargetId = targetId;
    this.selectedResolvedActionId = origin.dataset.resolvedActionId;
    for (const target of this.root.querySelectorAll<HTMLElement>('[data-action="select-action-proof-target"]')) {
      const selected = target === origin;
      target.classList.toggle("is-selected", selected);
      target.setAttribute("aria-pressed", String(selected));
    }
    this.updateTargetingCopy(origin.dataset.targetLabel ?? "Target", origin.dataset.targetDetail ?? "");
    const confirm = this.root.querySelector<HTMLButtonElement>('[data-action="confirm-action-proof-target"]');
    if (confirm) {
      confirm.hidden = false;
      confirm.textContent = `Commit against ${origin.dataset.targetLabel ?? "target"}`;
      confirm.focus({ preventScroll: true });
    }
  }

  private updateTargetingCopy(title: string, detail: string): void {
    const titleHost = this.root.querySelector<HTMLElement>("[data-action-proof-targeting-title]");
    const detailHost = this.root.querySelector<HTMLElement>("[data-action-proof-targeting-detail]");
    if (titleHost) titleHost.textContent = title;
    if (detailHost) detailHost.textContent = detail;
  }

  private selectSubject(origin: HTMLElement): void {
    const subjectId = origin.dataset.actionProofSubjectId;
    if (!subjectId) return;
    if (this.selectedSubjectId === subjectId) {
      this.clearSubject(true);
      return;
    }
    this.clearSubject();
    this.clearTargeting();
    this.selectedSubjectId = subjectId;
    origin.classList.add("is-selected");
    origin.setAttribute("aria-expanded", "true");
    const panel = this.root.querySelector<HTMLElement>(`[data-action-proof-subject-panel="${CSS.escape(subjectId)}"]`);
    if (panel) panel.hidden = false;
    const announcer = this.root.querySelector<HTMLElement>("[data-action-proof-announcer]");
    if (announcer) announcer.textContent = panel?.dataset.subjectAnnouncement ?? `Examining ${subjectId}.`;
  }

  private clearSubject(restoreFocus = false): void {
    const priorSubject = this.selectedSubjectId;
    this.selectedSubjectId = undefined;
    for (const subject of this.root.querySelectorAll<HTMLElement>('[data-action="select-action-proof-subject"]')) {
      subject.classList.remove("is-selected");
      subject.setAttribute("aria-expanded", "false");
    }
    for (const panel of this.root.querySelectorAll<HTMLElement>("[data-action-proof-subject-panel]")) {
      panel.hidden = true;
    }
    if (restoreFocus && priorSubject) {
      this.root.querySelector<HTMLElement>(`[data-action="select-action-proof-subject"][data-action-proof-subject-id="${CSS.escape(priorSubject)}"]`)?.focus({ preventScroll: true });
    }
  }

  private clearTargeting(restoreFocus = false): void {
    const priorAction = this.selectedActionId;
    this.selectedActionId = undefined;
    this.selectedTargetId = undefined;
    this.selectedResolvedActionId = undefined;
    for (const action of this.root.querySelectorAll<HTMLElement>('[data-action="select-action-proof"]')) {
      action.classList.remove("is-selected");
      action.setAttribute("aria-pressed", "false");
    }
    for (const target of this.root.querySelectorAll<HTMLElement>('[data-action="select-action-proof-target"]')) {
      target.hidden = true;
      target.classList.remove("is-selected");
      target.setAttribute("aria-pressed", "false");
    }
    const panel = this.root.querySelector<HTMLElement>("[data-action-proof-targeting]");
    if (panel) panel.hidden = true;
    const confirm = this.root.querySelector<HTMLButtonElement>('[data-action="confirm-action-proof-target"]');
    if (confirm) confirm.hidden = true;
    if (restoreFocus && priorAction) {
      this.root.querySelector<HTMLElement>(`[data-action="select-action-proof"][data-action-proof-id="${CSS.escape(priorAction)}"]`)?.focus({ preventScroll: true });
    }
  }

  private commit(intent: DevelopmentActionIntent): void {
    const transition = this.adapter.step(this.state, intent);
    if (transition.error) {
      const announcer = this.root.querySelector<HTMLElement>("[data-action-proof-announcer]");
      if (announcer) announcer.textContent = transition.error;
      return;
    }
    this.clearTargeting();
    this.clearSubject();
    this.clearMovePreview();
    this.closeConversation();
    this.state = transition.state;
    this.patchScene(
      transition.event ? "result" : "preserve",
      motionCuesForActionProofIntent(intent),
    );
  }

  private sceneMarkup(): string { return this.adapter.render(this.state); }

  private patchScene(
    focus: "page" | "result" | "preserve",
    motionCues: readonly ActionProofMotionCue[] = [],
  ): void {
    const host = this.root.querySelector<HTMLElement>("[data-development-action-host]");
    if (!host) { this.renderPage(); return; }
    const spatialPositions = focus === "page" ? undefined : captureActionProofSpatialPositions(host);
    host.innerHTML = this.sceneMarkup();
    applyActionProofMotionCues(host, motionCues);
    completeDomUpdate(this.root, focus);
    if (spatialPositions) scheduleActionProofSpatialMotion(host, spatialPositions);
  }

  private renderPage(): void {
    this.root.innerHTML = `<div class="app-shell development-tactical-shell" data-screen="development-action-proof">
      <nav class="development-tactical-shell__nav" aria-label="Development action proof controls">
        <strong>${this.adapter.label}</strong>
        <span>Noncanonical · deterministic · not autosaved</span>
        <button type="button" data-action="restart-action-proof">Reset scene</button>
        <button type="button" data-action="exit-action-proof">Return to proofs</button>
      </nav>
      <p class="sr-only" aria-live="polite" data-action-proof-announcer></p>
      <main data-development-action-host>${this.sceneMarkup()}</main>
    </div>`;
    applyActionProofMotionCues(this.root, ACTION_PROOF_ENTRY_MOTION);
    completeDomUpdate(this.root, "page");
  }
}
