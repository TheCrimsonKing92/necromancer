import { describe, expect, it } from "vitest";
import {
  beginDepartureRecoveryBattle,
  emptyDepartureRecoveryState,
  endDepartureRecoveryBattle,
  normalizeDepartureRecoveryState,
  redeemMercyTokens,
  resolveDepartureRecovery,
  type DepartureRecoveryExpression,
  type DepartureRecoveryState,
} from "./departure-recovery";

const resolve = (
  expression: DepartureRecoveryExpression,
  state: DepartureRecoveryState,
  overrides: Partial<Parameters<typeof resolveDepartureRecovery>[0]> = {},
) =>
  resolveDepartureRecovery({
    state,
    battleKey: "saint-orra:41",
    expression,
    defeatIds: ["mourner-left"],
    recipientStanding: true,
    spirit: 1,
    maxSpirit: 5,
    ward: 0,
    maxWard: 12,
    ...overrides,
  });

describe("departure recovery", () => {
  it("normalizes save-shaped state deterministically", () => {
    expect(
      normalizeDepartureRecoveryState({
        battleKey: " saint-orra:41 ",
        expression: "bank-the-departure",
        mercyTokens: 19.8,
        claimedDefeatIds: ["a", "a", " ", 3, "b"],
        openHandConversionSpent: true,
      }),
    ).toEqual({
      battleKey: "saint-orra:41",
      expression: "bank-the-departure",
      mercyTokens: 2,
      claimedDefeatIds: ["a", "b"],
      openHandConversionSpent: false,
    });
    expect(normalizeDepartureRecoveryState({ mercyTokens: 2 })).toEqual(
      emptyDepartureRecoveryState(),
    );
  });

  it("banks departures instead of restoring Spirit and caps Mercy at two", () => {
    const result = resolve(
      "bank-the-departure",
      emptyDepartureRecoveryState(),
      { defeatIds: ["left", "right", "pallbearer"] },
    );

    expect(result).toMatchObject({
      expression: "bank-the-departure",
      spiritBefore: 1,
      spiritAfter: 1,
      spiritRecovered: 0,
      mercyBefore: 0,
      mercyAfter: 2,
      mercyAdded: 2,
      mercyOverflow: 1,
    });
  });

  it("never holds more Mercy than maximum Spirit", () => {
    const result = resolve(
      "bank-the-departure",
      emptyDepartureRecoveryState(),
      {
        defeatIds: ["left", "right"],
        spirit: 0,
        maxSpirit: 1,
      },
    );
    expect(result.mercyAfter).toBe(1);
    expect(result.mercyOverflow).toBe(1);
  });

  it("claims each eligible enemy defeat only once across save-shaped calls", () => {
    const first = resolve(
      "bank-the-departure",
      emptyDepartureRecoveryState(),
    );
    const repeated = resolve("bank-the-departure", first.state);

    expect(first.mercyAdded).toBe(1);
    expect(repeated).toMatchObject({
      acceptedDefeatIds: [],
      mercyAdded: 0,
      mercyAfter: 1,
    });
  });

  it("redeems only at player-turn start and only into available Spirit room", () => {
    const banked = resolve(
      "bank-the-departure",
      emptyDepartureRecoveryState(),
      { defeatIds: ["left", "right"] },
    );
    const wrongPhase = redeemMercyTokens({
      state: banked.state,
      battleKey: "saint-orra:41",
      phase: "other",
      requested: 2,
      spirit: 4,
      maxSpirit: 5,
    });
    expect(wrongPhase.mercySpent).toBe(0);

    const redeemed = redeemMercyTokens({
      state: wrongPhase.state,
      battleKey: "saint-orra:41",
      phase: "player-turn-start",
      requested: 2,
      spirit: 4,
      maxSpirit: 5,
    });
    expect(redeemed).toMatchObject({
      spiritAfter: 5,
      spiritRecovered: 1,
      mercyAfter: 1,
      mercySpent: 1,
    });
  });

  it("cannot turn repeated redemption into a positive resource loop", () => {
    const banked = resolve(
      "bank-the-departure",
      emptyDepartureRecoveryState(),
      { defeatIds: ["left", "right"], spirit: 0 },
    );
    const first = redeemMercyTokens({
      state: banked.state,
      battleKey: "saint-orra:41",
      phase: "player-turn-start",
      requested: 2,
      spirit: 0,
      maxSpirit: 5,
    });
    const second = redeemMercyTokens({
      state: first.state,
      battleKey: "saint-orra:41",
      phase: "player-turn-start",
      requested: 2,
      spirit: first.spiritAfter,
      maxSpirit: 5,
    });

    expect(first.spiritRecovered).toBe(2);
    expect(second).toMatchObject({
      spiritRecovered: 0,
      mercyAfter: 0,
    });
  });

  it("keeps Open Hand recovery immediate", () => {
    const result = resolve(
      "open-hand",
      emptyDepartureRecoveryState(),
      { defeatIds: ["left", "right"], spirit: 1, maxSpirit: 5 },
    );
    expect(result).toMatchObject({
      spiritAfter: 3,
      spiritRecovered: 2,
      spiritOverflow: 0,
      mercyAfter: 0,
      wardGained: 0,
    });
  });

  it("turns a fully wasted Open Hand recovery into one Ward only once", () => {
    const first = resolve("open-hand", emptyDepartureRecoveryState(), {
      defeatIds: ["left", "right"],
      spirit: 5,
      maxSpirit: 5,
      ward: 4,
    });
    const second = resolve("open-hand", first.state, {
      defeatIds: ["pallbearer"],
      spirit: 5,
      maxSpirit: 5,
      ward: first.wardAfter,
    });

    expect(first).toMatchObject({
      spiritRecovered: 0,
      spiritOverflow: 2,
      wardGained: 1,
      wardAfter: 5,
      openHandTriggered: true,
    });
    expect(second).toMatchObject({
      wardGained: 0,
      wardAfter: 5,
      openHandTriggered: false,
    });
  });

  it("does not convert partial overflow and spends a blocked full conversion", () => {
    const partial = resolve("open-hand", emptyDepartureRecoveryState(), {
      defeatIds: ["left", "right"],
      spirit: 4,
      maxSpirit: 5,
      ward: 0,
    });
    expect(partial).toMatchObject({
      spiritRecovered: 1,
      spiritOverflow: 1,
      wardGained: 0,
      openHandTriggered: false,
    });

    const blocked = resolve("open-hand", emptyDepartureRecoveryState(), {
      spirit: 5,
      maxSpirit: 5,
      ward: 12,
    });
    expect(blocked).toMatchObject({
      wardGained: 0,
      openHandTriggered: true,
    });
    expect(blocked.state.openHandConversionSpent).toBe(true);
  });

  it("locks the prepared expression for a battle and clears it afterward", () => {
    const begun = beginDepartureRecoveryBattle(
      emptyDepartureRecoveryState(),
      "saint-orra:41",
      "bank-the-departure",
    );
    const attemptedSwap = resolve("open-hand", begun, {
      spirit: 0,
      maxSpirit: 5,
    });

    expect(attemptedSwap.expression).toBe("bank-the-departure");
    expect(attemptedSwap.spiritRecovered).toBe(0);
    expect(attemptedSwap.mercyAdded).toBe(1);
    expect(endDepartureRecoveryBattle()).toEqual(
      emptyDepartureRecoveryState(),
    );
  });

  it("claims deaths without rewarding a fallen recipient", () => {
    const result = resolve(
      "bank-the-departure",
      emptyDepartureRecoveryState(),
      { recipientStanding: false },
    );
    expect(result.acceptedDefeatIds).toEqual(["mourner-left"]);
    expect(result.state.claimedDefeatIds).toEqual(["mourner-left"]);
    expect(result.mercyAdded).toBe(0);
    expect(result.spiritRecovered).toBe(0);
  });
});
