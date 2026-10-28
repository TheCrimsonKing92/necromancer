import { describe, expect, it } from "vitest";
import { createCharacter, chooseStoryChoice } from "../../engine";
import { resolveRendererResidue } from "./residue";

const rendererBattle = (
  expression: "decant-the-remainder" | "carry-the-reduction",
) => {
  let state = createCharacter(
    "Mara Vale",
    "thaumaturgist",
    "female",
    0x9e3779b1,
  ).state;
  state.run!.player.level = 2;
  state.run!.player.advancements.push("residue-disposition");
  state.run!.player.advancementReadiness = {
    practice: [expression],
    universal: [],
  };
  state = chooseStoryChoice(state, "attune").state;
  return chooseStoryChoice(state, "open-ground").state;
};

describe("Renderer residue disposition", () => {
  it("decants remaining Burning into bounded Spirit once per encounter", () => {
    const state = rendererBattle("decant-the-remainder");
    const run = state.run!;
    const source = run.battle!.enemies[0]!;
    source.statuses.push({ id: "burning", potency: 2, turns: 3 });
    run.player.spirit = 0;

    resolveRendererResidue(run, [source.id]);
    expect(run.player.spirit).toBe(2);
    expect(run.battle!.advancementState?.usedExpressions).toContain(
      "decant-the-remainder",
    );
    expect(run.battle!.log.at(-1)?.text).toContain(
      "draws the remainder under glass",
    );

    run.player.spirit = 0;
    resolveRendererResidue(run, [source.id]);
    expect(run.player.spirit).toBe(0);
  });

  it("carries unfinished Burning into another standing enemy once", () => {
    const state = rendererBattle("carry-the-reduction");
    const run = state.run!;
    const [source, target] = run.battle!.enemies;
    source!.hp = 0;
    source!.statuses.push({
      id: "burning",
      potency: 2,
      turns: 2,
      preventsHealthRecovery: true,
    });

    resolveRendererResidue(run, [source!.id]);
    expect(target!.statuses).toContainEqual({
      id: "burning",
      potency: 2,
      turns: 2,
      preventsHealthRecovery: true,
    });
    expect(run.battle!.advancementState?.usedExpressions).toContain(
      "carry-the-reduction",
    );
    expect(run.battle!.log.at(-1)?.text).toContain(
      `enters ${target!.name}`,
    );
  });
});
