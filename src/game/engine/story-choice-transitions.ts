import {
  storySceneFor,
  storyChoicesFor,
  storyChoiceCompletionFlag,
  storyChoiceIsComplete,
} from "../content";
import { addItem, removeItem } from "../items";
import { resolveDisputedBundleChoice } from "../world/disputed-bundle";
import { sellGraveSaltToIven } from "../economy/iven-exchange";
import { resolveContentStoryTransition } from "../content-packs/story-runtime-port";
import { isStoryEffect } from "../types";
import type {
  EngineResult,
  GameState,
  RunState,
  StoryChoice,
  StoryEffect,
} from "../types";
import {
  startRoadBattle,
  startVaultBattle,
  startWakeBattle,
} from "./battle-openings";
import {
  resolveBurialCutCheck,
  studyLedger,
  communeWithHollis,
  renderRoadsideRemains,
  followNameStorm,
  continueRoad,
} from "./story-road-effects";
import {
  restAtTollhouse,
  dressSaintWounds,
  shareCaravanFire,
  tradeForSurgery,
  bargainForVigilCordial,
  helpDitchBurial,
} from "./story-recovery-effects";

const applyStoryEffect = (
  next: GameState,
  run: RunState,
  choice: StoryChoice,
  effect: StoryEffect,
): string | void => {
  switch (effect) {
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
    case "burial-cut-check":
      return resolveBurialCutCheck(run, choice);
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
      return studyLedger(run);
    case "medium-communion":
      return communeWithHollis(run);
    case "summoner-hound":
      if (!removeItem(run.player.inventory, "hound-tooth")) {
        return "The hound left no tooth fit for binding.";
      }
      run.flags.push("bound-ash-hound");
      break;
    case "thaumaturgist-render":
      return renderRoadsideRemains(run);
    case "grave-warden-road-seal":
      if (run.player.spirit < 1) {
        return "Taking the broken boundary into custody requires 1 Spirit.";
      }
      run.player.spirit -= 1;
      run.flags.push("grave-warden-road-seal");
      break;
    case "leave-aftermath":
      next.storyId = "hollow-tollhouse";
      break;
    case "rest-tollhouse":
      return restAtTollhouse(next, run);
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
        return "Breaking the jaw-seal requires 1 Spirit.";
      }
      startVaultBattle(run, "shattered-seal");
      next.screen = "battle";
      next.storyId = null;
      break;
    case "dress-saint-wounds":
      return dressSaintWounds(run);
    case "follow-name-storm":
      return followNameStorm(next, run);
    case "share-caravan-fire":
      return shareCaravanFire(run);
    case "trade-for-surgery":
      return tradeForSurgery(run);
    case "bargain-for-vigil-cordial":
      return bargainForVigilCordial(run);
    case "sell-grave-salt-to-iven": {
      const error = sellGraveSaltToIven(run);
      if (error) return error;
      break;
    }
    case "help-ditch-burial":
      return helpDitchBurial(run);
    case "inspect-disputed-bundle":
    case "leave-bundle-with-burial-crew":
    case "release-bundle-to-broker":
      resolveDisputedBundleChoice(run, effect);
      break;
    case "continue-road":
      return continueRoad(next, run);
    case "wake-guarded":
      startWakeBattle(run, "guarded");
      next.screen = "battle";
      next.storyId = null;
      break;
    case "wake-severing":
      if (run.player.spirit < 1) {
        return "The severing word requires 1 Spirit to survive being spoken.";
      }
      startWakeBattle(run, "severing");
      next.screen = "battle";
      next.storyId = null;
      break;
    default: {
      const unhandledEffect: never = effect;
      throw new Error(
        `Unhandled story effect: ${String(unhandledEffect)}`,
      );
    }
  }
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

  const next = structuredClone(state);
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

  const error = applyStoryEffect(next, run, choice, choice.effect);
  if (error) return { state, error };

  if (choice.mode === "interaction") {
    run.flags.push(completionFlag);
  }

  return { state: next };
};
