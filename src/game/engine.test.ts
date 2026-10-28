import { beforeAll, describe, expect, it } from "vitest";
import {
  beginNewGame,
  buyItem,
  chooseAdvancement,
  chooseStoryChoice,
  closeInventory,
  continueJourney,
  createCharacter,
  createInitialState,
  effectiveAttack,
  effectiveDefense,
  equipItem,
  getActionUnavailableReason,
  getFleeChance,
  openInventory,
  prepareAdvancementExpression,
  resolveBattleAction,
  sellItem,
  treatWound,
  unequipItem,
  useInventoryItem,
} from "./engine";
import {
  allWounds,
  createWound,
  isCombatantStanding,
  woundSeverityForDamage,
} from "./anatomy";
import {
  WAKE_VARIANTS,
  rollWakeVariant,
} from "./encounters";
import {
  STORY_SCENES,
  storyChoicesFor,
} from "./content";
import {
  ROAD_EVENTS,
  ROAD_EVENT_IDS,
  rollRoadEvent,
} from "./road-events";
import {
  factionKnows,
  rollRoadsideRendering,
} from "./world";
import {
  equippedArmorForPart,
  equippedWeapon,
  itemCount,
  offHandStrikeDamage,
} from "./items";
import { activateReliquaryMarketRuntime } from "./economy/reliquary-transitions";
import type {
  AdvancementId,
  GameState,
  TraditionId,
  WakeVariantId,
} from "./types";

beforeAll(() => activateReliquaryMarketRuntime());

const createStoryState = (
  tradition: TraditionId = "medium",
  seed = 12345,
): GameState => {
  const result = createCharacter("Mara Vey", tradition, seed);
  expect(result.error).toBeUndefined();
  return result.state;
};

const createBattleState = (
  tradition: TraditionId = "medium",
  preparation: "attune" | "take-tonic" = "attune",
  opening: "open-ground" | "dead-advance" = "open-ground",
  seed = 12345,
): GameState => {
  let state = createStoryState(tradition, seed);
  state = chooseStoryChoice(state, preparation).state;
  state = chooseStoryChoice(state, opening).state;
  expect(state.screen).toBe("battle");
  return state;
};

const createRoadVictoryState = (
  tradition: TraditionId = "medium",
): GameState => {
  const state = createBattleState(
    tradition,
    "attune",
    "open-ground",
    2468,
  );
  const battle = state.run?.battle;
  if (!battle) throw new Error("Missing test battle");
  battle.seed = 1;
  battle.enemies[0]!.hp = 1;
  battle.enemies[1]!.hp = 0;
  return resolveBattleAction(
    state,
    "strike",
    "road-reeve",
  ).state;
};

const ROOT_ADVANCEMENT: Record<
  TraditionId,
  AdvancementId
> = {
  medium: "two-way-passage",
  summoner: "longer-leash",
  thaumaturgist: "cold-furnace-method",
  "grave-warden": "threshold-discipline",
};

const createVaultBattleState = (
  tradition: TraditionId = "medium",
  rootAdvancement: AdvancementId =
    ROOT_ADVANCEMENT[tradition],
): GameState => {
  let state = continueJourney(
    createRoadVictoryState(tradition),
  ).state;
  state = chooseStoryChoice(state, "read-ledger").state;
  state = chooseStoryChoice(state, "leave-aftermath").state;
  state = chooseAdvancement(
    state,
    rootAdvancement,
  ).state;
  state = chooseStoryChoice(state, "rest-first").state;
  return chooseStoryChoice(state, "warded-descent").state;
};

const createVaultVictoryState = (
  tradition: TraditionId = "medium",
  rootAdvancement: AdvancementId =
    ROOT_ADVANCEMENT[tradition],
): GameState => {
  const state = createVaultBattleState(
    tradition,
    rootAdvancement,
  );
  state.run!.battle!.seed = 1;
  state.run!.battle!.enemies[0]!.hp = 1;
  return resolveBattleAction(
    state,
    "strike",
    "ossuary-saint",
  ).state;
};

const continuePastOrra = (
  tradition: TraditionId,
  rootAdvancement: AdvancementId,
  nextAdvancement: AdvancementId,
): GameState => {
  const victory = createVaultVictoryState(
    tradition,
    rootAdvancement,
  );
  const advanced = chooseAdvancement(
    victory,
    nextAdvancement,
  ).state;
  return continueJourney(advanced).state;
};

const continueThroughRoadInterlude = (
  state: GameState,
): GameState => {
  const interlude = chooseStoryChoice(
    state,
    "follow-name-storm",
  ).state;
  if (
    interlude.storyId !== "road-interlude" ||
    !interlude.run
  ) {
    throw new Error("Missing road interlude");
  }
  const onward = storyChoicesFor(
    STORY_SCENES["road-interlude"],
    interlude.run,
  ).find((choice) => choice.effect === "continue-road");
  if (!onward) throw new Error("Missing onward road choice");
  return chooseStoryChoice(interlude, onward.id).state;
};

describe("game setup and narrative", () => {
  it("starts at the title and opens a clean creation flow", () => {
    expect(createInitialState()).toMatchObject({
      schemaVersion: 4,
      screen: "home",
      run: null,
      inventoryReturnScreen: null,
    });
    expect(beginNewGame()).toMatchObject({
      screen: "creation",
      run: null,
    });
  });

  it("normalizes a valid character name and applies tradition stats", () => {
    const result = createCharacter("  Mara   Vey  ", "summoner", 9);

    expect(result.error).toBeUndefined();
    expect(result.state.run?.player).toMatchObject({
      name: "Mara Vey",
      sex: "other",
      tradition: "summoner",
      hp: 30,
      maxHp: 30,
      spirit: 4,
      maxSpirit: 4,
      attributes: {
        strength: 4,
        dexterity: 2,
        vitality: 5,
        intelligence: 2,
        willpower: 4,
        charisma: 1,
      },
      skills: {
        athletics: 1,
        medicine: 0,
        survival: 2,
        perception: 1,
        persuasion: 0,
        barter: 1,
      },
      equipment: {
        mainHand: "bone-wand",
        arms: "binder-wraps",
      },
      inventory: {
        "linen-binding": 1,
      },
    });
  });

  it("records the chosen character sex without changing seeded setup", () => {
    const result = createCharacter(
      "Mara Vey",
      "medium",
      "female",
      9,
    );

    expect(result.state.run).toMatchObject({
      seed: 9,
      player: {
        sex: "female",
      },
    });
  });

  it("rejects unusable names without creating a run", () => {
    const result = createCharacter("x", "medium", 9);

    expect(result.error).toContain("2 and 24");
    expect(result.state.screen).toBe("creation");
    expect(result.state.run).toBeNull();
  });

  it("turns the inn choice into a mechanical preparation", () => {
    const attuned = chooseStoryChoice(
      createStoryState("medium"),
      "attune",
    ).state;
    const supplied = chooseStoryChoice(
      createStoryState("medium"),
      "take-tonic",
    ).state;

    expect(attuned.storyId).toBe("ossuary-road");
    expect(attuned.run?.player.maxSpirit).toBe(6);
    expect(attuned.run?.flags).toContain("heard-warning");
    expect(
      itemCount(supplied.run!.player.inventory, "black-tonic"),
    ).toBe(1);
    expect(supplied.run?.flags).toContain("bought-tonic");
  });

  it("turns the road choice into a distinct battle opening", () => {
    const braced = createBattleState(
      "medium",
      "attune",
      "open-ground",
    );
    const omen = createBattleState(
      "medium",
      "attune",
      "dead-advance",
    );

    expect(braced.run?.player.ward).toBe(4);
    expect(omen.run?.player.spirit).toBe(5);
    expect(omen.run?.battle?.enemies.map((enemy) => enemy.hp)).toEqual([
      16, 11,
    ]);
    expect(omen.run?.battle?.enemies.every((enemy) =>
      enemy.body.torso.wounds.some(
        (wound) => wound.source === "the buried dead",
      ),
    )).toBe(true);
    expect(omen.run?.battle?.log).toMatchObject([
      {
        tone: "system",
        text: "The burial stones stir. The dead surge across the road.",
      },
      {
        tone: "player",
        text: "The buried dead claw upward into Hollis Vane, dealing 3 damage to his torso. Hollis Vane suffers rib bruise.",
      },
      {
        tone: "player",
        text: "The buried dead claw upward into Ash hound, dealing 3 damage to its torso. Ash hound suffers bruised ribs.",
      },
      {
        tone: "system",
        text: "The floorboard dead already gave you the shape of their first movement. Forewarned grants +10% Accuracy and Evasion through this first exchange.",
      },
    ]);
  });
});

