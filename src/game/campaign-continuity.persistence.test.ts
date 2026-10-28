import { describe, expect, it } from "vitest";
import { synchronizeCampaignContinuity } from "./campaign-continuity";
import { createCharacter } from "./engine";
import {
  loadGame,
  saveGame,
  SAVE_KEY,
  type StorageLike,
} from "./persistence";

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

describe("campaign continuity persistence", () => {
  it("normalizes an older v4 save without losing run or world state", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Old Mara", "medium", "female", 71).state;
    state.storyId = "burial-cut";
    state.run!.flags.push("old-route-state");
    state.run!.world.facts.push("hollis-vane-dead");
    state.run!.world.playerKnowledge.push("hollis-vane-dead");
    expect(saveGame(storage, state)).toBe(true);

    const raw = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: Record<string, unknown>;
    };
    delete raw.state.campaign;
    storage.setItem(SAVE_KEY, JSON.stringify(raw));

    const first = loadGame(storage)!.state;
    const second = loadGame(storage)!.state;

    expect(first.campaign).toEqual(second.campaign);
    expect(first.storyId).toBe("burial-cut");
    expect(first.run?.flags).toContain("old-route-state");
    expect(first.run?.world.facts).toContain("hollis-vane-dead");
    expect(first.run?.world.playerKnowledge).toContain(
      "hollis-vane-dead",
    );
  });

  it("round-trips one closed summary and never re-archives it on load", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", "female", 71).state;
    state.screen = "ending";
    state.storyId = null;
    state.ending = "defeat";
    state.run!.player.hp = 0;
    synchronizeCampaignContinuity(state);

    expect(saveGame(storage, state)).toBe(true);
    const first = loadGame(storage)!.state;
    expect(saveGame(storage, first)).toBe(true);
    const second = loadGame(storage)!.state;

    expect(second.campaign?.closedTestaments).toHaveLength(1);
    expect(second.campaign?.closedTestaments[0]).toEqual(
      first.campaign?.closedTestaments[0],
    );
    expect(second.run?.player.inventory).toEqual(
      state.run?.player.inventory,
    );
  });

  it("archives a terminal older v4 save once during normalization", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Old Mara", "medium", "other", 71).state;
    state.screen = "ending";
    state.storyId = null;
    state.ending = "defeat";
    state.run!.player.hp = 0;
    saveGame(storage, state);
    const raw = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: { campaign?: unknown };
    };
    delete raw.state.campaign;
    storage.setItem(SAVE_KEY, JSON.stringify(raw));

    const first = loadGame(storage)!.state.campaign;
    const second = loadGame(storage)!.state.campaign;

    expect(first?.closedTestaments).toHaveLength(1);
    expect(first).toEqual(second);
    expect(first?.closedTestaments[0]?.endReason).toBe("death");
  });
});
