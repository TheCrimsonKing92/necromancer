import { describe, expect, it } from "vitest";
import { chooseStoryChoice, createCharacter } from "../game/engine";
import { renderBattle } from "./battle-render";

describe("Mercy battle presentation", () => {
  it("shows held Mercy and both available redemption controls", () => {
    let state = createCharacter("Mara Vey", "medium", 12_345).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state.run!.player.spirit = 0;
    state.run!.battle!.advancementState = {
      usedExpressions: [],
      departureRecovery: {
        battleKey: "ossuary-road:ordinary:1:17",
        expression: "bank-the-departure",
        mercyTokens: 2,
        claimedDefeatIds: ["hollis", "ash-hound"],
        openHandConversionSpent: false,
      },
    };

    const markup = renderBattle(state, { hasSave: false });

    expect(markup).toContain("Mercy · 2 / 2 held");
    expect(markup).toContain("Bank the Departure · Mercy 2 / 2");
    expect(markup).toContain(
      'data-action="redeem-mercy" data-amount="1"',
    );
    expect(markup).toContain(
      'data-action="redeem-mercy" data-amount="2">Redeem all',
    );
  });
});
