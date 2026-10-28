import { describe, expect, it } from "vitest";
import { renderActionProofFigure } from "./action-proof-art";

describe("direct-action figure art", () => {
  it("renders stable illustrated cast cells for authored figures", () => {
    const figure = renderActionProofFigure({
      id: "coalition-bow",
      label: "Coalition bow",
      tone: "danger",
    });
    expect(figure).toContain("action-stage__figure-art--bow");
    expect(figure).toContain('aria-label="Coalition bow"');
  });

  it("distinguishes a road carter from the armored siege corpse", () => {
    const figure = renderActionProofFigure({
      id: "road-dead",
      label: "Road-dead carter",
      tone: "neutral",
    });
    expect(figure).toContain("action-stage__figure-art--road-carter");
  });

  it("projects the hound through a non-humanoid rig without changing its accessible name", () => {
    const figure = renderActionProofFigure({
      id: "hound",
      label: "Ash hound",
      detail: "7 Health",
      tone: "danger",
      motionId: "recoil",
      anatomyStates: [{
        anatomyPartId: "leftArm",
        visualId: "condition:left-foreleg-hurt",
      }],
    });
    expect(figure).toContain('aria-label="Ash hound, 7 Health"');
    expect(figure).toContain('data-visual-rig-id="quadruped-hound"');
    expect(figure).toContain('data-visual-pose-id="hound-recoil"');
    expect(figure).toContain('data-motion="recoil"');
    expect(figure).toContain('data-affected-visual-nodes="forequarters left-foreleg left-forepaw"');
    expect(figure).toContain("action-stage__figure-art--hound");
  });

  it("makes a conversable character a native delegated control", () => {
    const figure = renderActionProofFigure({
      id: "sera",
      label: "Sera Vale",
      tone: "ally",
      conversationId: "sera-arrival",
    });
    expect(figure).toContain('<button class="action-stage__figure');
    expect(figure).toContain('data-action="open-action-proof-conversation"');
    expect(figure).toContain('data-action-proof-conversation-id="sera-arrival"');
    expect(figure).toContain('aria-label="Speak with Sera Vale');
  });

  it("makes a represented subject selectable without assigning it a world transition", () => {
    const figure = renderActionProofFigure({
      id: "ditch-hand",
      label: "Ditch-Hand",
      tone: "ally",
      subjectId: "ditch-hand",
    });
    expect(figure).toContain('<button class="action-stage__figure');
    expect(figure).toContain('data-action="select-action-proof-subject"');
    expect(figure).toContain('aria-controls="action-proof-subject-ditch-hand"');
    expect(figure).toContain('aria-expanded="false"');
  });

  it("makes optional ally Health discoverable without leaving another meter on the field", () => {
    const figure = renderActionProofFigure({
      id: "halwen",
      label: "Halwen Sar",
      tone: "ally",
      health: { current: 14, max: 18 },
      healthVisibility: "disclosure",
    });
    expect(figure).toContain('aria-label="Halwen Sar, 14 of 18 Health"');
    expect(figure).toContain('tabindex="0" data-health-disclosure');
    expect(figure).toContain("action-stage__health--disclosure");
    expect(figure).not.toContain("action-stage__health--persistent");
  });
});
