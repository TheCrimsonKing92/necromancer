import { beforeAll, describe, expect, it } from "vitest";
import {
  createCharacter,
  openInventory,
} from "../game/engine";
import { renderApp } from "./render";
import { ensureOptionalScreenSurface } from "./optional-screen-loader";

beforeAll(() => ensureOptionalScreenSurface());

describe("inventory item visuals", () => {
  it("renders accessible object studies for equipped and packed items", () => {
    let state = createCharacter(
      "Mara Vale",
      "medium",
      "female",
      42,
    ).state;
    state = openInventory(state).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("item-visual--equipment");
    expect(markup).toContain("item-visual--pack");
    expect(markup).toContain(
      'alt="A narrow iron ritual knife with an old bone grip."',
    );
    expect(markup).toContain(
      "/assets/items/individual/linen-binding.webp",
    );
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('decoding="async"');
    expect(markup).not.toContain("background-image:");
    expect(markup).toContain(
      'data-action="inventory-to-journal"',
    );
  });
});
