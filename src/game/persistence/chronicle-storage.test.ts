import { describe, expect, it } from "vitest";
import { createCharacter } from "../engine";
import { synchronizeCampaignContinuity } from "../campaign-continuity";
import { saveGame } from "../persistence";
import { readStoredChronicle } from "./chronicle-storage";
import { SAVE_KEY, type StorageLike } from "./schema";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("stored Chronicle projection", () => {
  it("reads closed summaries without running full save admission", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", "female", 22).state;
    state.run!.world.playerKnowledge.push("hollis-vane-dead");
    state.screen = "ending";
    state.ending = "defeat";
    state.run!.player.hp = 0;
    synchronizeCampaignContinuity(state);
    saveGame(storage, state);

    const model = readStoredChronicle(storage);

    expect(model?.testaments).toHaveLength(1);
    expect(model?.testaments[0]).toMatchObject({
      useName: "Mara",
      endReason: "death",
    });
    expect(JSON.stringify(model)).not.toContain("hollis-vane-dead");
  });

  it("recovers a bounded terminal summary from an older v4 save", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Old Mara", "medium", "other", 22).state;
    state.screen = "ending";
    state.storyId = null;
    state.ending = "defeat";
    state.run!.player.hp = 0;
    const envelope = {
      schemaVersion: 4,
      savedAt: "2026-08-08T00:00:00.000Z",
      state,
    };
    const oldState = envelope.state as unknown as {
      campaign?: unknown;
    };
    delete oldState.campaign;
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));

    expect(readStoredChronicle(storage)?.testaments[0]).toMatchObject({
      useName: "Old Mara",
      endReason: "death",
      finalHealth: 0,
    });
  });
});
