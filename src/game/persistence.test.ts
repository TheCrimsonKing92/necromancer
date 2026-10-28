import { describe, expect, it } from "vitest";
import {
  chooseAdvancement,
  chooseStoryChoice,
  createCharacter,
  prepareAdvancementExpression,
} from "./engine";
import { createWound } from "./anatomy";
import {
  LEGACY_SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  SAVE_KEY,
  V2_SAVE_KEY,
  clearSave,
  loadGame,
  saveGame,
  type StorageLike,
} from "./persistence";
import type { GameState } from "./types";
import { MAX_PERSISTED_WITNESS_ENTRIES } from "./witness";
import { revealWorldFact } from "./world";
import { experienceForLevel } from "./progression";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

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

const asV2State = (state: GameState): unknown => {
  const previous = structuredClone(state) as unknown as {
    schemaVersion: number;
    run: {
      player: Record<string, unknown>;
      world?: unknown;
    } | null;
  };
  previous.schemaVersion = 2;
  const player = previous.run?.player;
  if (player) {
    player.focus = player.spirit;
    player.maxFocus = player.maxSpirit;
    delete player.spirit;
    delete player.maxSpirit;
    delete player.attributes;
    delete player.skills;
  }
  if (previous.run) delete previous.run.world;
  return previous;
};

const asV3State = (state: GameState): unknown => {
  const previous = structuredClone(state) as unknown as {
    schemaVersion: number;
    run: {
      world?: unknown;
    } | null;
  };
  previous.schemaVersion = 3;
  if (previous.run) delete previous.run.world;
  return previous;
};

