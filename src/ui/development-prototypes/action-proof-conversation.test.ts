import { describe, expect, it } from "vitest";
import {
  advanceActionProofConversation,
  openActionProofConversation,
  renderActionProofConversation,
  validateActionProofConversation,
  type ActionProofConversation,
} from "./action-proof-conversation";

const conversation: ActionProofConversation = {
  id: "arrival",
  eyebrow: "At the road",
  title: "Someone asks for help.",
  initialBeatId: "ask",
  beats: [
    {
      id: "ask",
      speakerId: "reeve",
      speakerLabel: "The reeve",
      speakerRole: "Road authority",
      text: "The bridge will carry people or grain. It will not carry both unaided.",
      portrait: { src: "/reeve.webp", width: 720, height: 960 },
      choices: [
        { id: "why", label: "Ask what failed.", nextBeatId: "answer" },
        { id: "go", label: "Enter the road.", closes: true },
      ],
    },
    {
      id: "answer",
      speakerId: "reeve",
      speakerLabel: "The reeve",
      speakerRole: "Road authority",
      text: "The wagon broke its axle against the bridge shoulder.",
      portrait: { src: "/reeve.webp", width: 720, height: 960 },
      choices: [{ id: "go", label: "Enter the road.", closes: true }],
    },
  ],
};

describe("action-proof conversations", () => {
  it("validates and advances an authored exchange without inventing an outcome", () => {
    expect(validateActionProofConversation(conversation)).toEqual([]);
    const opened = openActionProofConversation(conversation);
    expect(advanceActionProofConversation(conversation, opened, "why")?.beatId).toBe("answer");
    expect(advanceActionProofConversation(conversation, opened, "go")).toBeUndefined();
  });

  it("renders the world-facing conversation as one modal interaction surface", () => {
    const markup = renderActionProofConversation(conversation, openActionProofConversation(conversation));
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('/reeve.webp');
    expect(markup).toContain('data-action="choose-action-proof-conversation"');
    expect(markup).toContain("The bridge will carry people or grain");
  });
});
