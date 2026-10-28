import { describe, expect, it } from "vitest";
import {
  FIRE_ROAD_ARRIVAL_CONVERSATION,
  fireRoadConversationById,
} from "./road-under-ash-conversations";

describe("Fire Road conversations", () => {
  it("bounds Sera's claims by her work, observation, and attributed reports", () => {
    const copy = FIRE_ROAD_ARRIVAL_CONVERSATION.beats.map(({ text }) => text).join(" ");
    expect(copy).toContain("I can move the six households");
    expect(copy).toContain("before my crews can clear both");
    expect(copy).toContain("I saw him beneath the axle");
    expect(copy).toContain("He knew the axle and load");
    expect(copy).toContain("Three drovers saw something");
    expect(copy).toContain("I have not been close enough");
    expect(copy).not.toContain("your art");
    expect(copy).not.toContain("raise him");
    expect(copy).not.toContain("what remains in him");
    expect(copy).not.toContain("came ahead of the foreign host");
    expect(copy).not.toContain("Wake the work in him and he can finish it");
    expect(FIRE_ROAD_ARRIVAL_CONVERSATION.title).toBe("The broken wagon holds the road.");
    expect(fireRoadConversationById("sera-arrival")).toBe(FIRE_ROAD_ARRIVAL_CONVERSATION);
  });
});
