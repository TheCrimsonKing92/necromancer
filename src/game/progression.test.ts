import { describe, expect, it } from "vitest";
import {
  experienceForLevel,
  levelForExperience,
  romanLevel,
} from "./progression";

describe("progression thresholds", () => {
  it("widens the experience step with each level", () => {
    expect(experienceForLevel(1)).toBe(0);
    expect(experienceForLevel(2)).toBe(25);
    expect(experienceForLevel(3)).toBe(60);
    expect(experienceForLevel(4)).toBe(105);
  });

  it("derives levels at exact threshold boundaries", () => {
    expect(levelForExperience(24)).toBe(1);
    expect(levelForExperience(25)).toBe(2);
    expect(levelForExperience(59)).toBe(2);
    expect(levelForExperience(60)).toBe(3);
  });

  it("formats dossier seals beyond the opening level", () => {
    expect(romanLevel(1)).toBe("I");
    expect(romanLevel(2)).toBe("II");
    expect(romanLevel(14)).toBe("XIV");
  });
});
