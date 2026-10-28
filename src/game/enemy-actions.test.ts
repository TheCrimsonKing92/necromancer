import { describe, expect, it } from "vitest";
import {
  enemyAttackFor,
  enemyIntentFor,
  enemyIntentsFor,
  validateEnemyActionCatalogs,
} from "./enemy-actions";
import {
  chooseStoryChoice,
  createCharacter,
  resolveBattleAction,
} from "./engine";

const roadBattle = () => {
  let state = createCharacter("Mara", "medium", 41).state;
  state = chooseStoryChoice(state, "attune").state;
  state = chooseStoryChoice(state, "open-ground").state;
  return state;
};

describe("enemy intent", () => {
  it("keeps every technique and cadence reference valid", () => {
    expect(validateEnemyActionCatalogs()).toEqual([]);
  });

  it("rejects malformed techniques, cadences, and aliases", () => {
    expect(
      validateEnemyActionCatalogs({
        techniques: {
          broken: { name: "", telegraph: "", baseDamage: -1 },
        },
        cadences: {
          broken: { sequence: ["missing"] },
          empty: { sequence: [] },
        },
        aliases: {
          broken: "missing",
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "broken has no action name",
        "broken has no telegraph",
        "broken has invalid base damage",
        "broken references missing technique missing",
        "empty has an empty cadence",
        "broken shadows a defined cadence",
        "broken aliases missing cadence missing",
      ]),
    );
  });

  it("preserves every authored cadence and explicit alias", () => {
    const enemy = roadBattle().run!.battle!.enemies[0]!;
    const cases: Array<{
      enemyId: string;
      actions: string[];
    }> = [
      {
        enemyId: "ossuary-saint",
        actions: [
          "accounting touch",
          "bone crozier",
          "death knell",
          "bone crozier",
          "accounting touch",
          "death knell",
        ],
      },
      {
        enemyId: "road-reeve",
        actions: ["knife thrust", "knife thrust", "hooked knife"],
      },
      {
        enemyId: "ash-hound",
        actions: ["bite", "raking bite"],
      },
      {
        enemyId: "wake-bell-widow",
        actions: [
          "veiled hand",
          "clapper-chain",
          "thirteenth peal",
          "clapper-chain",
          "veiled hand",
          "thirteenth peal",
        ],
      },
      {
        enemyId: "wake-redactor",
        actions: [
          "editorial knife",
          "editorial knife",
          "redaction hook",
        ],
      },
      {
        enemyId: "wake-cantor",
        actions: ["stitched antiphon", "stolen syllable"],
      },
      {
        enemyId: "wake-pallbearer",
        actions: ["bier-pole", "office for the unburied"],
      },
      {
        enemyId: "wake-mourner-left",
        actions: ["grief-nail", "borrowed grief"],
      },
      {
        enemyId: "wake-mourner-right",
        actions: ["grief-nail", "borrowed grief"],
      },
      {
        enemyId: "wake-poacher-captain",
        actions: ["billhook jab", "billhook jab", "billhook drag"],
      },
      {
        enemyId: "wake-poacher-bow",
        actions: ["crossbow bolt", "barbed bolt"],
      },
      {
        enemyId: "wake-reeve-sergeant",
        actions: [
          "ashwood baton",
          "ashwood baton",
          "arresting hook",
        ],
      },
      {
        enemyId: "wake-reeve-levy",
        actions: ["short spear", "shield rush"],
      },
    ];

    for (const { enemyId, actions } of cases) {
      enemy.id = enemyId;
      // Exercise legacy-ID compatibility; current instances own cadence
      // explicitly so generated IDs cannot change their mechanics.
      enemy.cadenceId = undefined;
      expect(
        actions.map((_, index) =>
          enemyAttackFor(enemy, index + 1).name,
        ),
      ).toEqual(actions);
      expect(enemyAttackFor(enemy, actions.length + 1).name).toBe(
        actions[0],
      );
      expect(enemyAttackFor(enemy, 0).name).toBe(
        actions.at(-1),
      );
    }

    enemy.id = "unmapped-enemy";
    enemy.cadenceId = undefined;
    expect(enemyAttackFor(enemy, 1)).toMatchObject({
      name: "unremembered violence",
      baseDamage: 0,
      injuryProfile: "impact",
    });
  });

  it("forecasts the current cadence without consuming the battle seed", () => {
    const state = roadBattle();
    const battle = state.run!.battle!;
    const seed = battle.seed;

    const first = enemyIntentsFor(battle);
    const second = enemyIntentsFor(battle);

    expect(second).toEqual(first);
    expect(battle.seed).toBe(seed);
    expect(first).toMatchObject([
      {
        enemyId: "road-reeve",
        action: "knife thrust",
        damageType: "physical",
      },
      {
        enemyId: "ash-hound",
        action: "bite",
        damageType: "physical",
      },
    ]);
  });

  it("previews special effects and their durations from the attack definition", () => {
    const state = roadBattle();
    const enemy = state.run!.battle!.enemies[0]!;

    enemy.id = "ossuary-saint";
    enemy.cadenceId = undefined;
    const deathKnell = enemyIntentFor(enemy, 3);
    expect(deathKnell).toMatchObject({
      action: "death knell",
      damageType: "occult",
      effects: [
        "Occult attack",
        "Exposes 1 for 2 rounds on hit",
      ],
    });

    enemy.id = "wake-cantor";
    const syllable = enemyIntentFor(enemy, 2);
    expect(syllable.effects).toContain(
      "Drains 1 Spirit through damage",
    );
  });

  it("executes the action forecast for the exchange", () => {
    const state = roadBattle();
    const battle = state.run!.battle!;
    const intent = enemyIntentsFor(battle)[0]!;
    state.run!.player.hp = 100;
    state.run!.player.maxHp = 100;

    const resolved = resolveBattleAction(
      state,
      "guard",
    ).state;
    const answer = resolved.run!.battle!.log
      .flatMap((entry) => entry.event?.segments ?? [])
      .find(
        (segment) =>
          (segment.type === "damage" ||
            segment.type === "miss") &&
          segment.actor === intent.enemyName,
      );

    expect(answer).toBeDefined();
    if (
      answer?.type === "damage" ||
      answer?.type === "miss"
    ) {
      expect(answer.action).toBe(intent.action);
    }
  });
});
