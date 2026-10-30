import { describe, expect, it } from "vitest";
import {
  isStoryEffect,
  STORY_EFFECT_IDS,
  STORY_IDS,
} from "../types";
import {
  isStoryEffect as contentIsStoryEffect,
  STORY_EFFECT_IDS as contentStoryEffectIds,
} from "./content";
import { STORY_IDS as continuityStoryIds } from "./continuity";

describe("types facade runtime exports", () => {
  it("re-exports the originating isStoryEffect function", () => {
    expect(isStoryEffect).toBe(contentIsStoryEffect);
  });

  it("re-exports the originating STORY_EFFECT_IDS array", () => {
    expect(STORY_EFFECT_IDS).toBe(contentStoryEffectIds);
  });

  it("re-exports the originating STORY_IDS array", () => {
    expect(STORY_IDS).toBe(continuityStoryIds);
  });
});
