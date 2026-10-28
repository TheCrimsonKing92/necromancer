import { describe, expect, it } from "vitest";
import { createCharacter } from "./engine";
import {
  advancementReadinessCapacity,
  normalizeAdvancementReadiness,
} from "./advancement-readiness";
import { advancementNodeStateFrom } from "./advancement-tree";
import { ADVANCEMENTS } from "./advancements";
import type { AdvancementExpressionId } from "./types";

const playerAtLevel = (level: number) => {
  const player = createCharacter("Mara", "thaumaturgist", 41).state.run!
    .player;
  player.level = level;
  return player;
};

describe("advancement readiness", () => {
  it("applies the level-based practice and universal slot capacities", () => {
    expect(advancementReadinessCapacity(playerAtLevel(1), "practice")).toBe(
      0,
    );
    expect(advancementReadinessCapacity(playerAtLevel(2), "practice")).toBe(
      2,
    );
    expect(advancementReadinessCapacity(playerAtLevel(6), "practice")).toBe(
      3,
    );
    expect(advancementReadinessCapacity(playerAtLevel(10), "practice")).toBe(
      4,
    );
    expect(
      advancementReadinessCapacity(playerAtLevel(2), "universal"),
    ).toBe(1);
    expect(
      advancementReadinessCapacity(playerAtLevel(8), "universal"),
    ).toBe(2);
  });

  it("normalizes unknown, wrong-kind, duplicate, sibling, and over-capacity readiness", () => {
    const player = playerAtLevel(2);
    player.advancements = ["cold-furnace-method"];
    player.advancementReadiness = {
      practice: [
        "cold-furnace-white-quench",
        "cold-furnace-long-reduction",
        "cold-furnace-white-quench",
        "unknown-expression" as AdvancementExpressionId,
      ],
      universal: ["cold-furnace-long-reduction"],
    };

    normalizeAdvancementReadiness(player);

    expect(player.advancementReadiness).toEqual({
      practice: ["cold-furnace-white-quench"],
      universal: [],
    });

    player.level = 1;
    normalizeAdvancementReadiness(player);
    expect(player.advancementReadiness).toEqual({
      practice: [],
      universal: [],
    });
  });
});

describe("doctrine exclusion", () => {
  it("locks an unlearned peer after another doctrine in its group is learned", () => {
    const player = playerAtLevel(2);
    player.advancements = ["field-medicine"];
    const definitions = structuredClone(ADVANCEMENTS);
    definitions["field-medicine"].name = "Field Splint";
    definitions["field-medicine"].classification = "active";
    definitions["field-medicine"].duality = {
      kind: "doctrine",
      group: "wound-method",
    };
    definitions.roadcraft.name = "Worked Around";
    definitions.roadcraft.classification = "passive";
    definitions.roadcraft.duality = {
      kind: "doctrine",
      group: "wound-method",
    };

    expect(
      advancementNodeStateFrom(player, definitions.roadcraft, definitions, 1),
    ).toMatchObject({
      status: "locked",
      reason:
        "Excluded by Field Splint. Retraining requires a world-grounded service.",
    });
  });
});
