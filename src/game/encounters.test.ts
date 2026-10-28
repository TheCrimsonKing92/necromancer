import { describe, expect, it } from "vitest";
import {
  WAKE_VARIANTS,
  validateWakeVariants,
} from "./encounters";

describe("wake encounter definitions", () => {
  it("keeps every built-in roster and copy package valid", () => {
    expect(validateWakeVariants(WAKE_VARIANTS)).toEqual([]);
  });

  it("separates incorporeal resistance from armor and includes living opposition", () => {
    const enemies = Object.values(WAKE_VARIANTS).flatMap(
      (variant) => variant.enemies,
    );
    const incorporeal = enemies.filter(
      (enemy) => enemy.materiality === "incorporeal",
    );

    expect(incorporeal.length).toBeGreaterThan(0);
    expect(
      incorporeal.every(
        (enemy) =>
          Object.keys(enemy.naturalArmor ?? {}).length === 0 &&
          enemy.anatomy === "manifestation",
      ),
    ).toBe(true);
    expect(
      Object.values(WAKE_VARIANTS).filter(
        (variant) => variant.nature === "mundane",
      ),
    ).toHaveLength(2);
  });

  it("rejects duplicate enemy ownership and empty atmospheric copy", () => {
    const broken = structuredClone(WAKE_VARIANTS);
    broken["name-thieves"].enemies[0]!.id =
      "wake-bell-widow";
    broken["bone-procession"].endingBody = "";

    const errors = validateWakeVariants(broken);

    expect(
      errors.some((error) =>
        error.includes(
          "enemy id wake-bell-widow is already owned",
        ),
      ),
    ).toBe(true);
    expect(errors).toContain(
      "bone-procession: endingBody copy is empty.",
    );
  });
});
