import { describe, expect, it } from "vitest";
import { actInFireRoad, createFireRoadActionState } from "../../../game/development-prototypes/fire-road/road-under-ash";
import { renderFireRoadUnderAsh } from "./road-under-ash-render";

describe("Fire Road direct-action renderer", () => {
  it("presents the world, movement, and a compact character bar without publishing every scene course", () => {
    const markup = renderFireRoadUnderAsh(createFireRoadActionState());
    expect(markup).toContain('/assets/scenes/fire-road-navigation-v4.webp');
    expect(markup).toContain('/assets/scenes/fire-road-navigation-mobile-v4.webp');
    expect(markup).toContain('/assets/scenes/fire-road-wreck-v1-768.png');
    expect(markup).toContain('aria-label="Examine the broken grain wagon. 3 measures of wreckage remain."');
    expect(markup).toContain("action-stage__figure-art--necromancer");
    expect(markup).toContain("action-stage__figure-art--ditch-hand");
    expect(markup).toContain('data-action="move-action-proof"');
    expect(markup).toContain('data-move-label="the yard lane · 1 exchange"');
    expect(markup).toContain('aria-label="Walk to the yard lane. 1 exchange."');
    expect(markup).toContain("action-stage__move--zone");
    expect(markup).toContain('class="road-under-ash__abilities"');
    expect(markup).toContain('data-action="select-action-proof-subject"');
    expect(markup).toContain('data-action-proof-subject-panel="broken-wagon"');
    expect(markup).toContain('data-action-proof-id="direct-ditch-hand"');
    expect(markup).toContain('data-resolved-action-id="order:brace"');
    expect(markup).toContain('data-resolved-action-id="order:harry"');
    expect(markup).not.toContain('class="action-stage__commands"');
    expect(markup).not.toContain('class="action-stage__command-detail"');
    expect(markup).not.toContain("Put the road-dead to work");
    expect(markup).not.toContain("Choose one act");
  });

  it("projects authoritative positions and consequences after a move", () => {
    const moved = actInFireRoad(createFireRoadActionState(), "move:bridge-approach").state;
    const markup = renderFireRoadUnderAsh(moved);
    expect(markup).toContain(">R1<");
    expect(markup).toContain("--stage-x:44%;--stage-y:66%;--stage-mobile-x:47%;--stage-mobile-y:60%");
    expect(markup).toContain("The ash hound is hunting the nearest living body");
  });

  it("removes the represented wreck when the lane has been cleared", () => {
    const state = { ...createFireRoadActionState(), obstruction: 0 };
    const markup = renderFireRoadUnderAsh(state);
    expect(markup).not.toContain("fire-road-wreck-v1-768.png");
    expect(markup).not.toContain("Bridge shoulder");
  });

  it("keeps unavailable world courses out of the contextual controls", () => {
    const markup = renderFireRoadUnderAsh(createFireRoadActionState());
    expect(markup).toContain('data-action-proof-subject-panel="road-dead"');
    expect(markup).toContain("Stand beside the dead carter.");
    expect(markup).not.toMatch(/road-under-ash__context-action[\s\S]*?data-action-proof-id="raise-road-dead"/);
  });

  it("reveals a local course on the represented subject only when its condition is met", () => {
    const state = { ...createFireRoadActionState(), player: "carter-side" as const };
    const markup = renderFireRoadUnderAsh(state);
    expect(markup).toContain('data-action-proof-subject-panel="road-dead"');
    expect(markup).toContain('data-action-proof-id="raise-road-dead"');
    expect(markup).toContain("Put the road-dead to work");
  });

  it("separates a combat act from its represented target and keeps enemy Health visible", () => {
    const state = { ...createFireRoadActionState(), player: "brush-edge" as const };
    const markup = renderFireRoadUnderAsh(state);
    expect(markup).toContain('data-action="select-action-proof"');
    expect(markup).toContain('data-action="select-action-proof-target"');
    expect(markup).toContain('data-target-id="hound"');
    expect(markup).toContain('role="meter"');
    expect(markup).toContain('aria-label="Ash hound Health"');
  });

  it("makes the proof's wider campaign consequences explicit at deliberate departure", () => {
    const rescued = {
      ...createFireRoadActionState(),
      hound: null,
      houndHealth: 0,
      households: "safety-road" as const,
      sera: "safety-road" as const,
      householdsRemaining: 0,
      householdsSafe: 6,
      grainSaved: 2,
      grainBurned: 1,
      hostCollarRecovered: true,
      playerWounds: ["hound-bite" as const],
    };
    const ended = actInFireRoad(rescued, "depart").state;
    const markup = renderFireRoadUnderAsh(ended);
    expect(markup).toContain("WHAT A TESTAMENT WOULD KEEP");
    expect(markup).toContain("Sera Vale saw you bring every household through");
    expect(markup).toContain("settlements face a winter shortage");
    expect(markup).toContain("quartermaster&#039;s sign");
    expect(markup).toContain("ash-hound bite");
  });
});