describe("versioned local persistence", () => {
  it("round-trips a resumable run with save metadata", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", 1).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "hedge-surgeon";
    state.run!.seenRoadEvents = [
      "mourning-caravan",
      "hedge-surgeon",
    ];
    state.run!.player.scars.push({
      id: "scar-test",
      part: "rightArm",
      label: "Pale binding line",
      source: "test blade",
      conditionPenalty: 1,
    });
    const saved = saveGame(
      storage,
      state,
      () => new Date("2026-07-24T12:00:00.000Z"),
    );

    expect(saved).toBe(true);
    expect(loadGame(storage)).toEqual({
      schemaVersion: 4,
      savedAt: "2026-07-24T12:00:00.000Z",
      state,
    });
  });

  it("round-trips prepared expressions and removes invalid readiness", () => {
    const storage = new MemoryStorage();
    let state = createCharacter(
      "Mara",
      "thaumaturgist",
      1,
    ).state;
    state.run!.player.level = 2;
    state.run!.player.xp = experienceForLevel(2);
    state = chooseAdvancement(
      state,
      "cold-furnace-method",
    ).state;
    state = prepareAdvancementExpression(
      state,
      "cold-furnace-long-reduction",
    ).state;
    saveGame(storage, state);

    const loaded = loadGame(storage)!.state;
    expect(
      loaded.run?.player.advancementReadiness?.practice,
    ).toEqual(["cold-furnace-long-reduction"]);

    const raw = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: {
        run: {
          player: {
            advancements: string[];
            advancementReadiness: {
              practice: string[];
              universal: string[];
            };
          };
        };
      };
    };
    raw.state.run.player.advancements = [];
    raw.state.run.player.advancementReadiness.practice.push(
      "not-a-discipline",
    );
    storage.setItem(SAVE_KEY, JSON.stringify(raw));

    expect(
      loadGame(storage)?.state.run?.player
        .advancementReadiness,
    ).toEqual({ practice: [], universal: [] });
  });

  it("does not persist menus or incomplete character creation", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", 1).state;
    state.screen = "creation";

    expect(saveGame(storage, state)).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("defaults saves from before character sex was recorded to other", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", 1).state;
    saveGame(storage, state);
    const saved = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: { run: { player: { sex?: unknown } } };
    };
    delete saved.state.run.player.sex;
    storage.setItem(SAVE_KEY, JSON.stringify(saved));

    expect(loadGame(storage)?.state.run?.player.sex).toBe("other");
  });

  it("trims oversized Witness history when loading older saves", () => {
    const storage = new MemoryStorage();
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "dead-advance").state;
    const total = MAX_PERSISTED_WITNESS_ENTRIES + 5;
    state.run!.battle!.log = Array.from(
      { length: total },
      (_, index) => ({
        id: index + 1,
        round: index + 1,
        tone: "system" as const,
        text: `Exchange ${index + 1}.`,
      }),
    );

    saveGame(storage, state);
    const loadedLog = loadGame(storage)?.state.run?.battle?.log;

    expect(loadedLog).toHaveLength(
      MAX_PERSISTED_WITNESS_ENTRIES,
    );
    expect(loadedLog?.[0]?.id).toBe(6);
    expect(loadedLog?.at(-1)?.id).toBe(total);
  });

  it("adds an empty world memory when migrating a v3 save", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", 1).state;
    storage.setItem(
      PREVIOUS_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 3,
        savedAt: "2026-07-24T12:00:00.000Z",
        state: asV3State(state),
      }),
    );

    const loaded = loadGame(storage);

    expect(loaded?.schemaVersion).toBe(4);
    expect(loaded?.state.run?.world).toMatchObject({
      pressures: {
        escapedNames: 0,
        countyNotice: 0,
      },
      facts: [],
      standing: {
        "county-reeves": 0,
        "iven-saye": 0,
      },
    });
  });

  it("normalizes additive structured world records in current saves", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", 1).state;
    revealWorldFact(
      state.run!.world,
      "county-reeves",
      "hollis-vane-rendered",
    );
    saveGame(storage, state);
    const saved = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: {
        run: {
          world: Record<string, unknown>;
        };
      };
    };
    delete saved.state.run.world.beliefs;
    delete saved.state.run.world.evidence;
    delete saved.state.run.world.provenance;
    delete saved.state.run.world.claims;
    delete saved.state.run.world.relationships;
    delete saved.state.run.world.activePressures;
    const standing = saved.state.run.world.standing as Record<
      string,
      unknown
    >;
    delete standing["eda-pell"];
    delete standing["oren-vask"];
    storage.setItem(SAVE_KEY, JSON.stringify(saved));

    const world = loadGame(storage)?.state.run?.world;

    expect(world?.beliefs).toEqual([
      expect.objectContaining({
        holderId: "county-reeves",
        factId: "hollis-vane-rendered",
        certainty: "accepted",
      }),
    ]);
    expect(world?.evidence).toEqual([]);
    expect(world?.provenance).toEqual([]);
    expect(world?.claims).toEqual([]);
    expect(world?.relationships).toEqual([]);
    expect(world?.standing["eda-pell"]).toBe(0);
    expect(world?.standing["oren-vask"]).toBe(0);
    expect(world?.activePressures).toEqual([
      expect.objectContaining({
        id: "north-vey:escaped-names",
        intensity: 0,
      }),
      expect.objectContaining({
        id: "north-vey:county-notice",
        intensity: 0,
      }),
    ]);
  });

  it("defaults a missing current-save economy ledger", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", 1).state;
    saveGame(storage, state);
    const saved = JSON.parse(storage.getItem(SAVE_KEY)!) as {
      state: { run: { economy?: unknown } };
    };
    delete saved.state.run.economy;
    storage.setItem(SAVE_KEY, JSON.stringify(saved));

    expect(loadGame(storage)?.state.run?.economy).toEqual({
      markets: {},
    });
  });

  it("rejects corrupt market activity counts in current saves", () => {
    for (const count of [0.5, Number.MAX_SAFE_INTEGER + 1]) {
      const storage = new MemoryStorage();
      const state = createCharacter("Mara", "medium", 1).state;
      saveGame(storage, state);
      const saved = JSON.parse(storage.getItem(SAVE_KEY)!) as {
        state: {
          run: {
            economy: {
              markets: Record<string, unknown>;
            };
          };
        };
      };
      saved.state.run.economy.markets["north-vey-reliquary"] = {
        purchases: { "vigil-cordial": count },
        services: {},
      };
      storage.setItem(SAVE_KEY, JSON.stringify(saved));

      expect(loadGame(storage)).toBeNull();
    }
  });

  it("reconciles a stale saved level from its experience total", () => {
    const storage = new MemoryStorage();
    const state = createCharacter("Mara", "medium", 1).state;
    state.run!.player.xp = 25;
    state.run!.player.level = 1;
    saveGame(storage, state);

    const loaded = loadGame(storage);

    expect(loaded?.state.run?.player.level).toBe(2);
  });

  it("normalizes additive character and journey fields in older v2 saves", () => {
    const storage = new MemoryStorage();
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "dead-advance").state;
    const player = state.run!.player as {
      advancements?: unknown;
      scars?: unknown;
      obols?: unknown;
      anatomy?: unknown;
      materiality?: unknown;
    };
    delete player.advancements;
    delete player.scars;
    delete player.obols;
    delete player.anatomy;
    delete player.materiality;
    const run = state.run as {
      wakeVariant?: unknown;
      roadEvent?: unknown;
      seenRoadEvents?: unknown;
    };
    delete run.wakeVariant;
    delete run.roadEvent;
    delete run.seenRoadEvents;
    const hound = state.run!.battle!.enemies.find(
      (enemy) => enemy.id === "ash-hound",
    )!;
    hound.body.rightArm.wounds.push(
      createWound(
        "old-hound-wound",
        "rightArm",
        "serious",
        "burial stone",
      ),
    );
    const legacyHound = hound as unknown as {
      anatomy?: unknown;
      materiality?: unknown;
    };
    delete legacyHound.anatomy;
    delete legacyHound.materiality;
    delete (
      hound.body.rightArm.wounds[0] as {
        care?: unknown;
      }
    ).care;
    storage.setItem(
      V2_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        savedAt: "2026-07-24T12:00:00.000Z",
        state: asV2State(state),
      }),
    );

    const loaded = loadGame(storage);

    expect(loaded?.state.run?.player.advancements).toEqual([]);
    expect(loaded?.state.run?.player.scars).toEqual([]);
    expect(loaded?.state.run?.player.obols).toBe(0);
    expect(loaded?.state.run?.player).toMatchObject({
      anatomy: "humanoid",
      materiality: "corporeal",
      spirit: 5,
      maxSpirit: 6,
      attributes: {
        strength: 3,
        dexterity: 2,
        vitality: 4,
        intelligence: 2,
        willpower: 3,
        charisma: 4,
      },
      skills: {
        medicine: 0,
        perception: 2,
      },
    });
    expect(loaded?.state.run?.wakeVariant).toBeNull();
    expect(loaded?.state.run?.roadEvent).toBeNull();
    expect(loaded?.state.run?.seenRoadEvents).toEqual([]);
    const loadedHound = loaded?.state.run?.battle?.enemies.find(
      (enemy) => enemy.id === "ash-hound",
    );
    expect(loadedHound).toMatchObject({
      anatomy: "quadruped",
      materiality: "corporeal",
    });
    expect(loadedHound?.body.rightArm.wounds[0]).toMatchObject({
      label: expect.stringMatching(/foreleg|forepaw/i),
      care: "binding",
    });
  });

  it("infers encounter identity for older v2 battle saves", () => {
    const storage = new MemoryStorage();
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    const battle = state.run!.battle as {
      encounterId?: unknown;
      variantId?: unknown;
    };
    delete battle.encounterId;
    delete battle.variantId;
    const run = state.run as {
      wakeVariant?: unknown;
    };
    delete run.wakeVariant;
    storage.setItem(
      V2_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        savedAt: "2026-07-24T12:00:00.000Z",
        state: asV2State(state),
      }),
    );

    const loaded = loadGame(storage);

    expect(loaded?.state.run?.wakeVariant).toBeNull();
    expect(loaded?.state.run?.battle).toMatchObject({
      encounterId: "ossuary-road",
      variantId: null,
    });
  });

  it("restores known supernatural body rules in older combatants", () => {
    const storage = new MemoryStorage();
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    const saint = state.run!.battle!.enemies[0]!;
    saint.id = "ossuary-saint";
    saint.name = "Saint Orra";
    const legacySaint = saint as {
      formId?: unknown;
      archetypeId?: unknown;
      identityProfileId?: unknown;
      cadenceId?: unknown;
      vitalParts?: unknown;
      bodyDamageModifiers?: unknown;
    };
    delete legacySaint.formId;
    delete legacySaint.archetypeId;
    delete legacySaint.identityProfileId;
    delete legacySaint.cadenceId;
    delete legacySaint.vitalParts;
    delete legacySaint.bodyDamageModifiers;
    saveGame(storage, state);

    const loaded = loadGame(storage);
    const restored =
      loaded?.state.run?.battle?.enemies.find(
        (enemy) => enemy.id === "ossuary-saint",
      );

    expect(restored?.vitalParts).toEqual([]);
    expect(restored?.bodyDamageModifiers).toEqual({
      physical: 0.5,
      occult: 1.25,
    });
  });

  it("rejects malformed and future-version saves", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "{bad-json");
    expect(loadGame(storage)).toBeNull();

    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        schemaVersion: 99,
        savedAt: "later",
        state: {},
      }),
    );
    expect(loadGame(storage)).toBeNull();
  });

  it("migrates a v1 testament with supplies and earned loot", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: "2026-07-23T12:00:00.000Z",
        state: {
          schemaVersion: 1,
          screen: "ending",
          storyId: null,
          ending: "victory",
          run: {
            seed: 7,
            flags: ["bought-tonic"],
            battle: null,
            battlesWon: 1,
            player: {
              id: "player",
              name: "Old Mara",
              kind: "player",
              title: "Medium",
              tradition: "medium",
              level: 1,
              xp: 20,
              hp: 12,
              maxHp: 26,
              attack: 3,
              defense: 2,
              ward: 4,
              focus: 2,
              maxFocus: 5,
              statuses: [
                {
                  id: "exposed",
                  turns: 1,
                  potency: 1,
                },
              ],
              supplies: {
                blackTonic: 1,
              },
            },
          },
        },
      }),
    );

    const migrated = loadGame(storage);

    expect(migrated).toMatchObject({
      schemaVersion: 4,
      savedAt: "2026-07-23T12:00:00.000Z",
      state: {
        schemaVersion: 4,
        screen: "ending",
        inventoryReturnScreen: null,
        run: {
          wakeVariant: null,
          player: {
            name: "Old Mara",
            hp: 12,
            ward: 0,
            spirit: 2,
            maxSpirit: 5,
            statuses: [],
            scars: [],
            obols: 0,
            equipment: {
              mainHand: "ritual-knife",
              torso: "gravecloth-coat",
            },
            inventory: {
              "black-tonic": 1,
              "hooked-knife": 1,
              "hound-tooth": 2,
            },
          },
        },
      },
    });
    expect(migrated?.state.run?.player.body.head.maxCondition).toBe(8);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it("clears every Necromancer save generation and nothing else", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "save");
    storage.setItem(PREVIOUS_SAVE_KEY, "previous");
    storage.setItem(V2_SAVE_KEY, "v2");
    storage.setItem(LEGACY_SAVE_KEY, "legacy");
    storage.setItem("another-app", "untouched");

    expect(clearSave(storage)).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(PREVIOUS_SAVE_KEY)).toBeNull();
    expect(storage.getItem(V2_SAVE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    expect(storage.getItem("another-app")).toBe("untouched");
  });
});
