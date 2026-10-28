import { describe, expect, it } from "vitest";
import { chooseStoryChoice, createCharacter } from "./engine";
import {
  loadGame,
  saveGame,
  type StorageLike,
} from "./persistence";
import type { DepartureRecoveryState } from "./departure-recovery";

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

describe("departure recovery persistence", () => {
  it("normalizes Mercy and claimed enemy IDs through a real save round trip", () => {
    let state = createCharacter("Mara Vey", "medium", 12_345).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state.run!.battle!.advancementState = {
      usedExpressions: [],
      departureRecovery: {
        battleKey: "  ossuary-road:ordinary:1:17  ",
        expression: "bank-the-departure",
        mercyTokens: 91.7,
        claimedDefeatIds: [
          "hollis",
          "hollis",
          "  ash-hound  ",
          "",
          17,
        ],
        openHandConversionSpent: true,
      } as unknown as DepartureRecoveryState,
    };
    const storage = new MemoryStorage();

    expect(saveGame(storage, state)).toBe(true);
    const loaded = loadGame(storage)!.state.run!.battle!
      .advancementState!.departureRecovery;

    expect(loaded).toEqual({
      battleKey: "ossuary-road:ordinary:1:17",
      expression: "bank-the-departure",
      mercyTokens: 2,
      claimedDefeatIds: ["hollis", "ash-hound"],
      openHandConversionSpent: false,
    });
  });
});
