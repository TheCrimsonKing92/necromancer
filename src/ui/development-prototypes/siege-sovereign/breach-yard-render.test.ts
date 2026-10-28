import { describe, expect, it } from "vitest";
import { SIEGE_SOVEREIGN_BREACH_YARD } from "../../../game/development-prototypes/siege-sovereign/breach-yard";
import { renderSiegeSovereignBreachYard } from "./breach-yard-render";

describe("Siege Sovereign breach-yard renderer", () => {
  it("keeps the world first and reveals scene work through represented subjects", () => {
    const state = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const markup = renderSiegeSovereignBreachYard(SIEGE_SOVEREIGN_BREACH_YARD.project(state));
    expect(markup).toContain('aria-label="Positions in the breach yard"');
    expect(markup).toContain('/assets/scenes/siege-breach-yard-v2.jpg');
    expect(markup).toContain('/assets/scenes/siege-breach-yard-mobile-v2.jpg');
    expect(markup).toContain("action-stage__figure-art--necromancer");
    expect(markup).toContain("action-stage__figure-art--halwen");
    expect(markup).toContain('data-action="move-action-proof"');
    expect(markup).toContain('data-destination-id="broken-arch"');
    expect(markup).toContain('data-move-label="Broken arch · 1 exchange"');
    expect(markup).toContain('aria-label="Go to Broken arch. One exchange."');
    expect(markup).toContain("action-stage__move--zone");
    expect(markup).toContain('data-action="act-action-proof"');
    expect(markup).toContain('data-action="select-action-proof-subject"');
    expect(markup).toContain('data-action-proof-subject-id="corpse"');
    expect(markup).toContain('data-action-proof-subject-panel="corpse"');
    expect(markup).toContain('class="breach-yard__abilities"');
    expect(markup).toContain("closing on the shoring");
    expect(markup).toContain("Halwen Sar");
    expect(markup).toContain("Direct Ditch-Hand");
    expect(markup).not.toContain('class="action-stage__commands"');
    expect(markup).not.toContain("Act where you stand");
    expect(markup).not.toContain("What they will do");
    expect(markup).not.toContain("Raise the fallen scout");
    expect(markup).not.toContain("canvas");
  });

  it("renders distinct target controls and Health meters for a multi-target strike", () => {
    const initial = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const state = {
      ...initial,
      playerPosition: "broken-arch" as const,
      enemies: initial.enemies.map((enemy) => ({ ...enemy, position: "shoring-line" as const })),
    };
    const markup = renderSiegeSovereignBreachYard(SIEGE_SOVEREIGN_BREACH_YARD.project(state));
    expect(markup.match(/data-action="select-action-proof-target"\s+data-action-proof-id="strike"/g)).toHaveLength(2);
    expect(markup).toContain('data-target-id="coalition-cutter"');
    expect(markup).toContain('data-target-id="coalition-bow"');
    expect(markup.match(/action-stage__health--persistent/g)).toHaveLength(2);
    expect(markup.match(/action-stage__health--disclosure/g)).toHaveLength(3);
    expect(markup).toContain('aria-label="Examine Toman Rusk. Toman Rusk, 6 of 6 Health"');
  });

  it("uses a spaced formation and a standing manifestation when allies share ground", () => {
    const initial = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    const state = {
      ...initial,
      servantPosition: "timber-stack" as const,
      shadePosition: "timber-stack" as const,
      shadeRounds: 3,
      masonPosition: "timber-stack" as const,
    };
    const markup = renderSiegeSovereignBreachYard(SIEGE_SOVEREIGN_BREACH_YARD.project(state));
    expect(markup).toContain("--figure-spacing:8.4rem");
    expect(markup).toContain("action-stage__figure-art--cutter");
    expect(markup).toContain('data-visual-rig-id="manifestation"');
  });

  it("shows local capability, qualitative prospect, time, cost, and known risk only after reaching the corpse", () => {
    let state = SIEGE_SOVEREIGN_BREACH_YARD.createState();
    state = SIEGE_SOVEREIGN_BREACH_YARD.step(state, { kind: "move", destinationId: "timber-stack" }).state;
    const markup = renderSiegeSovereignBreachYard(SIEGE_SOVEREIGN_BREACH_YARD.project(state));
    expect(markup).toContain("Raise the fallen scout");
    expect(markup).toContain("Bonebinding · Willpower");
    expect(markup).toContain("Prospect");
    expect(markup).toContain("Assured");
    expect(markup).toContain("2 Spirit");
    expect(markup).toContain("The cutters act while the scout rises.");
    expect(markup).not.toContain("% chance");
  });
});
