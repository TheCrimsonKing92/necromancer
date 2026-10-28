import { describe, expect, it } from "vitest";
import {
  convalesceWounds,
  createWound,
  getBodyPartLabel,
  getWoundCare,
  getWoundLabel,
  pickBodyPart,
} from "./anatomy";
import { createCharacter } from "./engine";

describe("anatomy profiles", () => {
  it("maps quadruped limb slots to legs and paws, never arms or hands", () => {
    const labels = new Set<string>();

    for (let roll = 1; roll <= 100; roll += 1) {
      const part = pickBodyPart(roll, "quadruped");
      labels.add(getBodyPartLabel(part, "quadruped"));
      labels.add(getWoundLabel(part, "minor", "quadruped"));
      labels.add(getWoundLabel(part, "serious", "quadruped"));
      labels.add(getWoundLabel(part, "grievous", "quadruped"));
    }

    const copy = [...labels].join(" ");
    expect(copy).toContain("forepaw");
    expect(copy).toContain("hind leg");
    expect(copy).not.toMatch(/\barm\b|\bhand\b/i);
  });

  it("requires rest for closed head trauma instead of treating it as bleeding", () => {
    const concussion = createWound(
      "concussion",
      "head",
      "serious",
      "a baton",
    );

    expect(concussion).toMatchObject({
      label: "Concussion",
      care: "rest",
      bleed: 0,
    });
    expect(getWoundCare("head", "serious")).toBe("rest");
  });

  it("heals closed trauma without turning it into a tissue scar", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    const player = state.run!.player;
    const bruise = createWound(
      "bruise",
      "rightLeg",
      "minor",
      "a cudgel",
      undefined,
      "humanoid",
      undefined,
      "impact",
    );
    bruise.treated = true;
    player.body.rightLeg.wounds.push(bruise);
    const maximumBefore = player.body.rightLeg.maxCondition;

    const result = convalesceWounds(player);

    expect(result.healed).toEqual(["Bruised right leg"]);
    expect(result.scars).toEqual([]);
    expect(player.body.rightLeg.wounds).toEqual([]);
    expect(player.body.rightLeg.maxCondition).toBe(maximumBefore);
    expect(player.scars).toEqual([]);
  });

  it("keeps grave salt injuries distinct from blunt trauma", () => {
    const saltBurn = createWound(
      "salt-burn",
      "torso",
      "serious",
      "Grave Salt",
      undefined,
      "humanoid",
      undefined,
      "grave-salt",
    );
    const bluntTrauma = createWound(
      "blunt-trauma",
      "torso",
      "serious",
      "a bone crozier",
      undefined,
      "humanoid",
      undefined,
      "impact",
    );

    expect(saltBurn).toMatchObject({
      label: "Desiccated torso",
      bleed: 0,
      care: "binding",
    });
    expect(saltBurn.label).not.toMatch(/rib|bruise|fracture/i);
    expect(bluntTrauma).toMatchObject({
      label: "Cracked ribs",
      bleed: 0,
      care: "rest",
    });
  });

  it("describes incorporeal anatomy as a manifestation, not flesh", () => {
    const part = pickBodyPart(40, "manifestation");

    expect(getBodyPartLabel(part, "manifestation")).toBe("Core");
    expect(
      getWoundLabel(part, "serious", "manifestation"),
    ).toBe("Riven core");
    expect(
      getWoundLabel("leftArm", "grievous", "manifestation"),
    ).toBe("Dissolving left reach");
    expect(
      getWoundLabel("leftArm", "grievous", "manifestation"),
    ).not.toMatch(/unmade|severed/i);
  });
});
