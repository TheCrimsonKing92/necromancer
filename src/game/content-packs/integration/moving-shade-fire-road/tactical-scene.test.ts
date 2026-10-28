import { beforeAll, describe, expect, it } from "vitest";
import { validateTacticalSceneProjection } from "../../../tactical-scene";
import {
  createMovingShadePrototypeState,
} from "../../development-loader";
import { fireRoadTacticalScene } from "./tactical-scene";
import { FIRE_ROAD_SCENE } from "./scene";
import { fireRoadStateFor } from "./state";
import { chooseStoryChoice } from "../../../engine";
import { storyChoicesFor } from "../../../content/story-selectors";

describe("Fire Road tactical projection", () => {
  beforeAll(async () => {
    await createMovingShadePrototypeState("medium");
  });

  it("projects existing story approaches through the semantic scene", async () => {
    const state = await createMovingShadePrototypeState("medium");
    const response = chooseStoryChoice(state, storyChoicesFor(FIRE_ROAD_SCENE, state.run!)
      .find(({ id }) => id === "hear-appeal")!.id);
    expect(response.error).toBeUndefined();
    const scene = fireRoadTacticalScene(response.state.run!);

    expect(validateTacticalSceneProjection(scene)).toEqual([]);
    expect(scene.subjects.some(({ id }) => id === "bell-keeper")).toBe(true);
    expect(scene.subjects.some(({ id }) => id === "servant")).toBe(false);
    expect(scene.actions.some(({ activation }) =>
      activation.kind === "story-approach")).toBe(true);
    expect(scene.actions.some(({ activation }) =>
      activation.kind === "story-choice")).toBe(true);
    const firebreak = scene.actions.find(({ id }) =>
      id === "moving-shade:cut-firebreak");
    expect(firebreak).toMatchObject({
      resolution: {
        method: expect.stringContaining("Survival"),
        prospect: expect.stringMatching(/Poor|Unfavorable|Uncertain|Favorable|Strong/u),
      },
    });
  });

  it("puts the active authored dialogue and decisions on Sera", async () => {
    const state = await createMovingShadePrototypeState("medium");
    const scene = fireRoadTacticalScene(state.run!);
    const sera = scene.subjects.find(({ id }) => id === "sera")!;
    const actions = sera.actionIds.map((id) =>
      scene.actions.find((action) => action.id === id)!);

    expect(actions.map(({ activation }) => activation)).toEqual(
      expect.arrayContaining([
        { kind: "story-choice", choiceId: "ask-why-me" },
        { kind: "story-choice", choiceId: "ask-high-shade" },
        { kind: "story-choice", choiceId: "ask-grain-stakes" },
        { kind: "story-choice", choiceId: "hear-appeal" },
        { kind: "story-choice", choiceId: "leave" },
      ]),
    );
    expect(actions[0]?.activation.kind).toBe("story-choice");
    expect(sera.description).toContain("empower her to surrender it");
    expect(sera.description).not.toContain("surrender them");
  });

  it("removes answered dialogue from the tableau without removing the onward decision", async () => {
    const state = await createMovingShadePrototypeState("medium");
    const answered = chooseStoryChoice(state, "ask-why-me");
    const scene = fireRoadTacticalScene(answered.state.run!);
    const choiceIds = scene.actions.flatMap(({ activation }) =>
      activation.kind === "story-choice" ? [activation.choiceId] : []);

    expect(choiceIds).not.toContain("ask-why-me");
    expect(choiceIds).toContain("hear-appeal");
  });

  it("shows only the current practice's unique represented opportunity", async () => {
    const state = await createMovingShadePrototypeState("summoner");
    const response = chooseStoryChoice(state, storyChoicesFor(FIRE_ROAD_SCENE, state.run!)
      .find(({ id }) => id === "hear-appeal")!.id);
    expect(response.error).toBeUndefined();
    const scene = fireRoadTacticalScene(response.state.run!);

    expect(scene.subjects.some(({ id }) => id === "servant")).toBe(true);
    expect(scene.subjects.some(({ id }) => id === "bell-keeper")).toBe(false);
  });

  it("does not present failed preparations as secured facts", async () => {
    const state = await createMovingShadePrototypeState("medium");
    const response = chooseStoryChoice(state, "hear-appeal");
    const fireRoad = fireRoadStateFor(response.state.run!);
    fireRoad.preparations.push("open-wells", "secure-carts", "host-need", "firebreak");
    fireRoad.preparationResults["open-wells"] = "failure";
    fireRoad.preparationResults["secure-carts"] = "failure";
    fireRoad.preparationResults["host-need"] = "failure";
    fireRoad.preparationResults.firebreak = "failure";

    const scene = fireRoadTacticalScene(response.state.run!);
    expect(scene.subjects.find(({ id }) => id === "wells")).toMatchObject({
      status: "Two wells forced; the claim remains disputed",
      visualState: "partial",
    });
    expect(scene.subjects.find(({ id }) => id === "wagons")?.status).toBe(
      "Two hired teams arrived",
    );
    expect(scene.subjects.find(({ id }) => id === "host")).toMatchObject({
      status: "Supply train screened from a second count",
      visualState: "screened",
    });
    expect(scene.subjects.find(({ id }) => id === "host")?.description).not.toContain(
      "shortage of water",
    );
    expect(scene.subjects.find(({ id }) => id === "fire")?.status).toBe(
      "Crossing a broken firebreak in three places",
    );
  });
});
