import { describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  createCharacter,
  resolveBattleAction,
  resolveServantBattleCommand,
} from "../engine";
import { resolveCalledCounsel } from "../engine/bonebinder-transitions";
import type { GameState } from "../types";
import { bonebinderStateFor } from "./bonebinder";
import { setServantServicePurpose } from "./bonebinder/advancement-transitions";
import { deployBonebinderServant } from "./bonebinder/battle";
import { installDitchHandFixture } from "./bonebinder/fixture";

const withFixture = (
  advancement:
    | "letter-of-service"
    | "called-counsel"
    | "set-the-frame",
): GameState => {
  let state = createCharacter(
    "Mara Vale",
    "summoner",
    "female",
    0x9e3779b1,
  ).state;
  state = installDitchHandFixture(state).state;
  state.run!.player.advancements.push(advancement);
  return state;
};

const enterBattle = (state: GameState): GameState => {
  state = chooseStoryChoice(state, "attune").state;
  state = chooseStoryChoice(state, "open-ground").state;
  return deployBonebinderServant(state).state;
};

const makeBattleDurable = (state: GameState): void => {
  const battle = state.run!.battle!;
  for (const enemy of battle.enemies) {
    enemy.hp = 100;
    enemy.maxHp = 100;
    enemy.attack = -20;
    Object.values(enemy.body).forEach((part) => {
      part.condition = 100;
      part.maxCondition = 100;
      part.wounds = [];
    });
  }
};

describe("Bonebinder doctrine battle integration", () => {
  it("raises servant Ward only on the first actual Interposition each round", () => {
    let state = enterBattle(withFixture("set-the-frame"));
    makeBattleDurable(state);
    const battle = state.run!.battle!;
    const servant = battle.allies[0]!;
    servant.hp = 100;
    servant.maxHp = 100;
    Object.values(servant.body).forEach((part) => {
      part.condition = 100;
      part.maxCondition = 100;
      part.wounds = [];
    });
    state = resolveServantBattleCommand(state, "interpose").state;
    const firstRound = resolveBattleAction(state, "guard");
    expect(firstRound.error).toBeUndefined();
    state = firstRound.state;
    expect(state.run!.battle!.round).toBe(2);
    expect(
      bonebinderStateFor(state.run!)!.servant!.command.current.id,
    ).toBe("interpose");
    expect(state.run!.battle!.log.filter(({ text }) =>
      text.includes("sets its frame against the coming stroke"),
    )).toHaveLength(1);

    const secondRound = resolveBattleAction(state, "guard");
    expect(secondRound.error).toBeUndefined();
    state = secondRound.state;
    expect(state.run!.battle!.outcome).toBeNull();
    expect(state.screen).toBe("battle");
    expect(state.run!.battle!.round).toBe(3);
    expect(
      bonebinderStateFor(state.run!)!.servant!.command.current,
    ).toMatchObject({
      id: "interpose",
      targetReference: state.run!.player.id,
    });
    expect(state.run!.battle!.allies[0]!.hp).toBeGreaterThan(0);
    expect(state.run!.battle!.log.filter(({ text }) =>
      text.includes("sets its frame against the coming stroke"),
    )).toHaveLength(2);
  });

  it("makes matching Letter orders free and charges one Spirit for an exception", () => {
    let matching = withFixture("letter-of-service");
    matching = setServantServicePurpose(
      matching,
      "keep-custody",
    ).state;
    matching = enterBattle(matching);
    makeBattleDurable(matching);
    matching.run!.player.spirit = 3;
    matching = resolveServantBattleCommand(matching, "guard").state;

    expect(matching.run!.player.spirit).toBe(3);
    expect(matching.run!.battle!.log.some(({ text }) =>
      text.includes("within the written service"),
    )).toBe(false);
    matching = resolveBattleAction(matching, "guard").state;
    expect(matching.run!.battle!.log.some(({ text }) =>
      text.includes("within the written service"),
    )).toBe(true);

    let exceptional = withFixture("letter-of-service");
    exceptional = setServantServicePurpose(
      exceptional,
      "road-labor",
    ).state;
    exceptional = enterBattle(exceptional);
    makeBattleDurable(exceptional);
    exceptional.run!.player.spirit = 3;
    exceptional = resolveServantBattleCommand(
      exceptional,
      "guard",
    ).state;

    expect(exceptional.run!.player.spirit).toBe(3);
    exceptional = resolveBattleAction(exceptional, "guard").state;
    expect(exceptional.run!.player.spirit).toBe(2);
    expect(exceptional.run!.battle!.log.some(({ text }) =>
      text.includes("outside the written service"),
    )).toBe(true);
  });

  it("uses Called Counsel as the servant instruction and preserves the player's act", () => {
    let state = enterBattle(withFixture("called-counsel"));
    makeBattleDurable(state);
    state.run!.player.spirit = 2;
    state.run!.battle!.seed = 2;
    const round = state.run!.battle!.round;

    state = resolveCalledCounsel(
      state,
      state.run!.battle!.enemies[0]!.id,
    ).state;

    expect(
      bonebinderStateFor(state.run!)!.servant!.command.current.id,
    ).toBe("counsel");
    expect(
      bonebinderStateFor(state.run!)!.advancement.counsel.lastAction,
    ).toBeNull();
    expect(state.run!.battle!.round).toBe(round);
    expect(state.run!.player.spirit).toBe(2);
    expect(state.run!.battle!.log.filter(({ text }) =>
      text.includes("pallbearer"),
    )).toHaveLength(0);

    const repeated = resolveCalledCounsel(
      state,
      state.run!.battle!.enemies[0]!.id,
    );
    expect(repeated.error).toBeUndefined();

    state = resolveBattleAction(repeated.state, "guard").state;
    const first = bonebinderStateFor(state.run!)!.advancement.counsel
      .lastAction;
    expect(first?.actionId).toBe("shove");
    expect(state.run!.battle!.log.filter(({ text }) =>
      text.includes("pallbearer"),
    )).toHaveLength(1);
    expect(state.run!.battle!.round).toBe(round + 1);
    state.run!.battle!.seed = 2;
    state = resolveCalledCounsel(
      state,
      state.run!.battle!.enemies[0]!.id,
    ).state;
    state = resolveBattleAction(state, "guard").state;
    const second = bonebinderStateFor(state.run!)!.advancement.counsel
      .lastAction;
    expect(second?.round).toBe(round + 1);
    expect(second?.actionId).not.toBe(first?.actionId);
  });
});
