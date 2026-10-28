import { describe, expect, it } from "vitest";
import { INTERDICT_WINTER_SLUICE_PROTOTYPE } from "../../../game/development-prototypes/interdict/winter-sluice";
import { renderInterdictWinterSluice } from "./winter-sluice-render";

describe("Interdict winter-sluice renderer", () => {
  it("establishes the human request, supernatural conflict, and the Medium's reason for being present", () => {
    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(),
    );
    const markup = renderInterdictWinterSluice(projection);

    expect(markup).toContain("The lower-bank reeve finds you before dawn");
    expect(markup).toContain("the mill&#039;s nails and the iron in the wheel repeat her final words");
    expect(markup).toContain("The last mason to inspect the buried works lies on the burial rise");
    expect(markup).toContain("His field book is kept beside his grave");
    expect(markup).toContain("the reeve has not given up on what the man himself might add");
    expect(markup).toContain("Every link laid after silence will break at noon");
    expect(markup).toContain("Let the miller show where Rill gave herself to the wheel");
    expect(markup.match(/<blockquote>/g)).toHaveLength(2);
    expect(markup).not.toContain("The voice in the white bars");
    expect(markup).not.toContain("hidden crack runs below");
  });

  it("uses one ordered semantic subject set as the positioned isometric board", () => {
    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(),
    );
    const markup = renderInterdictWinterSluice(projection, "old-sluice");

    expect(markup).toContain('role="group" aria-label="Winter sluice scene subjects"');
    expect(markup).toContain('class="interdict-sluice__board-viewport" tabindex="0"');
    expect(markup).toContain("Swipe to survey the full scene");
    expect(markup).toContain("fixed isometric field");
    expect(markup).toContain('data-tactical-subject-id="old-sluice"');
    expect(markup).toMatch(/data-tactical-subject-id="old-sluice"[\s\S]*?aria-pressed="true"/);
    expect(markup).toContain("A fixed isometric view of a river mill");
    expect(markup).toContain("positions express authored relations, not range");
    expect(markup.match(/data-tactical-subject-id=/g)).toHaveLength(projection.subjects.length);
  });

  it("does not offer the deeper sluice inspection before the mason's measure is recovered", () => {
    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(),
    );
    const markup = renderInterdictWinterSluice(projection, "old-sluice");

    expect(markup).not.toContain("Test the mason&#039;s measure");
    expect(markup).toContain("Raise the timber shoring");
    expect(markup).toContain("The mill&#039;s timber and carts are still withheld.");
    expect(markup).toContain('data-tactical-action-id="raise-timber-shoring"');
    expect(markup).toContain('data-activation-kind="prototype-transition"');
    expect(markup).toMatch(/data-tactical-action-id="raise-timber-shoring"[\s\S]*?disabled aria-describedby=/);

    const burial = renderInterdictWinterSluice(projection, "burial-ground");
    expect(burial).toContain("Recover the mason&#039;s measure");
    expect(burial).toContain("Ordinary investigation");
    expect(burial).not.toContain("Admit the dead inspector");

    const recovered = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(),
      "recover-mason-record",
    ).state;
    const informed = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(recovered),
      "old-sluice",
    );
    expect(informed).toContain("Test the mason&#039;s measure");
    expect(informed).toContain("Field evidence");
  });

  it("lets the miller answer before presenting only presently known courses", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    const closed = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state),
      "miller",
    );

    expect(closed).toContain("Confront the miller over his yard");
    expect(closed).not.toContain("Pay his price");

    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(
      state,
      "open-miller-exchange",
    ).state;
    const opened = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state),
      "miller",
    );

    expect(opened).toContain("The miller keeps his keys in hand.");
    expect(opened).toContain("If the town wants my winter stores spent on it");
    expect(opened).toContain("Pay his price");
    expect(opened).not.toContain("Stand witness to the flood right");
    expect(opened).not.toContain("Put his refusal before witnesses");
    expect(opened).not.toContain("Answer him with the proved crack");
    expect(opened).not.toContain("The deepest crack has not been proved");
    expect(opened).not.toContain(">negotiate<");

    const title = opened.indexOf("Pay his price");
    const method = opened.indexOf("Fixed exchange");
    const prospect = opened.indexOf("Assured", method);
    const cost = opened.indexOf('data-course-cost-kind="resource"');
    expect(title).toBeGreaterThan(-1);
    expect(method).toBeGreaterThan(title);
    expect(prospect).toBeGreaterThan(method);
    expect(cost).toBeGreaterThan(prospect);
    expect(opened).toContain("6 obols");
    expect(opened).toContain("8 ready");
    expect(opened).not.toContain('data-course-consequence-kind="obligation"');

    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(),
      "recover-mason-record",
    ).state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(
      state,
      "inspect-old-stone",
    ).state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(
      state,
      "open-miller-exchange",
    ).state;
    const informed = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state),
      "miller",
    );
    expect(informed).toContain("Put his refusal before witnesses");
    expect(informed).toContain("Public evidence");
    expect(informed).not.toContain("Requires public proof");
  });

  it("features the chosen mill-yard outcome before retaining it in the ledger", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "open-miller-exchange").state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "buy-mill-stores").state;
    const markup = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state),
      "miller",
    );

    expect(markup).toContain("interdict-sluice__featured-outcome");
    expect(markup).toContain("The yard gate opens on paid terms.");
    expect(markup).toContain("The miller weighs each obol twice.");
    expect(markup).toContain("6 obols spent · timber, carts, foreman, and mill crews retained");
    expect(markup).toContain("What the scene now remembers");

    const elsewhere = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state),
      "river-presence",
    );
    expect(elsewhere).not.toContain("interdict-sluice__featured-outcome");
  });

  it("keeps the practice-specific limit and causal field available in text", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "recover-mason-record").state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "inspect-old-stone").state;
    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state);
    const markup = renderInterdictWinterSluice(projection, "burial-ground");

    expect(markup).toContain("Admit the dead inspector");
    expect(markup).toContain("Admit the dead mason, not the living wight");
    expect(markup).toContain("What reaches what");
    expect(markup).toContain("Rill chained to the wheel");
    expect(markup).toContain("Water reaches the lower bank first");
    expect(markup).toContain("White frame fixed to the mill");
    expect(markup).not.toContain("field-severer → aspect-instrument");
  });

  it("marks the mill yard generically when proof exposes new choices there", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "recover-mason-record").state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "inspect-old-stone").state;
    expect(state.waterRead).toBe(false);
    const markup = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state),
      "old-sluice",
    );

    expect(markup).toContain("Deep failure proved");
    expect(markup).toContain('data-tactical-attention="new-courses"');
    expect(markup).toContain('class="tactical-subject-attention"');
    expect(markup).toContain("New choices are available here.");
    expect(markup).not.toContain("Flood right ready");

    const inspected = renderInterdictWinterSluice(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state),
      "miller",
      new Set(["miller:proved-wall"]),
    );
    expect(inspected).not.toContain('data-tactical-attention="new-courses"');
    expect(inspected).not.toContain("New choices are available here.");
  });

  it("states plainly that burial work moves remains rather than a row of graves", () => {
    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(
      INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(),
    );
    const markup = renderInterdictWinterSluice(projection, "burial-ground");

    expect(markup).toContain("Move the threatened remains");
    expect(markup).toContain("exhume the remains in the lowest row");
    expect(markup).toContain("burial ground itself will remain exposed");
    expect(markup).not.toContain("carry the exposed row");
  });

  it("renders settled authoritative state without obsolete actions", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "recover-mason-record").state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "inspect-old-stone").state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "evacuate-lower-bank").state;
    state = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, "assume-two-day-delay").state;
    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state);
    const markup = renderInterdictWinterSluice(projection, "old-sluice");

    expect(markup).toContain("The winter water takes its course.");
    expect(markup).toContain("Rill-of-Reeds is free");
    expect(markup).toContain('data-visual-state="failed"');
    expect(markup).toContain('data-visual-state="withholding"');
    expect(markup).toContain("No obsolete preparation remains actionable.");
    expect(markup).not.toContain("data-tactical-action-id=");
    expect(markup).toContain("TWO DAYS BORROWED");
    expect(markup).toContain("Sluice failed · 8 households displaced");
    expect(markup).not.toContain("interdict-sluice__introduction");
  });
});
