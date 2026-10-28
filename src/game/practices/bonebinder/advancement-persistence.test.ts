import { describe, expect, it } from "vitest";

import { createCharacter } from "../../engine";
import {
  loadGame,
  SAVE_KEY,
  saveGame,
  type StorageLike,
} from "../../persistence";
import {
  bonebinderStateFor,
  configureServantCompact,
  createBonebinderAdvancementState,
  installDitchHandFixture,
  prepareCalledCounsel,
} from "../bonebinder";

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

const fixtureState = () =>
  installDitchHandFixture(
    createCharacter("Mara", "summoner", "female", 13).state,
  ).state;

describe("Bonebinder advancement persistence", () => {
  it("preserves the written compact and counsel history records", () => {
    const storage = new MemoryStorage();
    const state = fixtureState();
    const practice = bonebinderStateFor(state.run!)!;
    const configured = configureServantCompact(
      practice,
      ["letter-of-service"],
      "keep-custody",
      true,
    );
    if (!configured.ok) throw new Error(configured.reason);
    state.run!.practiceStates!.bonebinder = configured.practice;
    saveGame(storage, state);

    expect(
      bonebinderStateFor(loadGame(storage)!.state.run!)!.advancement.compact,
    ).toEqual({
      purposeId: "keep-custody",
      status: "kept",
      breachReference: null,
    });

    const counselState = fixtureState();
    const called = prepareCalledCounsel(
      bonebinderStateFor(counselState.run!)!,
      ["called-counsel"],
      "battle:ditch",
      1,
      1,
    );
    if (!called.ok) throw new Error(called.reason);
    counselState.run!.practiceStates!.bonebinder = called.practice;
    saveGame(storage, counselState);
    expect(
      bonebinderStateFor(loadGame(storage)!.state.run!)!.advancement.counsel,
    ).toEqual(called.practice.advancement.counsel);
  });

  it("supplies the additive default when an earlier current save lacks it", () => {
    const storage = new MemoryStorage();
    saveGame(storage, fixtureState());
    const saved = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: {
        run: {
          practiceStates: {
            bonebinder: Record<string, unknown>;
          };
        };
      };
    };
    delete saved.state.run.practiceStates.bonebinder.advancement;
    storage.setItem(SAVE_KEY, JSON.stringify(saved));

    expect(
      bonebinderStateFor(loadGame(storage)!.state.run!)!.advancement,
    ).toEqual(createBonebinderAdvancementState());
  });
});
