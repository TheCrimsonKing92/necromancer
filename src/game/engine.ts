import {
  storySceneFor,
  TRADITIONS,
  storyChoicesFor,
  storyChoiceCompletionFlag,
  storyOutcomeDismissalFlag,
} from "./content";
import {
  applyAdvancement,
  clearPresentedAdvancement,
  getAdvancementOffer,
  getPresentedAdvancement,
  markAdvancementPresented,
} from "./advancements";
import { readyAdvancementExpression } from "./advancement-readiness";
import { advancementPresentationLocation } from "./advancement-presentation-location";
import { createEconomyState } from "./economy-state";
import { normalizeSeed } from "./random";
import { createWorldState } from "./world/state";
import type {
  AdvancementId,
  AdvancementExpressionId,
  CharacterSex,
  EngineResult,
  GameState,
  RunState,
  TraditionId,
} from "./types";
import { createPlayer } from "./engine/combatants";
import { getServantCommandUnavailableReason } from "./content-packs/bonebinder-runtime";
import { createCampaignContinuity } from "./campaign-continuity";

const cloneState = (state: GameState): GameState => structuredClone(state);

export const createInitialState = (): GameState => ({
  schemaVersion: 4,
  campaign: null,
  screen: "home",
  storyId: null,
  ending: null,
  run: null,
  inventoryReturnScreen: null,
  journalReturnScreen: null,
});

export const beginNewGame = (): GameState => ({
  ...createInitialState(),
  screen: "creation",
});

export const createCharacter = (
  rawName: string,
  tradition: TraditionId,
  sexOrSeed: CharacterSex | number = "other",
  seed = Date.now(),
): EngineResult => {
  const sex =
    typeof sexOrSeed === "number" ? "other" : sexOrSeed;
  const resolvedSeed =
    typeof sexOrSeed === "number" ? sexOrSeed : seed;
  const name = rawName.trim().replace(/\s+/g, " ");
  const characterCount = Array.from(name).length;

  if (characterCount < 2 || characterCount > 24) {
    return {
      state: beginNewGame(),
      error: "Choose a name between 2 and 24 characters.",
    };
  }

  if (!Object.hasOwn(TRADITIONS, tradition)) {
    return {
      state: beginNewGame(),
      error: "Choose an available necromantic practice.",
    };
  }

  const run: RunState = {
    seed: normalizeSeed(resolvedSeed),
    player: createPlayer(name, tradition, sex),
    world: createWorldState(),
    economy: createEconomyState(),
    flags: [],
    wakeVariant: null,
    roadEvent: null,
    seenRoadEvents: [],
    battle: null,
    battlesWon: 0,
  };

  return {
    state: {
      schemaVersion: 4,
      campaign: createCampaignContinuity(resolvedSeed),
      screen: "story",
      storyId: "weary-traveler",
      ending: null,
      run,
      inventoryReturnScreen: null,
      journalReturnScreen: null,
    },
  };
};

export const continueJourney = (state: GameState): EngineResult => {
  const completedEncounterId = state.run?.battle?.encounterId;
  const nextStoryId =
    completedEncounterId === "ossuary-road"
      ? "road-aftermath"
      : completedEncounterId === "saint-orra"
        ? "saint-orra-aftermath"
        : !completedEncounterId && state.run?.battlesWon === 1
          ? "road-aftermath"
          : !completedEncounterId && state.run?.battlesWon === 2
            ? "saint-orra-aftermath"
            : null;
  if (
    state.screen !== "ending" ||
    state.ending !== "victory" ||
    !state.run ||
    !nextStoryId
  ) {
    return {
      state,
      error: "This testament has no road left to follow.",
    };
  }
  const next = cloneState(state);
  const player = next.run!.player;
  player.ward = 0;
  player.statuses = [];
  next.run!.battle = null;
  next.screen = "story";
  next.storyId = nextStoryId;
  next.ending = null;
  next.inventoryReturnScreen = null;
  next.journalReturnScreen = null;
  return { state: next };
};

