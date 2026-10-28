import {
  storySceneFor,
  TRADITIONS,
  storyChoicesFor,
  storyChoiceCompletionFlag,
  storyChoiceIsComplete,
  storyOutcomeDismissalFlag,
} from "./content";
import {
  advancementModifier,
  applyAdvancement,
  clearPresentedAdvancement,
  getAdvancementOffer,
  getPresentedAdvancement,
  markAdvancementPresented,
} from "./advancements";
import { readyAdvancementExpression } from "./advancement-readiness";
import { advancementPresentationLocation } from "./advancement-presentation-location";
import {
  convalesceWounds,
  createWound,
} from "./anatomy";
import { rollWakeVariant } from "./encounters";
import { createEconomyState } from "./economy-state";
import { resolveMundaneCheck } from "./checks";
import {
  addItem,
  itemCount,
  removeItem,
} from "./items";
import { normalizeSeed, rollInteger } from "./random";
import { rollRoadEvent } from "./road-events";
import { awardExperience } from "./progression";
import {
  adjustWorldPressure,
  adjustWorldStanding,
  createWorldState,
  learnWorldFact,
  revealWorldFact,
} from "./world/state";
import {
  rollRoadsideRendering,
  wakeVariantPoolForWorld,
} from "./world/north-vey-rules";
import type {
  AdvancementId,
  AdvancementExpressionId,
  CharacterSex,
  EngineResult,
  GameState,
  RunState,
  TraditionId,
} from "./types";
import {
  nextWoundNumber,
  startRoadBattle,
  startVaultBattle,
  startWakeBattle,
} from "./engine/battle-openings";
import { createPlayer } from "./engine/combatants";
import {
  getServantCommandUnavailableReason,
  standingBonebinderServantFor,
} from "./content-packs/bonebinder-runtime";
import { resolveDisputedBundleChoice } from "./world/disputed-bundle";
import { sellGraveSaltToIven } from "./economy/iven-exchange";
import { createCampaignContinuity } from "./campaign-continuity";
import { resolveContentStoryTransition } from "./content-packs/story-runtime-port";
import { isStoryEffect } from "./types";

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

const applyConvalescence = (run: RunState) => {
  const recovery = convalesceWounds(run.player, {
    conditionPerInjuredPart:
      3 +
      advancementModifier(
        run.player,
        "recovery-condition",
      ),
    scarConditionPenalty: Math.max(
      0,
      1 -
        advancementModifier(
          run.player,
          "scar-condition-penalty-reduction",
        ),
    ),
  });
  run.flags = run.flags.filter(
    (flag) => !flag.startsWith("convalescence:"),
  );
  run.flags.push(
    `convalescence:${recovery.stabilized.length}:${recovery.improved.length}:${recovery.scars.length}:${recovery.conditionRestored}:${recovery.healed.length}`,
  );
  return recovery;
};

