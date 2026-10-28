import { beforeAll, describe, expect, it } from "vitest";
import { experienceForLevel } from "../../progression";
import {
  chooseAdvancement,
  chooseStoryChoice,
  createCharacter,
  getActionUnavailableReason,
  prepareAdvancementExpression,
  resolveBattleAction,
} from "../../engine";
import {
  startRoadBattle,
  startVaultBattle,
} from "../../engine/battle-openings";
import { activateGraveWardenPackRuntime } from "../../content-packs/practice/grave-warden/grave-warden-pack";
import {
  closeTheGate,
  commitBreachAnswer,
  graveWardenBattleState,
  graveWardenBattleSummary,
  resolveThresholdSealBreach,
  setThresholdSeal,
  thresholdSealUnavailableReason,
} from "./battle";
import { beginGraveWardenPractice } from "./practice-state";
import type { GameState } from "../../types";

beforeAll(() => activateGraveWardenPackRuntime());

const roadState = (): GameState => {
  const state = createCharacter(
    "Mara",
    "grave-warden",
    "female",
    41,
  ).state;
  beginGraveWardenPractice(state);
  startRoadBattle(state.run!, "open-ground");
  state.run!.player.ward = 0;
  state.screen = "battle";
  state.storyId = null;
  return state;
};

describe("Grave Warden field seals", () => {
  it("makes the seal's second fold a choice between an early follow-up and recovered Spirit", () => {
    const state = roadState();
    const run = state.run!;
    const target = run.battle!.enemies[0]!;
    run.player.spirit = run.player.maxSpirit - 1;

    setThresholdSeal(run, target);
    expect(graveWardenBattleState(run)).toMatchObject({
      sealsPlaced: 1,
      seals: [{ targetId: target.id, integrity: 2, breached: false }],
    });

    resolveThresholdSealBreach(run, target);
    expect(run.player).toMatchObject({
      ward: 1,
      spirit: run.player.maxSpirit - 1,
    });
    const breachWitness = run.battle!.log.at(-1)?.text ?? "";
    expect(breachWitness).toContain(`${target.name} crosses the seal. One fold closes behind the attack`);
    expect(breachWitness).toContain("The attack continues.");
    expect(breachWitness).not.toContain("before");
    expect(graveWardenBattleState(run)?.seals[0]).toMatchObject({
      integrity: 1,
      breached: true,
    });

    resolveThresholdSealBreach(run, target);
    expect(run.player).toMatchObject({ ward: 2, spirit: run.player.maxSpirit });
    expect(graveWardenBattleState(run)?.seals[0]).toMatchObject({
      integrity: 0,
      breached: true,
    });

    const answer = commitBreachAnswer(run, target);
    expect(answer).toMatchObject({ bonusDamage: 3 });
    expect(answer.detail).toMatch(/recorded crossing/i);
    expect(graveWardenBattleState(run)?.seals).toEqual([]);
  });

  it("runs the set-and-follow loop through public battle transitions", () => {
    let state = roadState();
    const targetId = state.run!.battle!.enemies[0]!.id;

    const set = resolveBattleAction(
      state,
      "set-threshold-seal",
      targetId,
    );
    expect(set.error).toBeUndefined();
    state = set.state;
    expect(state.run!.player.spirit).toBe(state.run!.player.maxSpirit - 1);
    expect(graveWardenBattleState(state.run!)).toMatchObject({
      breachRecoveries: 0,
      seals: [{
      targetId,
      integrity: 1,
      breached: true,
      }],
    });

    const answer = resolveBattleAction(
      state,
      "answer-the-breach",
      targetId,
    );
    expect(answer.error).toBeUndefined();
    expect(answer.state.run!.player.spirit).toBe(
      answer.state.run!.player.maxSpirit - 2,
    );
    expect(graveWardenBattleState(answer.state.run!)?.seals).toEqual([]);
    expect(
      answer.state.run!.battle!.log.some((entry) =>
        /recorded crossing|occult force across/i.test(entry.text),
      ),
    ).toBe(true);
  });

  it("does not mutate battle state while availability and presentation are queried", () => {
    const run = roadState().run!;
    const before = structuredClone(run.battle);

    expect(thresholdSealUnavailableReason(run)).toBeNull();
    expect(graveWardenBattleSummary(run)).toMatch(/2 uncommitted/);
    expect(run.battle).toEqual(before);
  });

  it("blocks accidental replacement of a finite seal", () => {
    const run = roadState().run!;
    const target = run.battle!.enemies[0]!;
    setThresholdSeal(run, target);

    expect(thresholdSealUnavailableReason(run, target.id)).toMatch(
      /already bears/i,
    );
    setThresholdSeal(run, target);
    expect(graveWardenBattleState(run)).toMatchObject({
      sealsPlaced: 1,
      nextSealId: 2,
    });
  });

  it("lets Closed Gate name which of two anchors is consumed", () => {
    const run = roadState().run!;
    run.player.advancements = ["threshold-discipline"];
    run.player.advancementReadiness = {
      practice: ["closed-gate"],
      universal: [],
    };
    const [reeve, hound] = run.battle!.enemies;
    setThresholdSeal(run, reeve!);
    setThresholdSeal(run, hound!);

    closeTheGate(run, hound!);

    expect(run.player.ward).toBe(4);
    expect(graveWardenBattleState(run)?.seals).toEqual([
      expect.objectContaining({ targetId: reeve!.id }),
    ]);
  });

  it("makes Invitation to Breach an offensive trade rather than a coefficient boost", () => {
    const run = roadState().run!;
    run.player.advancements = ["threshold-discipline"];
    run.player.advancementReadiness = {
      practice: ["invitation-to-breach"],
      universal: [],
    };
    const target = run.battle!.enemies[0]!;
    run.player.spirit -= 1;
    setThresholdSeal(run, target);

    resolveThresholdSealBreach(run, target);

    expect(run.player.ward).toBe(0);
    expect(run.player.spirit).toBe(run.player.maxSpirit);
    expect(target.statuses).toContainEqual({
      id: "exposed",
      potency: 1,
      turns: 2,
    });
    expect(graveWardenBattleState(run)?.seals[0]?.integrity).toBe(0);
  });

  it("leaves a zero-Spirit Warden a mundane action instead of soft-locking", () => {
    const state = roadState();
    state.run!.player.spirit = 0;
    expect(getActionUnavailableReason(state, "strike")).toBeNull();
    expect(
      getActionUnavailableReason(state, "set-threshold-seal"),
    ).toBe("Requires 1 Spirit.");
  });
});

