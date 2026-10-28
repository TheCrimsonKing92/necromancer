import { describe, expect, it } from "vitest";
import { nextRandom, normalizeSeed, rollInteger } from "./random";

describe("seeded random helpers", () => {
  it("normalizes zero into a usable unsigned seed", () => {
    expect(normalizeSeed(0)).not.toBe(0);
    expect(normalizeSeed(-1)).toBe(4_294_967_295);
  });

  it("produces a repeatable sequence", () => {
    expect(nextRandom(42)).toEqual(nextRandom(42));
    expect(nextRandom(42)).not.toEqual(nextRandom(43));
  });

  it("rolls inclusive integer ranges", () => {
    let seed = 123;
    const values: number[] = [];

    for (let index = 0; index < 100; index += 1) {
      const result = rollInteger(seed, -1, 1);
      seed = result.seed;
      values.push(result.value);
    }

    expect(Math.min(...values)).toBe(-1);
    expect(Math.max(...values)).toBe(1);
  });
});

