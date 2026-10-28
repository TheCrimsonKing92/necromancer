import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "../game/engine";
import type { GameState } from "../game/types";
import { resolveEphemeralJourneyState } from "./ephemeral-journey-app-action";

const origin = (action: string, tradition?: string): HTMLElement =>
  ({ dataset: { action, tradition } }) as unknown as HTMLElement;

describe("ephemeral journey app actions", () => {
  it("restarts a completed proof with its current practice", async () => {
    const state = createInitialState();
    state.run = { player: { tradition: "summoner" } } as GameState["run"];
    const fresh = createInitialState();
    const start = vi.fn(async () => fresh);

    const result = await resolveEphemeralJourneyState(
      state,
      origin("restart-development-proof"),
      { isComplete: () => true, start },
    );

    expect(result).toBe(fresh);
    expect(start).toHaveBeenCalledWith("summoner");
  });

  it("starts another selected practice from the in-app proof selector", async () => {
    const fresh = createInitialState();
    const start = vi.fn(async () => fresh);

    const result = await resolveEphemeralJourneyState(
      createInitialState(),
      origin("start-fire-road-prototype", "grave-warden"),
      { isComplete: () => false, start },
    );

    expect(result).toBe(fresh);
    expect(start).toHaveBeenCalledWith("grave-warden");
  });
});
