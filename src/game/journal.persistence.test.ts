import { describe, expect, it } from "vitest";
import { createCharacter, openJournal } from "./engine";
import {
  SAVE_KEY,
  loadGame,
  saveGame,
  type StorageLike,
} from "./persistence";
import { learnWorldFact } from "./world";

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

describe("journal persistence", () => {
  it("persists player knowledge and the screen to return to", () => {
    const storage = new MemoryStorage();
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    learnWorldFact(state.run!.world, "aided-county-burial");
    state = openJournal(state).state;

    expect(saveGame(storage, state)).toBe(true);
    const loaded = loadGame(storage)?.state;
    expect(loaded?.screen).toBe("journal");
    expect(loaded?.journalReturnScreen).toBe("story");
    expect(loaded?.run?.world.playerKnowledge).toEqual([
      "aided-county-burial",
    ]);
  });

  it("normalizes older current-schema saves without journal fields", () => {
    const storage = new MemoryStorage();
    const state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    const oldState = structuredClone(state) as unknown as Record<
      string,
      unknown
    >;
    delete oldState.journalReturnScreen;
    const oldRun = oldState.run as Record<string, unknown>;
    const oldWorld = oldRun.world as Record<string, unknown>;
    delete oldWorld.playerKnowledge;
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        schemaVersion: 4,
        savedAt: "2026-07-25T12:00:00.000Z",
        state: oldState,
      }),
    );

    const loaded = loadGame(storage)?.state;
    expect(loaded?.journalReturnScreen).toBeNull();
    expect(loaded?.run?.world.playerKnowledge).toEqual([]);
  });
});
