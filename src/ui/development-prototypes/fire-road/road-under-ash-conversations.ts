import {
  validateActionProofConversation,
  type ActionProofConversation,
} from "../action-proof-conversation";

const SERA_PORTRAIT = {
  src: "/assets/portraits/sera-vale-fire-road-v1.webp",
  width: 1024,
  height: 1536,
  position: "50% 24%",
} as const;

export const FIRE_ROAD_ARRIVAL_CONVERSATION: ActionProofConversation = {
  id: "sera-arrival",
  eyebrow: "At the western verge",
  title: "The broken wagon holds the road.",
  initialBeatId: "need",
  beats: [
    {
      id: "need",
      speakerId: "sera",
      speakerLabel: "Sera Vale",
      speakerRole: "Road reeve",
      text: "The lead wagon broke its axle against the bridge shoulder. I can move the six households once the lane is open, but the old west brace has split. The fire will reach them before my crews can clear both.",
      portrait: SERA_PORTRAIT,
      choices: [
        { id: "dead", label: "Ask about the dead carter.", nextBeatId: "dead" },
        { id: "hound", label: "Ask what is moving in the scrub.", nextBeatId: "hound" },
        { id: "enter", label: "Enter the fire road.", closes: true },
      ],
    },
    {
      id: "dead",
      speakerId: "sera",
      speakerLabel: "Sera Vale",
      speakerRole: "Road reeve",
      text: "The carter died trying to free his own wagon. I saw him beneath the axle before the smoke covered the yard. He knew the axle and load better than anyone left here. No one has reached his body since.",
      portrait: SERA_PORTRAIT,
      choices: [
        { id: "hound", label: "Ask about the thing in the scrub.", nextBeatId: "hound" },
        { id: "enter", label: "Enter the fire road.", closes: true },
      ],
    },
    {
      id: "hound",
      speakerId: "sera",
      speakerLabel: "Sera Vale",
      speakerRole: "Road reeve",
      text: "Three drovers saw something moving through the burning scrub. One swears it wore black iron at the throat; another saw only charred flesh. I have not been close enough to settle either claim. If it reaches the road, keep it off the households.",
      portrait: SERA_PORTRAIT,
      choices: [
        { id: "dead", label: "Ask where the dead carter fell.", nextBeatId: "dead" },
        { id: "enter", label: "Enter the fire road.", closes: true },
      ],
    },
  ],
};

const FIRE_ROAD_CONVERSATIONS = new Map<string, ActionProofConversation>([
  [FIRE_ROAD_ARRIVAL_CONVERSATION.id, FIRE_ROAD_ARRIVAL_CONVERSATION],
]);

const conversationErrors = [...FIRE_ROAD_CONVERSATIONS.values()].flatMap(validateActionProofConversation);
if (conversationErrors.length) throw new Error(conversationErrors.join("\n"));

export const fireRoadConversationById = (id: string): ActionProofConversation | undefined =>
  FIRE_ROAD_CONVERSATIONS.get(id);
