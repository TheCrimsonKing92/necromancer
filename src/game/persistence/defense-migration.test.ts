import { describe, expect, it } from "vitest";
import { chooseStoryChoice, createCharacter } from "../engine";
import { createAshShade } from "../engine/combatants";
import { loadGame, saveGame } from "../persistence";
import {
  LEGACY_SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  SAVE_KEY,
  V2_SAVE_KEY,
  type StorageLike,
} from "./schema";

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

const battleState = () => {
  let state = createCharacter("Mara", "medium", 1).state;
  state = chooseStoryChoice(state, "attune").state;
  state = chooseStoryChoice(state, "dead-advance").state;
  state.run!.player.defense = 2;
  const ally = createAshShade(state.run!.player);
  ally.defense = 7;
  state.run!.battle!.allies = [ally];
  return state;
};

describe("player defense save migration", () => {
  it.each([
    [1, LEGACY_SAVE_KEY],
    [2, V2_SAVE_KEY],
    [3, PREVIOUS_SAVE_KEY],
    [4, SAVE_KEY],
  ] as const)("resets v%i player defense once and preserves other combatants", (version, key) => {
    const storage = new MemoryStorage();
    const state = battleState();
    const enemies = state.run!.battle!.enemies.map((enemy) => enemy.defense);
    const previous = {
      ...state,
      schemaVersion: version,
      run: {
        ...state.run!,
        player: {
          ...state.run!.player,
          focus: state.run!.player.spirit,
          maxFocus: state.run!.player.maxSpirit,
        },
      },
    };
    storage.setItem(key, JSON.stringify({
      schemaVersion: version,
      savedAt: "2026-11-02T12:00:00.000Z",
      state: previous,
    }));

    const loaded = loadGame(storage)!;
    expect(loaded?.schemaVersion).toBe(5);
    expect(loaded?.state.schemaVersion).toBe(5);
    expect(loaded?.state.run?.player.defense).toBe(0);
    expect(loaded?.state.run?.battle?.enemies.map((enemy) => enemy.defense)).toEqual(enemies);
    expect(loaded?.state.run?.battle?.allies[0]?.defense).toBe(7);
    const persisted = JSON.parse(storage.getItem(SAVE_KEY)!);
    expect(persisted.schemaVersion).toBe(5);
    expect(persisted.state.run.player.defense).toBe(0);

    loaded.state.run!.player.defense = 3;
    expect(saveGame(storage, loaded.state)).toBe(true);
    expect(loadGame(storage)?.state.run?.player.defense).toBe(3);
  });

  it("preserves defense bonuses in newly written saves", () => {
    const storage = new MemoryStorage();
    const state = battleState();
    state.run!.player.defense = 3;
    expect(saveGame(storage, state)).toBe(true);
    expect(loadGame(storage)?.state.run?.player.defense).toBe(3);
  });

  it.each([
    [undefined, 4],
    [4, undefined],
    [4, 3],
    [3, 4],
    [99, 99],
  ])("rejects unsupported or mismatched versions %s/%s under the current key", (envelopeVersion, stateVersion) => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({
      schemaVersion: envelopeVersion,
      savedAt: "2026-11-02T12:00:00.000Z",
      state: { ...battleState(), schemaVersion: stateVersion },
    }));
    expect(loadGame(storage)).toBeNull();
  });
});
