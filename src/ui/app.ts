import {
  beginNewGame,
  chooseStoryChoice,
  closeInventory,
  closeJournal,
  continueJourney,
  createInitialState,
  dismissResultCard,
  getLivingEnemies,
  openInventory,
  openJournal,
  switchInventoryToJournal,
  switchJournalToInventory,
} from "../game/engine";
import {
  loadGame,
  type StorageLike,
} from "../game/persistence";
import type { AdvancementId, EngineResult, GameState } from "../game/types";
import { resolveBattleDomAction } from "./battle-dom-actions";
import { loadPlayableSave } from "./character-creation-transition";
import {
  bonebinderSurfaceNeeded,
  ensureBonebinderSurface,
} from "./bonebinder-surface-loader";
import { resolveBonebinderAppAction } from "./bonebinder-app-action";
import {
  ensureInventoryScreenSurface,
  ensureJournalScreenSurface,
  resolveLoadedReliquaryMarketAppAction,
} from "./optional-screen-loader";
import { ensureEndingSurface } from "./ending-surface-loader";
import { savedAtLabel } from "./save-presentation";
import type { RenderContext, StatsPane } from "./render-context";
import {
  patchAdvancementTransition,
  selectAdvancementFromElement,
  transitionAdvancementFromElement,
} from "./advancement-dom-loader";
import { patchBattleTargetSelection } from "./battle-target-dom";
import { patchSameScreenDom } from "./same-screen-dom-patch";
import {
  closeFocusedKnowledgeDisclosure,
  restoreKnowledgeDisclosure,
  toggleKnowledgeDisclosure,
} from "./disclosure-dom";
import {
  captureFocusKey,
  completeDomUpdate,
  focusKeyFor,
  type FocusIntent,
} from "./focus-management";
import type {
  EphemeralJourneyController,
  NecromancerAppMountOptions,
  NecromancerAppOptions,
} from "./playable-admission";
import {
  announceNewWitness,
  mountWitnessAnnouncer,
} from "./witness-announcer";
import { DEFAULT_STORY_APPROACH_EXPLORER_STATE, type StoryApproachExplorerState } from "./story-approach-state";
import { persistAppliedState, resetSavedCampaign } from "./app-persistence";
import { resolveCharacterFormAction } from "./character-form-action";
import { bindAppEvents } from "./app-event-lifecycle";
import { renderAppTransition } from "./app-render-transition";

export class NecromancerApp {
  readonly root: HTMLElement;
  readonly storage: StorageLike;
  private state: GameState = createInitialState();
  private savedAt?: string;
  private selectedTargetId?: string;
  private statsOpen = false;
  private statsPane: StatsPane = "character";
  private selectedAdvancementId?: AdvancementId;
  private message?: string;
  private messageTimer?: ReturnType<typeof setTimeout>;
  private witnessAnnouncer?: HTMLElement;
  private readonly ephemeral: boolean;
  private readonly ephemeralJourney?: EphemeralJourneyController;
  private storyApproachState: StoryApproachExplorerState =
    DEFAULT_STORY_APPROACH_EXPLORER_STATE;
  private unbindEvents?: () => void;
  constructor(
    root: HTMLElement,
    storage: StorageLike,
    options: NecromancerAppOptions = {},
  ) {
    this.root = root;
    this.storage = storage;
    this.savedAt = options.savedAt;
    this.state = options.initialState ?? createInitialState();
    this.ephemeral = options.ephemeral ?? false;
    this.ephemeralJourney = options.ephemeralJourney;
  }

  async mount(
    { intent = "home" }: NecromancerAppMountOptions = {},
  ): Promise<void> {
    this.unbindEvents = bindAppEvents(this.root, {
      click: this.handleClick,
      keydown: this.handleKeydown,
      disclosureEntry: this.handleDisclosureEntry,
      submit: this.handleSubmit,
    });
    this.witnessAnnouncer = mountWitnessAnnouncer(this.root);
    if (intent === "start-new") {
      this.state = beginNewGame();
    } else if (intent === "continue") {
      await this.continueSavedGame();
      return;
    }
    this.render("page");
  }

  private handleClick = async (event: MouseEvent): Promise<void> => {
    const origin =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-action]")
        : null;
    if (!origin) return;
    const action = origin.dataset.action;

    const pendingEphemeralState = this.ephemeralJourney
      ? (await import("./ephemeral-journey-app-action")).resolveEphemeralJourneyState(
          this.state,
          origin,
          this.ephemeralJourney,
        )
      : null;
    if (pendingEphemeralState) {
      this.state = await pendingEphemeralState;
      this.selectedTargetId = undefined;
      this.statsOpen = false;
      this.selectedAdvancementId = undefined;
      this.storyApproachState = DEFAULT_STORY_APPROACH_EXPLORER_STATE;
      this.render("page");
      return;
    }

