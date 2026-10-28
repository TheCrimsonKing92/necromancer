import { describe, expect, it } from "vitest";
import { ITEMS } from "./items";
import { ITEM_VISUALS } from "./item-visuals";
import type { ItemId } from "./types";

describe("item visuals", () => {
  it("covers every item with a right-sized image and description", () => {
    expect(Object.keys(ITEM_VISUALS).sort()).toEqual(
      Object.keys(ITEMS).sort(),
    );

    for (const itemId of Object.keys(ITEMS) as ItemId[]) {
      const visual = ITEM_VISUALS[itemId];
      expect(visual.alt.trim().length).toBeGreaterThan(0);
      expect(visual.src).toBe(`/assets/items/individual/${itemId}.webp`);
      expect(visual.aspectRatio).toMatch(/^\d+ \/ \d+$/u);
    }
  });

  it("keeps unique items visually distinct", () => {
    expect(ITEM_VISUALS["hooked-knife"]).toMatchObject({
      src: "/assets/items/individual/hooked-knife.webp",
    });
    expect(ITEM_VISUALS["hooked-knife"].alt).toContain("split leather");
    expect(ITEM_VISUALS["grave-iron-mask"].src).not.toBe(
      ITEM_VISUALS["hooked-knife"].src,
    );
  });
});
