import { describe, expect, it } from "vitest";
import { renderChronicle } from "./chronicle-render";

describe("Chronicle rendering", () => {
  it("identifies the record as player knowledge and exposes a keyboard control", () => {
    const markup = renderChronicle({
      campaignId: "campaign-one",
      hasActiveTestament: false,
      testaments: [
        {
          testamentId: "testament-one",
          ordinal: 1,
          useName: "Mara",
          tradition: "medium",
          practiceName: "Medium",
          endReason: "death",
          level: 2,
          experience: 25,
          battlesWon: 1,
          finalHealth: 0,
          maximumHealth: 28,
          hasSuccessor: false,
        },
      ],
    });

    expect(markup).toContain("data-page-title tabindex=\"-1\"");
    expect(markup).toContain("data-action=\"close-chronicle\"");
    expect(markup).toContain("Previous testaments are recorded here for you");
    expect(markup).toContain("Mara");
    expect(markup).not.toContain("Journal entry");
  });
});