describe("battle engine", () => {
  it("is deterministic for the same state and action", () => {
    const left = createBattleState("medium", "attune", "open-ground", 77);
    const right = createBattleState(
      "medium",
      "attune",
      "open-ground",
      77,
    );

    const leftResult = resolveBattleAction(left, "strike", "road-reeve");
    const rightResult = resolveBattleAction(
      right,
      "strike",
      "road-reeve",
    );

    expect(leftResult.state).toEqual(rightResult.state);
  });

  it("allows an attack to miss without applying its on-hit effect", () => {
    const state = createBattleState(
      "medium",
      "take-tonic",
      "open-ground",
    );
    const battle = state.run!.battle!;
    battle.seed = 14_336;
    state.run!.player.ward = 0;
    const healthBefore = battle.enemies[0]!.hp;

    const result = resolveBattleAction(
      state,
      "spirit-lash",
      "road-reeve",
    ).state;
    const miss = result.run?.battle?.log
      .flatMap((entry) => entry.event?.segments ?? [])
      .find(
        (segment) =>
          segment.type === "miss" &&
          segment.action === "Spirit Lash",
      );

    expect(miss).toMatchObject({
      type: "miss",
      chance: 75,
      roll: 91,
    });
    expect(result.run?.battle?.enemies[0]?.hp).toBe(
      healthBefore,
    );
    expect(result.run?.player.ward).toBe(0);
    expect(result.run?.battle?.log.some((entry) =>
      entry.text.includes(
        "The borrowed soul returns to",
      ),
    )).toBe(true);
  });

  it("names vital-region collapse when Borrowed Might defeats the ash hound with Health remaining", () => {
    const state = createBattleState(
      "medium",
      "take-tonic",
      "open-ground",
    );
    state.run!.battle!.seed = 21;

    const result = resolveBattleAction(
      state,
      "borrowed-might",
      "ash-hound",
    ).state;
    const hound = result.run?.battle?.enemies.find(
      (enemy) => enemy.id === "ash-hound",
    );
    const event = result.run?.battle?.log.find((entry) =>
      entry.event?.segments.some(
        (segment) =>
          segment.type === "damage" &&
          segment.action === "Borrowed Might",
      ),
    )?.event;

    expect(hound?.hp).toBe(0);
    expect(event?.segments).toContainEqual(
      expect.objectContaining({
        type: "damage",
        damage: 13,
        location: "torso",
      }),
    );
    expect(event?.segments).toContainEqual(
      expect.objectContaining({
        type: "transition",
        entity: "Ash hound",
        cause: "vital-region",
      }),
    );
    expect(event?.segments.map((segment) =>
      segment.type === "transition" ? segment.text : "",
    ).join(" ")).toContain("crushed chest gives way");
    expect(event?.segments.map((segment) =>
      segment.type === "transition" ? segment.text : "",
    ).join(" ")).toContain(
      "cinder behind its teeth gutters out",
    );
  });

  it("resolves the player, allies, enemies, and statuses as one turn", () => {
    const state = createBattleState("medium");
    const result = resolveBattleAction(state, "strike", "road-reeve");

    expect(result.error).toBeUndefined();
    expect(result.state.run?.battle?.round).toBe(2);
    expect(result.state.run?.battle?.enemies[0]?.hp).toBeLessThan(19);
    expect(result.state.run?.battle?.log.length).toBeGreaterThan(3);
    expect(
      result.state.run?.battle?.log.some((entry) =>
        entry.text.includes("strikes"),
      ),
    ).toBe(true);
    expect(
      result.state.run?.battle?.enemies.some(
        (enemy) =>
          Object.values(enemy.body).some(
            (part) => part.condition < part.maxCondition,
          ),
      ),
    ).toBe(true);
    expect(result.state).not.toBe(state);
  });

  it("requires a live target for targeted actions", () => {
    const state = createBattleState("medium");
    const result = resolveBattleAction(state, "strike");

    expect(result.error).toContain("living enemy");
    expect(result.state).toBe(state);
  });

  it("spends Spirit and rejects actions the player cannot afford", () => {
    const state = createBattleState("medium");
    state.run!.battle!.enemies[0]!.hp = 100;
    state.run!.battle!.enemies[0]!.maxHp = 100;
    Object.values(state.run!.battle!.enemies[0]!.body).forEach(
      (part) => {
        part.condition = 100;
        part.maxCondition = 100;
      },
    );
    const first = resolveBattleAction(
      state,
      "borrowed-might",
      "road-reeve",
    ).state;

    expect(first.run?.player.spirit).toBe(4);
    expect(
      first.run?.battle?.log.some(
        (entry) =>
          entry.text.includes("The borrowed body buckles") &&
          entry.text.includes("Spirit-bruised ribs") &&
          entry.text.includes("need a safe rest"),
      ),
    ).toBe(true);
    expect(first.run?.player.statuses).not.toContainEqual(
      expect.objectContaining({ id: "bleeding" }),
    );
    expect(
      first.run?.player.body.torso.wounds,
    ).toContainEqual(
      expect.objectContaining({
        label: "Spirit-bruised ribs",
        severity: "minor",
        bleed: 0,
        care: "rest",
        source: "Borrowed Might",
      }),
    );

    const second = resolveBattleAction(
      first,
      "borrowed-might",
      "road-reeve",
    ).state;
    expect(second.run?.player.spirit).toBe(2);
    expect(second.run?.player.body.torso.wounds).toHaveLength(1);
    const third = resolveBattleAction(
      second,
      "borrowed-might",
      "road-reeve",
    ).state;
    expect(third.run?.player.spirit).toBe(0);
    expect(third.run?.player.body.torso.wounds).toHaveLength(1);
    expect(
      getActionUnavailableReason(third, "borrowed-might"),
    ).toContain("Requires 2 Spirit");
  });

  it("makes Brace non-stacking while it intercepts incoming damage", () => {
    const state = createBattleState("medium");
    if (!state.run) throw new Error("Missing test run");
    state.run.player.spirit = 0;
    state.run.player.ward = 0;

    const result = resolveBattleAction(state, "guard").state;

    expect(result.run?.player.spirit).toBe(0);
    expect(result.run?.player.hp).toBe(28);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes("raises 3 Ward"),
      ),
    ).toBe(true);
    expect(result.run?.battle?.log.some((entry) =>
      entry.text.includes("Ward turns the blow aside completely"),
    )).toBe(true);

    const alreadyBraced = createBattleState("medium");
    alreadyBraced.run!.player.ward = 3;
    const repeated = resolveBattleAction(
      alreadyBraced,
      "guard",
    ).state;
    expect(
      repeated.run?.battle?.log.some((entry) =>
        entry.text.includes("Brace adds no further protection"),
      ),
    ).toBe(true);
  });

  it("recovers one Spirit when an enemy falls", () => {
    const state = createBattleState("medium");
    const battle = state.run!.battle!;
    state.run!.player.spirit = 0;
    battle.seed = 1;
    battle.enemies[0]!.hp = 1;

    const result = resolveBattleAction(
      state,
      "strike",
      battle.enemies[0]!.id,
    ).state;

    expect(result.run?.player.spirit).toBe(1);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "Death leaves a narrow opening. Mara Vey recovers 1 Spirit.",
        ),
      ),
    ).toBe(true);
  });

  it("gives the Summoner a temporary autonomous shade", () => {
    const state = createBattleState("summoner");
    const before = state.run?.battle?.enemies[1]?.hp ?? 0;
    const result = resolveBattleAction(state, "raise-shade").state;

    expect(result.run?.battle?.allies[0]).toMatchObject({
      id: "bound-shade",
      lifetime: {
        kind: "temporary",
        remainingTurns: 2,
      },
    });
    expect(result.run?.battle?.enemies[1]?.hp).toBeLessThan(before);
  });

  it("lets grave salt expose a target for later attacks", () => {
    const state = createBattleState("thaumaturgist");
    state.run!.battle!.seed = 1;
    const target = state.run!.battle!.enemies[0]!;
    target.hp = 100;
    target.maxHp = 100;
    Object.values(target.body).forEach((part) => {
      part.condition = 100;
      part.maxCondition = 100;
    });
    const result = resolveBattleAction(
      state,
      "grave-salt",
      "road-reeve",
    ).state;

    expect(result.run?.battle?.enemies[0]?.statuses).toContainEqual({
      id: "exposed",
      potency: 2,
      turns: 2,
    });
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "Exposed 2 for 3 rounds (-2 Defense and Evasion)",
        ),
      ),
    ).toBe(true);
    const graveSaltWound = allWounds(
      result.run!.battle!.enemies[0]!,
    ).find((wound) => wound.source === "Grave Salt");
    expect(graveSaltWound?.label).toMatch(
      /salt-burned|desiccated|crystallized/i,
    );
    expect(graveSaltWound?.label).not.toMatch(
      /rib|bruise|fracture/i,
    );
    expect(
      result.run?.battle?.log.some(
        (entry) =>
          entry.text.includes("casts grave salt across") &&
          !entry.text.includes("fist of grave salt"),
      ),
    ).toBe(true);
  });

  it("does not let a destroyed projection end Saint Orra in one opening act", () => {
    const openings: Array<{
      tradition: TraditionId;
      action: "borrowed-might" | "soul-tithe" | "corpsefire";
    }> = [
      { tradition: "medium", action: "borrowed-might" },
      { tradition: "summoner", action: "soul-tithe" },
      { tradition: "thaumaturgist", action: "corpsefire" },
    ];

    for (const opening of openings) {
      const state = createVaultBattleState(opening.tradition);
      const battle = state.run!.battle!;
      const saint = battle.enemies[0]!;
      expect(saint.vitalParts).toEqual([]);
      expect(saint.bodyDamageModifiers).toEqual({
        physical: 0.5,
        occult: 1.25,
      });

      saint.body.head.condition = 0;
      saint.body.torso.condition = 0;
      expect(isCombatantStanding(saint)).toBe(true);
      battle.seed = 1;

      const result = resolveBattleAction(
        state,
        opening.action,
        saint.id,
      ).state;

      expect(result.ending).not.toBe("victory");
      expect(result.run!.battle!.enemies[0]!.hp).toBeGreaterThan(0);
      expect(
        isCombatantStanding(result.run!.battle!.enemies[0]!),
      ).toBe(true);
    }
  });

  it("accounts once for the Ward drawn by Spirit Lash", () => {
    const state = createBattleState("medium");
    state.run!.player.ward = 0;

    const result = resolveBattleAction(
      state,
      "spirit-lash",
      "road-reeve",
    ).state;

    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "The wake seals behind the lash, leaving 1 Ward.",
        ),
      ),
    ).toBe(true);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "leaving 2 Ward in all",
        ),
      ),
    ).toBe(false);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes(
          `${result.run!.player.name} lashes a borrowed soul through Hollis Vane`,
        ),
      ),
    ).toBe(true);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes("uses Spirit Lash"),
      ),
    ).toBe(false);
  });

  it("conserves Ward through Two-way Passage and Saint Orra's answer", () => {
    for (const startingWard of [9, 7]) {
      const state = createVaultBattleState("medium");
      const battle = state.run!.battle!;
      const saint = battle.enemies[0]!;
      state.run!.player.ward = startingWard;
      saint.hp = 100;
      saint.maxHp = 100;
      Object.values(saint.body).forEach((part) => {
        part.condition = 100;
        part.maxCondition = 100;
      });
      battle.seed = 1;
      const logLength = battle.log.length;

      const result = resolveBattleAction(
        state,
        "spirit-lash",
        saint.id,
      ).state;
      const newEntries =
        result.run?.battle?.log.slice(logLength) ?? [];
      const lash = newEntries.find((entry) =>
        entry.event?.segments.some(
          (segment) =>
            segment.type === "damage" &&
            segment.action === "Spirit Lash",
        ),
      );
      const wardSpent = newEntries
        .flatMap((entry) => entry.event?.segments ?? [])
        .filter(
          (segment) =>
            segment.type === "damage" &&
            segment.target === result.run!.player.name,
        )
        .reduce(
          (total, segment) =>
            total +
            (segment.type === "damage"
              ? segment.wardAbsorbed
              : 0),
          0,
        );
      const wardAfterLash = Math.min(
        12,
        startingWard + 2,
      );

      expect(lash?.text).toContain(
        "Both wakes seal behind the lash, leaving 2 Ward in all.",
      );
      expect(lash?.text).toContain(
        `Ward rises from ${startingWard} to ${wardAfterLash}.`,
      );
      expect(lash?.text).not.toContain("1 more Ward");
      expect(result.run?.player.ward).toBe(
        wardAfterLash - wardSpent,
      );
    }
  });

  it("witnesses Soul Tithe as an exaction without mangling the hit location", () => {
    const state = createBattleState("summoner");
    state.run!.player.hp -= 3;

    const result = resolveBattleAction(
      state,
      "soul-tithe",
      "road-reeve",
    ).state;
    const tithe = result.run!.battle!.log.find((entry) =>
      entry.event?.segments.some(
        (segment) =>
          segment.type === "damage" &&
          segment.action === "Soul Tithe",
      ),
    );

    expect(tithe?.text).toContain(
      `${result.run!.player.name} exacts a soul-tithe from Hollis Vane’s pulse, dealing`,
    );
    expect(tithe?.text).toContain(
      `3 Health follows the tithe back to ${result.run!.player.name}.`,
    );
    expect(tithe?.text).not.toContain("threads a tithe");
    expect(tithe?.text).not.toMatch(
      /pulse into their own in the/,
    );
  });

  it("names corpsefire's ongoing effect in the combat log", () => {
    const state = createBattleState("thaumaturgist");
    const result = resolveBattleAction(
      state,
      "corpsefire",
      "road-reeve",
    ).state;

    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes("Burning 2 for 2 rounds"),
      ),
    ).toBe(true);
  });

  it("consumes the story tonic and heals before the enemy answer", () => {
    const state = createBattleState(
      "medium",
      "take-tonic",
      "open-ground",
    );
    if (!state.run) throw new Error("Missing test run");
    state.run.player.hp = 10;

    const result = resolveBattleAction(state, "black-tonic").state;

    expect(
      itemCount(result.run!.player.inventory, "black-tonic"),
    ).toBe(0);
    expect(result.run?.player.hp).toBeGreaterThan(10);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes("recovers 10 Health"),
      ),
    ).toBe(true);
  });

  it("ends in victory and awards experience when no enemy remains", () => {
    const state = createBattleState("thaumaturgist");
    const battle = state.run?.battle;
    if (!battle) throw new Error("Missing test battle");
    battle.enemies[0]!.hp = 1;
    battle.enemies[1]!.hp = 0;

    const result = resolveBattleAction(
      state,
      "strike",
      "road-reeve",
    ).state;

    expect(result.screen).toBe("ending");
    expect(result.ending).toBe("victory");
    expect(result.run?.player.xp).toBe(20);
    expect(result.run?.player.level).toBe(1);
    expect(result.run?.battlesWon).toBe(1);
    expect(result.campaign?.activeTestament).not.toBeNull();
    expect(result.campaign?.closedTestaments).toEqual([]);
    expect(
      itemCount(result.run!.player.inventory, "hooked-knife"),
    ).toBe(1);
    expect(
      itemCount(result.run!.player.inventory, "hound-tooth"),
    ).toBe(2);
  });

  it("records a hardcore defeat when the enemy answer is fatal", () => {
    const state = createBattleState("thaumaturgist");
    if (!state.run) throw new Error("Missing test run");
    state.run.player.hp = 1;
    state.run.player.ward = 0;
    state.run.battle!.seed = 1;

    const result = resolveBattleAction(
      state,
      "strike",
      "road-reeve",
    ).state;

    expect(result.screen).toBe("ending");
    expect(result.ending).toBe("defeat");
    expect(result.run?.player.hp).toBe(0);
    expect(result.campaign?.activeTestament).toBeNull();
    expect(result.campaign?.closedTestaments).toHaveLength(1);
    expect(result.campaign?.closedTestaments[0]?.endReason).toBe(
      "death",
    );
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.event?.segments.some(
          (segment) =>
            segment.type === "transition" &&
            segment.entity ===
              result.run?.player.name &&
            segment.cause === "health",
        ),
      ),
    ).toBe(true);
  });

  it("can end the encounter by escaping", () => {
    const state = createBattleState("medium");
    if (!state.run?.battle) throw new Error("Missing test battle");
    state.run.battle.seed = 1;

    const result = resolveBattleAction(state, "flee").state;

    expect(result.screen).toBe("ending");
    expect(result.ending).toBe("fled");
    expect(result.campaign?.activeTestament).toBeNull();
    expect(result.campaign?.closedTestaments[0]?.endReason).toBe(
      "withdrawal",
    );
    expect(result.run?.battle?.outcome).toBe("fled");
  });
});

