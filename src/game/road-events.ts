import { normalizeSeed, rollInteger } from "./random";
import { itemCount } from "./items";
import { IVEN_GRAVE_SALT_PRICE } from "./economy/iven-exchange";
import type {
  RoadEventId,
  RunState,
  StoryChoice,
} from "./types";

export interface RoadEventDefinition {
  id: RoadEventId;
  disposition: "friendly" | "neutral";
  eyebrow: string;
  title: string;
  paragraphs: [string, string, string];
  afterInteraction?: {
    choiceId: string | string[];
    choicesAfterResolution?: string[];
    paragraphs:
      | [string, string, string]
      | ((run: RunState) => [string, string, string]);
  };
  choices: StoryChoice[];
}

const roadChoiceCompleted = (
  run: RunState,
  choiceId: string,
): boolean =>
  run.flags.includes(
    `story-choice:road-interlude:${choiceId}`,
  );

interface IvenCordialResult {
  outcome: "success" | "failure";
  chance: string;
  roll: string;
  restored: string;
}

const latestIvenCordialResult = (
  run: RunState,
): IvenCordialResult | null => {
  const record = [...run.flags]
    .reverse()
    .find((flag) => flag.startsWith("iven-cordial-result:"));
  if (!record) return null;

  const [, recordedOutcome, chance = "0", roll = "0", restored = "0"] =
    record.split(":");
  return {
    outcome: recordedOutcome === "success" ? "success" : "failure",
    chance,
    roll,
    restored,
  };
};

interface BundleInspectionResult {
  outcome: "success" | "failure";
  chance: string;
  roll: string;
}

const latestBundleInspectionResult = (
  run: RunState,
): BundleInspectionResult | null => {
  const record = [...run.flags]
    .reverse()
    .find((flag) =>
      flag.startsWith("bundle-inspection-result:"),
    );
  if (!record) return null;
  const [, outcome, chance = "0", roll = "0"] = record.split(":");
  return {
    outcome: outcome === "success" ? "success" : "failure",
    chance,
    roll,
  };
};

const bundleSettlementFor = (
  run: RunState,
): "burial" | "broker" | null =>
  run.flags.includes("disputed-bundle-settled:burial")
    ? "burial"
    : run.flags.includes("disputed-bundle-settled:broker")
      ? "broker"
      : null;

export const roadEventParagraphsFor = (
  event: RoadEventDefinition,
  run: RunState,
): [string, string, string] => {
  if (!event.afterInteraction) return event.paragraphs;
  const choiceIds = Array.isArray(event.afterInteraction.choiceId)
    ? event.afterInteraction.choiceId
    : [event.afterInteraction.choiceId];
  if (!choiceIds.some((id) => roadChoiceCompleted(run, id))) {
    return event.paragraphs;
  }
  return typeof event.afterInteraction.paragraphs === "function"
    ? event.afterInteraction.paragraphs(run)
    : event.afterInteraction.paragraphs;
};

export const roadEventChoicesFor = (
  event: RoadEventDefinition,
  run: RunState,
): StoryChoice[] => {
  const resolved = event.afterInteraction;
  if (!resolved?.choicesAfterResolution) return event.choices;
  const choiceIds = Array.isArray(resolved.choiceId)
    ? resolved.choiceId
    : [resolved.choiceId];
  return choiceIds.some((id) => roadChoiceCompleted(run, id))
    ? event.choices.filter((choice) =>
        choiceIds.includes(choice.id) ||
        resolved.choicesAfterResolution!.includes(choice.id),
      )
    : event.choices;
};

export const ROAD_EVENT_IDS: RoadEventId[] = [
  "mourning-caravan",
  "hedge-surgeon",
  "ditch-burial",
  "disputed-bundle",
];

export const ROAD_EVENTS: Record<
  RoadEventId,
  RoadEventDefinition
