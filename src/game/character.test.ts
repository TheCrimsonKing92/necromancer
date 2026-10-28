import { describe, expect, it } from "vitest";
import {
  braceWardFromAttributes,
  carryCapacityFromAttributes,
  fieldDressingChance,
  fieldDressingRecovery,
  fleeChanceFromAttributes,
  maximumHealthFromAttributes,
  normalizeAttributes,
  normalizeSkills,
  occultPowerFromAttributes,
  skillRankLabel,
} from "./character";
import type {
  CharacterAttributes,
  MundaneSkills,
} from "./types";

const attributes: CharacterAttributes = {
  strength: 3,
  dexterity: 2,
  vitality: 4,
  intelligence: 2,
  willpower: 3,
  charisma: 4,
};

const skills: MundaneSkills = {
  athletics: 0,
  medicine: 0,
  survival: 1,
  perception: 2,
  persuasion: 2,
  barter: 0,
};

describe("character rules", () => {
  it("derives Health, load, escape, and Brace from familiar attributes", () => {
    expect(maximumHealthFromAttributes(attributes)).toBe(28);
    expect(carryCapacityFromAttributes(attributes)).toBe(28);
    expect(fleeChanceFromAttributes(attributes)).toBe(45);
    expect(braceWardFromAttributes(attributes)).toBe(3);
  });

  it("uses the tradition attribute alongside Willpower for occult power", () => {
    expect(occultPowerFromAttributes(attributes, "charisma")).toBe(3);
    expect(
      occultPowerFromAttributes(attributes, "intelligence"),
    ).toBe(2);
  });

  it("lets untrained hands try Medicine while rewarding training", () => {
    expect(fieldDressingChance(attributes, skills, "minor")).toBe(70);
    expect(fieldDressingChance(attributes, skills, "serious")).toBe(60);
    expect(fieldDressingRecovery(skills)).toBe(1);

    const practiced = { ...skills, medicine: 2 };
    expect(
      fieldDressingChance(attributes, practiced, "serious"),
    ).toBe(80);
    expect(fieldDressingRecovery(practiced)).toBe(3);
  });

  it("normalizes persisted values and gives ranks plain labels", () => {
    expect(
      normalizeAttributes(
        { strength: 99, dexterity: -4 },
        attributes,
      ),
    ).toMatchObject({
      strength: 10,
      dexterity: 1,
      vitality: 4,
    });
    expect(
      normalizeSkills(
        { medicine: 99, survival: -2 },
        skills,
      ),
    ).toMatchObject({
      medicine: 5,
      survival: 0,
      perception: 2,
    });
    expect(skillRankLabel(0)).toBe("Untrained");
    expect(skillRankLabel(2)).toBe("Practiced");
  });
});