describe("Grave Warden progression and world use", () => {
  it("learns and prepares its duality through ordinary level points", () => {
    let state = createCharacter(
      "Mara",
      "grave-warden",
      "female",
      41,
    ).state;
    beginGraveWardenPractice(state);
    state.storyId = "road-aftermath";
    state.run!.player.level = 2;
    state.run!.player.xp = experienceForLevel(2);

    state = chooseAdvancement(state, "threshold-discipline").state;
    expect(state.run!.player.advancements).toContain("threshold-discipline");
    state = prepareAdvancementExpression(
      state,
      "invitation-to-breach",
    ).state;
    expect(state.run!.player.advancementReadiness?.practice).toEqual([
      "invitation-to-breach",
    ]);
  });

  it("carries one paid roadside seal into Saint Orra's encounter", () => {
    let state = createCharacter(
      "Mara",
      "grave-warden",
      "female",
      41,
    ).state;
    beginGraveWardenPractice(state);
    state.storyId = "road-aftermath";
    state.run!.player.spirit = 1;

    state = chooseStoryChoice(state, "keep-road-seal").state;
    expect(state.run!.player.spirit).toBe(0);
    expect(state.run!.flags).toContain("grave-warden-road-seal");

    startVaultBattle(state.run!, "warded");
    expect(graveWardenBattleState(state.run!)).toMatchObject({
      sealsPlaced: 1,
      seals: [
        {
          targetId: "ossuary-saint",
          integrity: 1,
          maxIntegrity: 1,
          breached: false,
        },
      ],
    });
    expect(state.run!.flags).toContain(
      "preparation-spent:grave-warden-road-seal",
    );
  });
});