> = {
  "mourning-caravan": {
    id: "mourning-caravan",
    disposition: "friendly",
    eyebrow: "North Road · A Mourning Caravan",
    title: "Six living voices around one quiet name",
    paragraphs: [
      "A covered farm cart waits where the road widens. Black ribbons bind its wheels, and the family beside it is sharing onion broth before carrying their dead the last mile home.",
      "The oldest woman sees the grave instruments at your belt. She draws the cart blanket tighter over the dead, then makes room at the fire. Saint Orra’s grave copper she will not allow near the kettle.",
      "“If you mean to sit, sit now,” she says. “We carry him at first light.” Behind you, the escaped names are still finding their way into the dawn.",
    ],
    afterInteraction: {
      choiceId: "share-caravan-fire",
      choicesAfterResolution: ["leave-caravan"],
      paragraphs: [
        "The bowl is empty. Around you, the family ties the last black ribbons before carrying their dead the final mile home.",
        "No one asks what stains your coat. The oldest woman watches your hands whenever you sit near the covered body.",
        "“We carry him now,” the oldest woman says. Overhead, the escaped names have traveled farther into the dawn.",
      ],
    },
    choices: [
      {
        id: "share-caravan-fire",
        label: "Sit for one bowl",
        detail:
          "Recover up to 4 Health and 1 Spirit. Sitting costs time on the road.",
        effect: "share-caravan-fire",
        signal: "tradeoff",
        mode: "interaction",
        outcome: {
          eyebrow: "The shared fire",
          title: "They pass you a bowl.",
          body:
            "Onion, barley, and salt restore some warmth. Beneath the cart blanket, the dead remains silent.",
          result: (run) => {
            const record = [...run.flags]
              .reverse()
              .find((flag) =>
                flag.startsWith("caravan-recovery:"),
              );
            const [, health = "0", spirit = "0"] =
              record?.split(":") ?? [];
            return `${health} Health recovered · ${spirit} Spirit recovered · Time surrendered on the road`;
          },
        },
      },
      {
        id: "leave-caravan",
        label: (run) =>
          roadChoiceCompleted(run, "share-caravan-fire")
            ? "Rise from the fire"
            : "Leave them their fire",
        detail: (run) =>
          roadChoiceCompleted(run, "share-caravan-fire")
            ? "Thank the mourners for the bowl and take up the road again."
            : "Thank the mourners and keep pace with the names moving north.",
        effect: "continue-road",
      },
    ],
  },
  "hedge-surgeon": {
    id: "hedge-surgeon",
    disposition: "neutral",
    eyebrow: "North Road · The Barber’s Awning",
    title: "A clean needle beneath a dirty sky",
    paragraphs: [
      "A blue awning leans against a milestone. Beneath it, steel instruments lie boiled and ordered beside a brazier.",
      "The county roll names Iven Saye as a barber. His hands and questions belong to a surgeon. He examines your gait, your pupils, and the way you guard your ribs before asking what you can pay.",
      "One ampoule of ossuary ichor will buy his work. He separates open wounds from closed injuries and warns that linen will not mend a damaged brain.",
    ],
    afterInteraction: {
      choiceId: "trade-for-surgery",
      paragraphs: [
        "Iven knots the last dressing and drops his needle into boiling water. The blue awning smells of spirits, hot iron, and work done cleanly.",
        "He tests your pupils once more. His instructions are brief, exact, and repeated until you can give them back without error.",
        "Your spent ampoule stands beside his instruments. Northward, the road and its disturbance have not waited.",
      ],
    },
    choices: [
      {
        id: "trade-for-surgery",
        label: "Pay Iven in ossuary ichor",
        detail:
          "Trade one ampoule for 6 Health and one full measure of wound recovery.",
        effect: "trade-for-surgery",
        signal: "tradeoff",
        mode: "interaction",
        outcome: {
          eyebrow: "Roadside surgery",
          title: "The instruments were clean.",
          body:
            "Iven spends no motion twice. When he steps back, the open wounds are clean, the closed injuries have been tested, and the worst bleeding has stopped.",
          result: (run) => {
            const record = [...run.flags]
              .reverse()
              .find((flag) =>
                flag.startsWith("surgeon-recovery:"),
              );
            const [
              ,
              health = "0",
              stabilized = "0",
              improved = "0",
              healed = "0",
              scarred = "0",
            ] = record?.split(":") ?? [];
            const changes = [
              "Ossuary ichor −1",
              `${health} Health recovered`,
              Number(stabilized) > 0
                ? `${stabilized} ${stabilized === "1" ? "injury" : "injuries"} stabilized`
                : "",
              Number(improved) > 0
                ? `${improved} ${improved === "1" ? "injury" : "injuries"} improved`
                : "",
              Number(healed) > 0
                ? `${healed} closed ${healed === "1" ? "injury" : "injuries"} healed`
                : "",
              Number(scarred) > 0
                ? `${scarred} open ${scarred === "1" ? "wound" : "wounds"} closed into ${scarred === "1" ? "a scar" : "scars"}`
                : "",
            ].filter(Boolean);
            return changes.join(" · ");
          },
        },
      },
      {
        id: "bargain-for-vigil-cordial",
        label: "Ask what he keeps for occult exhaustion",
        detail:
          "Persuade Iven to open the case beneath his brazier. If he agrees, one ampoule of ossuary ichor buys a cordial taken here.",
        effect: "bargain-for-vigil-cordial",
        skill: "persuasion",
        signal: "risk",
        mode: "interaction",
        outcome: {
          eyebrow: "The surgeon’s other trade",
          title: (run) =>
            latestIvenCordialResult(run)?.outcome === "success"
              ? "A brown vial changes hands."
              : "The case remains shut.",
          body: (run) => {
            return latestIvenCordialResult(run)?.outcome === "success"
              ? "Iven unlocks a narrow case beneath the brazier. The cordial inside tastes of grave mint and iron. It clears the pressure behind your eyes without lending you strength you did not have."
              : "Iven studies your face, then puts one hand beneath his apron. The key stays there. So does the narrow case beneath the brazier.";
          },
          result: (run) => {
            const result = latestIvenCordialResult(run);
            if (!result) return "No bargain was struck";

            const check = `Persuasion check · ${result.chance}% chance · rolled ${result.roll}: ${result.outcome}`;
            return result.outcome === "success"
              ? `${check} · Ossuary ichor −1 · ${result.restored} Spirit restored`
              : `${check} · Iven keeps the case closed`;
          },
        },
      },
      {
        id: "sell-grave-salt-to-iven",
        presentWhen: (run) =>
          itemCount(run.player.inventory, "grave-salt") > 0 ||
          roadChoiceCompleted(run, "sell-grave-salt-to-iven"),
        label: "Offer Iven a measure of grave salt",
        detail: `Trade one sealed twist for ${IVEN_GRAVE_SALT_PRICE} black obols. The salt leaves with him.`,
        effect: "sell-grave-salt-to-iven",
        signal: "tradeoff",
        mode: "interaction",
        outcome: {
          eyebrow: "Salt for the case",
          title: "Three black obols cross the cloth.",
          body:
            "Iven keeps the paper twist sealed. He sets it beside the boiled instruments and counts three dark coins into your palm.",
          result: () =>
            `Grave salt −1 · Black obols +${IVEN_GRAVE_SALT_PRICE}`,
        },
      },
      {
        id: "leave-surgeon",
        label: (run) =>
          roadChoiceCompleted(run, "trade-for-surgery") ||
          roadChoiceCompleted(run, "bargain-for-vigil-cordial") ||
          roadChoiceCompleted(run, "sell-grave-salt-to-iven")
            ? "Take your leave of Iven"
            : "Keep your relics",
        detail: (run) =>
          roadChoiceCompleted(run, "trade-for-surgery")
            ? "Settle your coat over his clean work and return to the road."
            : roadChoiceCompleted(
                  run,
                  "bargain-for-vigil-cordial",
                )
              ? latestIvenCordialResult(run)?.outcome === "success"
                ? "Leave the empty brown vial beside his brazier and return to the road."
                : "Leave Iven and his locked case beneath the awning, then return to the road."
              : roadChoiceCompleted(run, "sell-grave-salt-to-iven")
                ? "Leave Iven with the sealed salt and take up the road again."
              : "Leave the awning and follow the disturbance north.",
        effect: "continue-road",
      },
    ],
  },
  "ditch-burial": {
    id: "ditch-burial",
    disposition: "friendly",
    eyebrow: "North Road · County Ditch",
    title: "Work the dead cannot finish alone",
    paragraphs: [
      "Two county gravediggers stand beside a collapsed cart. Each time the rain-swollen coffin tilts, three measured knocks sound from within.",
      "The axle has split and one digger’s hand is swollen shut. They have rope, a shallow grave, and no way to lift the coffin level.",
      "The escaped names move north in pale threads. Stopping will cost your body and your lead.",
    ],
    afterInteraction: {
      choiceId: "help-ditch-burial",
      choicesAfterResolution: ["leave-ditch"],
      paragraphs: [
        "The coffin rests level beside a new-cut grave. Inside, the dead woman has stopped knocking now that no one is dropping her.",
        "One gravedigger resets the axle while the other presses clean field linen into your hand. Embarrassment has given way to practical gratitude.",
        "The pale names overhead have gained distance. The lift has set a deep ache across your back.",
      ],
    },
    choices: [
      {
        id: "help-ditch-burial",
        label: "Put your back beneath the coffin",
        detail:
          "Lose up to 2 Health and torso condition. Gain 5 experience and clean field linen; the work costs time on the road.",
        effect: "help-ditch-burial",
        signal: "tradeoff",
        mode: "interaction",
        outcome: {
          eyebrow: "Common labor",
          title: "The coffin is level.",
          body:
            "The coffin comes free of the mud. Once the dead woman lies level beside the grave, the knocking stops.",
          result: (run) => {
            const record = [...run.flags]
              .reverse()
              .find((flag) =>
                flag.startsWith("burial-strain:"),
              );
            const strain = record?.split(":").at(-1) ?? "0";
            return `${strain} Health and torso condition lost · 5 experience gained · Clean linen +1 · Time surrendered on the road`;
          },
          rewards: [
            {
              kind: "item",
              itemId: "linen-binding",
            },
          ],
        },
      },
      {
        id: "leave-ditch",
        label: (run) =>
          roadChoiceCompleted(run, "help-ditch-burial")
            ? "Return to the road"
            : "Keep to the road",
        detail: (run) =>
          roadChoiceCompleted(run, "help-ditch-burial")
            ? "Take the gravediggers’ thanks and follow the names north."
            : "Leave the gravediggers their rope and keep your lead.",
        effect: "continue-road",
      },
    ],
  },
  "disputed-bundle": {
    id: "disputed-bundle",
    disposition: "neutral",
    eyebrow: "North Road · A Washed-Out Verge",
    title: "One sealed bundle, entered twice",
    paragraphs: [
      "Two carts have stopped where runoff cut the verge away. Eda Pell, driving county dead, has a sealed blackcloth bundle among her coffin boards that does not appear on her burial tally.",
      "Oren Vask, a reliquary factor with blue thread on his packing rolls, says the bundle washed from his cart. Eda says anything found beneath her corpse boards remains in county custody until a reeve can open it.",
      "Neither asks what the bundle contains. Eda needs a record she can defend; Oren needs his licensed packet back before the next post checks his load.",
    ],
    afterInteraction: {
      choiceId: [
        "leave-bundle-with-burial-crew",
        "release-bundle-to-broker",
      ],
      choicesAfterResolution: ["leave-disputed-bundle"],
      paragraphs: (run) =>
        bundleSettlementFor(run) === "broker"
          ? [
              "Oren Vask sets the sealed bundle beneath his blue-strung cargo while Eda Pell writes the transfer on the back of her wet tally.",
              "Eda keeps the cord uncut and has Oren mark the entry himself. Neither has learned what the blackcloth holds.",
              "The carts can move again. The disagreement remains in ink, but custody no longer blocks the road.",
            ]
          : [
              "The sealed bundle remains beneath Eda Pell’s coffin boards. She adds its cord, weight, and unknown contents to the county tally.",
              "Oren Vask copies her entry into his own book and refuses to call it agreement. Eda refuses to call it his.",
              "The carts can move again. Whatever the blackcloth holds will meet a reeve before it meets either claimant.",
            ],
    },
    choices: [
      {
        id: "inspect-disputed-bundle",
        label: "Read the bundle without opening it",
        detail:
          "Use Perception to compare cord, grit, and packing marks. Failure leaves the trace uncertain; the custody choice remains yours.",
        effect: "inspect-disputed-bundle",
        skill: "perception",
        signal: "risk",
        mode: "interaction",
        outcome: {
          eyebrow: "The roadside trace",
          title: (run) =>
            latestBundleInspectionResult(run)?.outcome === "success"
              ? "The outer cord kept a history."
              : "The washout blurred the trail.",
          body: (run) =>
            latestBundleInspectionResult(run)?.outcome === "success"
              ? "Blue packing thread lies caught beneath the black cord. Dry limestone remains inside the knot where the road water could not have carried it. Eda sees both before Oren can pocket the loose thread."
              : "Mud has entered the outer weave and the cord bears several old knots. You can name what might have happened, but not which cart carried it before the washout.",
          result: (run) => {
            const result = latestBundleInspectionResult(run);
            if (!result) return "The bundle remains unexamined";
            const check = `Perception check · ${result.chance}% chance · rolled ${result.roll}: ${result.outcome}`;
            return result.outcome === "success"
              ? `${check} · Broker packing trace entered in the Journal`
              : `${check} · Origin remains uncertain`;
          },
        },
      },
      {
        id: "leave-bundle-with-burial-crew",
        label: (run) =>
          latestBundleInspectionResult(run)?.outcome === "success"
            ? "Leave it with Eda despite the trace"
            : "Leave it under county burial custody",
        detail: (run) =>
          latestBundleInspectionResult(run)?.outcome === "success"
            ? "The packing trace supports Oren, but Eda still has lawful custody of what was found among the dead."
            : "Keep the sealed bundle with the burial cart until a county reeve can decide between possession and ownership.",
        effect: "leave-bundle-with-burial-crew",
        signal: "tradeoff",
        mode: "interaction",
        outcome: {
          eyebrow: "Custody retained",
          title: "Eda enters one more line.",
          body:
            "The cord remains uncut. Eda records the bundle under county custody; Oren copies the entry and writes his objection beside it.",
          result: () =>
            "Bundle remains sealed · Burial custody recorded · Broker claim disputed",
        },
      },
      {
        id: "release-bundle-to-broker",
        label: (run) =>
          latestBundleInspectionResult(run)?.outcome === "success"
            ? "Return it along the packing trace"
            : "Accept Oren’s claim",
        detail: (run) =>
          latestBundleInspectionResult(run)?.outcome === "success"
            ? "Treat the blue thread and dry limestone as enough to return the sealed bundle to Oren."
            : "Release the sealed bundle on Oren’s account without knowing whether the washout put it beneath Eda’s boards.",
        effect: "release-bundle-to-broker",
        signal: "tradeoff",
        mode: "interaction",
        outcome: {
          eyebrow: "Custody transferred",
          title: "Oren takes back the weight.",
          body:
            "Eda records the transfer before lifting the bundle from her boards. Oren marks her wet tally and sets it among his blue-strung cargo.",
          result: () =>
            "Bundle remains sealed · Custody transferred · Burial record retained",
        },
      },
      {
        id: "leave-disputed-bundle",
        label: (run) =>
          bundleSettlementFor(run)
            ? "Leave the two records behind"
            : "Leave the dispute unresolved",
        detail: (run) =>
          bundleSettlementFor(run)
            ? "Let both carts take up the road under the custody record you helped make."
            : "Keep to the north road. Neither claimant can make you choose for them.",
        effect: "continue-road",
      },
    ],
  },
};

