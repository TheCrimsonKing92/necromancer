import { describe, expect, it } from "vitest";
import { chooseStoryChoice } from "../game/engine";
import { bonebinderStateFor } from "../game/practices/bonebinder/practice-state";
import { createPlayableCharacter } from "./character-creation-transition";

describe("playable practice creation", () => {
  it("starts a Bonebinder with Ditch-Hand and deploys the servant into battle", async () => {
    let state = (await createPlayableCharacter(
      "Mara Vale",
      "summoner",
      "female",
    )).state;

    expect(state.run?.player.title).toBe("Bonebinder");
    expect(bonebinderStateFor(state.run!)?.servant?.identity.useName).toBe(
      "Ditch-Hand",
    );

    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;

    expect(
      state.run?.battle?.allies.some(
        (ally) =>
          ally.lifetime.kind === "persistent" &&
          ally.lifetime.servantId === "servant:ditch-hand",
      ),
    ).toBe(true);
    expect(
      state.run?.battle?.log.some((entry) =>
        entry.text.includes("Ditch-Hand takes its place in the line"),
      ),
    ).toBe(true);
  });

  it("does not attach a corporeal servant to other traditions", async () => {
    const state = (await createPlayableCharacter(
      "Mara Vale",
      "medium",
      "female",
    )).state;

    expect(state.run?.practiceStates?.bonebinder).toBeUndefined();
  });

  it("admits Grave Warden content before returning a playable run", async () => {
    const state = (await createPlayableCharacter(
      "Mara Vale",
      "grave-warden",
      "female",
    )).state;

    expect(state.run?.player).toMatchObject({
      title: "Grave Warden",
      tradition: "grave-warden",
    });
    expect(state.run?.practiceStates?.graveWarden).toEqual({
      version: 1,
      sealCapacity: 2,
    });
    expect(state.run?.practiceStates?.bonebinder).toBeUndefined();
  });
});
