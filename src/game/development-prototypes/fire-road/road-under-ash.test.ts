import { describe, expect, it } from "vitest";
import {
  actInFireRoad,
  createFireRoadActionState,
  fireEdgeForTurn,
  fireRoadActionsFor,
  fireRoadCrossingState,
  fireRoadIsBraced,
  fireRoadMovementFor,
} from "./road-under-ash";

const act = (state: ReturnType<typeof createFireRoadActionState>, id: string, targetId?: string) => {
  const transition = actInFireRoad(state, id, targetId);
  expect(transition.error).toBeUndefined();
  return transition.state;
};

describe("Fire Road direct-action proof", () => {
  it("keeps servant orders free while every physical act advances the hazard", () => {
    let state = createFireRoadActionState();
    state = act(state, "order:brace");
    expect(state.turn).toBe(0);
    state = act(state, "move:bridge-approach");
    expect(state.turn).toBe(1);
    expect(fireEdgeForTurn(6)).toBe(6);
  });

  it("lets Sera move people to the bottleneck, while Ditch-Hand's brace makes the crossing safe", () => {
    let approaching = act(createFireRoadActionState(), "wait");
    expect(approaching.households).toBe("eastern-road");
    expect(fireRoadCrossingState(approaching)).toBe("moving-to-wreck");
    approaching = act(approaching, "wait");
    expect(approaching.households).toBe("wagon-flank");
    expect(fireRoadCrossingState(approaching)).toBe("blocked-by-wreck");

    let state = createFireRoadActionState();
    state = act(state, "order:brace");
    state = act(state, "move:yard-lane");
    state = act(state, "move:carter-side");
    state = act(state, "raise-road-dead");
    expect(state.spirit).toBe(2);
    expect(state.raisedLaborer).not.toBeNull();
    for (let index = 0; index < 4; index += 1) state = act(state, "wait");
    expect(state.obstruction).toBe(0);
    expect(fireRoadIsBraced(state)).toBe(true);
    expect(state.households).not.toBe("evacuee-line");
    expect(state.householdsRemaining).toBeGreaterThan(0);
    expect(state.events.every(({ id }) => !id.includes("unbraced-crossing"))).toBe(true);
  });

  it("lets the player change a servant order without losing a turn", () => {
    let state = createFireRoadActionState();
    state = act(state, "order:brace");
    state = act(state, "order:harry");
    expect(state.turn).toBe(0);
    expect(state.servantOrder).toBe("harry");
    expect(fireRoadActionsFor(state).find(({ id }) => id === "order:brace")?.available).toBe(true);
  });

  it("offers named physical destinations and treats friendly occupants as soft congestion", () => {
    const initial = createFireRoadActionState();
    expect(fireRoadMovementFor(initial).map(({ id }) => id)).toEqual([
      "yard-lane", "bridge-approach",
    ]);
    expect(fireRoadMovementFor(initial).every(({ label }) => !/north|east|south|west$/iu.test(label))).toBe(true);

    const crowded = { ...initial, player: "eastern-road" as const, sera: "evacuee-line" as const, households: "evacuee-line" as const, hound: "brush-edge" as const };
    expect(fireRoadMovementFor(crowded).map(({ id }) => id)).toContain("evacuee-line");
    expect(fireRoadMovementFor(crowded).map(({ id }) => id)).not.toContain("brush-edge");
  });

  it("makes the optional grain recovery depend on necromantic labor and an open lane", () => {
    let state = createFireRoadActionState();
    state = act(state, "move:yard-lane");
    state = act(state, "move:carter-side");
    state = act(state, "raise-road-dead");
    for (let index = 0; index < 4; index += 1) state = act(state, "wait");
    const grain = fireRoadActionsFor(state).find(({ id }) => id === "claim-grain")!;
    expect(grain.available).toBe(true);
    state = act(state, "claim-grain");
    expect(state.turn).toBe(7);
    expect(state.grainClaimed).toBe(true);
  });

  it("crosses an open bridge without waiting for the player, but loses a household without a brace", () => {
    const initial = createFireRoadActionState();
    const openRoad = { ...initial, obstruction: 0, households: "wagon-flank" as const, sera: "wagon-flank" as const };
    const crossed = act(openRoad, "wait");
    expect(crossed.households).toBe("bridge-approach");
    expect(crossed.householdsRemaining).toBe(5);
    expect(crossed.events.at(-1)?.id).toContain("unbraced-crossing");
  });

  it("removes the harry order and its control when the selected hound dies", () => {
    const initial = createFireRoadActionState();
    const ready = { ...initial, player: "brush-edge" as const, servantOrder: "harry" as const, houndHealth: 3 };
    const killed = act(ready, "strike", "hound");
    expect(killed.hound).toBeNull();
    expect(killed.houndRemains).toBe("far-scrub");
    expect(killed.servantOrder).toBe("follow");
    expect(fireRoadActionsFor(killed).some(({ id }) => id === "order:harry")).toBe(false);
  });

  it("records bodily consequences when the hound reaches the player", () => {
    const initial = createFireRoadActionState();
    const exposed = {
      ...initial,
      player: "wagon-flank" as const,
      hound: "eastern-road" as const,
      households: "safety-road" as const,
      sera: "safety-road" as const,
      householdsRemaining: 0,
      householdsSafe: 6,
    };
    const bitten = act(exposed, "wait");
    expect(bitten.playerHealth).toBe(11);
    expect(bitten.playerWounds).toEqual(["hound-bite"]);
    expect(bitten.events.at(-1)?.detail).toContain("outlast this road");
  });

  it("keeps the scene open after rescue so supplies and evidence remain genuine risks", () => {
    const initial = createFireRoadActionState();
    const almostSafe = {
      ...initial,
      hound: null,
      houndHealth: 0,
      obstruction: 0,
      households: "west-verge" as const,
      sera: "west-verge" as const,
      householdsRemaining: 1,
      householdsSafe: 5,
    };
    const rescued = act(almostSafe, "wait");
    expect(rescued.householdsSafe).toBe(6);
    expect(rescued.outcome).toBe("active");
    expect(fireRoadActionsFor(rescued).find(({ id }) => id === "depart")?.available).toBe(true);
    expect(act(rescued, "depart").outcome).toBe("saved");
  });

  it("lets advancing fire destroy unrecovered winter grain", () => {
    const initial = createFireRoadActionState();
    const late = {
      ...initial,
      turn: 9,
      player: "west-verge" as const,
      hound: null,
      houndHealth: 0,
      households: "safety-road" as const,
      sera: "safety-road" as const,
      householdsRemaining: 0,
      householdsSafe: 6,
      obstruction: 0,
    };
    const burned = act(late, "wait");
    expect(burned.grainBurned).toBe(1);
    expect(burned.events.at(-1)?.title).toBe("Fire reaches the grain wagons");
  });

  it("turns an optional recovery into evidence of the larger hostile force", () => {
    const initial = createFireRoadActionState();
    const aftermath = {
      ...initial,
      player: "eastern-road" as const,
      hound: null,
      houndHealth: 0,
      houndRemains: "brush-edge" as const,
    };
    const recovered = act(aftermath, "recover-collar");
    expect(recovered.hostCollarRecovered).toBe(true);
    expect(recovered.events.at(-1)?.detail).toContain("organized host");
  });

  it("makes a complete evacuation carry bodily, material, and campaign-facing costs", () => {
    let state = createFireRoadActionState();
    state = act(state, "order:brace");
    state = act(state, "move:bridge-approach");
    state = act(state, "move:wagon-flank");
    for (let index = 0; index < 3; index += 1) state = act(state, "strike", "hound");
    state = act(state, "recover-collar");
    for (let index = 0; index < 3; index += 1) state = act(state, "clear-obstruction");
    state = act(state, "move:bridge-approach");
    state = act(state, "move:west-verge");

    expect(state.householdsSafe).toBe(6);
    expect(state.outcome).toBe("active");
    expect(state.playerHealth).toBe(8);
    expect(state.playerWounds).toEqual(["hound-bite"]);
    expect(state.grainSaved).toBe(0);
    expect(state.grainBurned).toBe(2);
    expect(state.hostCollarRecovered).toBe(true);
  });

  it("resolves the same sequence deterministically", () => {
    const sequence = [
      "order:brace", "move:yard-lane", "move:carter-side", "raise-road-dead", "wait", "wait", "wait", "wait",
      "wait", "wait", "wait", "wait", "wait", "wait", "wait",
    ];
    const run = () => sequence.reduce((state, id) => actInFireRoad(state, id).state, createFireRoadActionState());
    expect(run()).toEqual(run());
  });
});
