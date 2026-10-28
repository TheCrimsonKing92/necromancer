import { describe, expect, it } from "vitest";
import { createWound, woundEffects } from "../anatomy";
import {
  chooseStoryChoice,
  createCharacter,
  resolveBattleAction,
  resolvePendingPlayerAction,
  resolveWorkedAroundChoice,
} from "../engine";
import type { GameState } from "../types";

const battleState = (): GameState => {
  let state = createCharacter("Mara Vey", "medium", 12_345).state;
  state = chooseStoryChoice(state, "attune").state;
  state = chooseStoryChoice(state, "open-ground").state;
  return state;
};

describe("active advancement expressions", () => {
  it("commits an attack check before Abort the Working is decided", () => {
    const state = battleState();
    const player = state.run!.player;
    player.advancements.push("working-contingency");
    player.advancementReadiness = {
      practice: [],
      universal: ["abort-the-working"],
    };
    const enemy = state.run!.battle!.enemies[0]!;
    const healthBefore = enemy.hp;
    const spiritBefore = player.spirit;

    const suspended = resolveBattleAction(
      state,
      "spirit-lash",
      enemy.id,
    ).state;

    expect(suspended.run!.battle!.round).toBe(1);
    expect(suspended.run!.battle!.enemies[0]!.hp).toBe(healthBefore);
    expect(suspended.run!.player.spirit).toBe(spiritBefore - 1);
    expect(
      suspended.run!.battle!.advancementState?.pendingPlayerAction,
    ).toMatchObject({ actionId: "spirit-lash", targetId: enemy.id });

    const restored = structuredClone(
      JSON.parse(JSON.stringify(suspended)) as GameState,
    );
    const continued = resolvePendingPlayerAction(
      suspended,
      "continue",
    ).state;
    const replayed = resolvePendingPlayerAction(
      restored,
      "continue",
    ).state;
    expect(continued).toEqual(replayed);
    expect(continued.run!.battle!.round).toBe(2);
    expect(
      continued.run!.battle!.advancementState?.pendingPlayerAction,
    ).toBeUndefined();
  });

  it("abandons consequences but spends the turn and Spirit", () => {
    const state = battleState();
    const player = state.run!.player;
    player.advancements.push("working-contingency");
    player.advancementReadiness = {
      practice: [],
      universal: ["abort-the-working"],
    };
    const target = state.run!.battle!.enemies[0]!;
    const targetHealth = target.hp;

    const suspended = resolveBattleAction(
      state,
      "spirit-lash",
      target.id,
    ).state;
    const aborted = resolvePendingPlayerAction(
      suspended,
      "abort",
    ).state;

    expect(aborted.run!.battle!.enemies[0]!.hp).toBe(targetHealth);
    expect(aborted.run!.battle!.round).toBe(2);
    expect(
      aborted.run!.battle!.advancementState?.usedExpressions,
    ).toContain("abort-the-working");
  });

  it("uses Held Measure only when an action reaches the reserved Spirit", () => {
    const state = battleState();
    const player = state.run!.player;
    player.advancements.push("working-contingency");
    player.advancementReadiness = {
      practice: [],
      universal: ["held-measure"],
    };
    player.spirit = 1;

    const result = resolveBattleAction(
      state,
      "spirit-lash",
      state.run!.battle!.enemies[0]!.id,
    ).state;

    expect(result.run!.player.spirit).toBe(0);
    expect(result.run!.battle!.advancementState?.usedExpressions).toContain(
      "held-measure",
    );
  });
});

describe("body wound doctrines", () => {
  it("turns a binding into temporary relief and lasting recovery burden", () => {
    const state = battleState();
    const player = state.run!.player;
    const wound = createWound(
      "test-arm",
      "leftArm",
      "serious",
      "hook",
    );
    player.body.leftArm.wounds.push(wound);
    player.advancements.push("field-splint");
    player.inventory["linen-binding"] = 1;

    const result = resolveBattleAction(
      state,
      "field-splint",
      wound.id,
    ).state;
    const changed = result.run!.player.body.leftArm.wounds[0]!;

    expect(woundEffects(changed).attackPenalty).toBe(0);
    expect(changed.recoveryBurden).toBe(1);
    expect(changed.combatPenaltyReductionTurns).toBe(1);
    expect(result.run!.player.inventory["linen-binding"] ?? 0).toBe(0);
  });

  it("works around a chosen wound without spending the opening action", () => {
    const state = battleState();
    const player = state.run!.player;
    const wound = createWound(
      "test-arm",
      "rightArm",
      "serious",
      "blade",
    );
    player.body.rightArm.wounds.push(wound);
    player.advancements.push("worked-around");

    const prepared = resolveWorkedAroundChoice(state, wound.id).state;
    expect(prepared.run!.battle!.round).toBe(1);
    expect(
      woundEffects(prepared.run!.player.body.rightArm.wounds[0]!)
        .attackPenalty,
    ).toBe(0);

    const acted = resolveBattleAction(
      prepared,
      "strike",
      prepared.run!.battle!.enemies[0]!.id,
    ).state;
    expect(
      acted.run!.player.body.rightArm.wounds[0]!.recoveryBurden,
    ).toBe(1);
  });
});
