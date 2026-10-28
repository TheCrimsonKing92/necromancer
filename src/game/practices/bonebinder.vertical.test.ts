import { describe, expect, it } from "vitest";
import { createWound } from "../anatomy";
import {
  chooseStoryChoice,
  createCharacter,
  openInventory,
  repairBonebinderServant,
  resolveBattleAction,
  resolveServantBattleCommand,
} from "../engine";
import { addItem, itemCount } from "../items";
import type { GameState } from "../types";
import { actorBelievesFact } from "../world";
import {
  DITCH_HAND_RECOGNITION_EVIDENCE_ID,
  bonebinderStateFor,
} from "./bonebinder";
import {
  deployBonebinderServant,
  resolvePersistentServantCommand,
} from "./bonebinder/battle";
import {
  installDitchHandFixture,
  recognizeDitchHandFixture,
} from "./bonebinder/fixture";

const battleWithDitchHand = (): GameState => {
  let state = createCharacter(
    "Mara Vale",
    "medium",
    "female",
    0x9e3779b1,
  ).state;
  state = installDitchHandFixture(state).state;
  state = chooseStoryChoice(state, "attune").state;
  state = chooseStoryChoice(state, "open-ground").state;
  state = deployBonebinderServant(state).state;
  return state;
};

describe("the persistent Bonebinder servant vertical slice", () => {
  it("does not turn persistence into a long temporary duration", () => {
    const state = battleWithDitchHand();
    const servant = bonebinderStateFor(state.run!)!.servant!;
    const ally = state.run!.battle!.allies[0]!;

    expect(servant.combatant.lifetime).toEqual({
      kind: "persistent",
      servantId: servant.identity.id,
    });
    expect(ally.lifetime).toEqual(servant.combatant.lifetime);
    expect("remainingTurns" in ally).toBe(false);
  });

  it("uses Guard to hold a bounded Ward around the necromancer", () => {
    let state = battleWithDitchHand();
    state.run!.player.ward = 0;
    bonebinderStateFor(state.run!)!.servant!.combatant.ward = 0;
    state = resolveServantBattleCommand(state, "guard").state;

    resolvePersistentServantCommand(state.run!);

    expect(state.run!.player.ward).toBe(2);
    expect(bonebinderStateFor(state.run!)!.servant!.combatant.ward).toBe(0);
    expect(state.run!.battle!.log.at(-1)?.text).toContain(
      "raising Mara Vale’s Ward to 2",
    );
  });

  it("acts only when commanded and joins the necromancer's ordinary round", () => {
    let state = battleWithDitchHand();
    const battle = state.run!.battle!;
    const enemy = battle.enemies[0]!;
    enemy.hp = 100;
    enemy.maxHp = 100;
    Object.values(enemy.body).forEach((part) => {
      part.condition = 100;
      part.maxCondition = 100;
      part.wounds = [];
    });
    const before = enemy.hp;
    enemy.defense = -100;

    const undirected = resolveBattleAction(state, "guard");
    expect(undirected.error).toBe("Direct Ditch-Hand before taking your act.");
    expect(undirected.state).toBe(state);

    const round = state.run!.battle!.round;
    state.run!.battle!.seed = 0x9e3779b1;
    const command = resolveServantBattleCommand(
      state,
      "harry",
      enemy.id,
    );
    expect(command.error).toBeUndefined();
    state = command.state;

    expect(state.run!.battle!.round).toBe(round);
    expect(state.run!.battle!.enemies[0]!.hp).toBe(before);
    expect(
      bonebinderStateFor(state.run!)!.servant!.command.current.id,
    ).toBe("harry");

    state = resolveBattleAction(state, "guard").state;
    expect(state.run!.battle!.round).toBe(round + 1);
    expect(state.run!.battle!.enemies[0]!.hp).toBeLessThan(before);
    expect(
      bonebinderStateFor(state.run!)!.servant!.command.current.id,
    ).toBe("harry");
    expect(
      state.run!.battle!.log.filter((entry) =>
        entry.text.includes("hooked hands"),
      ),
    ).toHaveLength(1);

    const afterFirstOrder = state.run!.battle!.enemies[0]!.hp;
    state = resolveBattleAction(state, "guard").state;
    expect(state.run!.battle!.enemies[0]!.hp).toBeLessThan(afterFirstOrder);
    expect(
      state.run!.battle!.log.filter((entry) =>
        entry.text.includes("hooked hands"),
      ),
    ).toHaveLength(2);
  });

  it("resolves Guard, Interpose, and Withdraw alongside the player's act", () => {
    let guard = battleWithDitchHand();
    guard = resolveServantBattleCommand(guard, "guard").state;
    guard = resolveBattleAction(guard, "guard").state;
    const guarded = guard.run!.battle!.allies.find(
      (ally) => ally.lifetime.kind === "persistent",
    )!;
    expect(guarded.ward).toBe(0);
    expect(
      guard.run!.battle!.log.some((entry) =>
        entry.text.includes("Ditch-Hand holds close"),
      ),
    ).toBe(true);

    let interpose = battleWithDitchHand();
    const interposing = interpose.run!.battle!.allies[0]!;
    interposing.defense = -100;
    const playerHealth = interpose.run!.player.hp;
    const servantHealth = interposing.hp;
    interpose.run!.battle!.seed = 0x9e3779b1;
    interpose = resolveServantBattleCommand(
      interpose,
      "interpose",
    ).state;
    interpose = resolveBattleAction(interpose, "guard").state;
    expect(interpose.run!.player.hp).toBe(playerHealth);
    expect(
      bonebinderStateFor(interpose.run!)!.servant!.combatant.hp,
    ).toBeLessThan(servantHealth);

    let withdrawn = battleWithDitchHand();
    const healthBefore =
      bonebinderStateFor(withdrawn.run!)!.servant!.combatant.hp;
    withdrawn = resolveServantBattleCommand(
      withdrawn,
      "withdraw",
    ).state;
    withdrawn = resolveBattleAction(withdrawn, "guard").state;
    expect(withdrawn.run!.battle!.allies).toEqual([]);
    expect(
      bonebinderStateFor(withdrawn.run!)!.servant!.combatant.hp,
    ).toBe(healthBefore);
  });

  it("carries defeat and postbattle anatomy back to the servant", () => {
    let defeated = battleWithDitchHand();
    const ally = defeated.run!.battle!.allies[0]!;
    ally.hp = 1;
    ally.defense = -100;
    defeated.run!.battle!.seed = 0x9e3779b1;
    defeated = resolveServantBattleCommand(
      defeated,
      "interpose",
    ).state;
    defeated = resolveBattleAction(defeated, "guard").state;
    expect(
      bonebinderStateFor(defeated.run!)!.servant!.combatant.hp,
    ).toBe(0);

    let victory = battleWithDitchHand();
    const [target, other] = victory.run!.battle!.enemies;
    target!.hp = 1;
    other!.hp = 0;
    victory.run!.battle!.allies[0]!.hp = 13;
    victory.run!.battle!.seed = 0x9e3779b1;
    victory = resolveServantBattleCommand(
      victory,
      "harry",
      target!.id,
    ).state;
    victory = resolveBattleAction(victory, "guard").state;
    expect(victory.ending).toBe("victory");
    expect(
      bonebinderStateFor(victory.run!)!.servant!.combatant.hp,
    ).toBe(13);
    expect(
      bonebinderStateFor(victory.run!)!.servant!.combatant.ward,
    ).toBe(0);
  });

  it("consumes grounded repair materials without treating every wound", () => {
    let state = installDitchHandFixture(
      createCharacter("Mara", "medium", "female", 42).state,
    ).state;
    const servant = bonebinderStateFor(state.run!)!.servant!;
    servant.combatant.hp = 4;
    servant.combatant.body.leftArm.condition -= 5;
    const openWound = createWound(
      "servant-open",
      "leftArm",
      "serious",
      "road hook",
      "Opened arm",
      "humanoid",
      "binding",
    );
    const closedWound = createWound(
      "servant-closed",
      "head",
      "serious",
      "stone fall",
      "Closed skull injury",
      "humanoid",
      "rest",
    );
    servant.combatant.body.leftArm.wounds.push(openWound);
    servant.combatant.body.head.wounds.push(closedWound);
    addItem(state.run!.player.inventory, "mortuary-tallow");
    addItem(state.run!.player.inventory, "linen-binding");
    state = openInventory(state).state;

    const conditionBefore =
      servant.combatant.body.leftArm.condition;
    state = repairBonebinderServant(state, {
      kind: "reinforce-part",
      part: "leftArm",
    }).state;
    const repaired = bonebinderStateFor(state.run!)!.servant!;
    expect(repaired.combatant.body.leftArm.condition).toBe(
      conditionBefore + 3,
    );
    expect(repaired.combatant.hp).toBe(7);
    expect(
      itemCount(state.run!.player.inventory, "mortuary-tallow"),
    ).toBe(0);

    state = repairBonebinderServant(state, {
      kind: "stabilize-wound",
      woundId: openWound.id,
    }).state;
    expect(
      bonebinderStateFor(state.run!)!.servant!.combatant.body
        .leftArm.wounds[0],
    ).toMatchObject({ treated: true, bleed: 0 });
    const linenBefore = itemCount(
      state.run!.player.inventory,
      "linen-binding",
    );
    const refused = repairBonebinderServant(state, {
      kind: "stabilize-wound",
      woundId: closedWound.id,
    });
    expect(refused.error).toContain("mortuary rest");
    expect(
      itemCount(refused.state.run!.player.inventory, "linen-binding"),
    ).toBe(linenBefore);
    expect(repaired.repairs.history[0]).toMatchObject({
      conditionRestored: 3,
      healthRestored: 3,
      materialReferences: ["item:mortuary-tallow"],
    });
  });

  it("records recognition as actor-held evidence, not global reputation", () => {
    const initial = installDitchHandFixture(
      createCharacter("Mara", "medium", "female", 42).state,
    ).state;
    const standingBefore = structuredClone(initial.run!.world.standing);
    const recognized = recognizeDitchHandFixture(initial).state;

    expect(recognized.run!.world.playerKnowledge).toContain(
      "ditch-hand-body-recognized",
    );
    expect(recognized.run!.world.evidence).toContainEqual(
      expect.objectContaining({
        id: DITCH_HAND_RECOGNITION_EVIDENCE_ID,
        custodianId: "eda-pell",
      }),
    );
    expect(
      actorBelievesFact(
        recognized.run!.world,
        "eda-pell",
        "ditch-hand-body-recognized",
        "accepted",
      ),
    ).toBe(true);
    expect(recognized.run!.world.standing).toEqual(standingBefore);
  });
});