export const chooseStoryChoice = (
  state: GameState,
  choiceId: string,
): EngineResult => {
  if (state.screen !== "story" || !state.storyId || !state.run) {
    return { state, error: "There is no choice to make here." };
  }
  const scene = storySceneFor(state.storyId);
  if (!scene) return { state, error: "That story is not loaded." };
  const choice = storyChoicesFor(scene, state.run).find(
    (candidate) => candidate.id === choiceId,
  );

  if (!choice) {
    return { state, error: "That path is not available." };
  }
  if (
    choice.tradition &&
    choice.tradition !== state.run.player.tradition
  ) {
    return {
      state,
      error: "Your practice cannot take that path.",
    };
  }
  const completionFlag = storyChoiceCompletionFlag(
    scene.id,
    choice.id,
  );
  if (storyChoiceIsComplete(scene.id, choice, state.run)) {
    return {
      state,
      error: "That action is already complete.",
    };
  }

  const next = cloneState(state);
  const run = next.run;
  if (!run) return { state, error: "No active journey was found." };

  if (!isStoryEffect(choice.effect)) {
    const resolved = resolveContentStoryTransition(choice.effect, {
      state: next,
      run,
      choice,
    });
    if (!resolved) {
      return { state, error: "That story transition is not loaded." };
    }
    if (resolved.error) return { state, error: resolved.error };
    if (choice.mode === "interaction" && resolved.completeInteraction !== false) {
      run.flags.push(completionFlag);
    }
    return { state: next, message: resolved.message };
  }

  switch (choice.effect) {
    case "attune":
      run.player.maxSpirit += 1;
      run.player.spirit += 1;
      run.flags.push("heard-warning");
      next.storyId = "ossuary-road";
      break;
    case "take-tonic":
      addItem(run.player.inventory, "black-tonic");
      run.flags.push("bought-tonic");
      next.storyId = "ossuary-road";
      break;
    case "take-burial-cut":
      run.flags.push("burial-cut-route");
      next.storyId = "burial-cut";
      break;
    case "burial-cut-check": {
      if (!choice.skill && !standingBonebinderServantFor(run)) {
        return {
          state,
          error: "No standing servant can bear the bier.",
        };
      }

      const attempt = choice.skill
        ? resolveMundaneCheck(
            run.seed,
            run.player,
            { skill: choice.skill },
          )
        : { seed: run.seed, success: true, chance: 100, roll: 0 };
      run.seed = attempt.seed;
      run.flags.push(
        `burial-cut-result:${choice.id}:${attempt.success ? "success" : "failure"}`,
      );
      if (choice.skill) {
        run.flags.push(
          `burial-cut-roll:${choice.id}:${attempt.chance}:${attempt.roll}`,
        );
      }

      const canReceiveTally =
        attempt.success || choice.id === "give-use-name";
      if (canReceiveTally) run.flags.push("burial-tally");

      let healthCost = 0;
      if (!attempt.success && choice.id !== "give-use-name") {
        const torso = run.player.body.torso;
        healthCost = Math.min(
          3,
          Math.max(0, run.player.hp - 1),
          Math.max(0, torso.condition - 1),
        );
        run.player.hp -= healthCost;
        torso.condition -= healthCost;
        if (healthCost > 0) {
          torso.wounds.push(
            createWound(
              `w${nextWoundNumber(run.player)}`,
              "torso",
              "minor",
              "the burial washout",
              "Strained ribs",
              run.player.anatomy,
              "rest",
            ),
          );
        }
      }
      run.flags.push(`burial-cut-cost:${healthCost}`);
      addItem(run.player.inventory, "linen-binding");

      awardExperience(run.player, 25);

      revealWorldFact(
        run.world,
        "burial-crews",
        "aided-county-burial",
      );
      learnWorldFact(run.world, "aided-county-burial");
      if (attempt.success) {
        adjustWorldStanding(run.world, "burial-crews", 1);
      }

      if (choice.id === "give-use-name") {
        revealWorldFact(
          run.world,
          "burial-crews",
          "gave-use-name-to-burial-crews",
        );
        learnWorldFact(
          run.world,
          "gave-use-name-to-burial-crews",
        );
        if (attempt.success) {
          adjustWorldStanding(run.world, "burial-crews", 1);
        } else {
          revealWorldFact(
            run.world,
            "county-reeves",
            "gave-use-name-to-burial-crews",
          );
          adjustWorldPressure(run.world, "countyNotice", 1);
        }
      }
      break;
    }
    case "leave-burial-cut":
      next.storyId = "hollow-tollhouse";
      break;
    case "open-ground":
      startRoadBattle(run, "open-ground");
      next.screen = "battle";
      next.storyId = null;
      break;
    case "dead-advance":
      startRoadBattle(run, "dead-advance");
      next.screen = "battle";
      next.storyId = null;
      break;
    case "study-ledger":
      {
        awardExperience(run.player, 5);
        const notice = rollInteger(run.seed, 1, 100);
        run.seed = notice.seed;
        if (notice.value <= 40) {
          run.flags.push("ward-name-noticed");
        }
      }
      run.flags.push("read-ledger");
      break;
    case "medium-communion": {
      const healthCost = Math.min(
        2,
        Math.max(0, run.player.hp - 1),
      );
      run.player.hp -= healthCost;
      run.player.maxSpirit += 1;
      run.player.spirit = Math.min(
        run.player.maxSpirit,
        run.player.spirit + 1,
      );
      run.flags.push(`hollis-health-cost:${healthCost}`);
      run.flags.push("hollis-testimony");
      break;
    }
    case "summoner-hound":
      if (!removeItem(run.player.inventory, "hound-tooth")) {
        return {
          state,
          error: "The hound left no tooth fit for binding.",
        };
      }
      run.flags.push("bound-ash-hound");
      break;
    case "thaumaturgist-render":
      {
        const rendering = rollRoadsideRendering(
          run.seed,
          run.player,
        );
        run.seed = rendering.seed;
        learnWorldFact(run.world, "hollis-vane-rendered");
        run.flags = run.flags.filter(
          (flag) => !flag.startsWith("hollis-rendering:"),
        );
        run.flags.push(
          `hollis-rendering:${rendering.yield}:${rendering.witnessed ? "witnessed" : "unseen"}`,
        );

        if (rendering.yield === "usable") {
          addItem(run.player.inventory, "grave-salt");
          addItem(run.player.inventory, "mortuary-tallow");
        } else if (rendering.yield === "pure") {
          addItem(run.player.inventory, "grave-salt", 2);
          addItem(run.player.inventory, "mortuary-tallow");
          addItem(run.player.inventory, "ossuary-ichor");
        }

        if (rendering.witnessed) {
          revealWorldFact(
            run.world,
            "county-reeves",
            "hollis-vane-rendered",
          );
          adjustWorldStanding(run.world, "county-reeves", -2);
          adjustWorldPressure(
            run.world,
            "countyNotice",
            2,
            "hollis-vane-rendered",
          );
        }
      }
      break;
    case "grave-warden-road-seal":
      if (run.player.spirit < 1) {
        return {
          state,
          error: "Taking the broken boundary into custody requires 1 Spirit.",
        };
      }
      run.player.spirit -= 1;
      run.flags.push("grave-warden-road-seal");
      break;
    case "leave-aftermath":
      next.storyId = "hollow-tollhouse";
      break;
    case "rest-tollhouse":
      applyConvalescence(run);
      run.player.hp = Math.min(
        run.player.maxHp,
        run.player.hp + 6,
      );
      run.player.spirit = run.player.maxSpirit;
      run.flags.push("rested-at-tollhouse");
      next.storyId = "ossuary-vault";
      break;
    case "press-descent":
      run.flags.push("pressed-descent");
      next.storyId = "ossuary-vault";
      break;
    case "warded-descent":
      startVaultBattle(run, "warded");
      next.screen = "battle";
      next.storyId = null;
      break;
    case "shatter-seal":
      if (run.player.spirit < 1) {
        return {
          state,
          error: "Breaking the jaw-seal requires 1 Spirit.",
        };
      }
      startVaultBattle(run, "shattered-seal");
      next.screen = "battle";
      next.storyId = null;
      break;
    case "dress-saint-wounds": {
      const healthBefore = run.player.hp;
      applyConvalescence(run);
      run.player.hp = Math.min(
        run.player.maxHp,
        run.player.hp + 8,
      );
      run.player.spirit = run.player.maxSpirit;
      run.flags = run.flags.filter(
        (flag) =>
          !flag.startsWith("saint-recovery-health:") &&
          !flag.startsWith("saint-recovery-vitality:"),
      );
      run.flags.push(
        `saint-recovery-health:${run.player.hp - healthBefore}`,
      );
      run.flags.push("rested-in-saint-wax");
      adjustWorldPressure(run.world, "escapedNames", 2);
      break;
    }
    case "follow-name-storm": {
      const event = rollRoadEvent(run.seed, run.seenRoadEvents);
      run.seed = event.seed;
      run.roadEvent = event.eventId;
      if (!run.seenRoadEvents.includes(event.eventId)) {
        run.seenRoadEvents.push(event.eventId);
      }
      next.storyId = "road-interlude";
      break;
    }
    case "share-caravan-fire": {
      const healthBefore = run.player.hp;
      const spiritBefore = run.player.spirit;
      run.player.hp = Math.min(
        run.player.maxHp,
        run.player.hp + 4,
      );
      run.player.spirit = Math.min(
        run.player.maxSpirit,
        run.player.spirit + 1,
      );
      run.flags.push(
        `caravan-recovery:${run.player.hp - healthBefore}:${run.player.spirit - spiritBefore}`,
      );
      if (!run.flags.includes("road-interlude-delay")) {
        run.flags.push("road-interlude-delay");
      }
      learnWorldFact(run.world, "shared-mourning-fire");
      adjustWorldStanding(
        run.world,
        "north-road-households",
        1,
      );
      adjustWorldPressure(run.world, "escapedNames", 1);
      break;
    }
    case "trade-for-surgery": {
      if (!removeItem(run.player.inventory, "ossuary-ichor")) {
        return {
          state,
          error: "Iven’s careful hands require one ampoule of ossuary ichor.",
        };
      }
      const healthBefore = run.player.hp;
      const recovery = applyConvalescence(run);
      run.player.hp = Math.min(
        run.player.maxHp,
        run.player.hp + 6,
      );
      run.flags.push(
        `surgeon-recovery:${run.player.hp - healthBefore}:${recovery.stabilized.length}:${recovery.improved.length}:${recovery.healed.length}:${recovery.scars.length}`,
      );
      learnWorldFact(run.world, "dealt-with-iven");
      adjustWorldStanding(run.world, "iven-saye", 1);
      break;
    }
    case "bargain-for-vigil-cordial": {
      if (itemCount(run.player.inventory, "ossuary-ichor") < 1) {
        return {
          state,
          error:
            "Iven will not open the case for a promise. The trade requires one ampoule of ossuary ichor.",
        };
      }
      if (run.player.spirit >= run.player.maxSpirit) {
        return {
          state,
          error:
            "Iven sees no occult exhaustion to treat and leaves the case beneath the brazier.",
        };
      }

      const attempt = resolveMundaneCheck(
        run.seed,
        run.player,
        {
          skill: "persuasion",
          difficulty: 5,
        },
      );
      run.seed = attempt.seed;
      let restored = 0;
      if (attempt.success) {
        removeItem(run.player.inventory, "ossuary-ichor");
        const spiritBefore = run.player.spirit;
        run.player.spirit = Math.min(
          run.player.maxSpirit,
          run.player.spirit + 3,
        );
        restored = run.player.spirit - spiritBefore;
        adjustWorldStanding(run.world, "iven-saye", 1);
      }
      run.flags.push(
        `iven-cordial-result:${attempt.success ? "success" : "failure"}:${attempt.chance}:${attempt.roll}:${restored}`,
      );
      break;
    }
    case "sell-grave-salt-to-iven": {
      const error = sellGraveSaltToIven(run);
      if (error) return { state, error };
      break;
    }
    case "help-ditch-burial": {
      const torso = run.player.body.torso;
      const strain = Math.min(
        2,
        Math.max(0, run.player.hp - 1),
        Math.max(0, torso.condition - 1),
      );
      run.player.hp -= strain;
      torso.condition -= strain;
      awardExperience(run.player, 5);
      addItem(run.player.inventory, "linen-binding");
      run.flags.push(`burial-strain:${strain}`);
      if (!run.flags.includes("road-interlude-delay")) {
        run.flags.push("road-interlude-delay");
      }
      learnWorldFact(run.world, "aided-county-burial");
      revealWorldFact(
        run.world,
        "burial-crews",
        "aided-county-burial",
      );
      adjustWorldStanding(run.world, "burial-crews", 1);
      adjustWorldPressure(run.world, "escapedNames", 1);
      break;
    }
    case "inspect-disputed-bundle":
    case "leave-bundle-with-burial-crew":
    case "release-bundle-to-broker":
      resolveDisputedBundleChoice(run, choice.effect);
      break;
    case "continue-road": {
      const variation = rollWakeVariant(
        run.seed,
        wakeVariantPoolForWorld(run.world),
      );
      run.seed = variation.seed;
      run.wakeVariant = variation.variantId;
      run.roadEvent = null;
      next.storyId = "black-mile-wake";
      break;
    }
    case "wake-guarded":
      startWakeBattle(run, "guarded");
      next.screen = "battle";
      next.storyId = null;
      break;
    case "wake-severing":
      if (run.player.spirit < 1) {
        return {
          state,
          error:
            "The severing word requires 1 Spirit to survive being spoken.",
        };
      }
      startWakeBattle(run, "severing");
      next.screen = "battle";
      next.storyId = null;
      break;
    default: {
      const unhandledEffect: never = choice.effect;
      throw new Error(
        `Unhandled story effect: ${String(unhandledEffect)}`,
      );
    }
  }

  if (choice.mode === "interaction") {
    run.flags.push(completionFlag);
  }

  return { state: next };
};

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
