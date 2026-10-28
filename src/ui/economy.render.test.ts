import { beforeAll, describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  createCharacter,
  openInventory,
} from "../game/engine";
import { renderApp } from "./render";
import { ensureOptionalScreenSurface } from "./optional-screen-loader";

beforeAll(() => ensureOptionalScreenSurface());

describe("exchange presentation", () => {
  it("keeps Iven's result and exit copy consistent after the salt sale", () => {
    const state = createCharacter("Mara Vale", "thaumaturgist", 42).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "hedge-surgeon";
    state.run!.player.inventory["grave-salt"] = 1;

    const offered = renderApp(state, { hasSave: false });
    expect(offered).toContain("Offer Iven a measure of grave salt");

    const sold = chooseStoryChoice(
      state,
      "sell-grave-salt-to-iven",
    ).state;
    const markup = renderApp(sold, { hasSave: false });
    expect(markup).toContain("Three black obols cross the cloth.");
    expect(markup).toContain("Take your leave of Iven");
    expect(markup).toContain(
      "Leave Iven with the sealed salt and take up the road again.",
    );
    expect(markup).not.toContain("Keep your relics");
  });

  it("shows selective demand, barter, limited stock, and services", () => {
    const story = createCharacter("Mara Vale", "medium", 42).state;
    story.storyId = "saint-orra-aftermath";
    story.run!.battlesWon = 2;
    story.run!.player.inventory["hooked-knife"] = 1;
    const state = openInventory(story).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("Sell · 6 obols");
    expect(markup).toContain("No offer");
    expect(markup).toContain("Trade · 1 Ossuary ichor");
    expect(markup).toContain("Close a graveglass ward");
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('decoding="async"');
    expect(markup).toContain('class="pack-item is-singular"');
    expect(markup).toContain("Singular · Hollis Vane · tollhouse reeve");
  });

  it("keeps an equipped singular spoil visibly distinct", () => {
    const story = createCharacter("Mara Vale", "medium", 42).state;
    story.run!.player.equipment.mainHand = "orra-crozier";
    const state = openInventory(story).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("equipment-slot is-filled is-singular");
    expect(markup).toContain("Singular · Saint Orra · counting room");
    expect(markup).toContain("Singular item. Provenance: Saint Orra · counting room");
  });
});
