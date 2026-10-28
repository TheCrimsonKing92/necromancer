import { beforeAll, describe, expect, it } from "vitest";
import { createCharacter } from "../../engine";
import { startRoadBattle } from "../../engine/battle-openings";
import {
  loadGame,
  SAVE_KEY,
  saveGame,
  type StorageLike,
} from "../../persistence";
import { activateGraveWardenPackRuntime } from "../../content-packs/practice/grave-warden/grave-warden-pack";
import { graveWardenBattleState, setThresholdSeal } from "./battle";
import {
  beginGraveWardenPractice,
  isGraveWardenBattleState,
  isGraveWardenPracticeState,
} from "./practice-state";

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

beforeAll(() => activateGraveWardenPackRuntime());

describe("Grave Warden persistence", () => {
  it("round-trips namespaced practice and encounter state", () => {
    const storage = new MemoryStorage();
    const state = createCharacter(
      "Mara",
      "grave-warden",
      "female",
      41,
    ).state;
    beginGraveWardenPractice(state);
    startRoadBattle(state.run!, "open-ground");
    setThresholdSeal(state.run!, state.run!.battle!.enemies[0]!);
    state.screen = "battle";
    state.storyId = null;

    saveGame(storage, state);
    const loaded = loadGame(storage)!.state.run!;

    expect(isGraveWardenPracticeState(loaded.practiceStates?.graveWarden)).toBe(
      true,
    );
    expect(graveWardenBattleState(loaded)).toMatchObject({
      sealsPlaced: 1,
      seals: [{ targetId: "road-reeve", integrity: 2 }],
    });
  });

  it("clamps counters and drops duplicate or impossible current-save seals", () => {
    const storage = new MemoryStorage();
    const state = createCharacter(
      "Mara",
      "grave-warden",
      "female",
      41,
    ).state;
    beginGraveWardenPractice(state);
    startRoadBattle(state.run!, "open-ground");
    state.screen = "battle";
    state.storyId = null;
    saveGame(storage, state);

    const envelope = JSON.parse(storage.getItem(SAVE_KEY)!) as any;
    envelope.state.run.practiceStates.graveWarden = {
      version: 99,
      sealCapacity: -40,
    };
    envelope.state.run.battle.practiceStates.graveWarden = {
      version: 99,
      sealsPlaced: -5,
      breachRecoveries: 99,
      nextSealId: -2,
      seals: [
        {
          id: 4,
          targetId: " road-reeve ",
          integrity: 99,
          maxIntegrity: 99,
          breached: false,
        },
        {
          id: 4,
          targetId: "ash-hound",
          integrity: 1,
          maxIntegrity: 2,
          breached: false,
        },
        {
          id: 5,
          targetId: "road-reeve",
          integrity: -1,
          maxIntegrity: 0,
          breached: false,
        },
        {
          id: -1,
          targetId: "",
          integrity: -1,
          maxIntegrity: -1,
          breached: false,
        },
      ],
    };
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));

    const loaded = loadGame(storage)!.state.run!;
    const practice = loaded.practiceStates!.graveWarden!;
    const battle = loaded.battle!.practiceStates!.graveWarden!;
    expect(practice).toEqual({ version: 1, sealCapacity: 1 });
    expect(battle).toEqual({
      version: 1,
      sealsPlaced: 1,
      breachRecoveries: 2,
      nextSealId: 5,
      seals: [
        {
          id: 4,
          targetId: "road-reeve",
          integrity: 2,
          maxIntegrity: 2,
          breached: false,
        },
      ],
    });
    expect(isGraveWardenBattleState(battle)).toBe(true);
  });
});
