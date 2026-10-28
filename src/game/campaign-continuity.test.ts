import { describe, expect, it } from "vitest";
import { createCharacter } from "./engine";
import {
  createCampaignContinuity,
  normalizeCampaignContinuity,
  synchronizeCampaignContinuity,
  testamentEndReasonFor,
} from "./campaign-continuity";

describe("campaign and testament continuity", () => {
  it("creates a deterministic campaign and an active first testament", () => {
    const first = createCampaignContinuity(41);
    const replay = createCampaignContinuity(41);

    expect(first).toEqual(replay);
    expect(first.activeTestament).toMatchObject({
      ordinal: 1,
      predecessorTestamentId: null,
      successorRelationship: null,
    });
    expect(first.closedTestaments).toEqual([]);
    expect(first.nextTestamentOrdinal).toBe(2);
  });

  it("archives a death exactly once without moving the character's possessions", () => {
    const state = createCharacter("Mara", "medium", "female", 41).state;
    const inventoryBefore = structuredClone(state.run!.player.inventory);
    state.screen = "ending";
    state.ending = "defeat";
    state.run!.player.hp = 0;

    synchronizeCampaignContinuity(state);
    synchronizeCampaignContinuity(state);

    expect(state.campaign?.activeTestament).toBeNull();
    expect(state.campaign?.closedTestaments).toHaveLength(1);
    expect(state.campaign?.closedTestaments[0]).toMatchObject({
      useName: "Mara",
      tradition: "medium",
      endReason: "death",
      finalHealth: 0,
      successor: null,
    });
    expect(state.run!.player.inventory).toEqual(inventoryBefore);
  });

  it("does not close a testament for an intermediate victory screen", () => {
    const state = createCharacter("Mara", "medium", "female", 41).state;
    state.screen = "ending";
    state.ending = "victory";
    state.run!.battlesWon = 1;

    synchronizeCampaignContinuity(state);

    expect(testamentEndReasonFor(state)).toBeNull();
    expect(state.campaign?.activeTestament).not.toBeNull();
    expect(state.campaign?.closedTestaments).toEqual([]);
  });

  it("records final completion while keeping end reasons open to retirement", () => {
    const state = createCharacter("Mara", "medium", "female", 41).state;
    state.screen = "ending";
    state.ending = "victory";
    state.run!.battlesWon = 3;

    synchronizeCampaignContinuity(state);

    expect(state.campaign?.closedTestaments[0]?.endReason).toBe(
      "completion",
    );
    expect(
      normalizeCampaignContinuity(
        {
          ...state.campaign,
          closedTestaments: [
            state.campaign!.closedTestaments[0],
            {
              ...state.campaign!.closedTestaments[0],
              testamentId: "later-retirement",
              ordinal: 2,
              endReason: "retirement",
            },
          ],
        },
        state.run!,
        true,
      ).closedTestaments.map(({ endReason }) => endReason),
    ).toEqual(["completion", "retirement"]);
  });

  it("normalizes duplicate history deterministically and repairs an absent active identity", () => {
    const state = createCharacter("Mara", "medium", "female", 41).state;
    state.screen = "ending";
    state.ending = "defeat";
    synchronizeCampaignContinuity(state);
    const closed = state.campaign!.closedTestaments[0]!;

    const normalized = normalizeCampaignContinuity(
      {
        ...state.campaign,
        activeTestament: null,
        closedTestaments: [closed, closed],
      },
      state.run!,
      false,
    );

    expect(normalized.closedTestaments).toEqual([closed]);
    expect(normalized.activeTestament).toMatchObject({
      ordinal: 2,
      predecessorTestamentId: closed.testamentId,
      successorRelationship: null,
    });
    expect(normalized.nextTestamentOrdinal).toBe(3);
  });
});
