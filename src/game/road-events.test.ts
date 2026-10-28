import { describe, expect, it } from "vitest";
import {
  ROAD_EVENTS,
  validateRoadEvents,
} from "./road-events";

describe("road-event authoring validation", () => {
  it("accepts every built-in road event", () => {
    expect(validateRoadEvents(ROAD_EVENTS)).toEqual([]);
  });

  it("rejects incomplete events without an onward route", () => {
    const mourningCaravan = ROAD_EVENTS["mourning-caravan"];
    const malformed = {
      ...ROAD_EVENTS,
      "mourning-caravan": {
        ...mourningCaravan,
        title: "",
        choices: mourningCaravan.choices.filter(
          (choice) => choice.effect !== "continue-road",
        ),
      },
    };

    expect(validateRoadEvents(malformed)).toEqual(
      expect.arrayContaining([
        "mourning-caravan: presentation copy is incomplete.",
        "mourning-caravan: no onward route is defined.",
      ]),
    );
  });

  it("rejects an event order that references a missing definition", () => {
    const {
      "ditch-burial": omitted,
      ...missingDefinition
    } = ROAD_EVENTS;
    expect(omitted).toBeDefined();

    expect(validateRoadEvents(missingDefinition)).toContain(
      "Road-event order references missing id ditch-burial.",
    );
  });
});