    const approachAction = action?.includes("story-approach")
      ? (await import("./story-approach-app-action")).resolveStoryApproachAppAction(
          this.root,
          this.state,
          this.storyApproachState,
          origin,
        )
      : undefined;
    if (approachAction) {
      this.storyApproachState = approachAction.explorerState;
      if (approachAction.result) {
        await this.applyResult(approachAction.result, approachAction.focusIntent ?? "preserve");
      } else if (!approachAction.patched) this.render("preserve");
      return;
    }

    const pendingBonebinder = resolveBonebinderAppAction(
      this.root,
      this.state,
      origin,
      this.currentTargetId(),
    );
    if (pendingBonebinder) {
      const bonebinder = await pendingBonebinder;
      if (bonebinder) this.applyDelegatedResult(
          bonebinder.result,
          bonebinder.announcesWitness,
          bonebinder.focusIntent,
          bonebinder.patchDom,
        );
      return;
    }

    const battleAction = resolveBattleDomAction(
      this.state,
      origin,
      this.currentTargetId(),
    );
    if (battleAction) {
      this.applyDelegatedResult(
        battleAction.result,
        battleAction.announcesWitness,
      );
      return;
    }

    const marketAction = resolveLoadedReliquaryMarketAppAction(
      this.state,
      origin,
    );
    if (marketAction) {
      this.applyResult(marketAction, "preserve");
      return;
    }

    const inventoryAction = action === "equip-item" || action === "unequip-item" ||
        action === "use-item" || action === "treat-wound"
      ? (await import("./inventory-app-action")).resolveInventoryAppAction(
          this.state,
          origin,
        )
      : null;
    if (inventoryAction) {
      this.applyResult(inventoryAction, "preserve");
      return;
    }

