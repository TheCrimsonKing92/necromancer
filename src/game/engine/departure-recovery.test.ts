import { describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  createCharacter,
  resolveBattleAction,
  resolvePendingPlayerAction,
} from "../engine";
import type { GameState, TemporaryAlly } from "../types";
import { recoverSpiritFromDefeats } from "./departure-recovery";

const roadBattle = (): GameState => {
  let state = createCharacter("Mara Vey", "medium", 12_345).state;
  state = chooseStoryChoice(state, "attune").state;
  return chooseStoryChoice(state, "open-ground").state;
};

const readyDeparture = (
  state: GameState,
  expression: "bank-the-departure" | "open-hand",
): void => {
  const player = state.run!.player;
  player.level = 8;
  player.advancements.push(
    "working-contingency",
    "departure-disposition",
  );
  player.advancementReadiness = {
    practice: [],
    universal: [expression],
  };
};

describe("battle departure recovery wiring", () => {
  it("preserves legacy defeat recovery when no new expression is readied", () => {
    const state = roadBattle();
    const run = state.run!;
    const defeated = run.battle!.enemies[0]!;
    run.player.advancements.push("second-breath");
    run.player.spirit = 0;
    defeated.hp = 0;

    recoverSpiritFromDefeats(run, [defeated.id]);

    expect(run.player.spirit).toBe(2);
    expect(run.battle!.advancementState?.departureRecovery).toBeUndefined();
  });

  it("honors the expression locked in battle state if readiness later differs", () => {
    const state = roadBattle();
    const run = state.run!;
    const battle = run.battle!;
    const spare = structuredClone(battle.enemies[1]!);
    spare.id = "spare-enemy";
    battle.enemies.push(spare);
    readyDeparture(state, "bank-the-departure");
    run.player.spirit = 0;

    const first = battle.enemies[0]!;
    first.hp = 0;
    recoverSpiritFromDefeats(run, [first.id]);
    run.player.advancementReadiness!.universal = ["open-hand"];
    const second = battle.enemies[1]!;
    second.hp = 0;
    recoverSpiritFromDefeats(run, [second.id]);

    expect(run.player.spirit).toBe(0);
    expect(
      battle.advancementState?.departureRecovery,
    ).toMatchObject({
      expression: "bank-the-departure",
      mercyTokens: 2,
      claimedDefeatIds: [first.id, second.id],
    });
  });

  it("releases every held departure when the final enemy falls", () => {
    const state = roadBattle();
    const run = state.run!;
    const battle = run.battle!;
    readyDeparture(state, "bank-the-departure");

    const first = battle.enemies[0]!;
    first.hp = 0;
    recoverSpiritFromDefeats(run, [first.id]);
    battle.advancementState!.departureRecovery!.mercyTokens = 2;

    const last = battle.enemies[1]!;
    last.hp = 0;
    recoverSpiritFromDefeats(run, [last.id]);

    expect(
      battle.advancementState?.departureRecovery?.mercyTokens,
    ).toBe(0);
    expect(battle.log.at(-1)?.text).toContain(
      "2 held departures cross unbanked",
    );
  });

  it("records a departure caused by an ally after an aborted working", () => {
    const state = roadBattle();
    readyDeparture(state, "bank-the-departure");
    const run = state.run!;
    const battle = run.battle!;
    run.player.advancementReadiness!.universal = [
      "abort-the-working",
      "bank-the-departure",
    ];

    const doomed = battle.enemies[0]!;
    doomed.hp = 1;
    doomed.ward = 0;
    const ally = structuredClone(doomed) as unknown as TemporaryAlly;
    ally.id = "borrowed-shade";
    ally.name = "Borrowed shade";
    ally.kind = "ally";
    ally.lifetime = { kind: "temporary", remainingTurns: 2 };
    battle.allies.push(ally);

    const other = battle.enemies[1]!;
    const suspended = resolveBattleAction(
      state,
      "spirit-lash",
      other.id,
    ).state;
    const resolved = resolvePendingPlayerAction(
      suspended,
      "abort",
    ).state;

    expect(resolved.run!.battle!.enemies[0]!.hp).toBe(0);
    expect(
      resolved.run!.battle!.advancementState?.departureRecovery,
    ).toMatchObject({
      expression: "bank-the-departure",
      mercyTokens: 1,
      claimedDefeatIds: [doomed.id],
    });
  });
});