export const chooseAdvancement = (
  state: GameState,
  advancementId: AdvancementId,
): EngineResult => {
  const offer = getAdvancementOffer(state);
  if (!state.run || !offer) {
    return {
      state,
      error: "No advancement is waiting to be claimed here.",
    };
  }

  const node = offer.nodes.find(
    (candidate) => candidate.definition.id === advancementId,
  );
  if (!node || node.status !== "available") {
    return {
      state,
      error:
        node?.reason ??
        "That discipline is not available to this testament.",
    };
  }

  const next = cloneState(state);
  const player = next.run!.player;
  applyAdvancement(player, node.definition.id);
  markAdvancementPresented(next, node.definition.id);
  return { state: next };
};

export const prepareAdvancementExpression = (
  state: GameState,
  expressionId: AdvancementExpressionId,
): EngineResult => {
  if (
    !state.run ||
    !advancementPresentationLocation(state) ||
    state.run.player.hp <= 0
  ) {
    return {
      state,
      error:
        "Readiness can only be changed at a safe pause outside combat.",
    };
  }

  const next = cloneState(state);
  const error = readyAdvancementExpression(
    next.run!.player,
    expressionId,
  );
  return error ? { state, error } : { state: next };
};

export const dismissResultCard = (
  state: GameState,
  kind: "story-choice" | "advancement",
  resultId: string,
): EngineResult => {
  if (kind === "story-choice") {
    if (state.screen !== "story" || !state.storyId || !state.run) {
      return { state, error: "There is no story result to dismiss." };
    }

    const scene = storySceneFor(state.storyId);
    const choice = scene ? storyChoicesFor(
      scene,
      state.run,
    ).find(
      (candidate) =>
        candidate.id === resultId && Boolean(candidate.outcome),
    ) : undefined;
    const completed = state.run.flags.includes(
      storyChoiceCompletionFlag(state.storyId, resultId),
    );
    const dismissalFlag = storyOutcomeDismissalFlag(
      state.storyId,
      resultId,
    );
    if (
      !choice ||
      !completed ||
      state.run.flags.includes(dismissalFlag)
    ) {
      return { state, error: "That story result is not open." };
    }

    const next = cloneState(state);
    next.run!.flags.push(dismissalFlag);
    return { state: next };
  }

  const presented = getPresentedAdvancement(state);
  if (!presented || presented.id !== resultId) {
    return { state, error: "That advancement result is not open." };
  }

  const next = cloneState(state);
  if (!clearPresentedAdvancement(next, presented.id)) {
    return { state, error: "That advancement result is not open." };
  }
  return { state: next };
};

export { chooseStoryChoice } from "./engine/story-choice-transitions";

export {
  getActionUnavailableReason,
  getFleeChance,
  getLivingEnemies,
  resolveBattleAction,
  resolvePendingPlayerAction,
  resolveMercyRedemption,
  resolveWorkedAroundChoice,
  resolveServantBattleCommand,
} from "./engine/battle-transitions";

export { getServantCommandUnavailableReason };

export {
  effectiveAttack,
  effectiveDefense,
  effectiveOccultPower,
  getHitChance,
} from "./combat-math";

export {
  eligibleWoundResponses,
  playerBattleActionIds,
  workedAroundChoiceRequired,
  woundResponseLabel,
} from "./engine/wound-response";

export { heldSpiritAvailable } from "./engine/action-contingency";

export {
  barterForItem,
  buyItem,
  buyReliquaryService,
  closeInventory,
  closeJournal,
  equipItem,
  isPostDeathState,
  isReliquaryOpen,
  inventoryItemUseAvailability,
  openInventory,
  openJournal,
  repairBonebinderServant,
  sellItem,
  switchInventoryToJournal,
  switchJournalToInventory,
  treatWound,
  unequipItem,
  useInventoryItem,
} from "./inventory-engine";