    switch (action) {
      case "start-new":
        if (this.savedAt) {
          this.showMessage(
            "Reset the current campaign before beginning another.",
          );
          break;
        }
        this.state = beginNewGame();
        this.selectedTargetId = undefined;
        this.statsOpen = false;
        this.selectedAdvancementId = undefined;
        this.render("page");
        break;
      case "continue":
        await this.continueSavedGame();
        break;
      case "open-chronicle": {
        const { openChronicleAppSurface } = await import("./chronicle-app-action");
        if (!await openChronicleAppSurface(this.root, this.storage)) {
          this.showMessage("The Chronicle could not be opened.");
        }
        break;
      }
      case "close-chronicle":
        this.render("page");
        break;
      case "delete-save":
        this.deleteSavedGame();
        break;
      case "go-home":
        if (this.ephemeral) {
          this.unmount();
          const { NecromancerBootstrap } = await import("./bootstrap");
          new NecromancerBootstrap(this.root, this.storage).mount();
          break;
        }
        this.state = createInitialState();
        this.selectedTargetId = undefined;
        this.statsOpen = false;
        this.selectedAdvancementId = undefined;
        this.savedAt = loadGame(this.storage)?.savedAt;
        this.render("page");
        break;
      case "open-inventory":
        await ensureInventoryScreenSurface();
        if (bonebinderSurfaceNeeded(this.state)) {
          await ensureBonebinderSurface();
        }
        this.statsOpen = false;
        this.applyResult(openInventory(this.state), "page");
        break;
      case "close-inventory":
        this.applyResult(closeInventory(this.state), "page");
        break;
      case "open-journal":
        await ensureJournalScreenSurface();
        this.statsOpen = false;
        this.applyResult(openJournal(this.state), "page");
        break;
      case "close-journal":
        this.applyResult(closeJournal(this.state), "page");
        break;
      case "journal-to-inventory":
        await ensureInventoryScreenSurface();
        this.applyResult(
          switchJournalToInventory(this.state),
          "page",
        );
        break;
      case "inventory-to-journal":
        await ensureJournalScreenSurface();
        this.applyResult(
          switchInventoryToJournal(this.state),
          "page",
        );
        break;
      case "continue-journey":
        this.applyResult(continueJourney(this.state), "page");
        break;
      case "open-stats":
        if (!this.state.run) return;
        {
          const { openStatsAppSurface } = await import("./stats-app-action");
          const opened = await openStatsAppSurface({
            root: this.root,
            state: this.state,
            hasSave: Boolean(this.savedAt),
            selectedAdvancementId: this.selectedAdvancementId,
          }, this.statsPane, origin);
          this.statsPane = opened.pane;
          this.statsOpen = true;
          if (!opened.patched) this.render("panel");
        }
        break;
      case "show-stats-pane": {
        const { changeStatsAppPane } = await import("./stats-app-action");
        const changed = changeStatsAppPane({
          root: this.root,
          state: this.state,
          hasSave: Boolean(this.savedAt),
          selectedAdvancementId: this.selectedAdvancementId,
        }, this.statsPane, origin);
        if (!changed) return;
        this.statsPane = changed.pane;
        if (!changed.patched) this.render("preserve");
        break;
      }
      case "close-stats":
        await this.closeStats();
        break;
      case "toggle-knowledge": {
        toggleKnowledgeDisclosure(this.root, origin);
        break;
      }
      case "choose-story": {
        const choiceId = origin.dataset.choiceId;
        if (!choiceId) return;
        const previousStoryId = this.state.storyId;
        const result = chooseStoryChoice(this.state, choiceId);
        const remainsInScene =
          result.state.screen === "story" &&
          result.state.storyId === previousStoryId;
        this.applyResult(result, remainsInScene ? "result" : "page");
        break;
      }
      case "select-advancement": {
        const advancementId = await selectAdvancementFromElement(
          this.root,
          this.state,
          origin,
        );
        if (!advancementId) return;
        this.selectedAdvancementId = advancementId;
        break;
      }
      case "confirm-advancement":
      case "choose-advancement":
      case "prepare-advancement-expression": {
        const transition = await transitionAdvancementFromElement(
          this.state,
          origin,
        );
        if (!transition) return;
        this.selectedAdvancementId = transition.advancementId;
        const preparing =
          origin.dataset.action ===
          "prepare-advancement-expression";
        this.applyResult(
          transition.result,
          preparing
            ? {
                kind: "restore",
                key: focusKeyFor("select-advancement", {
                  advancementId: transition.advancementId,
                }),
              }
            : "panel-result",
          () => patchAdvancementTransition(
            this.root,
            this.state,
            transition.advancementId,
          ),
        );
        break;
      }
      case "dismiss-result": {
        const resultKind = origin.dataset.resultKind;
        const resultId = origin.dataset.resultId;
        if (
          !resultId ||
          (resultKind !== "story-choice" &&
            resultKind !== "advancement")
        ) {
          return;
        }
        this.applyResult(
          dismissResultCard(this.state, resultKind, resultId),
          resultKind === "story-choice"
            ? {
                kind: "restore",
                key: focusKeyFor("choose-story", {
                  choiceId: resultId,
                }),
              }
            : {
                kind: "restore",
                key: focusKeyFor("select-advancement", {
                  advancementId: resultId,
                }),
              },
          resultKind === "advancement"
            ? () => patchAdvancementTransition(
                this.root,
                this.state,
                resultId,
              )
            : undefined,
        );
        break;
      }
      case "select-target": {
        const targetId = origin.dataset.targetId;
        if (!targetId) return;
        const targetIsAlive = getLivingEnemies(this.state).some(
          (enemy) => enemy.id === targetId,
        );
        if (targetIsAlive) {
          this.selectedTargetId = targetId;
          this.updateTargetSelection();
        }
        break;
      }
    }
  };

  private applyDelegatedResult(
    result: EngineResult,
    announcesWitness: boolean,
    focusIntent?: FocusIntent,
    patchDom?: () => boolean | Promise<boolean>,
  ): void {
    const previousLog = this.state.run?.battle?.log ?? [];
    this.applyResult(
      result,
      result.state.screen === "ending" ? "page" : focusIntent ?? "preserve",
      patchDom,
    );
    if (announcesWitness && !result.error) {
      announceNewWitness(this.witnessAnnouncer, previousLog, result);
    }
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (this.statsOpen && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      void import("./stats-app-action").then(({ moveStatsTabFromKey }) =>
        moveStatsTabFromKey(this.root, event));
      return;
    }
    if (event.key !== "Escape") return;
    if (closeFocusedKnowledgeDisclosure(this.root)) {
      event.preventDefault();
      return;
    }
    if (!this.statsOpen) return;
    event.preventDefault();
    void this.closeStats();
  };

  private handleDisclosureEntry = (event: Event): void => {
    restoreKnowledgeDisclosure(event.target);
  };

  private handleSubmit = async (event: SubmitEvent): Promise<void> => {
    const action = await resolveCharacterFormAction(event);
    if (!action.handled) return;
    if (action.error) this.showMessage(action.error);
    else if (action.result) await this.applyResult(action.result, "page");
  };

  private async continueSavedGame(): Promise<void> {
    const { saved, preliminaryFound } = await loadPlayableSave(this.storage);
    if (!saved) {
      this.savedAt = undefined;
      this.showMessage(
        preliminaryFound ? "The saved testament could not be admitted by its practice."
          : "No readable testament was found.",
        true,
      );
      return;
    }
    this.savedAt = saved.savedAt;
    this.state = saved.state;
    if (this.state.screen === "inventory") await ensureInventoryScreenSurface();
    if (this.state.screen === "journal") await ensureJournalScreenSurface();
    if (this.state.screen === "ending") await ensureEndingSurface();
    if (bonebinderSurfaceNeeded(this.state)) {
      await ensureBonebinderSurface();
    }
    this.selectedTargetId = getLivingEnemies(this.state)[0]?.id;
    this.statsOpen = false;
    this.selectedAdvancementId = undefined;
    this.render("page");
  }
  private deleteSavedGame(): void {
    const message = resetSavedCampaign(this.storage);
    if (!message) return;
    if (message === "The campaign has been erased.") {
      this.savedAt = undefined;
      this.state = createInitialState();
    }
    this.showMessage(message, message.startsWith("The campaign"), "page");
  }

  private async applyResult(
    result: EngineResult,
    focusIntent: FocusIntent,
    patchDom?: () => boolean | Promise<boolean>,
  ): Promise<void> {
    if (result.error) {
      this.showMessage(result.error);
      return;
    }

    const previousState = this.state;
    const preservedKey =
      focusIntent === "preserve"
        ? captureFocusKey(document.activeElement)
        : undefined;
    this.state = result.state;
    this.selectedTargetId = this.currentTargetId();
    if (this.state.screen === "ending") await ensureEndingSurface();

    const persistence = persistAppliedState(
      this.storage,
      this.state,
      this.ephemeral,
    );
    if (persistence.savedAt) this.savedAt = persistence.savedAt;
    if (persistence.error) {
      this.showMessage(persistence.error, true);
      return;
    }

    const patched = patchDom
      ? await patchDom()
      : patchSameScreenDom(
          this.root,
          previousState,
          this.state,
          this.renderContext(),
          this.storyApproachState,
        );
    if (patched) {
      if (result.message) this.showMessage(result.message);
      completeDomUpdate(this.root, focusIntent, preservedKey);
      return;
    }
    if (result.message) {
      this.showMessage(result.message, true, focusIntent);
      return;
    }
    this.render(focusIntent);
  }

  private currentTargetId(): string | undefined {
    const living = getLivingEnemies(this.state);
    if (
      this.selectedTargetId &&
      living.some((enemy) => enemy.id === this.selectedTargetId)
    ) {
      return this.selectedTargetId;
    }

    return living[0]?.id;
  }

  private updateTargetSelection(): void {
    const selectedTargetId = this.currentTargetId();
    if (!patchBattleTargetSelection(
      this.root,
      this.state,
      selectedTargetId,
    )) {
      this.render("preserve");
    }
  }

  private async closeStats(): Promise<void> {
    const { closeStatsAppSurface } = await import("./stats-app-action");
    this.statsOpen = false;
    this.statsPane = "character";
    this.selectedAdvancementId = undefined;
    if (!closeStatsAppSurface({
      root: this.root,
      state: this.state,
      hasSave: Boolean(this.savedAt),
    })) this.render({ kind: "restore", key: focusKeyFor("open-stats") });
  }

  private updateNotice(): void {
    const notice = this.root.querySelector<HTMLElement>(".notice");
    if (!notice) {
      this.render("preserve");
      return;
    }

    notice.classList.toggle("notice--visible", Boolean(this.message));
    notice.textContent = this.message ?? "";
  }

  private showMessage(
    message: string,
    rerender = false,
    focusIntent: FocusIntent = "preserve",
  ): void {
    this.message = message;
    if (rerender) {
      this.render(focusIntent);
    } else {
      this.updateNotice();
    }

    if (this.messageTimer) window.clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => {
      this.message = undefined;
      this.updateNotice();
    }, 4_000);
  }

  private render(focusIntent: FocusIntent): void {
    renderAppTransition(this.root, this.state, this.renderContext(), focusIntent);
  }

  private unmount(): void {
    this.unbindEvents?.();
    this.witnessAnnouncer?.remove();
    this.witnessAnnouncer = undefined;
    if (this.messageTimer) window.clearTimeout(this.messageTimer);
  }

  private renderContext(): RenderContext {
    return {
      hasSave: Boolean(this.savedAt), message: this.message,
      savedLabel: this.savedAt ? savedAtLabel(this.savedAt) : undefined,
      selectedTargetId: this.currentTargetId(), statsOpen: this.statsOpen,
      statsPane: this.statsPane, selectedAdvancementId: this.selectedAdvancementId,
      storyApproachState: this.storyApproachState,
      ephemeral: this.ephemeral,
      ephemeralJourneyComplete: this.ephemeralJourney?.isComplete(this.state),
    };
  }

}
