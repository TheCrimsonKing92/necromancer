import { describe, expect, it } from "vitest";
import { defeatTransitionSegment } from "./combat-witness";
import type { Combatant } from "./types";

describe("combat defeat presentation", () => {
  it("names a destroyed head instead of folding around a generic ruin", () => {
    const target = {
      id: "reliquary-poacher",
      name: "Nim Bale",
      title: "Reliquary poacher",
      kind: "enemy",
      anatomy: "humanoid",
      materiality: "corporeal",
    } as Combatant;

    const segment = defeatTransitionSegment(
      target,
      "vital-region",
      "head",
      "Head",
      "Fractured skull",
    );

    expect(segment.text).toContain("Nim Bale’s head is destroyed");
    expect(segment.text).toContain("falls");
    expect(segment.text).not.toContain("folds around");
  });
});
