import { describe, expect, it } from "vitest";
import { SIEGE_SOVEREIGN_FAILING_CONDUIT } from "../../../game/development-prototypes/siege-sovereign/failing-conduit";
import { renderSiegeSovereignFailingConduit } from "./failing-conduit-render";

describe("Siege Sovereign failing-conduit renderer", () => {
  it("offers semantic subject and action controls over a fixed isometric stage", () => {
    const projection = SIEGE_SOVEREIGN_FAILING_CONDUIT.project(
      SIEGE_SOVEREIGN_FAILING_CONDUIT.createState(),
    );
    const markup = renderSiegeSovereignFailingConduit(projection, "broken-span");

    expect(markup).toContain('aria-label="Scene subjects in reading order"');
    expect(markup).toContain('data-tactical-subject-id="broken-span"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('data-tactical-action-id="trace-load"');
    expect(markup).toContain("Stone above the roofs. An army on the road.");
    expect(markup).toContain("The Siege Sovereign");
    expect(markup).toContain("We will speak of the road before I kneel");
    expect(markup).not.toContain("Placement expresses authored relation");
    expect(markup).not.toContain("Keep the access arch intact");
  });

  it("renders authoritative aftermath and keeps noncombat terms visible", () => {
    let state = SIEGE_SOVEREIGN_FAILING_CONDUIT.createState();
    for (const actionId of ["trace-load", "clear-houses", "raise-shoring", "find-watchers", "hear-terms", "counter-neutral", "warn-sovereign", "finish-brace"]) {
      const result = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(state, actionId);
      if (result.error) throw new Error(result.error);
      state = result.state;
    }
    const markup = renderSiegeSovereignFailingConduit(
      SIEGE_SOVEREIGN_FAILING_CONDUIT.project(state),
      "campaign-marshal",
    );

    expect(markup).toContain("Water runs through the chosen cost.");
    expect(markup).toContain("One-day passage witnessed");
    expect(markup).toContain("THE CUT IS FINISHED");
    expect(markup).toContain("Water survives under the witnessed one-day term.");
    expect(markup).not.toContain("canvas");
  });

  it("features an action outcome where it was taken and keeps a durable ledger", () => {
    let state = SIEGE_SOVEREIGN_FAILING_CONDUIT.createState();
    state = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(state, "trace-load").state;
    state = SIEGE_SOVEREIGN_FAILING_CONDUIT.act(state, "confront-reeve").state;

    const atReeve = renderSiegeSovereignFailingConduit(
      SIEGE_SOVEREIGN_FAILING_CONDUIT.project(state),
      "water-reeve",
    );
    expect(atReeve).toContain("siege-conduit__featured-event");
    expect(atReeve).toContain("Maelin&#039;s own seal lies beneath the warning.");
    expect(atReeve).toContain("What the town now remembers");

    const elsewhere = renderSiegeSovereignFailingConduit(
      SIEGE_SOVEREIGN_FAILING_CONDUIT.project(state),
      "broken-span",
    );
    expect(elsewhere).not.toContain("siege-conduit__featured-event");
    expect(elsewhere).toContain("What the town now remembers");
  });
});
