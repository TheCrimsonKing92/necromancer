import { describe, expect, it } from "vitest";
import { chooseStoryChoice } from "../../../engine";
import { chooseStoryApproach } from "../../../engine/story-approach-transitions";
import { createMovingShadePrototypeState } from "../../development-loader";
import { storyChoiceIsComplete, storyChoicesFor, storySceneFor } from "../../../content";
import { itemCount } from "../../../items";
import { fireRoadOperatingRoom, fireRoadStateFor } from "./state";
import {
  fireRoadCounterofferChance,
  fireRoadNegotiatingLeverage,
} from "./negotiation";
import { FIRE_ROAD_APPROACH_CATALOG } from "./approaches";

const enterFireRoad = async (
  tradition: Parameters<typeof createMovingShadePrototypeState>[0],
) => {
  const arrival = await createMovingShadePrototypeState(tradition);
  return chooseStoryChoice(arrival, "hear-appeal").state;
};

describe("Moving Shade Fire Road proof", () => {
  it("describes authored atomic courses without promising hidden subchoices or costs", () => {
    const byId = new Map(FIRE_ROAD_APPROACH_CATALOG.approaches.map((entry) => [entry.id, entry]));

    expect(byId.get("moving-shade:cut-firebreak")).toMatchObject({
      label: "Cut the eastern firebreak",
      lead: "Open the marked strip of scrub to bare earth.",
    });
    expect(byId.get("moving-shade:cut-firebreak")?.detail).not.toContain("choose ground");
    expect(byId.get("moving-shade:secure-carts")?.detail).not.toContain("standing");
    expect(byId.get("moving-shade:secure-carts")?.knownImmediateCost).toBe("Costs 2 obols.");
  });

  it("offers practice-specific preparation without mutating the admitted state", async () => {
    const state = await enterFireRoad("medium");
    const originalHealth = state.run!.player.hp;
    const originalSpirit = state.run!.player.spirit;

    const prepared = chooseStoryApproach(state, "moving-shade:host-keeper");

    expect(prepared.error).toBeUndefined();
    expect(fireRoadStateFor(state.run!).preparations).toEqual([]);
    expect(fireRoadStateFor(prepared.state.run!).preparations).toEqual([
      "dead-keeper",
    ]);
    expect(prepared.state.run!.player.hp).toBe(originalHealth - 1);
    expect(prepared.state.run!.player.spirit).toBe(originalSpirit - 1);
  });

  it("keeps independent preparations nonexclusive", async () => {
    let state = await enterFireRoad("summoner");
    state = chooseStoryApproach(state, "moving-shade:send-servant").state;
    state = chooseStoryApproach(state, "moving-shade:cut-firebreak").state;

    expect(fireRoadStateFor(state.run!).preparations).toEqual([
      "servant-labor",
      "firebreak",
    ]);
  });

  it("lets parallel work preserve the scene while other work spends its remaining room", async () => {
    let state = await enterFireRoad("summoner");
    expect(fireRoadOperatingRoom(fireRoadStateFor(state.run!))).toBe(3);

    state = chooseStoryApproach(state, "moving-shade:send-servant").state;
    expect(fireRoadOperatingRoom(fireRoadStateFor(state.run!))).toBe(3);

    state = chooseStoryApproach(state, "moving-shade:read-host").state;
    expect(fireRoadOperatingRoom(fireRoadStateFor(state.run!))).toBe(2);
  });

  it("allows a successful intervention to preserve or buy more room", async () => {
    let state = await enterFireRoad("thaumaturgist");
    const saltBefore = itemCount(state.run!.player.inventory, "grave-salt");

    state = chooseStoryApproach(state, "moving-shade:read-host").state;
    expect(fireRoadOperatingRoom(fireRoadStateFor(state.run!))).toBe(2);

    const rendered = chooseStoryApproach(state, "moving-shade:render-lane");
    expect(rendered.error).toBeUndefined();
    expect(fireRoadOperatingRoom(fireRoadStateFor(rendered.state.run!))).toBe(3);
    expect(itemCount(rendered.state.run!.player.inventory, "grave-salt")).toBe(
      saltBefore - 1,
    );
  });

  it("closes substantial preparations when the scene has spent its room", async () => {
    let state = await enterFireRoad("medium");
    state = chooseStoryApproach(state, "moving-shade:host-keeper").state;
    state = chooseStoryApproach(state, "moving-shade:read-host").state;
    state = chooseStoryApproach(state, "moving-shade:witness-offer").state;
    expect(fireRoadOperatingRoom(fireRoadStateFor(state.run!))).toBe(0);

    const seedBefore = state.run!.seed;
    const rejected = chooseStoryApproach(state, "moving-shade:cut-firebreak");
    expect(rejected.state).toBe(state);
    expect(rejected.error).toContain("closed");
    expect(rejected.state.run!.seed).toBe(seedBefore);
  });

  it("defaults legacy proof state and refuses costs after its preparation window", async () => {
    const legacy = await enterFireRoad("thaumaturgist");
    const proof = fireRoadStateFor(legacy.run!);
    delete (proof as { operatingRoom?: number }).operatingRoom;
    expect(fireRoadOperatingRoom(proof)).toBe(3);

    proof.operatingRoom = 0;
    const saltBefore = itemCount(legacy.run!.player.inventory, "grave-salt");
    const rejected = chooseStoryApproach(legacy, "moving-shade:render-lane");
    expect(rejected.error).toContain("closed");
    expect(itemCount(rejected.state.run!.player.inventory, "grave-salt")).toBe(
      saltBefore,
    );
  });

  it("separates rescue work from leverage over the God's terms", async () => {
    const state = await enterFireRoad("summoner");
    const initialProof = fireRoadStateFor(state.run!);
    const initialChance = fireRoadCounterofferChance(
      state.run!.player,
      initialProof,
    );

    const rescued = chooseStoryApproach(
      state,
      "moving-shade:send-servant",
    ).state;
    expect(fireRoadCounterofferChance(
      rescued.run!.player,
      fireRoadStateFor(rescued.run!),
    )).toBe(initialChance);
    expect(fireRoadNegotiatingLeverage(fireRoadStateFor(rescued.run!))).toBe(0);

    const informed = chooseStoryApproach(
      rescued,
      "moving-shade:read-host",
    ).state;
    const informedProof = fireRoadStateFor(informed.run!);
    if (informedProof.preparationResults["host-need"] === "success") {
      expect(fireRoadNegotiatingLeverage(informedProof)).toBe(1);
      expect(fireRoadCounterofferChance(informed.run!.player, informedProof)).toBe(
        initialChance + 8,
      );
    } else {
      expect(fireRoadNegotiatingLeverage(informedProof)).toBe(0);
      expect(fireRoadCounterofferChance(informed.run!.player, informedProof)).toBe(
        initialChance,
      );
    }
  });

  it("establishes the winter provisions before reporting their loss", async () => {
    const arrival = await createMovingShadePrototypeState("medium");
    const state = chooseStoryChoice(arrival, "hear-appeal").state;
    const scene = storySceneFor(state.storyId!);

    expect(storySceneFor(arrival.storyId!)?.paragraphs(arrival.run!).join(" ")).toContain(
      "Eighteen households are still inside",
    );
    expect(storySceneFor(arrival.storyId!)?.paragraphs(arrival.run!).join(" ")).toContain(
      "Twelve grain wagons wait behind them",
    );
    expect(scene?.paragraphs(state.run!).join(" ")).toContain(
      "12 wagons hold the winter grain of this town and three settlements farther east",
    );

    const resolved = chooseStoryChoice(state, "ordinary-rescue");
    expect(scene?.paragraphs(resolved.state.run!).join(" ")).toContain(
      "4 of 12 grain wagons crossed; 8 burned",
    );
    expect(scene?.paragraphs(resolved.state.run!).join(" ")).toContain("Winter shortage");
  });

  it("keeps the briefing consistent with every observed ignition", async () => {
    const variants = [
      ["east-wind", "lightning had fired the scrub", "Late-summer lightning has put fire into the resin scrub"],
      ["kiln-fall", "the kiln roof fell", "A kiln roof has fallen into the dry cut"],
      ["warehouse-sparks", "sparks had crossed between the grain roofs", "Sparks cross between the grain roofs"],
    ] as const;

    for (const [hazard, answerText, sceneText] of variants) {
      const arrival = await createMovingShadePrototypeState("medium");
      fireRoadStateFor(arrival.run!).hazard = hazard;
      const scene = storySceneFor(arrival.storyId!)!;
      const highShade = storyChoicesFor(scene, arrival.run!).find(({ id }) => id === "ask-high-shade")!;
      const body = typeof highShade.outcome!.body === "function"
        ? highShade.outcome!.body(arrival.run!)
        : highShade.outcome!.body;
      const response = chooseStoryChoice(arrival, "hear-appeal").state;

      expect(body).toContain(answerText);
      expect(scene.paragraphs(response.run!).join(" ")).toContain(sceneText);
      expect(`${body} ${highShade.outcome!.result(arrival.run!)}`).not.toContain(
        "whether the God brought the fire",
      );
    }
  });

  it("gives the God's speaker a concrete voice that answers changed leverage", async () => {
    let state = await enterFireRoad("medium");
    const scene = storySceneFor(state.storyId!)!;

    expect(scene.paragraphs(state.run!).join(" ")).toContain(
      "I do not spend shelter upon the uncounted",
    );

    state = chooseStoryApproach(state, "moving-shade:read-host").state;
    state = chooseStoryApproach(state, "moving-shade:witness-offer").state;
    const proof = fireRoadStateFor(state.run!);
    const successfulLeverage = ["host-need", "witnessed-offer"].filter(
      (id) => proof.preparationResults[id as "host-need" | "witnessed-offer"] === "success",
    ).length;
    const copy = scene.paragraphs(state.run!).join(" ");

    if (successfulLeverage === 2) {
      expect(copy).toContain("You have made refusal costly");
    } else if (successfulLeverage === 1) {
      expect(copy).toContain("You have found a price");
    } else {
      expect(copy).toContain("I do not spend shelter upon the uncounted");
    }
  });

  it("rejects a practice method that the current character cannot perform", async () => {
    const state = await enterFireRoad("medium");
    const attempted = chooseStoryApproach(state, "moving-shade:render-lane");

    expect(attempted.state).toBe(state);
    expect(attempted.error).toContain("practice");
  });

  it("resolves a final choice from the accumulated ordinary work", async () => {
    let state = await enterFireRoad("grave-warden");
    state = chooseStoryApproach(state, "moving-shade:keep-bridge").state;
    const resolved = chooseStoryChoice(state, "ordinary-rescue");
    const proof = fireRoadStateFor(resolved.state.run!);

    expect(resolved.error).toBeUndefined();
    expect(proof.phase).toBe("resolved");
    expect(proof.outcome).toBe("ordinary-rescue");
    expect(proof.rescuedHouseholds).toBeGreaterThan(7);
    expect(resolved.state.run!.flags).toContain(
      "story-choice:moving-shade:fire-road:ordinary-rescue",
    );
  });

  it("trades immediate rescue capacity for breaking the God's local voice", async () => {
    const state = await enterFireRoad("grave-warden");

    const ordinary = chooseStoryChoice(state, "ordinary-rescue").state;
    const broken = chooseStoryChoice(state, "break-array").state;
    const ordinaryProof = fireRoadStateFor(ordinary.run!);
    const brokenProof = fireRoadStateFor(broken.run!);

    expect(brokenProof.rescuedHouseholds).toBe(
      ordinaryProof.rescuedHouseholds! - 2,
    );
    expect(brokenProof.lostGrainLoads).toBe(
      ordinaryProof.lostGrainLoads! + 1,
    );
    expect(brokenProof.outcome).toBe("array-broken");
  });

  it("keeps a refused counteroffer as an enduring scene result", async () => {
    const state = await enterFireRoad("summoner");
    state.run!.seed = 10_368;

    const refused = chooseStoryChoice(state, "counteroffer");
    const proof = fireRoadStateFor(refused.state.run!);
    const scene = storySceneFor(refused.state.storyId!);
    const choices = scene ? storyChoicesFor(scene, refused.state.run!) : [];

    expect(refused.error).toBeUndefined();
    expect(refused.message).toBeUndefined();
    expect(proof.counterofferAttempted).toBe(true);
    expect(proof.counterofferAccepted).toBe(false);
    expect(refused.state.run!.flags).toContain(
      "story-choice:moving-shade:fire-road:counteroffer",
    );
    const completedCounteroffer = choices.find(({ id }) => id === "counteroffer");
    expect(completedCounteroffer).toBeDefined();
    expect(storyChoiceIsComplete(scene!.id, completedCounteroffer!, refused.state.run!)).toBe(true);
    expect(choices.map(({ id }) => id)).toContain("accept-ordinance");
    const refusedCopy = scene?.paragraphs(refused.state.run!).join(" ") ?? "";
    expect(refusedCopy).toContain("Shade belongs to subjects");
    expect(refusedCopy).toContain("The original ordinance remains open");

    const resolved = chooseStoryChoice(refused.state, "ordinary-rescue");
    expect(fireRoadStateFor(resolved.state.run!).lostGrainLoads).toBe(9);
  });
});
