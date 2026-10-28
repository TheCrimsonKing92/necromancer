import { describe, expect, it } from "vitest";
import {
  chooseAdvancement,
  chooseStoryChoice,
  createCharacter,
  openInventory,
  prepareAdvancementExpression,
  resolveBattleAction,
} from "./engine";
import {
  ADVANCEMENTS,
  advancementModifier,
  advancementTreeFor,
  availableDisciplinePoints,
  getAdvancementOffer,
  getPresentedAdvancement,
  validateAdvancementGraph,
} from "./advancements";
import { usePlayerAction } from "./engine/player-actions";
import { recoverSpiritFromDefeats } from "./engine/combat-state";
import { experienceForLevel } from "./progression";
import type {
  AdvancementId,
  GameState,
  TraditionId,
} from "./types";

const leveledStory = (
  tradition: TraditionId,
  level = 2,
): GameState => {
  const state = createCharacter("Mara", tradition, 12345).state;
  state.run!.player.level = level;
  state.run!.player.xp = experienceForLevel(level);
  return state;
};

const beginRoadBattle = (state: GameState): GameState => {
  let next = chooseStoryChoice(state, "attune").state;
  next = chooseStoryChoice(next, "open-ground").state;
  return next;
};

const availableNodeIds = (state: GameState): AdvancementId[] =>
  getAdvancementOffer(state)?.nodes
    .filter((node) => node.status === "available")
    .map((node) => node.definition.id) ?? [];

