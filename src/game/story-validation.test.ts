import { describe, expect, it } from "vitest";
import { STORY_SCENES } from "./content";
import { createCharacter } from "./engine";
import { initializeDitchHandPractice } from "./practices/bonebinder";
import {
  validateStoryScenes,
  type StoryValidationSample,
} from "./story-validation";
import type {
  RoadEventId,
  StoryScene,
  TraditionId,
  WakeVariantId,
} from "./types";

const ROAD_EVENTS: RoadEventId[] = [
  "mourning-caravan",
  "hedge-surgeon",
  "ditch-burial",
  "disputed-bundle",
];
const WAKE_VARIANTS: WakeVariantId[] = [
  "bell-widow",
  "name-thieves",
  "bone-procession",
  "reliquary-poachers",
  "reeve-patrol",
];

const storySamples = (): StoryValidationSample[] => {
  const traditions: TraditionId[] = [
    "medium",
    "summoner",
    "thaumaturgist",
  ];
  return traditions.flatMap((tradition, traditionIndex) =>
    ROAD_EVENTS.flatMap((roadEvent, eventIndex) => {
      const state = createCharacter(
        `${tradition} sample`,
        tradition,
        100 + traditionIndex * 10 + eventIndex,
      ).state;
      const run = state.run!;
      if (tradition === "summoner") initializeDitchHandPractice(run);
      run.roadEvent = roadEvent;
      run.wakeVariant =
        WAKE_VARIANTS[
          (traditionIndex * ROAD_EVENTS.length + eventIndex) %
            WAKE_VARIANTS.length
        ]!;
      const resolvedRun = structuredClone(run);
      resolvedRun.flags.push(
        "burial-cut-result:read-washout:success",
      );
      return [
        {
          name: `${tradition}/${roadEvent}`,
          run,
        },
        {
          name: `${tradition}/${roadEvent}/resolved-burial-cut`,
          run: resolvedRun,
        },
      ];
    }),
  );
};

describe("story authoring validation", () => {
  it("renders every scene branch with stable, complete choices", () => {
    expect(
      validateStoryScenes(STORY_SCENES, storySamples()),
    ).toEqual([]);
  });

  it("rejects mismatched scene ids, duplicate choices, and empty copy", () => {
    const original = STORY_SCENES["weary-traveler"];
    const malformed: typeof STORY_SCENES = {
      ...STORY_SCENES,
      "weary-traveler": {
        ...original,
        id: "ossuary-road",
        paragraphs: () => [""],
        choices: [
          {
            id: "same-choice",
            label: "",
            detail: "First",
            effect: "attune",
          },
          {
            id: "same-choice",
            label: "Second",
            detail: "",
            effect: "take-tonic",
          },
        ],
      } as StoryScene,
    };

    const errors = validateStoryScenes(
      malformed,
      storySamples(),
    ).join("\n");

    expect(errors).toContain("declares mismatched id");
    expect(errors).toContain("repeats choice id");
    expect(errors).toContain("empty narrative copy");
    expect(errors).toContain("empty label");
    expect(errors).toContain("empty detail");
  });
});
