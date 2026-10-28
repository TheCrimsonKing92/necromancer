import { describe, expect, it } from "vitest";
import {
  COMBATANT_IDENTITY_PROFILES,
} from "./combatants/identity-profiles";
import {
  validateCombatantCatalogs,
} from "./combatants/archetypes";
import { enemyAttackFor } from "./enemy-actions";
import {
  createAshShade,
  createPlayer,
  createProceduralEnemies,
  createRoadEnemies,
  createVaultEnemies,
  createWakeEnemies,
} from "./engine/combatants";
import { chooseStoryChoice, createCharacter } from "./engine";
import { loadGame, saveGame, type StorageLike } from "./persistence";
import {
  NORTH_VEY_ROAD_THREAT_FIXTURE,
  composeProceduralEnemyRoster,
  PROCEDURAL_ENEMY_LOADOUT_IDS,
  PROCEDURAL_ENEMY_ROLE_IDS,
  validateGeneratedEnemyRoster,
  validateProceduralEnemyCatalogs,
} from "./procedural-enemies";
import type { Combatant, WakeVariantId } from "./types";

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

const authoredEnemies = (): Combatant[] => {
  const wakeIds: WakeVariantId[] = [
    "bell-widow",
    "name-thieves",
    "bone-procession",
    "reliquary-poachers",
    "reeve-patrol",
  ];
  return [
    ...createRoadEnemies(),
    ...createVaultEnemies(),
    ...wakeIds.flatMap(createWakeEnemies),
  ];
};

