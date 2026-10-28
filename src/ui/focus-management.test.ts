import { describe, expect, it } from "vitest";
import { documentTitleFor, focusKeyFor } from "./focus-management";

describe("focus management", () => {
  it("builds stable semantic keys without selectors or DOM identity", () => {
    expect(
      focusKeyFor("choose-story", { choiceId: "listen-at-gate" }),
    ).toEqual({
      action: "choose-story",
      ids: { choiceId: "listen-at-gate" },
    });
    expect(
      focusKeyFor("select-story-approach", {
        approachId: "fixture:assess-orchard",
        approachAxis: "capability",
      }),
    ).toEqual({
      action: "select-story-approach",
      ids: {
        approachId: "fixture:assess-orchard",
        approachAxis: "capability",
      },
    });
  });

  it("keeps the product name in document titles", () => {
    expect(documentTitleFor("Every debt wants a body.")).toBe(
      "Every debt wants a body. · Necromancer",
    );
    expect(documentTitleFor("Necromancer")).toBe("Necromancer");
    expect(documentTitleFor(null)).toBe("Necromancer");
  });
});
