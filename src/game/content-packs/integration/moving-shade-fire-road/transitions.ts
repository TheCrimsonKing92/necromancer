import { resolveMundaneCheck } from "../../../checks";
import { removeItem } from "../../../items";
import type {
  ContentStoryTransitionContext,
  ContentStoryTransitionContribution,
  ContentStoryTransitionResult,
} from "../../types";
import {
  FIRE_ROAD_HOUSEHOLDS_AT_RISK,
  FIRE_ROAD_FAILED_NEGOTIATION_GRAIN_COST,
  FIRE_ROAD_MAX_OPERATING_ROOM,
  fireRoadOperatingRoom,
  fireRoadRescueScore,
  fireRoadStateFor,
  type FireRoadOutcome,
  type FireRoadPreparationId,
} from "./state";
import { fireRoadCounterofferCheck } from "./negotiation";
import { FIRE_ROAD_APPROACH_RESOLUTIONS, FIRE_ROAD_APPROACH_TEMPO } from "./approaches";

const preparationUnavailable = (
  context: ContentStoryTransitionContext,
  id: FireRoadPreparationId,
): string | undefined => {
  const state = fireRoadStateFor(context.run);
  if (state.phase !== "response" || state.preparations.includes(id)) {
    return "That work no longer needs doing.";
  }
  return fireRoadOperatingRoom(state) === 0
    ? "The fire has closed the remaining preparation window."
    : undefined;
};

const prepare = (
  context: ContentStoryTransitionContext,
  id: FireRoadPreparationId,
  result: "success" | "failure" | "certain",
): ContentStoryTransitionResult => {
  const state = fireRoadStateFor(context.run);
  const unavailable = preparationUnavailable(context, id);
  if (unavailable) return { error: unavailable };
  state.preparations.push(id);
  state.preparationResults[id] = result;
  const tempo = FIRE_ROAD_APPROACH_TEMPO[id];
  state.operatingRoom = Math.max(
    0,
    Math.min(
      FIRE_ROAD_MAX_OPERATING_ROOM,
      fireRoadOperatingRoom(state) - tempo.cost + (tempo.relief[result] ?? 0),
    ),
  );
  return { completeInteraction: false };
};

const checkedPreparation = (
  context: ContentStoryTransitionContext,
  id: FireRoadPreparationId,
): ContentStoryTransitionResult => {
  const unavailable = preparationUnavailable(context, id);
  if (unavailable) return { error: unavailable };
  const resolution = FIRE_ROAD_APPROACH_RESOLUTIONS[id];
  if (resolution.kind !== "mundane-check") {
    return prepare(context, id, "certain");
  }
  const attempt = resolveMundaneCheck(context.run.seed, context.run.player, {
    skill: resolution.skill,
    difficulty: "difficulty" in resolution ? resolution.difficulty : undefined,
  });
  context.run.seed = attempt.seed;
  return prepare(context, id, attempt.success ? "success" : "failure");
};

const conclude = (
  context: ContentStoryTransitionContext,
  outcome: FireRoadOutcome,
  sheltered: boolean,
  diversion: { households: number; grainLoads: number } = {
    households: 0,
    grainLoads: 0,
  },
): ContentStoryTransitionResult => {
  const state = fireRoadStateFor(context.run);
  if (state.phase === "resolved") return { error: "The town has already chosen." };
  const score = fireRoadRescueScore(state);
  const negotiationDelay = state.counterofferAttempted && state.counterofferAccepted === false
    ? FIRE_ROAD_FAILED_NEGOTIATION_GRAIN_COST
    : 0;
  state.phase = "resolved";
  state.outcome = outcome;
  state.rescuedHouseholds = Math.max(
    0,
    Math.min(
      FIRE_ROAD_HOUSEHOLDS_AT_RISK,
      7 + score + (sheltered ? 5 : 0) - diversion.households,
    ),
  );
  state.lostGrainLoads = Math.max(
    0,
    8 - score - (sheltered ? 3 : 0) + negotiationDelay +
      diversion.grainLoads,
  );
  return {};
};

const transition = (
  id: ContentStoryTransitionContribution["id"],
  resolve: ContentStoryTransitionContribution["resolve"],
): ContentStoryTransitionContribution => ({ id, resolve });