describe("advancement disciplines", () => {
  it("shows roots as available and their dependent nodes as locked", () => {
    expect(availableNodeIds(leveledStory("medium"))).toEqual([
      "working-contingency",
      "field-splint",
      "worked-around",
      "two-way-passage",
      "hardened-vessel",
      "deepened-well",
      "field-medicine",
      "roadcraft",
      "plain-dealing",
    ]);
    expect(availableNodeIds(leveledStory("summoner"))).toEqual([
      "working-contingency",
      "letter-of-service",
      "called-counsel",
      "field-splint",
      "worked-around",
      "longer-leash",
      "hardened-vessel",
      "deepened-well",
      "field-medicine",
      "roadcraft",
      "plain-dealing",
    ]);
    expect(
      availableNodeIds(leveledStory("thaumaturgist")),
    ).toEqual([
      "cold-furnace-method",
      "working-contingency",
      "residue-disposition",
      "field-splint",
      "worked-around",
      "hardened-vessel",
      "deepened-well",
      "field-medicine",
      "roadcraft",
      "plain-dealing",
    ]);

    const mediumNodes =
      getAdvancementOffer(leveledStory("medium"))?.nodes ?? [];
    expect(
      mediumNodes.find(
        (node) => node.definition.id === "echoing-passage",
      ),
    ).toMatchObject({
      status: "locked",
      reason: "Requires level 3.",
    });
  });

  it("derives unspent points across safe screens and ignores legacy scene deferrals", () => {
    const state = leveledStory("medium");
    state.run!.flags.push(
      "advancement-deferred:2:weary-traveler",
    );

    expect(getAdvancementOffer(state)?.points).toBe(1);
    expect(
      getAdvancementOffer(openInventory(state).state)?.points,
    ).toBe(1);
    expect(getAdvancementOffer(beginRoadBattle(state))).toBeNull();
  });

  it("switches one learned discipline between mechanically distinct expressions", () => {
    let state = chooseAdvancement(
      leveledStory("thaumaturgist"),
      "cold-furnace-method",
    ).state;

    expect(
      advancementModifier(
        state.run!.player,
        "corpsefire-duration",
      ),
    ).toBe(0);
    state = prepareAdvancementExpression(
      state,
      "cold-furnace-long-reduction",
    ).state;
    expect(
      advancementModifier(
        state.run!.player,
        "corpsefire-duration",
      ),
    ).toBe(1);
    expect(
      advancementModifier(
        state.run!.player,
        "corpsefire-base-damage",
      ),
    ).toBe(-2);

    state = prepareAdvancementExpression(
      state,
      "cold-furnace-white-quench",
    ).state;
    expect(
      advancementModifier(
        state.run!.player,
        "corpsefire-duration",
      ),
    ).toBe(0);
    expect(
      advancementModifier(
        state.run!.player,
        "grave-salt-quench-burning",
      ),
    ).toBe(1);

    const battle = beginRoadBattle(state);
    expect(
      prepareAdvancementExpression(
        battle,
        "cold-furnace-long-reduction",
      ).error,
    ).toContain("outside combat");
  });

  it("keeps a saved legacy Renderer on its original advancement chain", () => {
    const state = leveledStory("thaumaturgist", 3);
    state.run!.player.advancements.push("colder-furnace");
    const ids = advancementTreeFor(state.run!.player).map(
      ({ definition }) => definition.id,
    );

    expect(ids).toContain("colder-furnace");
    expect(ids).toContain("white-ash");
    expect(ids).not.toContain("cold-furnace-method");
  });

  it("spends earned points, opens prerequisites, and rejects locked nodes", () => {
    const state = leveledStory("medium", 3);
    expect(availableDisciplinePoints(state.run!.player)).toBe(2);
    expect(
      chooseAdvancement(state, "echoing-passage").error,
    ).toContain("Requires Two-way Passage");

    const rooted = chooseAdvancement(
      state,
      "two-way-passage",
    ).state;
    expect(availableDisciplinePoints(rooted.run!.player)).toBe(1);
    expect(availableNodeIds(rooted)).toContain("echoing-passage");

    const deepened = chooseAdvancement(
      rooted,
      "echoing-passage",
    ).state;
    expect(deepened.run?.player.advancements).toEqual([
      "two-way-passage",
      "echoing-passage",
    ]);
    expect(availableDisciplinePoints(deepened.run!.player)).toBe(0);
    expect(getAdvancementOffer(deepened)).toBeNull();
  });

  it("applies a permanent choice and features its result", () => {
    const state = leveledStory("medium");
    const player = state.run!.player;
    player.hp -= 6;
    const previousHp = player.hp;
    const previousMaximum = player.maxHp;

    const chosen = chooseAdvancement(
      state,
      "hardened-vessel",
    );

    expect(chosen.error).toBeUndefined();
    expect(chosen.state.run?.player.advancements).toEqual([
      "hardened-vessel",
    ]);
    expect(chosen.state.run?.player.maxHp).toBe(previousMaximum + 4);
    expect(chosen.state.run?.player.hp).toBe(previousHp + 4);
    expect(getPresentedAdvancement(chosen.state)?.id).toBe(
      "hardened-vessel",
    );
    expect(
      chooseAdvancement(chosen.state, "deepened-well").error,
    ).toContain("No advancement");
  });

  it("fills the new measure whenever a discipline raises a maximum", () => {
    const state = leveledStory("medium");
    state.run!.player.spirit = 0;
    const previousMaximum = state.run!.player.maxSpirit;

    const deepened = chooseAdvancement(
      state,
      "deepened-well",
    ).state;

    expect(deepened.run?.player.maxSpirit).toBe(
      previousMaximum + 1,
    );
    expect(deepened.run?.player.spirit).toBe(1);
  });

  it("makes each level-two tradition root change its advertised rule", () => {
    let medium = chooseAdvancement(
      leveledStory("medium"),
      "two-way-passage",
    ).state;
    medium = beginRoadBattle(medium);
    medium = resolveBattleAction(
      medium,
      "spirit-lash",
      "road-reeve",
    ).state;
    expect(
      medium.run?.battle?.log.some(
        (entry) =>
          entry.text.includes(
            "Both wakes seal behind the lash, leaving 2 Ward in all",
          ) &&
          entry.event?.segments.some(
            (segment) =>
              segment.type === "skill" &&
              segment.skill === "Two-way Passage",
          ),
      ),
    ).toBe(true);

    let summoner = chooseAdvancement(
      leveledStory("summoner"),
      "longer-leash",
    ).state;
    summoner = beginRoadBattle(summoner);
    summoner = resolveBattleAction(
      summoner,
      "raise-shade",
    ).state;
    expect(summoner.run?.battle?.allies[0]).toMatchObject({
      id: "bound-shade",
      attack: 4,
      lifetime: {
        kind: "temporary",
        remainingTurns: 3,
      },
    });
    expect(
      summoner.run?.battle?.log.some((entry) =>
        entry.text.includes("The binding holds farther from your body"),
      ),
    ).toBe(true);

    let thaumaturgist = chooseAdvancement(
      leveledStory("thaumaturgist"),
      "cold-furnace-method",
    ).state;
    thaumaturgist = prepareAdvancementExpression(
      thaumaturgist,
      "cold-furnace-long-reduction",
    ).state;
    thaumaturgist = beginRoadBattle(thaumaturgist);
    const target = thaumaturgist.run!.battle!.enemies[0]!;
    target.hp = 100;
    target.maxHp = 100;
    thaumaturgist = resolveBattleAction(
      thaumaturgist,
      "corpsefire",
      target.id,
    ).state;
    expect(
      thaumaturgist.run?.battle?.enemies[0]?.statuses,
    ).toContainEqual({
      id: "burning",
      potency: 2,
      turns: 2,
      preventsHealthRecovery: true,
    });
    expect(
      thaumaturgist.run?.battle?.log.some(
        (entry) =>
          entry.text.includes("Burning 2 for 3 rounds") &&
          entry.text.includes("the wound cannot close around it"),
      ),
    ).toBe(true);
  });

  it("makes every level-three node produce its mechanical payload", () => {
    let medium = leveledStory("medium", 3);
    medium = chooseAdvancement(
      medium,
      "two-way-passage",
    ).state;
    medium = chooseAdvancement(
      medium,
      "echoing-passage",
    ).state;
    medium = beginRoadBattle(medium);
    medium = resolveBattleAction(
      medium,
      "spirit-lash",
      "road-reeve",
    ).state;
    expect(
      medium.run?.battle?.log.some((entry) =>
        entry.text.includes(
          "The returning soul passes through twice",
        ) && entry.text.includes("2 more force"),
      ),
    ).toBe(true);

    let summoner = leveledStory("summoner", 3);
    summoner = chooseAdvancement(
      summoner,
      "longer-leash",
    ).state;
    summoner = chooseAdvancement(
      summoner,
      "shared-hunger",
    ).state;
    summoner = beginRoadBattle(summoner);
    summoner.run!.player.hp -= 5;
    summoner = resolveBattleAction(
      summoner,
      "raise-shade",
    ).state;
    expect(
      summoner.run?.battle?.log.some(
        (entry) =>
          entry.text.includes("Warmth follows the shade’s hand") &&
          entry.text.includes("recovers 1 Health"),
      ),
    ).toBe(true);

    let thaumaturgist = leveledStory("thaumaturgist", 3);
    thaumaturgist.run!.player.advancements.push(
      "colder-furnace",
    );
    thaumaturgist = chooseAdvancement(
      thaumaturgist,
      "white-ash",
    ).state;
    thaumaturgist = beginRoadBattle(thaumaturgist);
    const target = thaumaturgist.run!.battle!.enemies[0]!;
    target.hp = 100;
    target.maxHp = 100;
    thaumaturgist = resolveBattleAction(
      thaumaturgist,
      "corpsefire",
      target.id,
    ).state;
    expect(target.id).toBe("road-reeve");
    expect(
      thaumaturgist.run?.battle?.enemies[0]?.statuses,
    ).toEqual(
      expect.arrayContaining([
        { id: "burning", potency: 2, turns: 2 },
        { id: "exposed", potency: 1, turns: 2 },
      ]),
    );
    expect(
      thaumaturgist.run?.battle?.log.some(
        (entry) =>
          entry.text.includes(
            "White ash settles in the corpsefire’s wake",
          ) &&
          entry.text.includes(
            "Exposed 1 for 3 rounds (-1 Defense)",
          ),
      ),
    ).toBe(true);

    let occult = leveledStory("medium", 3);
    occult = chooseAdvancement(
      occult,
      "deepened-well",
    ).state;
    occult = chooseAdvancement(
      occult,
      "second-breath",
    ).state;
    occult = beginRoadBattle(occult);
    occult.run!.player.spirit = 0;
    occult.run!.battle!.seed = 1;
    occult.run!.battle!.enemies[0]!.hp = 1;
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

  it("derives level-four access from the XP curve and prerequisite path", () => {
    const state = leveledStory("medium", 4);
    state.run!.player.advancements.push(
      "two-way-passage",
      "echoing-passage",
    );

    expect(state.run?.player.xp).toBe(105);
    expect(availableNodeIds(state)).toContain("tempered-passage");

    state.run!.player.level = 3;
    state.run!.player.xp = 104;
    expect(
      advancementTreeFor(state.run!.player).find(
        ({ definition }) => definition.id === "tempered-passage",
      ),
    ).toMatchObject({
      status: "locked",
      reason: "Requires level 4.",
    });
  });

  it("claims a level-four node from the safe inventory surface", () => {
    const story = leveledStory("medium", 4);
    story.run!.player.advancements.push(
      "two-way-passage",
      "echoing-passage",
    );
    const inventory = openInventory(story).state;

    const claimed = chooseAdvancement(
      inventory,
      "tempered-passage",
    );

    expect(claimed.error).toBeUndefined();
    expect(claimed.state.screen).toBe("inventory");
    expect(claimed.state.run?.player.advancements).toContain(
      "tempered-passage",
    );
    expect(getPresentedAdvancement(claimed.state)?.id).toBe(
      "tempered-passage",
    );
  });

  it("lets a prepared Medium spend Ward before Borrowed Might strains the body", () => {
    let state = leveledStory("medium", 4);
    for (const id of [
      "two-way-passage",
      "echoing-passage",
      "tempered-passage",
    ] as const) {
      state = chooseAdvancement(state, id).state;
    }
    state = beginRoadBattle(state);
    const player = state.run!.player;
    player.ward = 2;
    const healthBefore = player.hp;
    const torsoBefore = player.body.torso.condition;

    usePlayerAction(
      state.run!,
      "borrowed-might",
      state.run!.battle!.enemies[0],
    );

    expect(player.ward).toBe(0);
    expect(player.hp).toBe(healthBefore);
    expect(player.body.torso.condition).toBe(torsoBefore);
    expect(player.body.torso.wounds).toEqual([]);
    expect(
      state.run?.battle?.log.at(-1)?.text,
    ).toContain("2 Ward takes the dead weight");
  });

  it("executes Last Command through ordinary shade damage and never during retreat", () => {
    let state = leveledStory("summoner", 4);
    for (const id of [
      "longer-leash",
      "shared-hunger",
      "last-command",
    ] as const) {
      state = chooseAdvancement(state, id).state;
    }
    state = beginRoadBattle(state);
    state = resolveBattleAction(state, "raise-shade").state;
    const battle = state.run!.battle!;
    const shade = battle.allies[0]!;
    for (const enemy of battle.enemies) {
      enemy.hp = 100;
      enemy.maxHp = 100;
    }
    battle.seed = 1;
    shade.attack = 100;
    if (shade.lifetime.kind !== "temporary") {
      throw new Error("Expected a temporary shade.");
    }
    shade.lifetime.remainingTurns = 1;
    const healthBefore = battle.enemies.reduce(
      (total, enemy) => total + enemy.hp,
      0,
    );

    state = resolveBattleAction(state, "guard").state;

    expect(state.run?.battle?.allies).toEqual([]);
    expect(
      healthBefore -
        state.run!.battle!.enemies.reduce(
          (total, enemy) => total + enemy.hp,
          0,
        ),
    ).toBeGreaterThan(0);
    expect(
      state.run?.battle?.log.some((entry) =>
        entry.text.includes("last command reaches its mark"),
      ),
    ).toBe(true);

    let retreat = leveledStory("summoner", 4);
    for (const id of [
      "longer-leash",
      "shared-hunger",
      "last-command",
    ] as const) {
      retreat = chooseAdvancement(retreat, id).state;
    }
    retreat = beginRoadBattle(retreat);
    retreat = resolveBattleAction(retreat, "raise-shade").state;
    const retreatShade = retreat.run!.battle!.allies[0]!;
    if (retreatShade.lifetime.kind !== "temporary") {
      throw new Error("Expected a temporary shade.");
    }
    retreatShade.lifetime.remainingTurns = 1;
    let fled: GameState | undefined;
    for (let seed = 1; seed <= 100 && !fled; seed += 1) {
      const attempt = structuredClone(retreat);
      attempt.run!.battle!.seed = seed;
      const result = resolveBattleAction(attempt, "flee").state;
      if (result.ending === "fled") fled = result;
    }
    expect(fled?.ending).toBe("fled");
    expect(
      fled?.run?.battle?.log.some((entry) =>
        entry.text.includes("last command reaches its mark"),
      ),
    ).toBe(false);
  });

  it("lets White Quench trade remaining Burning for immediate damage", () => {
    let state = leveledStory("thaumaturgist", 4);
    state.run!.player.advancements.push(
      "colder-furnace",
      "white-ash",
    );
    state = chooseAdvancement(state, "white-quench").state;
    state = beginRoadBattle(state);
    const target = state.run!.battle!.enemies[0]!;
    target.hp = 100;
    target.maxHp = 100;
    target.statuses.push({ id: "burning", potency: 2, turns: 2 });

    usePlayerAction(state.run!, "grave-salt", target);

    expect(target.statuses.some(({ id }) => id === "burning")).toBe(
      false,
    );
    expect(state.run?.battle?.log.at(-1)?.text).toContain(
      "adding 4 force; Burning ends",
    );
  });

  it("keeps Last Stance bounded under repeated Brace", () => {
    let state = leveledStory("medium", 4);
    for (const id of [
      "hardened-vessel",
      "grave-callus",
      "last-stance",
    ] as const) {
      state = chooseAdvancement(state, id).state;
    }
    state = beginRoadBattle(state);
    const player = state.run!.player;
    player.hp = Math.floor((player.maxHp - 1) / 2);
    player.spirit = 0;

    usePlayerAction(state.run!, "guard", undefined);
    const firstWard = player.ward;
    usePlayerAction(state.run!, "guard", undefined);

    expect(firstWard).toBe(5);
    expect(player.ward).toBe(firstWard);
    expect(player.ward).toBeLessThanOrEqual(12);
    expect(player.spirit).toBe(0);
    expect(state.run?.battle?.log.at(-1)?.text).toContain(
      "Brace adds no further protection",
    );
  });

  it("converts only capped overflow Spirit to Ward after a defeat", () => {
    const state = leveledStory("medium", 4);
    state.run!.player.advancements.push(
      "deepened-well",
      "second-breath",
      "death-dividend",
    );
    const player = state.run!.player;
    player.spirit = player.maxSpirit;
    player.ward = 11;

    const recovery = recoverSpiritFromDefeats(player, 3);

    expect(recovery).toMatchObject({
      recovered: 0,
      overflow: 6,
      wardGained: 1,
    });
    expect(player.ward).toBe(12);
  });

  it("makes mundane disciplines increase real skill ranks without exceeding mastery", () => {
    let state = leveledStory("medium");
    const medicineBefore = state.run!.player.skills.medicine;
    state = chooseAdvancement(state, "field-medicine").state;

    expect(state.run?.player.skills.medicine).toBe(
      medicineBefore + 1,
    );
    expect(
      advancementModifier(state.run!.player, "mercy-spirit"),
    ).toBe(0);

    const capped = leveledStory("medium");
    capped.run!.player.skills.medicine = 5;
    const claimed = chooseAdvancement(capped, "field-medicine").state;
    expect(claimed.run?.player.skills.medicine).toBe(5);
  });

  it("validates missing prerequisites and prerequisite cycles", () => {
    expect(validateAdvancementGraph(ADVANCEMENTS)).toEqual([]);

    const missing = structuredClone(ADVANCEMENTS);
    missing["echoing-passage"].prerequisites = [
      "missing-node" as AdvancementId,
    ];
    expect(validateAdvancementGraph(missing)).toContain(
      "echoing-passage: missing prerequisite missing-node.",
    );

    const cyclic = structuredClone(ADVANCEMENTS);
    cyclic["two-way-passage"].prerequisites = [
      "echoing-passage",
    ];
    expect(
      validateAdvancementGraph(cyclic).some((error) =>
        error.includes("prerequisite cycle detected"),
      ),
    ).toBe(true);
  });
});
