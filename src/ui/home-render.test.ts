import { describe, expect, it } from "vitest";
import { renderHome } from "./home-render";

describe("campaign-safe title actions", () => {
  it("starts a first testament only when no campaign is saved", () => {
    const markup = renderHome({ hasSave: false });

    expect(markup).toContain('data-action="start-new"');
    expect(markup).not.toContain('data-action="continue"');
    expect(markup).not.toContain('data-action="open-chronicle"');
  });

  it("never presents new-character creation as an implicit campaign reset", () => {
    const markup = renderHome({ hasSave: true });

    expect(markup).toContain('data-action="continue"');
    expect(markup).toContain('data-action="open-chronicle"');
    expect(markup).toContain('data-action="delete-save"');
    expect(markup).toContain("Reset campaign");
    expect(markup).not.toContain('data-action="start-new"');
  });

  it("keeps all tactical development proofs explicit and non-production", () => {
    const markup = renderHome({ hasSave: false, developmentTools: true });

    expect(markup).toContain('data-action="start-fire-road-prototype"');
    expect(markup).toContain('data-prototype-id="siege-sovereign"');
    expect(markup).toContain('data-prototype-id="interdict"');
    expect(markup).toContain('data-prototype-id="fire-road-under-ash"');
    expect(markup).toContain('class="prototype-launcher__comparison"');
    expect(markup).toContain('aria-labelledby="prototype-comparison-title"');
    expect(renderHome({ hasSave: false, developmentTools: false }))
      .not.toContain("start-tactical-prototype");
  });
});
