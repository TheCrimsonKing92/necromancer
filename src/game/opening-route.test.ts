import { describe, expect, it } from "vitest";
import {
  chooseAdvancement,
  chooseStoryChoice,
  createCharacter,
} from "./engine";
import { STORY_SCENES, storyChoicesFor } from "./content";
import { factionKnows } from "./world";
import { allWounds } from "./anatomy";
import { itemCount } from "./items";
import { beginDitchHandPractice } from "./practices/bonebinder";
import type { GameState } from "./types";

const useNameAttempt = (
  wanted: "success" | "failure",
): GameState => {
  for (let index = 1; index <= 250; index += 1) {
    const seed = index * 104_729;
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      seed,
    ).state;
    state = chooseStoryChoice(state, "burial-cut").state;
    state = chooseStoryChoice(state, "give-use-name").state;
    if (
      state.run?.flags.includes(
        `burial-cut-result:give-use-name:${wanted}`,
      )
    ) {
      return state;
    }
  }
  throw new Error(`No deterministic ${wanted} seed was found.`);
};

describe("the burial-cut opening route", () => {
  it("offers one consequential mundane check instead of the road fight", () => {
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    state = chooseStoryChoice(state, "burial-cut").state;

    expect(state.storyId).toBe("burial-cut");
    expect(state.run?.battle).toBeNull();
    expect(
      storyChoicesFor(STORY_SCENES["burial-cut"], state.run!).map(
        ({ id, skill }) => [id, skill],
      ),
    ).toEqual([
      ["read-washout", "perception"],
      ["shoulder-bier", "athletics"],
      ["give-use-name", "persuasion"],
    ]);

    state = chooseStoryChoice(state, "read-washout").state;
    const remaining = storyChoicesFor(
      STORY_SCENES["burial-cut"],
      state.run!,
    );
    expect(remaining.map(({ id }) => id)).toEqual([
      "read-washout",
      "leave-burial-cut",
    ]);
    expect(
      chooseStoryChoice(state, "shoulder-bier").error,
    ).toContain("not available");
  });

  it("lets a Bonebinder put a standing servant to grounded road work", () => {
    let state = beginDitchHandPractice(
      createCharacter(
        "Mara Vale",
        "summoner",
        "female",
        42,
      ).state,
    ).state;
    const servant = state.run!.practiceStates!.bonebinder!.servant!;
    const servantHealth = servant.combatant.hp;
    const linenBefore = itemCount(
      state.run!.player.inventory,
      "linen-binding",
    );
    state = chooseStoryChoice(state, "burial-cut").state;

    expect(
      storyChoicesFor(STORY_SCENES["burial-cut"], state.run!).map(
        ({ id }) => id,
      ),
    ).toContain("ditch-hand-bier");

    state = chooseStoryChoice(state, "ditch-hand-bier").state;
    expect(state.run!.flags).toContain(
      "burial-cut-result:ditch-hand-bier:success",
    );
    expect(state.run!.player.xp).toBe(25);
    expect(itemCount(state.run!.player.inventory, "linen-binding")).toBe(
      linenBefore + 1,
    );
    expect(state.run!.world.standing["burial-crews"]).toBe(1);
    expect(
      state.run!.practiceStates!.bonebinder!.servant!.combatant.hp,
    ).toBe(servantHealth);
  });

  it("makes a freely given use-name useful even when confidence fails", () => {
    const success = useNameAttempt("success");
    const failure = useNameAttempt("failure");

    for (const state of [success, failure]) {
      expect(state.run?.flags).toContain("burial-tally");
      expect(state.run?.player.xp).toBe(25);
      expect(
        factionKnows(
          state.run!.world,
          "burial-crews",
          "gave-use-name-to-burial-crews",
        ),
      ).toBe(true);
    }
    expect(
      factionKnows(
        success.run!.world,
        "county-reeves",
        "gave-use-name-to-burial-crews",
      ),
    ).toBe(false);
    expect(
      factionKnows(
        failure.run!.world,
        "county-reeves",
        "gave-use-name-to-burial-crews",
      ),
    ).toBe(true);
    expect(failure.run?.world.pressures.countyNotice).toBe(1);
  });

  it("turns a failed physical crossing into a wound, not flavor-only strain", () => {
    let failed: GameState | null = null;
    for (let index = 1; index <= 250 && !failed; index += 1) {
      let state = createCharacter(
        "Mara Vale",
        "medium",
        "female",
        index * 104_729,
      ).state;
      state = chooseStoryChoice(state, "burial-cut").state;
      state = chooseStoryChoice(state, "shoulder-bier").state;
      if (
        state.run?.flags.includes(
          "burial-cut-result:shoulder-bier:failure",
        )
      ) {
        failed = state;
      }
    }

    expect(failed).not.toBeNull();
    expect(allWounds(failed!.run!.player)).toEqual([
      expect.objectContaining({
        label: "Strained ribs",
        severity: "minor",
        care: "rest",
      }),
    ]);
  });

  it("carries the crew's preparation through the tollhouse into the vault", () => {
    let state = useNameAttempt("success");
    state = chooseStoryChoice(state, "leave-burial-cut").state;
    expect(state.storyId).toBe("hollow-tollhouse");

    const advancement = chooseAdvancement(
      state,
      "two-way-passage",
    );
    expect(advancement.error).toBeUndefined();
    state = advancement.state;
    expect(
      STORY_SCENES["hollow-tollhouse"]
        .paragraphs(state.run!)
        .join(" "),
    ).toContain("burial crew’s lower road");

    const descended = chooseStoryChoice(state, "descend-now");
    expect(descended.error).toBeUndefined();
    state = descended.state;
    const opened = chooseStoryChoice(state, "warded-descent");
    expect(opened.error).toBeUndefined();
    state = opened.state;
    expect(state.screen).toBe("battle");
    expect(state.run?.player.ward).toBe(9);
    expect(state.run?.battle?.log[0]?.text).toContain(
      "burial crew’s stamped tally",
    );
  });

  it("lets reeves act on a use-name that reached their road book", () => {
    const state = useNameAttempt("failure");
    state.run!.wakeVariant = "reeve-patrol";

    const paragraphs =
      STORY_SCENES["black-mile-wake"].paragraphs(state.run!);
    expect(paragraphs.join(" ")).toContain(
      "Mara Vale exactly as the burial clerk wrote it",
    );
  });
});
