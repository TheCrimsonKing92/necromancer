import { describe, expect, it } from "vitest";
import { chronicleReadModelFor } from "./chronicle";
import { createCharacter } from "./engine";
import { synchronizeCampaignContinuity } from "./campaign-continuity";

describe("Chronicle read model", () => {
  it("projects closed summaries without exposing world or Journal knowledge", () => {
    const state = createCharacter("Mara", "medium", "female", 19).state;
    state.run!.world.facts.push("hollis-vane-dead");
    state.run!.world.playerKnowledge.push("hollis-vane-dead");
    state.screen = "ending";
    state.ending = "defeat";
    state.run!.player.hp = 0;
    synchronizeCampaignContinuity(state);

    const model = chronicleReadModelFor(state.campaign!);
    const serialized = JSON.stringify(model);

    expect(model.testaments).toHaveLength(1);
    expect(model.testaments[0]).toMatchObject({
      useName: "Mara",
      endReason: "death",
    });
    expect(serialized).not.toContain("hollis-vane-dead");
    expect(serialized).not.toContain("playerKnowledge");
    expect(serialized).not.toContain("world");
  });
});
