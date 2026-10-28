import { describe, expect, it } from "vitest";
import { validateTacticalSceneProjection } from "../../tactical-scene";
import { SIEGE_SOVEREIGN_FAILING_CONDUIT } from "./failing-conduit";

const act = (actionIds: readonly string[]) =>
  actionIds.reduce(
    (state, actionId) => {
      const result = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(state, actionId);
      if (result.error) throw new Error(result.error);
      return result.state;
    },
    SIEGE_SOVEREIGN_FAILING_CONDUIT.createState(),
  );

describe("Siege Sovereign failing-conduit tactical proof", () => {
  it("projects a valid scene with social, mundane, military, and practice actions", () => {
    const projection = SIEGE_SOVEREIGN_FAILING_CONDUIT.project(
      SIEGE_SOVEREIGN_FAILING_CONDUIT.createState(),
    );

    expect(validateTacticalSceneProjection(projection)).toEqual([]);
    expect(new Set(projection.actions.map(({ kind }) => kind))).toEqual(
      expect.objectContaining(new Set(["prepare", "command", "negotiate", "ritual", "fight"])),
    );
    expect(projection.subjects.map(({ id }) => id)).toContain("siege-sovereign");
    expect(projection.background.alt).toContain("unwalled town");
  });

  it("makes neutral help depend on visible material and political footing", () => {
    const opened = act(["hear-terms"]);
    expect(SIEGE_SOVEREIGN_FAILING_CONDUIT.project(opened).actions.find(({ id }) => id === "counter-neutral")?.availability).toMatchObject({ state: "unavailable" });

    const prepared = act(["trace-load", "clear-houses", "raise-shoring", "hear-terms"]);
    const counter = SIEGE_SOVEREIGN_FAILING_CONDUIT.project(prepared).actions.find(({ id }) => id === "counter-neutral");
    expect(counter?.availability).toEqual({ state: "available" });

    const braced = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(prepared, "counter-neutral").state;
    expect(braced).toMatchObject({ phase: "brace", terms: "neutral", sovereignCondition: "strained" });
    expect(SIEGE_SOVEREIGN_FAILING_CONDUIT.project(braced).connections.find(({ id }) => id === "brace-reach")?.state).toBe("secured");
  });

  it("keeps the watchers' purpose and ambush responses undisclosed until investigated", () => {
    const initial = SIEGE_SOVEREIGN_FAILING_CONDUIT.project(
      SIEGE_SOVEREIGN_FAILING_CONDUIT.createState(),
    );
    const watchers = initial.subjects.find(({ id }) => id === "coalition-watchers")!;

    expect(watchers.label).toBe("Watchers in the crowd");
    expect(watchers.description).not.toContain("spare towns");
    expect(initial.actions.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(["warn-sovereign", "aid-strike"]),
    );

    const found = act(["find-watchers"]);
    const revealed = SIEGE_SOVEREIGN_FAILING_CONDUIT.project(found);
    expect(revealed.subjects.find(({ id }) => id === "coalition-watchers")).toMatchObject({
      label: "The concealed coalition",
      description: expect.stringContaining("spare towns farther along"),
    });
  });

  it("supports a strong ordinary rescue that grants no military passage", () => {
    const prepared = act(["trace-load", "keep-arch", "clear-houses", "clear-houses", "raise-shoring", "hear-terms"]);
    const result = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(prepared, "ordinary-work");

    expect(result.error).toBeUndefined();
    expect(result.state).toMatchObject({ phase: "resolved", terms: "unheard", outcome: "ordinary-loss" });
    expect(result.event?.result).toContain("All reachable people escape");
  });

  it("does not expose a free attack before the coalition plan and bodily brace", () => {
    const initial = SIEGE_SOVEREIGN_FAILING_CONDUIT.createState();
    expect(SIEGE_SOVEREIGN_FAILING_CONDUIT.project(initial).actions.find(({ id }) => id === "aid-strike")).toBeUndefined();

    const braced = act(["find-watchers", "hear-terms", "accept-passage"]);
    expect(SIEGE_SOVEREIGN_FAILING_CONDUIT.project(braced).actions.find(({ id }) => id === "aid-strike")?.availability).toEqual({ state: "available" });

    const struck = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(braced, "aid-strike").state;
    expect(struck).toMatchObject({ phase: "resolved", outcome: "strike-during-brace", sovereignCondition: "wounded" });
  });

  it("does not erase a concealed or unanswered ambush when the brace is finished", () => {
    const concealed = act(["hear-terms", "accept-passage"]);
    const concealedResult = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(concealed, "finish-brace");
    expect(concealedResult.state).toMatchObject({
      phase: "resolved",
      outcome: "strike-during-brace",
      sovereignCondition: "wounded",
    });
    expect(concealedResult.event?.detail).toContain("purpose hidden among the evacuees");

    const known = act(["find-watchers", "hear-terms", "accept-passage"]);
    const ignoredResult = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(known, "finish-brace");
    expect(ignoredResult.state.outcome).toBe("strike-during-brace");
    expect(ignoredResult.event?.detail).toContain("strike you uncovered but did not prevent");

    let guarded = act(["find-watchers", "hear-terms", "accept-passage"]);
    guarded = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(guarded, "warn-sovereign").state;
    expect(guarded).toMatchObject({ phase: "brace", coalitionPlan: "disclosed", outcome: null });
    const finished = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(guarded, "finish-brace").state;
    expect(finished).toMatchObject({ phase: "resolved", outcome: "passage-granted" });
  });

  it("refuses unavailable transitions without mutating state", () => {
    const state = SIEGE_SOVEREIGN_FAILING_CONDUIT.createState();
    const result = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(state, "counter-neutral");
    expect(result.state).toBe(state);
    expect(result.error).toContain("does not exist");
  });

  it("associates each consequence with the subject where the course was taken", () => {
    const state = act(["trace-load"]);
    const result = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(
      state,
      "confront-reeve",
    );

    expect(result.event?.subjectId).toBe("water-reeve");
    expect(result.state.events.at(-1)?.subjectId).toBe("water-reeve");
  });
});
