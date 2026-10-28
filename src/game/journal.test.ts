import { describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  closeJournal,
  createCharacter,
  openJournal,
  switchInventoryToJournal,
  switchJournalToInventory,
} from "./engine";
import {
  CAMPAIGN_PREPARATIONS,
  CAMPAIGN_PREPARATION_IDS,
  campaignPreparationsFor,
  journalEntryCount,
  knownFactsFor,
  spendPreparation,
} from "./journal";
import {
  adjustWorldPressure,
  journalWorldReadModelFor,
  learnWorldFact,
  WORLD_FACT_IDS,
} from "./world";
import { isResumableState } from "./persistence/validation";
import type { GameState, RunState } from "./types";

const preparedState = (): GameState => {
  const state = createCharacter(
    "Mara Vale",
    "medium",
    "female",
    42,
  ).state;
  state.run!.flags.push("burial-tally");
  learnWorldFact(state.run!.world, "aided-county-burial");
  return state;
};

const renderedJournalEntryCount = (run: RunState): number => {
  const world = journalWorldReadModelFor(run);
  return (
    campaignPreparationsFor(run).length +
    knownFactsFor(run).length +
    Object.values(world).reduce(
      (total, entries) => total + entries.length,
      0,
    )
  );
};

const broadJournalState = (): GameState => {
  let state = createCharacter(
    "Mara Vale",
    "medium",
    "female",
    73,
  ).state;
  state.storyId = "road-interlude";
  state.run!.roadEvent = "disputed-bundle";
  state = chooseStoryChoice(state, "inspect-disputed-bundle").state;

  for (const id of WORLD_FACT_IDS) {
    if (
      id !== "bundle-left-under-burial-custody" &&
      id !== "bundle-released-to-broker"
    ) {
      learnWorldFact(state.run!.world, id);
    }
  }
  for (const id of CAMPAIGN_PREPARATION_IDS) {
    const flag = CAMPAIGN_PREPARATIONS[id].flag;
    if (!state.run!.flags.includes(flag)) state.run!.flags.push(flag);
  }
  state.run!.flags.push("hollis-rendering:usable:witnessed");
  adjustWorldPressure(
    state.run!.world,
    "escapedNames",
    2,
    "saint-orra-unbound",
  );
  return state;
};

describe("the campaign journal", () => {
  it("keeps the compact header count equal to every rendered Journal category", () => {
    const states = [
      createCharacter("Mara Vale", "medium", "female", 42).state,
      preparedState(),
      broadJournalState(),
    ];

    for (const state of states) {
      expect(journalEntryCount(state.run!)).toBe(
        renderedJournalEntryCount(state.run!),
      );
    }
  });

  it("counts every disclosure category in a broad valid unresolved record", () => {
    const state = broadJournalState();
    const world = journalWorldReadModelFor(state.run!);

    expect(isResumableState(state)).toBe(true);
    expect(Object.fromEntries(
      Object.entries(world).map(([id, entries]) => [id, entries.length]),
    )).toEqual({
      actors: 6,
      relationships: 2,
      evidence: 1,
      claims: 2,
      custody: 1,
      concerns: 3,
    });
    expect(journalEntryCount(state.run!)).toBe(
      renderedJournalEntryCount(state.run!),
    );
  });

  it("separates active preparation from character-known facts", () => {
    const state = preparedState();

    expect(campaignPreparationsFor(state.run!)).toEqual([
      expect.objectContaining({
        id: "burial-tally",
        status: "active",
      }),
    ]);
    expect(knownFactsFor(state.run!)).toEqual([
      expect.objectContaining({
        id: "aided-county-burial",
      }),
    ]);
    expect(state.run?.world.facts).toContain(
      "aided-county-burial",
    );
  });

  it("keeps spent preparation as a readable record", () => {
    const state = preparedState();
    spendPreparation(state.run!, "burial-tally");

    expect(campaignPreparationsFor(state.run!)[0]).toMatchObject({
      id: "burial-tally",
      status: "spent",
    });
  });

  it("opens from story or battle and returns to the exact screen", () => {
    let story = preparedState();
    story = openJournal(story).state;
    expect(story.screen).toBe("journal");
    expect(closeJournal(story).state.screen).toBe("story");

    let battle = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    battle = chooseStoryChoice(battle, "attune").state;
    battle = chooseStoryChoice(battle, "open-ground").state;
    expect(battle.screen).toBe("battle");
    battle = openJournal(battle).state;
    expect(closeJournal(battle).state.screen).toBe("battle");
  });

  it("switches directly between Journal and Body & equipment", () => {
    let state = openJournal(preparedState()).state;
    state = switchJournalToInventory(state).state;
    expect(state.screen).toBe("inventory");
    expect(state.inventoryReturnScreen).toBe("story");

    state = switchInventoryToJournal(state).state;
    expect(state.screen).toBe("journal");
    expect(state.journalReturnScreen).toBe("story");
  });
});