describe("combatant identity catalogs", () => {
  it("resolves every form, identity, archetype, and cadence reference", () => {
    expect(validateCombatantCatalogs()).toEqual([]);
    expect(validateProceduralEnemyCatalogs()).toEqual([]);
  });

  it("rejects armor on an incorporeal form and missing references", () => {
    expect(
      validateCombatantCatalogs({
        forms: {
          mist: {
            anatomy: "manifestation",
            materiality: "incorporeal",
            bodyScale: 1,
            permitsNaturalArmor: false,
          },
        },
        identityProfiles: { neutral: {} },
        archetypes: {
          armoredMist: {
            formId: "mist",
            identityProfileId: "neutral",
            naturalArmor: { torso: 1 },
          },
          unknown: {
            formId: "missing",
            identityProfileId: "missing",
          },
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "armoredMist gives natural armor to mist",
        "unknown references missing form missing",
      ]),
    );
  });

  it("preserves the authored mechanics of every current enemy", () => {
    const expected = {
      "road-reeve": [
        "living-humanoid",
        "reeve-hooked-knife",
        "humanoid",
        "corporeal",
        19,
        4,
        2,
        0,
        { torso: 1 },
        undefined,
      ],
      "ash-hound": [
        "living-quadruped",
        "grave-hound-rake",
        "quadruped",
        "corporeal",
        14,
        3,
        0,
        0,
        { torso: 1, leftArm: 1, rightArm: 1, leftLeg: 1, rightLeg: 1 },
        undefined,
      ],
      "ossuary-saint": [
        "distributed-revenant",
        "saint-ossuary-cycle",
        "humanoid",
        "corporeal",
        32,
        4,
        3,
        0,
        { head: 2, torso: 2 },
        { physical: 0.5, occult: 1.25 },
      ],
      "wake-bell-widow": ["manifestation", "bell-widow-toll", "manifestation", "incorporeal", 34, 4, 2, 4, {}, { physical: 0.5, occult: 1.25 }],
      "wake-redactor": ["manifestation", "redactor-hook", "manifestation", "incorporeal", 20, 4, 1, 0, {}, { physical: 0.5, occult: 1.25 }],
      "wake-cantor": ["manifestation", "cantor-antiphon", "manifestation", "incorporeal", 18, 3, 2, 3, {}, { physical: 0.5, occult: 1.25 }],
      "wake-pallbearer": ["bound-revenant", "pallbearer-office", "humanoid", "corporeal", 18, 3, 2, 0, { torso: 2 }, undefined],
      "wake-mourner-left": ["manifestation", "mourner-grief", "manifestation", "incorporeal", 12, 3, 0, 0, {}, { physical: 0.5, occult: 1.25 }],
      "wake-mourner-right": ["manifestation", "mourner-grief", "manifestation", "incorporeal", 12, 3, 0, 0, {}, { physical: 0.5, occult: 1.25 }],
      "wake-poacher-captain": ["living-humanoid", "poacher-billhook", "humanoid", "corporeal", 20, 4, 2, 0, { torso: 1, leftArm: 1, rightArm: 1 }, undefined],
      "wake-poacher-bow": ["living-humanoid", "poacher-crossbow", "humanoid", "corporeal", 16, 3, 1, 0, {}, undefined],
      "wake-reeve-sergeant": ["living-humanoid", "reeve-baton-hook", "humanoid", "corporeal", 22, 4, 2, 0, { head: 1, torso: 1 }, undefined],
      "wake-reeve-levy": ["living-humanoid", "reeve-spear-shield", "humanoid", "corporeal", 17, 3, 1, 0, { torso: 1 }, undefined],
    } as const;

    for (const enemy of authoredEnemies()) {
      expect(
        [
          enemy.formId,
          enemy.cadenceId,
          enemy.anatomy,
          enemy.materiality,
          enemy.maxHp,
          enemy.attack,
          enemy.defense,
          enemy.ward,
          enemy.naturalArmor,
          enemy.bodyDamageModifiers,
        ],
        enemy.id,
      ).toEqual(expected[enemy.id as keyof typeof expected]);
      expect(enemy.archetypeId, enemy.id).toBeDefined();
      expect(enemy.identityProfileId, enemy.id).toBeDefined();
    }
  });

  it("keeps ordinary prepared corpses distinct from Saint Orra's distributed shell", () => {
    const pallbearer = createWakeEnemies("bone-procession")[0]!;
    expect(pallbearer.formId).toBe("bound-revenant");
    expect(pallbearer.vitalParts).toBeUndefined();
    expect(pallbearer.bodyDamageModifiers).toBeUndefined();

    const saint = createVaultEnemies()[0]!;
    expect(saint.formId).toBe("distributed-revenant");
    expect(saint.vitalParts).toEqual([]);
    expect(saint.bodyDamageModifiers).toEqual({
      physical: 0.5,
      occult: 1.25,
    });

    const shade = createAshShade(createPlayer("Mara", "medium", "female"));
    expect(shade.formId).toBe("quadruped-shade");
    expect(
      COMBATANT_IDENTITY_PROFILES[shade.identityProfileId!]
        .possessiveDeterminer,
    ).toBe("its");
  });
});

describe("procedural enemy roster composition", () => {
  it("keeps its candidate order explicit and stable", () => {
    expect(PROCEDURAL_ENEMY_ROLE_IDS).toEqual([
      "line-holder",
      "enforcer",
      "marksman",
      "grave-hound",
      "occult-harrier",
    ]);
    expect(PROCEDURAL_ENEMY_LOADOUT_IDS).toEqual([
      "spear-and-shield",
      "baton-and-hook",
      "billhook",
      "crossbow",
      "ash-teeth",
      "mourning-nails",
    ]);
  });

  it("is reproducible for the same seed and varies usefully across seeds", () => {
    const first = composeProceduralEnemyRoster(
      NORTH_VEY_ROAD_THREAT_FIXTURE,
    );
    const again = composeProceduralEnemyRoster(
      NORTH_VEY_ROAD_THREAT_FIXTURE,
    );
    expect(again).toEqual(first);

    const variants = new Set(
      Array.from({ length: 12 }, (_, seed) =>
        JSON.stringify(
          composeProceduralEnemyRoster({
            ...NORTH_VEY_ROAD_THREAT_FIXTURE,
            seed: seed + 1,
          }).enemies.map((enemy) => [
            enemy.archetypeId,
            enemy.loadoutId,
            enemy.name,
          ]),
        ),
      ),
    );
    expect(variants.size).toBeGreaterThan(3);
  });

  it("honors threat, size, identity, and uniqueness invariants", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const roster = composeProceduralEnemyRoster({
        seed,
        encounterKey: "invariant-patrol",
        threatBudget: 20,
        minimumSize: 2,
        maximumSize: 3,
      });
      expect(validateGeneratedEnemyRoster(roster)).toEqual([]);
      expect(roster.enemies.length).toBeGreaterThanOrEqual(2);
      expect(roster.enemies.length).toBeLessThanOrEqual(3);
      expect(roster.threatSpent).toBeLessThanOrEqual(20);
      expect(new Set(roster.enemies.map((enemy) => enemy.id)).size).toBe(
        roster.enemies.length,
      );
      expect(new Set(roster.enemies.map((enemy) => enemy.name)).size).toBe(
        roster.enemies.length,
      );
    }
  });

  it("rejects impossible budgets, duplicate IDs, and unknown cadences", () => {
    expect(() =>
      composeProceduralEnemyRoster({
        seed: 1,
        encounterKey: "too-small",
        threatBudget: 1,
        minimumSize: 2,
        maximumSize: 2,
      }),
    ).toThrow(/threatBudget cannot satisfy minimumSize/);

    const valid = composeProceduralEnemyRoster({
      seed: 2,
      encounterKey: "bad-output",
      threatBudget: 15,
      minimumSize: 2,
      maximumSize: 2,
    });
    const invalid = structuredClone(valid);
    invalid.enemies[1]!.id = invalid.enemies[0]!.id;
    invalid.enemies[0]!.cadenceId = "missing" as never;
    expect(validateGeneratedEnemyRoster(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/references missing cadence/),
        expect.stringMatching(/duplicate generated id/),
      ]),
    );
  });

  it("selects cadence by explicit profile for generated IDs", () => {
    const generated = createProceduralEnemies({
      seed: 17,
      encounterKey: "unknown-id-crossbow",
      threatBudget: 6,
      minimumSize: 1,
      maximumSize: 1,
      allowedArchetypeIds: ["reliquary-poacher"],
      allowedRoleIds: ["marksman"],
    }).enemies[0]!;
    expect(generated.id).toMatch(/^generated-/);
    expect(generated.cadenceId).toBe("poacher-crossbow");
    expect(enemyAttackFor(generated, 1).name).toBe("crossbow bolt");
    expect(enemyAttackFor(generated, 2).name).toBe("barbed bolt");
  });

  it("round-trips generated identities and mechanics through a save", () => {
    const storage = new MemoryStorage();
    let state = createCharacter("Mara", "medium", 90210).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    const generated = createProceduralEnemies(
      NORTH_VEY_ROAD_THREAT_FIXTURE,
    );
    state.run!.battle!.enemies = generated.enemies;
    state.run!.battle!.seed = generated.seed;

    expect(saveGame(storage, state)).toBe(true);
    const loaded = loadGame(storage)!.state.run!.battle!;
    expect(loaded.enemies).toEqual(generated.enemies);
    expect(loaded.seed).toBe(generated.seed);
    expect(enemyAttackFor(loaded.enemies[0]!, 1).name).toBe(
      enemyAttackFor(generated.enemies[0]!, 1).name,
    );
  });
});