export const FIRE_ROAD_TRANSITIONS: readonly ContentStoryTransitionContribution[] = [
  transition("moving-shade:ask-why-me", () => ({})),
  transition("moving-shade:ask-high-shade", () => ({})),
  transition("moving-shade:ask-grain-stakes", () => ({})),
  transition("moving-shade:hear-appeal", (context) => {
    const state = fireRoadStateFor(context.run);
    if (state.phase !== "arrival") return { error: "The road reeve has already made her appeal." };
    state.phase = "response";
    return {};
  }),
  transition("moving-shade:cut-firebreak", (context) => checkedPreparation(context, "firebreak")),
  transition("moving-shade:smoke-station", (context) => {
    const unavailable = preparationUnavailable(context, "smoke-station");
    if (unavailable) return { error: unavailable };
    if (!removeItem(context.run.player.inventory, "linen-binding")) return { error: "The smoke station requires one clean linen binding." };
    return checkedPreparation(context, "smoke-station");
  }),
  transition("moving-shade:open-wells", (context) => checkedPreparation(context, "open-wells")),
  transition("moving-shade:secure-carts", (context) => {
    const unavailable = preparationUnavailable(context, "secure-carts");
    if (unavailable) return { error: unavailable };
    if (context.run.player.obols < 2) return { error: "The teamsters require 2 obols." };
    context.run.player.obols -= 2;
    return checkedPreparation(context, "secure-carts");
  }),
  transition("moving-shade:host-keeper", (context) => {
    const unavailable = preparationUnavailable(context, "dead-keeper");
    if (unavailable) return { error: unavailable };
    if (context.run.player.tradition !== "medium" || context.run.player.spirit < 1 || context.run.player.hp < 2) return { error: "You cannot bear the keeper under the required terms." };
    context.run.player.spirit -= 1;
    context.run.player.hp -= 1;
    return prepare(context, "dead-keeper", "certain");
  }),
  transition("moving-shade:send-servant", (context) => {
    const unavailable = preparationUnavailable(context, "servant-labor");
    if (unavailable) return { error: unavailable };
    const servant = context.run.practiceStates?.bonebinder?.servant;
    if (context.run.player.tradition !== "summoner" || !servant) return { error: "No standing servant is present." };
    servant.combatant.body.torso.condition = Math.max(1, servant.combatant.body.torso.condition - 2);
    servant.combatant.hp = Math.max(1, servant.combatant.hp - 2);
    return prepare(context, "servant-labor", "certain");
  }),
  transition("moving-shade:render-lane", (context) => {
    const unavailable = preparationUnavailable(context, "rendered-lane");
    if (unavailable) return { error: unavailable };
    if (context.run.player.tradition !== "thaumaturgist" || !removeItem(context.run.player.inventory, "grave-salt")) return { error: "The lane requires one measure of prepared grave salt." };
    return prepare(context, "rendered-lane", "certain");
  }),
  transition("moving-shade:keep-bridge", (context) => {
    const unavailable = preparationUnavailable(context, "kept-bridge");
    if (unavailable) return { error: unavailable };
    if (context.run.player.tradition !== "grave-warden" || context.run.player.spirit < 1) return { error: "Keeping the bridge requires 1 Spirit." };
    context.run.player.spirit -= 1;
    return prepare(context, "kept-bridge", "certain");
  }),
  transition("moving-shade:read-host", (context) => checkedPreparation(context, "host-need")),
  transition("moving-shade:witness-offer", (context) => checkedPreparation(context, "witnessed-offer")),
  transition("moving-shade:accept-ordinance", (context) => conclude(context, "subjected", true)),
  transition("moving-shade:counteroffer", (context) => {
    const state = fireRoadStateFor(context.run);
    if (state.counterofferAttempted) return { error: "The air-speaker has heard this offer." };
    state.counterofferAttempted = true;
    const attempt = resolveMundaneCheck(
      context.run.seed,
      context.run.player,
      fireRoadCounterofferCheck(state),
    );
    context.run.seed = attempt.seed;
    state.counterofferAccepted = attempt.success;
    if (!attempt.success) return {};
    return conclude(context, "bounded-passage", true);
  }),
  transition("moving-shade:ordinary-rescue", (context) => conclude(context, "ordinary-rescue", false)),
  transition("moving-shade:break-array", (context) =>
    conclude(context, "array-broken", false, {
      households: 2,
      grainLoads: 1,
    })),
  transition("moving-shade:leave", (context) => conclude(context, "abandoned", false)),
];
