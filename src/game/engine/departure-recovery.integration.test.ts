import { describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  createCharacter,
  resolveMercyRedemption,
} from "../engine";
import type {
  AdvancementExpressionId,
  GameState,
} from "../types";
import { witnessPresentation } from "../witness";
import { recoverSpiritFromDefeats } from "./departure-recovery";

const battleState = (
  expression: Extract<
    AdvancementExpressionId,
    "bank-the-departure" | "open-hand"
  >,
  enemyCount = 3,
): GameState => {
  let state = createCharacter("Mara Vey", "medium", 12_345).state;
  state = chooseStoryChoice(state, "attune").state;
  state = chooseStoryChoice(state, "open-ground").state;
  const run = state.run!;
  run.player.advancements.push("departure-disposition");
  run.player.advancementReadiness = {
    practice: [],
    universal: [expression],
  };
  const enemies = run.battle!.enemies;
  const source = enemies[0]!;
  while (enemies.length < enemyCount) {
    const enemy = structuredClone(source);
    enemy.id = `mercy-test-${enemies.length}`;
    enemy.name = `Mercy test ${enemies.length}`;
    enemies.push(enemy);
  }
  return state;
};

const defeat = (state: GameState, indexes: number[]): string[] =>
  indexes.map((index) => {
    const enemy = state.run!.battle!.enemies[index]!;
    enemy.hp = 0;
    return enemy.id;
  });

describe("departure recovery battle integration", () => {
  it("claims the exact defeated combatants once and refuses to bank the final enemy", () => {
    const state = battleState("bank-the-departure", 3);
    const firstId = defeat(state, [0]);

    recoverSpiritFromDefeats(state.run!, firstId);
    recoverSpiritFromDefeats(state.run!, firstId);

    const afterFirst =
      state.run!.battle!.advancementState!.departureRecovery!;
    expect(afterFirst.claimedDefeatIds).toEqual(firstId);
    expect(afterFirst.mercyTokens).toBe(1);

    const finalIds = defeat(state, [1, 2]);
    recoverSpiritFromDefeats(state.run!, finalIds);

    const afterFinal =
      state.run!.battle!.advancementState!.departureRecovery!;
    expect(afterFinal.claimedDefeatIds).toEqual([
      ...firstId,
      ...finalIds,
    ]);
    expect(afterFinal.mercyTokens).toBe(0);
    expect(
      witnessPresentation(
        state.run!.battle!.log.at(-1)!,
      ).text.toLowerCase(),
    ).toContain("no further act remains");
  });

  it("redeems either one token or all held tokens without advancing the round", () => {
    const redeemOne = battleState("bank-the-departure", 3);
    redeemOne.run!.player.spirit = 0;
    recoverSpiritFromDefeats(redeemOne.run!, defeat(redeemOne, [0, 1]));
    const roundBefore = redeemOne.run!.battle!.round;

    const one = resolveMercyRedemption(redeemOne, 1).state;
    expect(one.run!.player.spirit).toBe(1);
    expect(
      one.run!.battle!.advancementState!.departureRecovery!.mercyTokens,
    ).toBe(1);
    expect(one.run!.battle!.round).toBe(roundBefore);

    const redeemAll = battleState("bank-the-departure", 3);
    redeemAll.run!.player.spirit = 0;
    recoverSpiritFromDefeats(redeemAll.run!, defeat(redeemAll, [0, 1]));

    const all = resolveMercyRedemption(redeemAll, 2).state;
    expect(all.run!.player.spirit).toBe(2);
    expect(
      all.run!.battle!.advancementState!.departureRecovery!.mercyTokens,
    ).toBe(0);
    expect(all.run!.battle!.round).toBe(redeemAll.run!.battle!.round);
  });

  it("converts fully wasted Open Hand recovery into Ward only once per battle", () => {
    const state = battleState("open-hand", 3);
    const player = state.run!.player;
    player.spirit = player.maxSpirit;
    player.ward = 3;

    recoverSpiritFromDefeats(state.run!, defeat(state, [0]));
    expect(player.ward).toBe(4);
    expect(
      state.run!.battle!.advancementState!.departureRecovery!
        .openHandConversionSpent,
    ).toBe(true);

    recoverSpiritFromDefeats(state.run!, defeat(state, [1]));
    expect(player.ward).toBe(4);
    expect(
      state.run!.battle!.advancementState!.departureRecovery!
        .claimedDefeatIds,
    ).toEqual([
      state.run!.battle!.enemies[0]!.id,
      state.run!.battle!.enemies[1]!.id,
    ]);
  });
});
