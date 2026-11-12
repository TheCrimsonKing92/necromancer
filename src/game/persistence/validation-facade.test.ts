import { describe, expect, it } from "vitest";
import { isRecord, isWorldFact } from "./validation";
import { isRecord as primitiveIsRecord } from "./validation-primitives";
import {
  isWorldFact as worldIsWorldFact,
  isWorldState,
} from "./world-validation";

const validWorldState = {
  pressures: { escapedNames: 0, countyNotice: 0 },
  standing: {},
  facts: ["hollis-vane-dead"],
  knowledge: {
    "county-reeves": [],
    "burial-crews": [],
    "reliquary-brokers": [],
    "north-road-households": [],
  },
};

describe("persistence validation facade", () => {
  it("re-exports the originating isWorldFact function", () => {
    expect(isWorldFact).toBe(worldIsWorldFact);
  });

  it("re-exports the originating isRecord function", () => {
    expect(isRecord).toBe(primitiveIsRecord);
  });

  it("isWorldState accepts a hand-written valid world state", () => {
    expect(isWorldState(validWorldState)).toBe(true);
  });

  it("isWorldState rejects an unknown fact identifier", () => {
    expect(
      isWorldState({ ...validWorldState, facts: ["not-a-world-fact"] }),
    ).toBe(false);
  });
});
