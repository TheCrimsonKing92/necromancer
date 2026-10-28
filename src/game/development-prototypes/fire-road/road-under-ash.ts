import type {
  DevelopmentActionIntent,
  DevelopmentActionPrototype,
  DevelopmentActionTarget,
  DevelopmentActionTransition,
} from "../../development-action-proof";
import {
  FIRE_ROAD_LOCATIONS,
  fireRoadDistance,
  fireRoadPlayerDestinations,
  fireRoadStepToward,
  fireRoadWithinReach,
  nextEvacuationLocation,
  type FireRoadLocationId,
  type FireRoadPositionId,
} from "./road-under-ash-navigation";

export type FireRoadServantOrder = "follow" | "brace" | "harry";
export type FireRoadWound = "hound-bite" | "smoke-burn";

export const FIRE_ROAD_HOUND_MAX_HEALTH = 9;
export const FIRE_ROAD_GRAIN_WAGONS = 3;

export interface FireRoadActionEvent {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

export interface FireRoadActionState {
  readonly turn: number;
  readonly player: FireRoadLocationId;
  readonly ditchHand: FireRoadPositionId;
  readonly sera: FireRoadLocationId;
  readonly households: FireRoadLocationId;
  readonly hound: FireRoadPositionId | null;
  readonly houndRemains: FireRoadPositionId | null;
  readonly roadDead: FireRoadLocationId | null;
  readonly raisedLaborer: FireRoadPositionId | null;
  readonly servantOrder: FireRoadServantOrder;
  readonly obstruction: number;
  readonly playerHealth: number;
  readonly playerWounds: readonly FireRoadWound[];
  readonly spirit: number;
  readonly houndHealth: number;
  readonly householdsRemaining: number;
  readonly householdsSafe: number;
  readonly grainSaved: number;
  readonly grainBurned: number;
  readonly grainClaimed: boolean;
  readonly hostCollarRecovered: boolean;
  readonly events: readonly FireRoadActionEvent[];
  readonly outcome: "active" | "saved" | "lost";
}

export interface FireRoadActionAvailability {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly available: boolean;
  readonly reason?: string;
  readonly advancesTime: boolean;
  readonly targets?: readonly DevelopmentActionTarget[];
}

export type FireRoadCrossingState = "moving-to-wreck" | "blocked-by-wreck" | "crossing-at-risk" | "crossing-under-brace" | "complete";

export interface FireRoadActionTransition {
  readonly state: FireRoadActionState;
  readonly event?: FireRoadActionEvent;
  readonly error?: string;
}

export interface FireRoadMovementDestination {
  readonly id: FireRoadLocationId;
  readonly label: string;
  readonly destinationLabel: string;
  readonly location: FireRoadLocationId;
  readonly exchanges: 1;
}

export const FIRE_ROAD_BRIDGE: FireRoadLocationId = "wagon-flank";
export const FIRE_ROAD_BRACE: FireRoadPositionId = "bridge-support";

const event = (turn: number, suffix: string, title: string, detail: string): FireRoadActionEvent => ({
  id: `${turn}:${suffix}`,
  title,
  detail,
});

export const createFireRoadActionState = (): FireRoadActionState => ({
  turn: 0,
  player: "west-verge",
  ditchHand: "west-verge",
  sera: "eastern-road",
  households: "evacuee-line",
  hound: "far-scrub",
  houndRemains: null,
  roadDead: "carter-side",
  raisedLaborer: null,
  servantOrder: "follow",
  obstruction: 3,
  playerHealth: 14,
  playerWounds: [],
  spirit: 4,
  houndHealth: FIRE_ROAD_HOUND_MAX_HEALTH,
  householdsRemaining: 6,
  householdsSafe: 0,
  grainSaved: 0,
  grainBurned: 0,
  grainClaimed: false,
  hostCollarRecovered: false,
  events: [event(0, "opening", "Sera commits to the bridge", "She will bring the six smoke-struck households west as soon as the broken wagon is cleared and Ditch-Hand takes the bridge's weight.")],
  outcome: "active",
});

export const fireEdgeForTurn = (turn: number): number =>
  Math.max(0, 9 - Math.floor(turn / 2));

export const fireFrontPercentForTurn = (turn: number): number =>
  Math.max(24, 96 - (Math.floor(turn / 2) * 9));

export const fireRoadIsBraced = (state: FireRoadActionState): boolean =>
  state.servantOrder === "brace" && state.ditchHand === FIRE_ROAD_BRACE;

const available = (
  id: string,
  label: string,
  detail: string,
  enabled: boolean,
  reason?: string,
  advancesTime = true,
  targets?: readonly DevelopmentActionTarget[],
): FireRoadActionAvailability => ({ id, label, detail, available: enabled, reason: enabled ? undefined : reason, advancesTime, targets });

const hostileOccupies = (state: FireRoadActionState, target: FireRoadLocationId): boolean =>
  state.hound === target;

export const fireRoadCrossingState = (state: FireRoadActionState): FireRoadCrossingState => {
  if (state.householdsRemaining <= 0) return "complete";
  if (state.obstruction > 0) return state.households === "wagon-flank" ? "blocked-by-wreck" : "moving-to-wreck";
  return fireRoadIsBraced(state) ? "crossing-under-brace" : "crossing-at-risk";
};

export const fireRoadActionsFor = (state: FireRoadActionState): readonly FireRoadActionAvailability[] => {
  if (state.outcome !== "active") return [];
  const actions: FireRoadActionAvailability[] = fireRoadMovementFor(state).map((destination) => available(
    `move:${destination.id}`,
    destination.label,
    `Cross to ${destination.destinationLabel}. The fire and the hound receive the same exchange.`,
    true,
  ));
  actions.push(available("wait", "Hold position", "Let every other will in the road spend a turn.", true));
  actions.push(available(
    "raise-road-dead",
    "Put the road-dead to work",
    "Spend 2 Spirit. The dead carter will crawl to the broken wagon and drag until the lane opens.",
    Boolean(state.roadDead && fireRoadWithinReach(state.player, state.roadDead) && state.spirit >= 2),
    state.spirit < 2 ? "You need 2 Spirit." : "Stand beside the dead carter.",
  ));
  actions.push(available(
    "clear-obstruction",
    "Put your shoulder to the wagon",
    "Remove one measure of the wreck while standing beside the bridge.",
    state.obstruction > 0 && fireRoadWithinReach(state.player, FIRE_ROAD_BRIDGE),
    state.obstruction <= 0 ? "The lane is already open." : "Stand beside the broken wagon.",
  ));
  const houndTarget: readonly DevelopmentActionTarget[] = state.hound ? [{
    id: "hound",
    label: "Ash hound",
    detail: `3 physical damage · ${state.houndHealth} of ${FIRE_ROAD_HOUND_MAX_HEALTH} Health`,
    currentHealth: state.houndHealth,
    maxHealth: FIRE_ROAD_HOUND_MAX_HEALTH,
  }] : [];
  actions.push(available(
    "strike",
    "Strike",
    "Commit the ritual knife against an adjacent enemy.",
    Boolean(state.hound && fireRoadWithinReach(state.player, state.hound)),
    "The hound is not within reach.",
    true,
    houndTarget,
  ));
  actions.push(available(
    "spirit-lash",
    "Spirit lash",
    "Spend 1 Spirit to drive occult force through an enemy within three steps.",
    Boolean(state.hound && fireRoadDistance(state.player, state.hound) <= 3 && state.spirit >= 1),
    state.spirit < 1 ? "You need 1 Spirit." : "The hound is beyond the lash.",
    true,
    houndTarget.map((target) => ({ ...target, detail: `3 occult damage · ${state.houndHealth} of ${FIRE_ROAD_HOUND_MAX_HEALTH} Health` })),
  ));
  actions.push(available(
    "claim-grain",
    "Put the raised dead on the grain cart",
    "Once the lane opens, send the dead carter back for three wagonloads while Sera keeps the living moving.",
    Boolean(state.raisedLaborer && state.obstruction <= 0 && !state.grainClaimed && state.grainSaved + state.grainBurned < FIRE_ROAD_GRAIN_WAGONS),
    !state.raisedLaborer ? "No dead laborer answers you." : state.obstruction > 0 ? "The bridge lane is still blocked." : state.grainSaved + state.grainBurned >= FIRE_ROAD_GRAIN_WAGONS ? "No grain remains to recover." : "The grain is already moving.",
    false,
  ));
  actions.push(available(
    "recover-collar",
    "Cut the collar from the hound",
    "Spend an exchange over the cindered body. Whatever marched it into the fire may have left a maker's mark.",
    Boolean(state.houndRemains && fireRoadWithinReach(state.player, state.houndRemains) && !state.hostCollarRecovered),
    !state.houndRemains ? "The hound has not fallen." : state.hostCollarRecovered ? "You already carry its collar." : "Stand beside the cindered hound.",
  ));
  actions.push(available(
    "depart",
    "Leave the fire road",
    "End the proof with the people, supplies, wounds, and evidence you have carried out.",
    state.householdsRemaining === 0 && state.householdsSafe > 0,
    "Sera's household line has not reached the western road.",
    false,
  ));
  for (const order of ["follow", "brace", ...(state.hound ? ["harry" as const] : [])] as const) {
    actions.push(available(
      `order:${order}`,
      order === "brace" ? "Send Ditch-Hand under the bridge" : order === "harry" ? "Send Ditch-Hand at the hound" : "Call Ditch-Hand back",
      order === "brace" ? "Ditch-Hand will move to the bridge shoulder and hold it for Sera's crossing." : order === "harry" ? "Ditch-Hand will pursue and strike the hound." : "Ditch-Hand will keep near you.",
      state.servantOrder !== order,
      "That is already Ditch-Hand's standing order.",
      false,
    ));
  }
  return actions;
};

export const fireRoadMovementFor = (
  state: FireRoadActionState,
): readonly FireRoadMovementDestination[] => fireRoadPlayerDestinations(
  state.player,
  fireRoadPlayerDestinations(state.player).filter((location) => hostileOccupies(state, location)),
).map((location) => ({
  id: location,
  label: `Walk to ${FIRE_ROAD_LOCATIONS[location].label}`,
  destinationLabel: FIRE_ROAD_LOCATIONS[location].label,
  location,
  exchanges: 1,
}));

const withEvent = (
  state: FireRoadActionState,
  nextEvent: FireRoadActionEvent,
): FireRoadActionState => ({ ...state, events: [...state.events, nextEvent].slice(-8) });

const addWound = (state: FireRoadActionState, wound: FireRoadWound): FireRoadActionState =>
  state.playerWounds.includes(wound)
    ? state
    : { ...state, playerWounds: [...state.playerWounds, wound] };

const extinguishHound = (
  state: FireRoadActionState,
  title: string,
  detail: string,
  suffix: string,
): FireRoadActionState => {
  if (!state.hound) return state;
  return withEvent({
    ...state,
    houndRemains: state.hound,
    hound: null,
    houndHealth: 0,
    servantOrder: state.servantOrder === "harry" ? "follow" : state.servantOrder,
  }, event(state.turn, suffix, title, detail));
};

const servantPhase = (state: FireRoadActionState): FireRoadActionState => {
  if (state.servantOrder === "brace") {
    if (state.ditchHand !== FIRE_ROAD_BRACE) {
      return { ...state, ditchHand: fireRoadStepToward(state.ditchHand, FIRE_ROAD_BRACE) };
    }
    return state;
  }
  if (state.servantOrder === "harry" && state.hound) {
    if (fireRoadWithinReach(state.ditchHand, state.hound)) {
      const houndHealth = Math.max(0, state.houndHealth - 2);
      return houndHealth === 0
        ? extinguishHound(state, "Ditch-Hand pins the ash hound", "The servant closes both hands in its burnt ruff and bears it down until the cinders stop kicking, then turns back toward you.", "ditch-kill")
        : { ...state, houndHealth };
    }
    return { ...state, ditchHand: fireRoadStepToward(state.ditchHand, state.hound) };
  }
  if (fireRoadDistance(state.ditchHand, state.player) > 1) {
    return { ...state, ditchHand: fireRoadStepToward(state.ditchHand, state.player) };
  }
  return state;
};

const laborPhase = (state: FireRoadActionState): FireRoadActionState => {
  if (!state.raisedLaborer) return state;
  if (state.grainClaimed) {
    if (state.grainSaved + state.grainBurned >= FIRE_ROAD_GRAIN_WAGONS) return state;
    const grainSaved = state.grainSaved + 1;
    return grainSaved + state.grainBurned === FIRE_ROAD_GRAIN_WAGONS
      ? withEvent({ ...state, grainSaved }, event(state.turn, "grain", "The dead carter brings the last recoverable grain through", `${grainSaved} wagonload${grainSaved === 1 ? "" : "s"} reach the western road. The fire keeps the rest.`))
      : { ...state, grainSaved };
  }
  if (state.obstruction > 0) {
    if (state.raisedLaborer !== FIRE_ROAD_BRIDGE) {
      return { ...state, raisedLaborer: fireRoadStepToward(state.raisedLaborer, FIRE_ROAD_BRIDGE) };
    }
    const obstruction = state.obstruction - 1;
    return obstruction === 0
      ? withEvent({ ...state, obstruction }, event(state.turn, "lane-open", "The road-dead drags the axle clear", "Sera calls the households forward. Ditch-Hand must still hold the bridge shoulder when they cross."))
      : { ...state, obstruction };
  }
  return state;
};

const evacuationPhase = (state: FireRoadActionState): FireRoadActionState => {
  if (state.householdsRemaining <= 0) return state;
  if (state.obstruction > 0) {
    if (state.households === "wagon-flank") return state;
    return {
      ...state,
      sera: nextEvacuationLocation(state.sera),
      households: nextEvacuationLocation(state.households),
    };
  }
  const nextSera = nextEvacuationLocation(state.sera);
  const nextHouseholds = nextEvacuationLocation(state.households);
  if (!fireRoadIsBraced(state) && state.households === "wagon-flank") {
    const householdsRemaining = Math.max(0, state.householdsRemaining - 1);
    return withEvent({
      ...state,
      sera: nextSera,
      households: nextHouseholds,
      householdsRemaining,
    }, event(state.turn, "unbraced-crossing", "The households take the bridge without Ditch-Hand", "The weak shoulder drops beneath the rear cart. One household falls out of the line; the rest keep moving west."));
  }
  if (nextHouseholds === "safety-road") {
    return withEvent({
      ...state,
      sera: nextSera,
      households: nextHouseholds,
      householdsSafe: state.householdsSafe + state.householdsRemaining,
      householdsRemaining: 0,
    }, event(state.turn, "households-safe", "Sera brings the last household off the burning road", "No subject oath carried them. Ditch-Hand held while living hands bore the smoke-struck west."));
  }
  return { ...state, sera: nextSera, households: nextHouseholds };
};

const houndPhase = (state: FireRoadActionState): FireRoadActionState => {
  if (!state.hound) return state;
  const targets = [
    { id: "player", position: state.player },
    ...(state.householdsRemaining > 0 ? [{ id: "households", position: state.households }] : []),
  ].sort((a, b) => fireRoadDistance(state.hound!, a.position) - fireRoadDistance(state.hound!, b.position));
  const target = targets[0];
  if (!target) return state;
  if (fireRoadWithinReach(state.hound, target.position)) {
    if (target.id === "player") {
      return withEvent(addWound({ ...state, playerHealth: Math.max(0, state.playerHealth - 3) }, "hound-bite"), event(state.turn, "hound-bites", "The ash hound reaches you", "Its cinder teeth open your leg for 3 Health. The bite will outlast this road."));
    }
    const householdsRemaining = Math.max(0, state.householdsRemaining - 1);
    return withEvent({ ...state, householdsRemaining }, event(state.turn, "hound-takes", "The ash hound reaches the line", "Sera cannot cover every back in the smoke. One household falls out of the crossing."));
  }
  return { ...state, hound: fireRoadStepToward(state.hound, target.position, [state.ditchHand]) };
};

const FIRE_THREAT_ORDER: readonly FireRoadPositionId[] = [
  "far-scrub",
  "brush-edge",
  "evacuee-line",
  "eastern-road",
  "wagon-flank",
  "carter-side",
  "bridge-approach",
  "yard-lane",
  "west-verge",
];

const fireThreatens = (position: FireRoadPositionId, turn: number): boolean => {
  const index = FIRE_THREAT_ORDER.indexOf(position);
  return index >= 0 && index < Math.floor(turn / 2);
};

const firePhase = (state: FireRoadActionState): FireRoadActionState => {
  let next = state;
  if (next.householdsRemaining > 0 && fireThreatens(next.households, next.turn)) {
    const householdsRemaining = Math.max(0, next.householdsRemaining - 2);
    next = withEvent({ ...next, householdsRemaining }, event(next.turn, "fire-takes", "Fire closes over the rear of the line", "Two households disappear behind resin smoke before Sera can turn them back."));
  }
  if (
    next.grainSaved + next.grainBurned < FIRE_ROAD_GRAIN_WAGONS
    && fireThreatens(FIRE_ROAD_BRIDGE, next.turn)
  ) {
    const grainBurned = next.grainBurned + 1;
    next = withEvent({ ...next, grainBurned }, event(next.turn, `grain-burns-${grainBurned}`, "Fire reaches the grain wagons", "One unrecovered wagonload catches in the wreck. What burns here will be missing from four settlements this winter."));
  }
  if (fireThreatens(next.player, next.turn)) {
    next = withEvent(addWound({ ...next, playerHealth: Math.max(0, next.playerHealth - 4) }, "smoke-burn"), event(next.turn, "fire-reaches-player", "The fire reaches you", "Resin flame catches cloth and skin for 4 Health. The burn will require treatment beyond the road."));
  }
  return next;
};

const settleOutcome = (state: FireRoadActionState): FireRoadActionState => {
  if (state.playerHealth <= 0 || (state.householdsRemaining <= 0 && state.householdsSafe <= 0)) {
    return { ...state, outcome: "lost" };
  }
  return state;
};

const advanceWorld = (state: FireRoadActionState): FireRoadActionState => {
  let next: FireRoadActionState = { ...state, turn: state.turn + 1 };
  next = servantPhase(next);
  next = laborPhase(next);
  next = evacuationPhase(next);
  next = houndPhase(next);
  next = firePhase(next);
  return settleOutcome(next);
};

export const actInFireRoad = (
  state: FireRoadActionState,
  actionId: string,
  targetId?: string,
): FireRoadActionTransition => {
  if (state.outcome !== "active") return { state, error: "The Fire Road proof has ended." };
  const action = fireRoadActionsFor(state).find(({ id }) => id === actionId);
  if (!action) return { state, error: "That act does not belong to this scene." };
  if (!action.available) return { state, error: action.reason ?? "That act is unavailable." };

  let next = state;
  let transitionEvent: FireRoadActionEvent | undefined;
  if (actionId.startsWith("move:")) {
    const destination = actionId.slice("move:".length) as FireRoadLocationId;
    next = { ...next, player: destination };
  } else if (actionId.startsWith("order:")) {
    const servantOrder = actionId.slice("order:".length) as FireRoadServantOrder;
    next = { ...next, servantOrder };
    transitionEvent = event(next.turn, `order-${servantOrder}`, "Ditch-Hand takes the new order", action.detail);
    next = withEvent(next, transitionEvent);
  } else if (actionId === "raise-road-dead" && next.roadDead) {
    transitionEvent = event(next.turn, "raise", "The carter returns to the harness", "The corpse rises on one knee, finds the drag-rope by touch, and turns its emptied face toward the broken wagon.");
    next = withEvent({ ...next, raisedLaborer: next.roadDead, roadDead: null, spirit: next.spirit - 2 }, transitionEvent);
  } else if (actionId === "clear-obstruction") {
    const obstruction = next.obstruction - 1;
    next = { ...next, obstruction };
    if (obstruction === 0) {
      transitionEvent = event(next.turn, "player-clears", "The axle rolls out of the lane", "Sera calls the households forward. The bridge still needs Ditch-Hand beneath it.");
      next = withEvent(next, transitionEvent);
    }
  } else if (actionId === "strike") {
    if (targetId !== "hound" || !next.hound) return { state, error: "Choose a living enemy within reach." };
    const houndHealth = Math.max(0, next.houndHealth - 3);
    next = { ...next, houndHealth };
    if (houndHealth === 0) {
      transitionEvent = event(next.turn, "hound-killed", "The ash hound breaks under the knife", "Its fire gutters in the wet road. The crossing has one danger fewer.");
      next = extinguishHound(next, transitionEvent.title, transitionEvent.detail, "hound-killed");
    }
  } else if (actionId === "spirit-lash") {
    if (targetId !== "hound" || !next.hound) return { state, error: "Choose a living enemy within reach." };
    const houndHealth = Math.max(0, next.houndHealth - 3);
    next = { ...next, spirit: next.spirit - 1, houndHealth };
    if (houndHealth === 0) {
      transitionEvent = event(next.turn, "hound-unmade", "The borrowed soul tears the hound's fire loose", "Wet ash drops where the animal stood.");
      next = extinguishHound(next, transitionEvent.title, transitionEvent.detail, "hound-unmade");
    }
  } else if (actionId === "claim-grain") {
    transitionEvent = event(next.turn, "grain-order", "The road-dead turns back for the grain", "Sera does not slow the living. The carter takes a wagon tongue in both hands and walks into the smoke alone.");
    next = withEvent({ ...next, grainClaimed: true }, transitionEvent);
  } else if (actionId === "recover-collar") {
    transitionEvent = event(next.turn, "collar", "Black iron names the hound's keeper", "A quartermaster's hooked sun and three filed tally-notches mark the collar. The beast ran ahead of an organized host, not alone.");
    next = withEvent({ ...next, hostCollarRecovered: true }, transitionEvent);
  } else if (actionId === "depart") {
    transitionEvent = event(next.turn, "departure", "You leave the fire road with what survived", "The road keeps whatever you did not carry west. Its consequences do not end at the edge of this scene.");
    next = withEvent({ ...next, outcome: "saved" }, transitionEvent);
  }

  if (action.advancesTime) next = advanceWorld(next);
  return { state: next, event: transitionEvent };
};

const stepFireRoad = (
  state: FireRoadActionState,
  intent: DevelopmentActionIntent,
): DevelopmentActionTransition<FireRoadActionState> => {
  const actionId = intent.kind === "act"
    ? intent.actionId
    : fireRoadMovementFor(state).find(({ id }) => id === intent.destinationId)
      ? `move:${intent.destinationId}`
      : undefined;
  if (!actionId) return { state, error: "That ground cannot be reached in one exchange." };
  const transition = actInFireRoad(state, actionId, intent.kind === "act" ? intent.targetId : undefined);
  return {
    state: transition.state,
    error: transition.error,
    event: transition.event
      ? `${transition.event.title}. ${transition.event.detail}`
      : intent.kind === "move" ? `You cross to ${FIRE_ROAD_LOCATIONS[intent.destinationId as FireRoadLocationId]?.label ?? "the chosen ground"}.` : undefined,
  };
};

export const FIRE_ROAD_UNDER_ASH: DevelopmentActionPrototype<FireRoadActionState, FireRoadActionState> = {
  id: "moving-shade:road-under-ash",
  createState: createFireRoadActionState,
  project: (state) => state,
  step: stepFireRoad,
};
