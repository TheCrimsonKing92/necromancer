export interface FailingConduitIntroduction {
  readonly eyebrow: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly voices: readonly {
    readonly speaker: string;
    readonly quote: string;
  }[];
}

export const FAILING_CONDUIT_INTRODUCTION: FailingConduitIntroduction = {
  eyebrow: "THE WATER TOWN WAITS",
  title: "Stone above the roofs. An army on the road.",
  paragraphs: [
    "The conduit broke its first pier before sunrise. Water still runs across the cracked span, feeding the town's cisterns and the planting channels beyond. Below it, carts crowd the only dry road while masons strike warning marks into doorposts. When the next pier goes, stone and water will fall together.",
    "Toman Rusk, the master mason, can bring part of the span down under his own tools. He cannot promise the conduit, the lower houses, and every worker beneath it will all survive. Water Reeve Maelin Orr had reports of the settling months ago. Her locked record chest is already in the yard.",
    "An army sworn to the being it calls Sovereign waits beyond the road. Its marshal, Halwen Sar, offers the Sovereign's help: passage for the present column, no garrison left behind, and no military wall raised from the repaired conduit. The Sovereign has come in person. It stands under the eastern arch on four plated limbs, taller than the houses, and speaks through a chamber that opens along its throat. To hold the span, it must put its body beneath the break.",
    "Among the evacuees, three strangers watch the seams between the Sovereign's plates instead of the stone above them. Toman has noticed. Nobody has left the rescue line to learn why.",
  ],
  voices: [
    {
      speaker: "Toman Rusk, master mason",
      quote: "Give me timber, clear the lower road, and tell me what must still be standing at dusk. I will not promise all three.",
    },
    {
      speaker: "Marshal Halwen Sar",
      quote: "My Sovereign will take the weight. Your masons will make the cut. When the last household clears, our column crosses this road.",
    },
    {
      speaker: "The Siege Sovereign",
      quote: "Your water need not die because your reeve feared a repair levy. Admit my body beneath the arch. We will speak of the road before I kneel.",
    },
  ],
};
