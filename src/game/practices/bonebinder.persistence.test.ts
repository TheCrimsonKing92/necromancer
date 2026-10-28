import { describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  createCharacter,
  resolveBattleAction,
} from "../engine";
import {
  loadGame,
  SAVE_KEY,
  saveGame,
  type StorageLike,
} from "../persistence";
import { bonebinderStateFor } from "./bonebinder";
import {
  installDitchHandFixture,
  recognizeDitchHandFixture,
} from "./bonebinder/fixture";

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

describe("Bonebinder persistence", () => {
  it("preserves servant identity, anatomy, commands, repairs, and world references", () => {
    const storage = new MemoryStorage();
    let state = installDitchHandFixture(
      createCharacter("Mara", "medium", "female", 42).state,
    ).state;
    state = recognizeDitchHandFixture(state).state;
    const servant = bonebinderStateFor(state.run!)!.servant!;
    servant.combatant.hp = 9;
    servant.combatant.body.rightArm.condition -= 4;
    servant.command = {
      sequence: 3,
      current: {
        id: "guard",
        targetReference: null,
        issuedAtReference: "battle:old:round-2",
      },
    };
    servant.repairs = {
      sequence: 1,
      history: [
        {
          id: "repair:old",
          part: "rightArm",
          conditionRestored: 2,
          healthRestored: 2,
          stabilizedWoundId: null,
          materialReferences: ["item:mortuary-tallow"],
          performedAtReference: "inventory",
        },
      ],
    };
    saveGame(storage, state);

    const loaded = loadGame(storage)!.state;
    const restored = bonebinderStateFor(loaded.run!)!.servant!;
    expect(restored.identity).toEqual(servant.identity);
    expect(restored.combatant).toMatchObject({
      hp: 9,
      anatomy: "humanoid",
      materiality: "corporeal",
      lifetime: {
        kind: "persistent",
        servantId: servant.identity.id,
      },
    });
    expect(restored.combatant.body.rightArm.condition).toBe(
      servant.combatant.body.rightArm.condition,
    );
    expect(restored.command).toEqual(servant.command);
    expect(restored.repairs).toEqual(servant.repairs);
    expect(restored.worldReferences).toEqual(
      servant.worldReferences,
    );
  });

  it("normalizes legacy shade durations into temporary lifetimes identically", () => {
    const storage = new MemoryStorage();
    let state = createCharacter(
      "Mara",
      "summoner",
      "female",
      42,
    ).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state = resolveBattleAction(state, "raise-shade").state;
    saveGame(storage, state);
    const saved = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: {
        run: {
          battle: {
            allies: Array<Record<string, unknown>>;
          };
        };
      };
    };
    const shade = saved.state.run.battle.allies[0]!;
    const duration = (
      shade.lifetime as { remainingTurns: number }
    ).remainingTurns;
    delete shade.lifetime;
    shade.remainingTurns = duration;
    storage.setItem(SAVE_KEY, JSON.stringify(saved));

    const restored =
      loadGame(storage)!.state.run!.battle!.allies[0]!;
    expect(restored.lifetime).toEqual({
      kind: "temporary",
      remainingTurns: duration,
    });
    expect("remainingTurns" in restored).toBe(false);
  });

  it("normalizes missing namespaced practice state without changing old saves", () => {
    const storage = new MemoryStorage();
    const state = createCharacter(
      "Mara",
      "medium",
      "female",
      42,
    ).state;
    saveGame(storage, state);
    const loaded = loadGame(storage)!.state;
    expect(loaded.run!.practiceStates).toBeUndefined();
  });
});