export const rollRoadEvent = (
  seed: number,
  seen: ReadonlyArray<RoadEventId> = [],
): { seed: number; eventId: RoadEventId } => {
  const unseen = ROAD_EVENT_IDS.filter((id) => !seen.includes(id));
  const pool = unseen.length > 0 ? unseen : ROAD_EVENT_IDS;
  let mixed = normalizeSeed(seed) ^ 0x726f6164;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
  mixed = (mixed ^ (mixed >>> 15)) >>> 0;
  const roll = rollInteger(normalizeSeed(mixed), 0, pool.length - 1);
  return {
    seed: roll.seed,
    eventId: pool[roll.value]!,
  };
};

export const validateRoadEvents = (
  definitions: Readonly<Record<string, RoadEventDefinition>>,
): string[] => {
  const errors: string[] = [];
  const choiceOwners = new Map<string, string>();

  for (const [key, event] of Object.entries(definitions)) {
    if (key !== event.id) {
      errors.push(`${key}: record key does not match event id ${event.id}.`);
    }
    if (
      event.eyebrow.trim().length === 0 ||
      event.title.trim().length === 0 ||
      event.paragraphs.some((paragraph) => paragraph.trim().length === 0)
    ) {
      errors.push(`${event.id}: presentation copy is incomplete.`);
    }
    if (!event.choices.some((choice) => choice.effect === "continue-road")) {
      errors.push(`${event.id}: no onward route is defined.`);
    }
    if (event.afterInteraction) {
      const interactionIds = Array.isArray(
        event.afterInteraction.choiceId,
      )
        ? event.afterInteraction.choiceId
        : [event.afterInteraction.choiceId];
      const interactions = interactionIds.map((choiceId) =>
        event.choices.find((choice) => choice.id === choiceId),
      );
      if (
        interactions.some(
          (interaction) =>
            !interaction || interaction.mode !== "interaction",
        )
      ) {
        errors.push(
          `${event.id}: resolved presentation references a missing interaction.`,
        );
      }
      if (
        event.afterInteraction.choicesAfterResolution?.some(
          (choiceId) => !event.choices.some((choice) => choice.id === choiceId),
        )
      ) {
        errors.push(
          `${event.id}: resolved presentation references a missing remaining choice.`,
        );
      }
      const resolvedParagraphs =
        typeof event.afterInteraction.paragraphs === "function"
          ? null
          : event.afterInteraction.paragraphs;
      if (
        resolvedParagraphs?.some(
          (paragraph) => paragraph.trim().length === 0,
        )
      ) {
        errors.push(
          `${event.id}: resolved presentation copy is incomplete.`,
        );
      }
    }
    for (const choice of event.choices) {
      const owner = choiceOwners.get(choice.id);
      if (owner) {
        errors.push(
          `${event.id}: choice id ${choice.id} is already owned by ${owner}.`,
        );
      } else {
        choiceOwners.set(choice.id, event.id);
      }
    }
  }

  for (const id of ROAD_EVENT_IDS) {
    if (!definitions[id]) {
      errors.push(`Road-event order references missing id ${id}.`);
    }
  }

  return [...new Set(errors)];
};