describe("inventory, equipment, and wounds", () => {
  it("opens the pack only between fights and returns to its prior scene", () => {
    const story = createStoryState("medium");
    const opened = openInventory(story);

    expect(opened.error).toBeUndefined();
    expect(opened.state.screen).toBe("inventory");
    expect(opened.state.inventoryReturnScreen).toBe("story");
    expect(closeInventory(opened.state).state.screen).toBe("story");

    const battle = createBattleState("medium");
    expect(openInventory(battle).error).toContain(
      "cannot be changed",
    );
  });

  it("preserves a defeated character as a read-only body", () => {
    const defeated = createStoryState("medium");
    const player = defeated.run!.player;
    const wound = createWound(
      "fatal-ledger-wound",
      "leftArm",
      "serious",
      "borrowed grief",
    );
    player.body.leftArm.wounds.push(wound);
    player.inventory["black-tonic"] = 1;
    player.inventory["hooked-knife"] = 1;
    player.hp = 0;
    defeated.screen = "ending";
    defeated.storyId = null;
    defeated.ending = "defeat";

    const inventory = openInventory(defeated).state;
    const before = structuredClone(inventory.run!.player);
    const attempts = [
      useInventoryItem(inventory, "black-tonic"),
      treatWound(inventory, wound.id),
      equipItem(inventory, "hooked-knife", "offHand"),
      unequipItem(inventory, "mainHand"),
    ];

    expect(inventory.screen).toBe("inventory");
    for (const attempt of attempts) {
      expect(attempt.error).toContain("can no longer");
      expect(attempt.state.run!.player).toEqual(before);
    }
    expect(closeInventory(inventory).state).toMatchObject({
      screen: "ending",
      ending: "defeat",
    });
  });

  it("equips carried weapons and returns displaced gear to the pack", () => {
    const story = createStoryState("medium");
    if (!story.run) throw new Error("Missing test run");
    story.run.player.inventory["hooked-knife"] = 1;
    const inventory = openInventory(story).state;
    const equipResult = equipItem(
      inventory,
      "hooked-knife",
      "mainHand",
    );
    expect(equipResult.message).toContain(
      "Equipped Hollis’s hooked knife in main hand.",
    );
    expect(equipResult.message).toContain(
      "Ritual knife returns to the pack.",
    );
    const equipped = equipResult.state;
    const player = equipped.run!.player;

    expect(player.equipment.mainHand).toBe("hooked-knife");
    expect(equippedWeapon(player).baseDamage).toBe(4);
    expect(equippedWeapon(player).traumaBonus).toBe(2);
    expect(itemCount(player.inventory, "hooked-knife")).toBe(0);
    expect(itemCount(player.inventory, "ritual-knife")).toBe(1);

    const unequipped = unequipItem(equipped, "mainHand").state;
    expect(unequipped.run?.player.equipment.mainHand).toBeNull();
    expect(
      itemCount(
        unequipped.run!.player.inventory,
        "hooked-knife",
      ),
    ).toBe(1);
  });

  it("turns a paired off-hand weapon into follow-through damage", () => {
    let state = createStoryState("medium");
    state.run!.player.inventory["hooked-knife"] = 1;
    state = openInventory(state).state;
    state = equipItem(
      state,
      "hooked-knife",
      "offHand",
    ).state;

    expect(offHandStrikeDamage(state.run!.player)).toBe(2);

    state = closeInventory(state).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state.run!.battle!.enemies[0]!.hp = 1;
    state.run!.battle!.enemies[0]!.maxHp = 100;
    state = resolveBattleAction(
      state,
      "strike",
      "road-reeve",
    ).state;

    const strike = state.run?.battle?.log.find((entry) =>
      entry.text.includes(
        "Hollis’s hooked knife follows close behind",
      ),
    );
    const damageIndex =
      strike?.event?.segments.findIndex(
        (segment) => segment.type === "damage",
      ) ?? -1;
    const transitionIndex =
      strike?.event?.segments.findIndex(
        (segment) => segment.type === "transition",
      ) ?? -1;
    expect(strike?.text).toContain(
      "Hollis’s hooked knife follows close behind, adding 2 damage to the committed strike",
    );
    expect(damageIndex).toBeGreaterThanOrEqual(0);
    expect(transitionIndex).toBeGreaterThan(damageIndex);
  });

  it("lets the reliquary broker buy spare gear and sell useful supplies", () => {
    const early = openInventory(
      createStoryState("medium"),
    ).state;
    expect(sellItem(early, "linen-binding").error).toContain(
      "No buyer",
    );

    const story = createStoryState("medium");
    story.run!.battlesWon = 2;
    story.storyId = "saint-orra-aftermath";
    story.run!.player.inventory["hooked-knife"] = 1;
    let inventory = openInventory(story).state;

    const sold = sellItem(inventory, "hooked-knife");
    expect(sold.message).toBe(
      "Sold Hollis’s hooked knife for 6 obols. 6 obols remain.",
    );
    inventory = sold.state;
    expect(inventory.run?.player.obols).toBe(6);
    expect(
      itemCount(
        inventory.run!.player.inventory,
        "hooked-knife",
      ),
    ).toBe(0);

    const bought = buyItem(inventory, "black-tonic");
    expect(bought.message).toBe(
      "Bought Black tonic for 6 obols. 0 obols remain.",
    );
    inventory = bought.state;
    expect(inventory.run?.player.obols).toBe(0);
    expect(
      itemCount(
        inventory.run!.player.inventory,
        "black-tonic",
      ),
    ).toBe(1);
  });

  it("makes each tradition's starting equipment mechanically visible", () => {
    const medium = createStoryState("medium").run!.player;
    const summoner = createStoryState("summoner").run!.player;
    const thaumaturgist =
      createStoryState("thaumaturgist").run!.player;

    expect(effectiveAttack(medium)).toBe(medium.attack + 1);
    expect(equippedWeapon(summoner).damageType).toBe("occult");
    expect(
      equippedArmorForPart(thaumaturgist, "torso"),
    ).toBe(2);
    expect(effectiveDefense(thaumaturgist)).toBe(
      thaumaturgist.defense,
    );

    summoner.equipment.offHand = summoner.equipment.mainHand;
    summoner.equipment.mainHand = null;
    expect(equippedWeapon(summoner).name).toBe("Bone wand");
  });

  it("uses Medicine to bind a persistent wound and restore condition", () => {
    const story = createStoryState("medium");
    story.run!.seed = 1;
    const player = story.run!.player;
    const wound = createWound(
      "test-wound",
      "leftLeg",
      "serious",
      "a test blade",
    );
    player.body.leftLeg.condition = 4;
    player.body.leftLeg.wounds.push(wound);
    const inventory = openInventory(story).state;

    const treated = treatWound(inventory, wound.id);
    const treatedPlayer = treated.state.run!.player;
    const treatedWound = allWounds(treatedPlayer).find(
      (candidate) => candidate.id === wound.id,
    );

    expect(treated.error).toBeUndefined();
    expect(treatedWound).toMatchObject({
      treated: true,
      bleed: 0,
    });
    expect(treatedPlayer.body.leftLeg.condition).toBe(5);
    expect(treated.message).toContain("binding holds");
    expect(
      itemCount(treatedPlayer.inventory, "linen-binding"),
    ).toBe(0);
    expect(allWounds(inventory.run!.player)[0]?.treated).toBe(false);
  });

  it("refuses to solve a concussion with linen", () => {
    const story = createStoryState("medium");
    const concussion = createWound(
      "test-concussion",
      "head",
      "serious",
      "an ashwood baton",
    );
    story.run!.player.body.head.wounds.push(concussion);
    const inventory = openInventory(story).state;
    const bindingsBefore = itemCount(
      inventory.run!.player.inventory,
      "linen-binding",
    );

    const result = treatWound(inventory, concussion.id);

    expect(result.error).toContain("needs a safe rest");
    expect(
      itemCount(
        result.state.run!.player.inventory,
        "linen-binding",
      ),
    ).toBe(bindingsBefore);
    expect(
      result.state.run!.player.body.head.wounds[0],
    ).toMatchObject({
      label: "Concussion",
      care: "rest",
      treated: false,
    });
  });

  it("can spoil a binding when an untrained field dressing fails", () => {
    const story = createStoryState("medium");
    story.run!.seed = 12_345;
    const wound = createWound(
      "failed-dressing",
      "leftLeg",
      "serious",
      "a test blade",
    );
    story.run!.player.body.leftLeg.wounds.push(wound);
    const inventory = openInventory(story).state;

    const result = treatWound(inventory, wound.id);
    const remaining = allWounds(result.state.run!.player).find(
      (candidate) => candidate.id === wound.id,
    );

    expect(result.message).toContain("linen comes away spoiled");
    expect(remaining?.treated).toBe(false);
    expect(
      itemCount(
        result.state.run!.player.inventory,
        "linen-binding",
      ),
    ).toBe(0);
  });

  it("uses restorative items outside combat without mending body parts", () => {
    const story = createStoryState("medium");
    const player = story.run!.player;
    player.inventory["black-tonic"] = 1;
    player.hp = 9;
    player.body.torso.condition = 5;
    const inventory = openInventory(story).state;

    const useResult = useInventoryItem(inventory, "black-tonic");
    expect(useResult.message).toBe(
      "Black tonic restores 10 Health (9 → 19).",
    );
    const used = useResult.state;

    expect(used.run?.player.hp).toBe(19);
    expect(used.run?.player.body.torso.condition).toBe(5);
    expect(
      itemCount(used.run!.player.inventory, "black-tonic"),
    ).toBe(0);
  });

  it("wounds penalize the relevant combat statistics", () => {
    const player = createStoryState("medium").run!.player;
    const attackBefore = effectiveAttack(player);
    const defenseBefore = effectiveDefense(player);
    player.body.rightArm.wounds.push(
      createWound("arm", "rightArm", "serious", "hook"),
    );
    player.body.leftLeg.wounds.push(
      createWound("leg", "leftLeg", "grievous", "bite"),
    );

    expect(effectiveAttack(player)).toBe(attackBefore - 1);
    expect(effectiveDefense(player)).toBe(defenseBefore - 2);
    expect(getFleeChance(player)).toBe(30);
  });

  it("does not invent wounds when Ward absorbs all damage", () => {
    expect(woundSeverityForDamage(0, 0)).toBeNull();
  });

  it("lets Ward fully stop a raking bite without bleeding or a wound", () => {
    const state = createBattleState("medium");
    const run = state.run;
    const battle = run?.battle;
    if (!run || !battle) throw new Error("Missing test battle");
    battle.round = 2;
    battle.enemies[0]!.hp = 0;
    run.player.ward = 12;
    const hpBefore = run.player.hp;
    const woundsBefore = allWounds(run.player).length;

    const result = resolveBattleAction(state, "guard").state;
    const bite = result.run?.battle?.log.find((entry) =>
      entry.event?.segments.some(
        (segment) =>
          segment.type === "damage" &&
          segment.action === "raking bite",
      ),
    );

    expect(bite?.text).toContain(
      "Ward turns the blow aside completely",
    );
    expect(bite?.text).not.toContain("0 damage");
    expect(result.run?.player.hp).toBe(hpBefore);
    expect(result.run?.player.statuses).not.toContainEqual(
      expect.objectContaining({ id: "bleeding" }),
    );
    expect(allWounds(result.run!.player)).toHaveLength(
      woundsBefore,
    );
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes("opens a wound"),
      ),
    ).toBe(false);
  });
});

