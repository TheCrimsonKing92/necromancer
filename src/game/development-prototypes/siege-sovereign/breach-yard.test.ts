import { describe, expect, it } from "vitest";
import { SIEGE_SOVEREIGN_BREACH_YARD } from "./breach-yard";

describe("Siege Sovereign breach-yard action proof", () => {
  it("makes movement a time-bearing domain transition and advances enemy objectives", () => {
    const initial = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const moved = SIEGE_SOVEREIGN_BREACH_YARD.step(initial, {
      kind: "move",
      destinationId: "broken-arch",
    });
    expect(moved.error).toBeUndefined();
    expect(moved.state).toMatchObject({ round: 2, playerPosition: "broken-arch" });
    expect(moved.state.enemies.map(({ position }) => position)).not.toEqual(
      initial.enemies.map(({ position }) => position),
    );
  });

  it("rejects geometry as authority when cells are not adjacent", () => {
    const initial = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const result = SIEGE_SOVEREIGN_BREACH_YARD.step(initial, {
      kind: "move",
      destinationId: "east-road",
    });
    expect(result.state).toBe(initial);
    expect(result.error).toContain("one exchange");
  });

  it("offers mutually exclusive tactical uses for a corpse", () => {
    let state = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "move", destinationId: "timber-stack" }).state;
    const raised = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "act", actionId: "raise-scout" });
    expect(raised.state).toMatchObject({ fallenScout: "raised", playerSpirit: 3, shadeRounds: 3 });
    const rendered = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "act", actionId: "render-scout" });
    expect(rendered.state).toMatchObject({ fallenScout: "rendered", tallow: 1, shadePosition: null });
  });

  it("telegraphs material objectives and makes Halwen contribute autonomously", () => {
    let state = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "move", destinationId: "broken-arch" }).state;
    const projection = SIEGE_SOVEREIGN_BREACH_YARD.project(state);
    expect(projection.enemyIntents.join(" ")).toContain("shoring");
    expect(projection.enemyIntents.join(" ")).toContain("Toman");
    expect(projection.eventLog.join(" ")).toContain("Halwen holds the breach beside you");
  });

  it("lets Toman retreat toward protection and survive a direct rescue route", () => {
    let state = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "move", destinationId: "broken-arch" }).state;
    expect(state).toMatchObject({ masonAlive: true, masonPosition: "shoring-line" });
    expect(state.eventLog.join(" ")).toContain("Toman leaves the bow's line");

    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "move", destinationId: "upper-walk" }).state;
    expect(state.masonAlive).toBe(true);
    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "move", destinationId: "broken-arch" }).state;
    expect(state.masonAlive).toBe(true);
    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, {
      kind: "act",
      actionId: "strike",
      targetId: "coalition-bow",
    }).state;

    expect(state).toMatchObject({ resolved: "secured", masonAlive: true });
  });

  it("projects every valid target separately and strikes only the chosen enemy", () => {
    const initial = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const state = {
      ...initial,
      playerPosition: "broken-arch" as const,
      enemies: initial.enemies.map((enemy) => ({ ...enemy, position: "shoring-line" as const })),
    };
    const strike = SIEGE_SOVEREIGN_BREACH_YARD.project(state).actions.find(({ id }) => id === "strike");
    expect(strike?.targets?.map(({ id }) => id)).toEqual(["coalition-cutter", "coalition-bow"]);
    const result = SIEGE_SOVEREIGN_BREACH_YARD.step(state, {
      kind: "act",
      actionId: "strike",
      targetId: "coalition-bow",
    });
    expect(result.error).toBeUndefined();
    expect(result.state.enemies.find(({ id }) => id === "coalition-bow")?.health).toBe(3);
    expect(result.state.enemies.find(({ id }) => id === "coalition-cutter")?.health).toBe(8);
    expect(result.state.eventLog.join(" ")).toContain("hooked knife opens coalition bow");
  });

  it("separates persistent abilities from interactions discovered at a represented subject", () => {
    let state = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    let actions = SIEGE_SOVEREIGN_BREACH_YARD.project(state).actions;
    expect(actions.find(({ id }) => id === "strike")?.presentation.scope).toBe("persistent");
    expect(actions.find(({ id }) => id === "direct-servant")?.presentation).toMatchObject({
      scope: "persistent",
      capability: "Bonebinder direction",
      prospect: "Assured",
      time: "Free direction",
    });
    expect(actions.find(({ id }) => id === "raise-scout")?.available).toBe(false);

    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "move", destinationId: "timber-stack" }).state;
    actions = SIEGE_SOVEREIGN_BREACH_YARD.project(state).actions;
    expect(actions.find(({ id }) => id === "raise-scout")?.presentation).toMatchObject({
      scope: "contextual",
      subjectId: "corpse",
      capability: "Bonebinding · Willpower",
      prospect: "Assured",
      time: "One exchange",
    });
  });

  it("directs Ditch-Hand toward an explicit represented assignment without spending the exchange", () => {
    const initial = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const directed = SIEGE_SOVEREIGN_BREACH_YARD.step(initial, {
      kind: "act",
      actionId: "direct-servant",
      targetId: "mason",
    });
    expect(directed.error).toBeUndefined();
    expect(directed.state).toMatchObject({
      round: initial.round,
      servantOrder: "guard",
      servantTargetId: "mason",
    });
    expect(directed.state.eventLog.at(-1)).toContain("Toman");
  });

  it("removes a recovered survey from the local interaction set", () => {
    const initial = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const state = {
      ...initial,
      playerPosition: "east-road" as const,
      enemies: initial.enemies.map((enemy) => enemy.id === "coalition-cutter" ? { ...enemy, health: 0 } : enemy),
    };
    const before = SIEGE_SOVEREIGN_BREACH_YARD.project(state).actions;
    expect(before.find(({ id }) => id === "take-survey:coalition-cutter")?.presentation.subjectId).toBe("fallen:coalition-cutter");
    const searched = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "act", actionId: "take-survey:coalition-cutter" });
    const after = SIEGE_SOVEREIGN_BREACH_YARD.project(searched.state).actions;
    expect(after.some(({ id }) => id === "take-survey:coalition-cutter")).toBe(false);
  });
});