describe("the extended testament", () => {
  it("carries the road survivor, wounds, and gear into the aftermath", () => {
    const victory = createRoadVictoryState("medium");
    const player = victory.run!.player;
    player.body.leftArm.wounds.push(
      createWound("w17", "leftArm", "serious", "old hook"),
    );
    player.statuses.push({
      id: "exposed",
      turns: 1,
      potency: 2,
    });

    const continued = continueJourney(victory);

    expect(continued.error).toBeUndefined();
    expect(continued.state).toMatchObject({
      screen: "story",
      storyId: "road-aftermath",
      ending: null,
    });
    expect(continued.state.run?.battle).toBeNull();
    expect(continued.state.run?.player.statuses).toEqual([]);
    expect(
      allWounds(continued.state.run!.player).some(
        (wound) => wound.id === "w17",
      ),
    ).toBe(true);
    expect(
      itemCount(
        continued.state.run!.player.inventory,
        "hooked-knife",
      ),
    ).toBe(1);
  });

  it("gives every tradition a distinct aftermath preparation", () => {
    const medium = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    const mediumBefore = medium.run!.player;
    const communed = chooseStoryChoice(
      medium,
      "question-hollis",
    ).state;
    expect(communed.run?.flags).toContain("hollis-testimony");
    expect(communed.run?.player.maxSpirit).toBe(
      mediumBefore.maxSpirit + 1,
    );
    expect(communed.run?.player.hp).toBe(mediumBefore.hp - 2);
    expect(communed.storyId).toBe("road-aftermath");

    const summoner = continueJourney(
      createRoadVictoryState("summoner"),
    ).state;
    const teethBefore = itemCount(
      summoner.run!.player.inventory,
      "hound-tooth",
    );
    const bound = chooseStoryChoice(
      summoner,
      "bind-hound",
    ).state;
    expect(bound.run?.flags).toContain("bound-ash-hound");
    expect(
      itemCount(bound.run!.player.inventory, "hound-tooth"),
    ).toBe(teethBefore - 1);
    expect(bound.storyId).toBe("road-aftermath");

    const thaumaturgist = continueJourney(
      createRoadVictoryState("thaumaturgist"),
    ).state;
    const saltBefore = itemCount(
      thaumaturgist.run!.player.inventory,
      "grave-salt",
    );
    const expectedRendering = rollRoadsideRendering(
      thaumaturgist.run!.seed,
      thaumaturgist.run!.player,
    );
    const rendered = chooseStoryChoice(
      thaumaturgist,
      "render-hollis",
    ).state;
    expect(rendered.run?.flags).toContain(
      `hollis-rendering:${expectedRendering.yield}:${expectedRendering.witnessed ? "witnessed" : "unseen"}`,
    );
    expect(rendered.run?.world.facts).toContain(
      "hollis-vane-rendered",
    );
    expect(
      itemCount(
        rendered.run!.player.inventory,
        "grave-salt",
      ),
    ).toBe(
      saltBefore +
        (expectedRendering.yield === "pure"
          ? 2
          : expectedRendering.yield === "usable"
            ? 1
            : 0),
    );
    expect(rendered.storyId).toBe("road-aftermath");
  });

  it("does not repeat Hollis rendering from an in-progress v4 testament", () => {
    const state = continueJourney(
      createRoadVictoryState("thaumaturgist"),
    ).state;
    state.run!.world.facts.push("hollis-vane-rendered");
    state.run!.flags.push(
      "story-choice:road-aftermath:render-hound",
    );
    const saltBefore = itemCount(
      state.run!.player.inventory,
      "grave-salt",
    );

    const result = chooseStoryChoice(state, "render-hollis");

    expect(result.error).toBe("That action is already complete.");
    expect(
      itemCount(result.state.run!.player.inventory, "grave-salt"),
    ).toBe(saltBefore);
  });

  it("turns witnessed corpse rendering into county pursuit", () => {
    let state = continueJourney(
      createRoadVictoryState("thaumaturgist"),
    ).state;
    const witnessSeed = Array.from(
      { length: 512 },
      (_, index) => index + 1,
    ).find(
      (seed) =>
        rollRoadsideRendering(seed, state.run!.player).witnessed,
    );
    expect(witnessSeed).toBeDefined();
    state.run!.seed = witnessSeed!;

    state = chooseStoryChoice(state, "render-hollis").state;

    expect(
      factionKnows(
        state.run!.world,
        "county-reeves",
        "hollis-vane-rendered",
      ),
    ).toBe(true);
    expect(
      state.run!.world.standing["county-reeves"],
    ).toBe(-2);
    expect(state.run!.world.pressures.countyNotice).toBe(2);
    expect(
      state.run!.world.activePressures.find(
        (pressure) => pressure.id === "north-vey:county-notice",
      ),
    ).toMatchObject({
      intensity: 2,
      sourceFactIds: ["hollis-vane-rendered"],
    });
    const renderingChoice = storyChoicesFor(
      STORY_SCENES["road-aftermath"],
      state.run!,
    ).find((choice) => choice.id === "render-hollis");
    const visibleResult =
      typeof renderingChoice?.outcome?.result === "function"
        ? renderingChoice.outcome.result(state.run!)
        : renderingChoice?.outcome?.result;
    expect(visibleResult).toContain(
      "A carrier witnessed the work",
    );
    expect(visibleResult).not.toMatch(/county notice|standing|pressure/i);

    state.storyId = "road-interlude";
    state.run!.roadEvent = "mourning-caravan";
    state = chooseStoryChoice(state, "leave-caravan").state;

    expect(state.storyId).toBe("black-mile-wake");
    expect(state.run?.wakeVariant).toBe("reeve-patrol");
    expect(
      STORY_SCENES["black-mile-wake"]
        .paragraphs(state.run!)
        .join(" "),
    ).toContain("cuts found in his body");
  });

  it("keeps optional aftermath actions independent from travel", () => {
    let state = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    const xpBefore = state.run!.player.xp;

    state = chooseStoryChoice(state, "read-ledger").state;
    expect(state.storyId).toBe("road-aftermath");
    expect(state.run?.player.xp).toBe(xpBefore + 5);
    expect(state.run?.player.level).toBe(2);

    state = chooseStoryChoice(state, "question-hollis").state;
    expect(state.storyId).toBe("road-aftermath");
    expect(state.run?.flags).toEqual(
      expect.arrayContaining([
        "read-ledger",
        "hollis-testimony",
        "story-choice:road-aftermath:read-ledger",
        "story-choice:road-aftermath:question-hollis",
      ]),
    );

    const repeated = chooseStoryChoice(state, "read-ledger");
    expect(repeated.error).toContain("already complete");
    expect(repeated.state).toBe(state);
    expect(repeated.state.run?.player.xp).toBe(xpBefore + 5);

    const departed = chooseStoryChoice(
      state,
      "leave-aftermath",
    );
    expect(departed.error).toBeUndefined();
    expect(departed.state.storyId).toBe("hollow-tollhouse");
  });

  it("makes the ward-name a reproducible risk rather than a certain punishment", () => {
    const markedStart = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    markedStart.run!.seed = 1;
    const marked = chooseStoryChoice(
      markedStart,
      "read-ledger",
    ).state;

    const passedStart = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    passedStart.run!.seed = 12_345;
    const passed = chooseStoryChoice(
      passedStart,
      "read-ledger",
    ).state;

    expect(marked.run?.flags).toContain("ward-name-noticed");
    expect(passed.run?.flags).not.toContain(
      "ward-name-noticed",
    );
    expect(marked.run?.flags).toContain("read-ledger");
    expect(passed.run?.flags).toContain("read-ledger");
  });

  it("keeps a new discipline available without gating story travel", () => {
    let state = continueJourney(
      createRoadVictoryState("medium"),
    ).state;

    state = chooseStoryChoice(state, "read-ledger").state;
    expect(
      chooseAdvancement(state, "two-way-passage").error,
    ).toBeUndefined();
    expect(
      chooseStoryChoice(state, "question-hollis").error,
    ).toBeUndefined();

    state = chooseStoryChoice(state, "leave-aftermath").state;
    expect(chooseStoryChoice(state, "rest-first").error).toBeUndefined();
    expect(
      state.run?.player.advancements,
    ).not.toContain("two-way-passage");
  });

  it("lets the tollhouse choice trade recovery for surprise", () => {
    const aftermath = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    const ledger = chooseStoryChoice(
      aftermath,
      "read-ledger",
    ).state;
    if (!ledger.run!.flags.includes("ward-name-noticed")) {
      ledger.run!.flags.push("ward-name-noticed");
    }
    ledger.run!.player.hp = 8;
    ledger.run!.player.spirit = 0;
    ledger.run!.player.body.rightArm.condition = 4;
    ledger.run!.player.body.rightArm.wounds.push(
      createWound(
        "rest-open",
        "rightArm",
        "serious",
        "a hooked knife",
      ),
    );
    ledger.run!.player.body.leftLeg.condition = 4;
    const improving = createWound(
      "rest-bound",
      "leftLeg",
      "serious",
      "a raking bite",
    );
    improving.treated = true;
    improving.bleed = 0;
    ledger.run!.player.body.leftLeg.wounds.push(improving);
    ledger.run!.player.body.torso.condition = 6;
    const closing = createWound(
      "rest-minor",
      "torso",
      "minor",
      "a knife thrust",
      undefined,
      "humanoid",
      undefined,
      "edge",
    );
    closing.treated = true;
    closing.bleed = 0;
    ledger.run!.player.body.torso.wounds.push(closing);
    const torsoMaximumBefore =
      ledger.run!.player.body.torso.maxCondition;
    const rightLeg = ledger.run!.player.body.rightLeg;
    rightLeg.condition = rightLeg.maxCondition - 2;
    const tollhouse = chooseStoryChoice(
      ledger,
      "leave-aftermath",
    ).state;
    const advanced = chooseAdvancement(
      tollhouse,
      "two-way-passage",
    ).state;

    const rested = chooseStoryChoice(
      advanced,
      "rest-first",
    ).state;
    expect(rested.storyId).toBe("ossuary-vault");
    expect(rested.run?.player.hp).toBe(14);
    expect(rested.run?.player.spirit).toBe(
      rested.run?.player.maxSpirit,
    );
    expect(
      rested.run?.player.body.rightArm.wounds[0],
    ).toMatchObject({
      id: "rest-open",
      severity: "serious",
      treated: true,
      bleed: 0,
    });
    expect(rested.run?.player.body.rightArm.condition).toBe(7);
    expect(
      rested.run?.player.body.leftLeg.wounds[0],
    ).toMatchObject({
      id: "rest-bound",
      severity: "minor",
      treated: true,
    });
    expect(rested.run?.player.body.leftLeg.condition).toBe(7);
    expect(rested.run?.player.body.torso.wounds).toEqual([]);
    expect(rested.run?.player.body.torso.maxCondition).toBe(
      torsoMaximumBefore - 1,
    );
    expect(rested.run?.player.scars).toContainEqual({
      id: "scar-rest-minor",
      part: "torso",
      label: "Roped scar across the ribs",
      source: "a knife thrust",
      conditionPenalty: 1,
    });
    expect(rested.run?.player.body.rightLeg.condition).toBe(
      rested.run?.player.body.rightLeg.maxCondition,
    );
    expect(rested.run?.flags).toContain(
      "convalescence:1:1:1:11:0",
    );

    const vault = chooseStoryChoice(
      rested,
      "warded-descent",
    ).state;
    expect(vault.screen).toBe("battle");
    expect(vault.run?.player.ward).toBe(6);
    expect(vault.run?.battle?.enemies[0]).toMatchObject({
      id: "ossuary-saint",
      defense: 2,
      hp: 32,
    });
    expect(vault.run?.player.statuses).toContainEqual({
      id: "exposed",
      potency: 1,
      turns: 2,
    });
  });

  it("lets Grave Callus improve convalescence without weakening a scarred part", () => {
    let state = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    state.run!.player.level = 3;
    state.run!.player.xp = 60;
    state = chooseAdvancement(
      state,
      "hardened-vessel",
    ).state;
    state = chooseAdvancement(state, "grave-callus").state;
    state = chooseStoryChoice(state, "leave-aftermath").state;

    const arm = state.run!.player.body.leftArm;
    arm.condition = 3;
    const wound = createWound(
      "callus-minor",
      "leftArm",
      "minor",
      "an old blade",
    );
    wound.treated = true;
    wound.bleed = 0;
    arm.wounds.push(wound);
    const maximumBefore = arm.maxCondition;

    state = chooseStoryChoice(state, "rest-first").state;

    expect(state.run?.player.body.leftArm.wounds).toEqual([]);
    expect(state.run?.player.body.leftArm.maxCondition).toBe(
      maximumBefore,
    );
    expect(state.run?.player.body.leftArm.condition).toBe(8);
    expect(state.run?.player.scars).toContainEqual({
      id: "scar-callus-minor",
      part: "leftArm",
      label: "White line along the left arm",
      source: "an old blade",
      conditionPenalty: 0,
    });
  });

  it("keeps Hollis's testimony additive beneath the funerary ward", () => {
    let state = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    state = chooseStoryChoice(state, "question-hollis").state;
    state = chooseStoryChoice(state, "leave-aftermath").state;
    state = chooseStoryChoice(state, "rest-first").state;

    state = chooseStoryChoice(state, "warded-descent").state;

    expect(state.run?.player.ward).toBe(9);
    expect(state.run?.battle?.log[0]?.text).toContain(
      "Hollis’s last memory closes around you and adds 3 Ward, raising your total from 0 to 3",
    );
    expect(state.run?.battle?.log[0]?.text).toContain(
      "The funerary ward adds 6 Ward, raising your total from 3 to 9",
    );
    expect(state.run?.battle?.enemies[0]?.body.torso.wounds).toEqual(
      [],
    );

    let withoutTestimony = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    withoutTestimony = chooseStoryChoice(
      withoutTestimony,
      "leave-aftermath",
    ).state;
    withoutTestimony = chooseStoryChoice(
      withoutTestimony,
      "rest-first",
    ).state;
    withoutTestimony = chooseStoryChoice(
      withoutTestimony,
      "warded-descent",
    ).state;
    expect(withoutTestimony.run?.player.ward).toBe(6);
  });

  it("keeps the funerary ward separate from both opening wounds", () => {
    let state = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    state = chooseStoryChoice(state, "leave-aftermath").state;
    state = chooseStoryChoice(state, "descend-now").state;
    const focusBefore = state.run!.player.spirit;

    state = chooseStoryChoice(state, "warded-descent").state;

    const saint = state.run!.battle!.enemies[0]!;
    expect(state.run?.player.spirit).toBe(focusBefore);
    expect(state.run?.player.ward).toBe(6);
    expect(saint.hp).toBe(28);
    expect(saint.body.torso.wounds).toHaveLength(1);
    expect(saint.body.torso.wounds[0]).toMatchObject({
      severity: "minor",
      source: "an unfinished incarnation",
    });
    expect(
      saint.body.torso.wounds.some(
        (wound) => wound.source === "the broken jaw-seal",
      ),
    ).toBe(false);
    expect(state.run?.battle?.log[0]?.text).not.toContain(
      "broken jaw-seal",
    );
  });

  it("combines a tradition boon, surprise, and a broken seal", () => {
    let state = continueJourney(
      createRoadVictoryState("summoner"),
    ).state;
    state = chooseStoryChoice(state, "bind-hound").state;
    state = chooseStoryChoice(state, "leave-aftermath").state;
    state = chooseStoryChoice(state, "descend-now").state;
    const focusBefore = state.run!.player.spirit;
    state = chooseStoryChoice(state, "break-jaw-seal").state;

    const saint = state.run!.battle!.enemies[0]!;
    expect(state.screen).toBe("battle");
    expect(state.run?.player.spirit).toBe(focusBefore - 1);
    expect(state.run?.battle?.allies[0]).toMatchObject({
      id: "ash-shade",
      lifetime: {
        kind: "temporary",
        remainingTurns: 3,
      },
    });
    expect(saint.hp).toBe(23);
    expect(saint.body.torso.wounds).toHaveLength(2);
    expect(saint.body.torso.wounds[1]).toMatchObject({
      severity: "serious",
      bleed: 1,
    });
  });

  it("keeps an ash-hound shade anatomically canine in the Witness", () => {
    let state = continueJourney(
      createRoadVictoryState("summoner"),
    ).state;
    state = chooseStoryChoice(state, "bind-hound").state;
    state = chooseStoryChoice(state, "leave-aftermath").state;
    state = chooseStoryChoice(state, "descend-now").state;
    state = chooseStoryChoice(state, "break-jaw-seal").state;
    state = resolveBattleAction(state, "guard").state;

    const houndAttack = state.run?.battle?.log.find((entry) =>
      entry.event?.segments.some(
        (segment) =>
          (segment.type === "damage" || segment.type === "miss") &&
          segment.actor === "Ash-hound shade",
      ),
    );

    expect(houndAttack).toBeDefined();
    expect(houndAttack?.text).toMatch(/jaws|teeth/);
    expect(houndAttack?.text).not.toMatch(/\bhand\b/);
  });

  it("gives Saint Orra a cadence distinct from the road enemies", () => {
    let state = continueJourney(
      createRoadVictoryState("medium"),
    ).state;
    state = chooseStoryChoice(state, "read-ledger").state;
    state = chooseStoryChoice(state, "leave-aftermath").state;
    state = chooseAdvancement(state, "two-way-passage").state;
    state = chooseStoryChoice(state, "rest-first").state;
    state = chooseStoryChoice(state, "warded-descent").state;
    state.run!.battle!.round = 3;
    state.run!.battle!.seed = 1;

    const result = resolveBattleAction(state, "guard").state;

    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes("death knell"),
      ),
    ).toBe(true);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "Exposed 1 for 2 rounds (-1 Defense and Evasion)",
        ),
      ),
    ).toBe(true);
    expect(result.run?.player.statuses).toContainEqual({
      id: "exposed",
      turns: 1,
      potency: 1,
    });
  });

  it("breaks Saint Orra’s account open, awards every relic, and opens the wake", () => {
    let state = continueJourney(
      createRoadVictoryState("thaumaturgist"),
    ).state;
    state = chooseStoryChoice(state, "read-ledger").state;
    state = chooseStoryChoice(state, "leave-aftermath").state;
    state = chooseAdvancement(
      state,
      "cold-furnace-method",
    ).state;
    state = chooseStoryChoice(state, "rest-first").state;
    state = chooseStoryChoice(state, "warded-descent").state;
    const battle = state.run!.battle!;
    battle.seed = 1;
    battle.enemies[0]!.hp = 1;
    state.run!.player.hp = 10;
    state.run!.player.statuses.push({
      id: "bleeding",
      turns: 2,
      potency: 2,
    });

    const result = resolveBattleAction(
      state,
      "strike",
      "ossuary-saint",
    ).state;

    expect(result.screen).toBe("ending");
    expect(result.ending).toBe("victory");
    expect(result.run?.battlesWon).toBe(2);
    expect(result.run?.player.xp).toBe(60);
    expect(result.run?.player.level).toBe(3);
    expect(result.run?.player.hp).toBe(6);
    expect(result.run?.player.ward).toBe(0);
    expect(result.run?.player.statuses).toEqual([]);
    expect(
      itemCount(
        result.run!.player.inventory,
        "grave-iron-mask",
      ),
    ).toBe(1);
    expect(
      result.run?.battle?.log.some((entry) =>
        entry.text.includes("her last debtor’s tally"),
      ),
    ).toBe(true);
    expect(
      itemCount(
        result.run!.player.inventory,
        "saint-bone-charm",
      ),
    ).toBe(1);
    expect(
      itemCount(
        result.run!.player.inventory,
        "debtor-tally",
      ),
    ).toBe(1);
    const inventory = openInventory(result).state;
    const defenseBefore = effectiveDefense(
      inventory.run!.player,
    );
    const charmed = equipItem(
      inventory,
      "saint-bone-charm",
      "charm",
    ).state;
    expect(effectiveDefense(charmed.run!.player)).toBe(
      defenseBefore + 1,
    );
    const attackBefore = effectiveAttack(charmed.run!.player);
    const aggressiveCharm = equipItem(
      charmed,
      "debtor-tally",
      "charm",
    ).state;
    expect(effectiveAttack(aggressiveCharm.run!.player)).toBe(
      attackBefore + 1,
    );
    expect(effectiveDefense(aggressiveCharm.run!.player)).toBe(
      defenseBefore,
    );
    expect(
      itemCount(
        aggressiveCharm.run!.player.inventory,
        "saint-bone-charm",
      ),
    ).toBe(1);
    const continued = continueJourney(result);
    expect(continued.error).toBeUndefined();
    const advanced = chooseAdvancement(
      continued.state,
      "field-medicine",
    ).state;
    expect(advanced.run?.player.advancements).toContain(
      "field-medicine",
    );
    expect(continued.state).toMatchObject({
      screen: "story",
      storyId: "saint-orra-aftermath",
      ending: null,
    });
  });

  it("selects every wake variant reproducibly and carries the choice into its scene", () => {
    const rolled = new Set<WakeVariantId>();
    for (let seed = 1; seed <= 64; seed += 1) {
      const first = rollWakeVariant(seed);
      const second = rollWakeVariant(seed);
      expect(second).toEqual(first);
      rolled.add(first.variantId);
    }
    expect(rolled).toEqual(
      new Set<WakeVariantId>([
        "bell-widow",
        "name-thieves",
        "bone-procession",
        "reliquary-poachers",
        "reeve-patrol",
      ]),
    );

    const aftermath = continuePastOrra(
      "medium",
      "two-way-passage",
      "echoing-passage",
    );
    const expectedEvent = rollRoadEvent(
      aftermath.run!.seed,
      aftermath.run!.seenRoadEvents,
    );
    const expected = rollWakeVariant(expectedEvent.seed);
    const interlude = chooseStoryChoice(
      aftermath,
      "follow-name-storm",
    ).state;
    expect(interlude.storyId).toBe("road-interlude");
    expect(interlude.run?.roadEvent).toBe(expectedEvent.eventId);
    const wake = continueThroughRoadInterlude(aftermath);
    expect(wake.storyId).toBe("black-mile-wake");
    expect(wake.run?.wakeVariant).toBe(expected.variantId);
  });

  it("draws friendly and neutral road events from an unseen seeded deck", () => {
    const rolled = new Set<string>();
    for (let seed = 1; seed <= 64; seed += 1) {
      const first = rollRoadEvent(seed);
      expect(rollRoadEvent(seed)).toEqual(first);
      rolled.add(first.eventId);
    }

    expect(rolled).toEqual(new Set(ROAD_EVENT_IDS));
    expect(
      new Set(
        Object.values(ROAD_EVENTS).map(
          (event) => event.disposition,
        ),
      ),
    ).toEqual(new Set(["friendly", "neutral"]));
    const onlyUnseen = rollRoadEvent(91, [
      "mourning-caravan",
      "hedge-surgeon",
      "disputed-bundle",
    ]);
    expect(onlyUnseen.eventId).toBe("ditch-burial");
  });

  it("lets road interludes change the journey without forcing combat", () => {
    const caravan = createStoryState("medium");
    caravan.storyId = "road-interlude";
    caravan.run!.roadEvent = "mourning-caravan";
    caravan.run!.player.hp = 20;
    caravan.run!.player.spirit = 0;
    const warmed = chooseStoryChoice(
      caravan,
      "share-caravan-fire",
    ).state;
    expect(warmed.screen).toBe("story");
    expect(warmed.run?.battle).toBeNull();
    expect(warmed.run?.player.hp).toBe(24);
    expect(warmed.run?.player.spirit).toBe(1);
    expect(warmed.run?.flags).toContain("road-interlude-delay");

    const surgery = createStoryState("medium");
    surgery.storyId = "road-interlude";
    surgery.run!.roadEvent = "hedge-surgeon";
    surgery.run!.player.inventory["ossuary-ichor"] = 1;
    surgery.run!.player.hp = 10;
    surgery.run!.player.body.head.wounds.push(
      createWound(
        "road-concussion",
        "head",
        "serious",
        "a fall",
      ),
    );
    const treated = chooseStoryChoice(
      surgery,
      "trade-for-surgery",
    ).state;
    expect(treated.run?.player.hp).toBe(16);
    expect(
      treated.run?.player.body.head.wounds[0],
    ).toMatchObject({
      label: "Concussion",
      treated: true,
      care: "rest",
    });
    expect(
      itemCount(
        treated.run!.player.inventory,
        "ossuary-ichor",
      ),
    ).toBe(0);

    let cordialTrade: GameState | undefined;
    for (let seed = 1; seed <= 100; seed += 1) {
      const bargain = createStoryState("medium", seed);
      bargain.storyId = "road-interlude";
      bargain.run!.roadEvent = "hedge-surgeon";
      bargain.run!.player.inventory["ossuary-ichor"] = 1;
      bargain.run!.player.spirit = 0;
      bargain.run!.player.skills.persuasion = 3;
      bargain.run!.player.attributes.charisma = 3;
      const attempted = chooseStoryChoice(
        bargain,
        "bargain-for-vigil-cordial",
      ).state;
      if (attempted.run!.player.spirit > 0) {
        cordialTrade = attempted;
        break;
      }
    }
    expect(cordialTrade?.run?.player.spirit).toBe(3);
    expect(
      itemCount(
        cordialTrade!.run!.player.inventory,
        "ossuary-ichor",
      ),
    ).toBe(0);
    expect(
      cordialTrade?.run?.flags.some((flag) =>
        flag.startsWith("iven-cordial-result:success:"),
      ),
    ).toBe(true);

    const burial = createStoryState("medium");
    burial.storyId = "road-interlude";
    burial.run!.roadEvent = "ditch-burial";
    const torsoBefore = burial.run!.player.body.torso.condition;
    const linenBefore = itemCount(
      burial.run!.player.inventory,
      "linen-binding",
    );
    const helped = chooseStoryChoice(
      burial,
      "help-ditch-burial",
    ).state;
    expect(helped.run?.player.hp).toBe(26);
    expect(helped.run?.player.body.torso.condition).toBe(
      torsoBefore - 2,
    );
    expect(helped.run?.player.xp).toBe(5);
    expect(
      itemCount(
        helped.run!.player.inventory,
        "linen-binding",
      ),
    ).toBe(linenBefore + 1);
  });

  it("builds each wake variant from a distinct enemy roster", () => {
    for (const variantId of Object.keys(
      WAKE_VARIANTS,
    ) as WakeVariantId[]) {
      const state = createStoryState("medium", 991);
      state.storyId = "black-mile-wake";
      state.run!.wakeVariant = variantId;

      const battle = chooseStoryChoice(
        state,
        "wake-guarded",
      ).state.run!.battle!;

      expect(battle.encounterId).toBe("black-mile-wake");
      expect(battle.variantId).toBe(variantId);
      expect(battle.enemies.map((enemy) => enemy.id)).toEqual(
        WAKE_VARIANTS[variantId].enemies.map(
          (enemy) => enemy.id,
        ),
      );
    }
  });

  it("describes Saint Orra's mask where the player actually carries it", () => {
    const state = createStoryState("medium", 991);
    state.storyId = "black-mile-wake";
    state.run!.wakeVariant = "reliquary-poachers";
    const scene = STORY_SCENES["black-mile-wake"];

    state.run!.player.equipment.head = "grave-iron-mask";
    const worn = scene.paragraphs(state.run!).join(" ");
    expect(worn).toContain(
      "Saint Orra’s grave-iron mask over your face",
    );
    expect(worn).not.toContain("at your belt");

    state.run!.player.equipment.head = null;
    state.run!.player.inventory["grave-iron-mask"] = 1;
    const carried = scene.paragraphs(state.run!).join(" ");
    expect(carried).toContain(
      "Saint Orra’s grave-iron mask among what you carry",
    );

    delete state.run!.player.inventory["grave-iron-mask"];
    const absent = scene.paragraphs(state.run!).join(" ");
    expect(absent).toContain(
      "watches you come from Saint Orra’s open stair",
    );
    expect(absent).not.toContain("grave-iron mask");
  });

  it("applies delay Ward only to opposition following the escaped names", () => {
    const state = createStoryState("medium", 991);
    state.storyId = "black-mile-wake";
    state.run!.wakeVariant = "bone-procession";
    state.run!.flags.push(
      "rested-in-saint-wax",
      "road-interlude-delay",
    );

    const opened = chooseStoryChoice(
      state,
      "wake-severing",
    ).state;
    const enemies = opened.run!.battle!.enemies;
    const severing = opened.run!.battle!.log
      .flatMap((entry) => entry.event?.segments ?? [])
      .filter(
        (segment) =>
          segment.type === "damage" &&
          segment.action === "a severing word",
      );

    expect(enemies).toHaveLength(3);
    expect(
      enemies.every(
        (enemy) =>
          enemy.hp === enemy.maxHp &&
          enemy.ward === 0 &&
          allWounds(enemy).length === 0,
      ),
    ).toBe(true);
    expect(severing).toHaveLength(3);
    expect(
      severing.every(
        (segment) =>
          segment.type === "damage" &&
          segment.damage === 0 &&
          segment.wardAbsorbed === 4 &&
          segment.woundLabel === undefined,
      ),
    ).toBe(true);
    expect(
      opened.run!.battle!.log.filter((entry) =>
        entry.text.includes(
          "4 Ward turns the blow aside completely",
        ),
      ),
    ).toHaveLength(3);
    expect(
      opened.run!.battle!.log.some((entry) =>
        entry.text.includes(
          "escaped names use the lost time to gather 4 Ward",
        ),
      ),
    ).toBe(true);

    const mundane = createStoryState("medium", 991);
    mundane.storyId = "black-mile-wake";
    mundane.run!.wakeVariant = "reliquary-poachers";
    mundane.run!.flags.push(
      "rested-in-saint-wax",
      "road-interlude-delay",
    );
    const poachers = chooseStoryChoice(
      mundane,
      "wake-guarded",
    ).state;
    expect(
      poachers.run!.battle!.enemies.every(
        (enemy) => enemy.ward === 0,
      ),
    ).toBe(true);
    expect(
      poachers.run!.battle!.log.some((entry) =>
        entry.text.includes("use the lost time"),
      ),
    ).toBe(false);
  });

  it("makes occult force answer incorporeal forms better than steel", () => {
    let state = createStoryState("medium", 991);
    state.storyId = "black-mile-wake";
    state.run!.wakeVariant = "name-thieves";
    state = chooseStoryChoice(
      state,
      "wake-guarded",
    ).state;
    const target = state.run!.battle!.enemies.find(
      (enemy) => enemy.id === "wake-redactor",
    )!;
    target.hp = 100;
    target.maxHp = 100;
    target.ward = 0;
    Object.values(target.body).forEach((part) => {
      part.condition = 100;
      part.maxCondition = 100;
    });

    const physical = resolveBattleAction(
      structuredClone(state),
      "strike",
      target.id,
    ).state;
    const occult = resolveBattleAction(
      structuredClone(state),
      "spirit-lash",
      target.id,
    ).state;
    const playerDamage = (candidate: GameState) =>
      candidate.run!.battle!.log
        .flatMap((entry) => entry.event?.segments ?? [])
        .find(
          (segment) =>
            segment.type === "damage" &&
            segment.actor === candidate.run!.player.name &&
            segment.target === "The Redactor",
        );
    const physicalDamage = playerDamage(physical);
    const occultDamage = playerDamage(occult);

    expect(physicalDamage).toMatchObject({
      type: "damage",
      resistanceLabel: "The Redactor’s written body",
    });
    expect(
      physicalDamage?.type === "damage"
        ? physicalDamage.resistanceAbsorbed
        : 0,
    ).toBeGreaterThan(0);
    expect(
      physicalDamage?.type === "damage"
        ? physicalDamage.locationLabel
        : "",
    ).toMatch(/visage|core|reach|tether/i);
    expect(
      physical.run?.battle?.log.some((entry) =>
        entry.text.includes("pass through harmlessly"),
      ),
    ).toBe(true);
    expect(
      occultDamage?.type === "damage"
        ? (occultDamage.resistanceAbsorbed ?? 0)
        : -1,
    ).toBe(0);
  });

  it("gives the wake variants mechanically distinct cadences", () => {
    const startVariant = (
      variantId: WakeVariantId,
      round: number,
    ): GameState => {
      let state = createStoryState("medium", 441);
      state.storyId = "black-mile-wake";
      state.run!.wakeVariant = variantId;
      state = chooseStoryChoice(
        state,
        "wake-guarded",
      ).state;
      state.run!.battle!.round = round;
      state.run!.player.ward = 0;
      state.run!.battle!.enemies.forEach((enemy) => {
        enemy.hp = 100;
        enemy.maxHp = 100;
      });
      return state;
    };

    let widow = startVariant("bell-widow", 3);
    widow = resolveBattleAction(
      widow,
      "strike",
      "wake-bell-widow",
    ).state;
    expect(
      widow.run?.battle?.log.some((entry) =>
        entry.text.includes("thirteenth peal"),
      ),
    ).toBe(true);
    expect(widow.run?.player.statuses).toContainEqual({
      id: "exposed",
      potency: 1,
      turns: 1,
    });

    let thieves = startVariant("name-thieves", 2);
    thieves.run!.player.spirit = 3;
    thieves = resolveBattleAction(
      thieves,
      "strike",
      "wake-redactor",
    ).state;
    expect(
      thieves.run?.battle?.log.some((entry) =>
        entry.text.includes("stolen syllable"),
      ),
    ).toBe(true);
    expect(thieves.run?.player.spirit).toBe(2);

    let procession = startVariant("bone-procession", 2);
    procession = resolveBattleAction(
      procession,
      "strike",
      "wake-pallbearer",
    ).state;
    expect(
      procession.run?.battle?.log.some((entry) =>
        entry.text.includes("order of burial"),
      ),
    ).toBe(true);
    expect(
      procession.run?.battle?.enemies
        .filter((enemy) => enemy.id.includes("mourner"))
        .every((enemy) => enemy.ward === 1),
    ).toBe(true);
  });

  it("lets every tradition exercise its new level-three technique in the wake", () => {
    const cases: Array<{
      tradition: TraditionId;
      root: AdvancementId;
      next: AdvancementId;
      action: "spirit-lash" | "raise-shade" | "corpsefire";
      skill: string;
      witnessPhrase: string;
      expression?: "cold-furnace-long-reduction";
    }> = [
      {
        tradition: "medium",
        root: "two-way-passage",
        next: "echoing-passage",
        action: "spirit-lash",
        skill: "Echoing Passage",
        witnessPhrase: "The returning soul passes through twice",
      },
      {
        tradition: "summoner",
        root: "longer-leash",
        next: "shared-hunger",
        action: "raise-shade",
        skill: "Shared Hunger",
        witnessPhrase: "Warmth follows the shade’s hand",
      },
      {
        tradition: "thaumaturgist",
        root: "cold-furnace-method",
        next: "field-medicine",
        action: "corpsefire",
        skill: "Cold Furnace",
        witnessPhrase: "the wound cannot close around it",
        expression: "cold-furnace-long-reduction",
      },
    ];

    for (const testCase of cases) {
      let state = continuePastOrra(
        testCase.tradition,
        testCase.root,
        testCase.next,
      );
      if (testCase.expression) {
        state = prepareAdvancementExpression(
          state,
          testCase.expression,
        ).state;
      }
      state = continueThroughRoadInterlude(state);
      state.run!.wakeVariant = "bell-widow";
      state = chooseStoryChoice(
        state,
        "wake-guarded",
      ).state;
      const target = state.run!.battle!.enemies[0]!;
      target.hp = 100;
      target.maxHp = 100;
      target.ward = 0;
      Object.values(target.body).forEach((part) => {
        part.condition = 100;
        part.maxCondition = 100;
      });
      state.run!.player.hp = Math.max(
        1,
        state.run!.player.maxHp - 5,
      );
      state.run!.battle!.seed = 1;

      state = resolveBattleAction(
        state,
        testCase.action,
        testCase.action === "raise-shade"
          ? undefined
          : target.id,
      ).state;

      expect(
        state.run?.battle?.log.some((entry) =>
          entry.event?.segments.some(
            (segment) =>
              segment.type === "skill" &&
              segment.skill === testCase.skill,
          ),
        ),
      ).toBe(true);
      expect(
        state.run?.battle?.log.some(
          (entry) =>
            entry.text.includes(testCase.witnessPhrase) &&
            !entry.text.includes(testCase.skill),
        ),
      ).toBe(true);
    }
  });

  it("lets the universal level-three disciplines answer before and during the wake", () => {
    let body = continuePastOrra(
      "medium",
      "hardened-vessel",
      "grave-callus",
    );
    const arm = body.run!.player.body.leftArm;
    arm.condition = 3;
    const closing = createWound(
      "wake-callus",
      "leftArm",
      "minor",
      "Saint Orra’s crozier",
    );
    closing.treated = true;
    closing.bleed = 0;
    arm.wounds.push(closing);
    const maximumBefore = arm.maxCondition;

    body = chooseStoryChoice(
      body,
      "dress-saint-wounds",
    ).state;
    expect(body.run?.player.body.leftArm.maxCondition).toBe(
      maximumBefore,
    );
    expect(body.run?.player.body.leftArm.condition).toBe(8);
    expect(body.run?.player.scars).toContainEqual(
      expect.objectContaining({
        id: "scar-wake-callus",
        conditionPenalty: 0,
      }),
    );
    body = continueThroughRoadInterlude(body);
    body.run!.wakeVariant = "bell-widow";
    body = chooseStoryChoice(body, "wake-guarded").state;
    expect(body.run?.battle?.enemies[0]?.ward).toBe(6);
    expect(
      body.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "escaped names use the lost time to gather 2 Ward",
        ),
      ),
    ).toBe(true);

    let occult = continuePastOrra(
      "medium",
      "deepened-well",
      "second-breath",
    );
    occult = continueThroughRoadInterlude(occult);
    occult.run!.wakeVariant = "bell-widow";
    occult = chooseStoryChoice(
      occult,
      "wake-guarded",
    ).state;
    occult.run!.player.spirit = 0;
    occult.run!.battle!.seed = 1;
    occult.run!.battle!.enemies[0]!.hp = 1;
    occult.run!.battle!.enemies[0]!.ward = 0;
    occult = resolveBattleAction(
      occult,
      "strike",
      occult.run!.battle!.enemies[0]!.id,
    ).state;
    expect(occult.run?.player.spirit).toBe(2);
    expect(
      occult.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "passage remains open long enough to draw 1 additional Spirit",
        ),
      ),
    ).toBe(true);
  });

  it("closes the opening testament only after the wake is defeated", () => {
    let state = continuePastOrra(
      "medium",
      "two-way-passage",
      "echoing-passage",
    );
    state = chooseStoryChoice(
      state,
      "dress-saint-wounds",
    ).state;
    state = continueThroughRoadInterlude(state);
    state = chooseStoryChoice(
      state,
      "wake-severing",
    ).state;
    const battle = state.run!.battle!;
    battle.enemies.forEach((enemy, index) => {
      enemy.hp = index === 0 ? 1 : 0;
      enemy.ward = 0;
    });

    state = resolveBattleAction(
      state,
      "strike",
      battle.enemies[0]!.id,
    ).state;

    expect(state).toMatchObject({
      screen: "ending",
      ending: "victory",
      run: {
        battlesWon: 3,
        player: {
          xp: 85,
          level: 3,
        },
      },
    });
    expect(
      state.run?.battle?.log.some((entry) =>
        entry.text.includes("You gain 25 experience"),
      ),
    ).toBe(true);
    expect(continueJourney(state).error).toContain(
      "no road left",
    );
  });
});
