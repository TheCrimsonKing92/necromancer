import { useNameFor } from "../identity";
import { CAMPAIGN_PREPARATIONS } from "../campaign-preparations";
import { standingBonebinderServantFor } from "../content-packs/bonebinder-runtime";
import type {
  RunState,
  StoryChoice,
  StoryId,
  StoryScene,
} from "../types";
import { seededLine } from "./shared";

type BurialCutCheckId =
  | "read-washout"
  | "shoulder-bier"
  | "give-use-name"
  | "ditch-hand-bier";

interface BurialCutResolution {
  choiceId: BurialCutCheckId;
  succeeded: boolean;
}

const burialCutResolution = (
  run: RunState,
): BurialCutResolution | null => {
  const record = [...run.flags]
    .reverse()
    .find((flag) => flag.startsWith("burial-cut-result:"));
  if (!record) return null;
  const [, choiceId, outcome] = record.split(":");
  if (
    choiceId !== "read-washout" &&
    choiceId !== "shoulder-bier" &&
    choiceId !== "give-use-name" &&
    choiceId !== "ditch-hand-bier"
  ) {
    return null;
  }
  return {
    choiceId,
    succeeded: outcome === "success",
  };
};

const burialCutResult = (run: RunState): string => {
  const resolution = burialCutResolution(run);
  const record = [...run.flags]
    .reverse()
    .find((flag) => flag.startsWith("burial-cut-cost:"));
  const healthCost = record?.split(":").at(-1) ?? "0";
  const tally = run.flags.includes("burial-tally")
    ? " · County funerary tally: 3 Ward reserved for Saint Orra"
    : "";
  const notice =
    resolution?.choiceId === "give-use-name" &&
    !resolution.succeeded
      ? " · A county clerk carries your use-name north"
      : "";
  return `25 experience gained · Clean linen +1${healthCost !== "0" ? ` · ${healthCost} Health and torso condition lost · Strained ribs (minor wound)` : ""}${tally}${notice}`;
};

const burialCutRewards = (run: RunState) => [
  {
    kind: "item" as const,
    itemId: "linen-binding" as const,
  },
  ...(run.flags.includes("burial-tally")
    ? [
        {
          kind: "effect" as const,
          label: CAMPAIGN_PREPARATIONS["burial-tally"].name,
          description:
            CAMPAIGN_PREPARATIONS["burial-tally"].description,
        },
      ]
    : []),
];

const BURIAL_CUT_CHECKS: StoryChoice[] = [
  {
    id: "read-washout",
    label: "Read what the flood left",
    detail:
      "Find firm ground beneath the washed markers before the crew commits its weight.",
    effect: "burial-cut-check",
    skill: "perception",
    signal: "risk",
    mode: "interaction",
    outcome: {
      eyebrow: "The drowned verge",
      title: "The road has a buried edge.",
      body: (run) =>
        burialCutResolution(run)?.succeeded
          ? "A line of sedge bends against the current where old paving still holds. The cart crosses there. One wheel sinks to the hub, but no farther."
          : "What looked like old paving is a skin of gravel over running mud. The wheel drops, the bier follows, and your shoulder takes the weight before the dead does.",
      result: burialCutResult,
      rewards: burialCutRewards,
    },
  },
  {
    id: "shoulder-bier",
    label: "Take the bier’s low corner",
    detail:
      "Help carry the shrouded dead across the washout without putting the body into the flood.",
    effect: "burial-cut-check",
    skill: "athletics",
    signal: "risk",
    mode: "interaction",
    outcome: {
      eyebrow: "County work",
      title: "The bier enters the water.",
      body: (run) =>
        burialCutResolution(run)?.succeeded
          ? "The current worries at your knees. No one loses footing. On the far bank, the foreman counts the living and then the dead."
          : "Mud shears away under one boot. The bier lists hard toward the water; you wrench it level and feel something yield under your ribs.",
      result: burialCutResult,
      rewards: burialCutRewards,
    },
  },
  {
    id: "give-use-name",
    label: "Give the foreman your use-name",
    detail: (run) =>
      `Offer ${useNameFor(run.player)} freely and ask leave to hear which bank the shrouded dead remembers.`,
    effect: "burial-cut-check",
    skill: "persuasion",
    signal: "risk",
    mode: "interaction",
    outcome: {
      eyebrow: "A name given freely",
      title: "The living answer first.",
      body: (run) =>
        burialCutResolution(run)?.succeeded
          ? `“${useNameFor(run.player)},” the foreman repeats. One dry knock comes from the shroud, toward the buried paving. The crew follows it across and keeps the name among themselves.`
          : `“${useNameFor(run.player)},” the foreman repeats. The shroud remains still. He accepts your help, but the county clerk writes the name in the road book before anyone moves.`,
      result: burialCutResult,
      rewards: burialCutRewards,
    },
  },
];

const DITCH_HAND_BURIAL_CHOICE: StoryChoice = {
  id: "ditch-hand-bier",
  label: "Give Ditch-Hand the low corner",
  detail:
    "Set the sealed servant where the current is strongest and keep the living crew on firmer ground.",
  effect: "burial-cut-check",
  tradition: "summoner",
  mode: "interaction",
  outcome: {
    eyebrow: "The seated hand",
    title: "The low corner holds.",
    body:
      "Ditch-Hand enters the brown water without testing the mud. The bier settles across its shoulder and stays level while the living bearers find the buried paving. On the far bank, the foreman checks the county seal at its collar before he counts the dead.",
    result: burialCutResult,
    rewards: burialCutRewards,
  },
};

const BURIAL_CUT_ONWARD: StoryChoice = {
  id: "leave-burial-cut",
  label: "Take the crew’s lower road",
  detail:
    "Follow the old burial paving toward the warm ruin beyond the washout.",
  effect: "leave-burial-cut",
};

const burialCutChoices = (run: RunState): StoryChoice[] => {
  const resolution = burialCutResolution(run);
  const servant = standingBonebinderServantFor(run);
  const availableChecks =
    run.player.tradition === "summoner" &&
    servant
      ? [...BURIAL_CUT_CHECKS, DITCH_HAND_BURIAL_CHOICE]
      : BURIAL_CUT_CHECKS;
  if (!resolution) return availableChecks;
  const completed = availableChecks.find(
    (choice) => choice.id === resolution.choiceId,
  );
  return completed
    ? [completed, BURIAL_CUT_ONWARD]
    : [BURIAL_CUT_ONWARD];
};

export const OPENING_BURIAL_SCENES = {
  "weary-traveler": {
    id: "weary-traveler",
    eyebrow: "Maldirin · The Weary Traveler",
    title: "A room paid through dawn",
    paragraphs: (run) => [
      `You wake with the name ${run.player.name} intact. In Maldirin, some do not.`,
      seededLine(run, 0x77656172, [
        "Rain worries the shutters of the Weary Traveler. Beneath the floorboards, something dead has spent the night whispering about one armed man and a half-starved hound waiting on the ossuary road.",
        "A chimney pot knocks in the wind above the Weary Traveler. Under your bed, a floorboard ghost counts one road reeve, one starving hound, and every grave between here and the north mile.",
        "Dawn has not reached the inn’s warped glass. Something beneath the floorboards keeps rehearsing a warning about a hooked knife and an ash-colored hound on the ossuary road.",
      ]),
      `The voice below is too thin for ordinary hearing. Your training gives it language, but no clear motive. Downstairs, the innkeeper keeps a black tonic beneath the counter and watches the stair.`,
      ...(run.player.tradition === "summoner"
        ? [
            "Ditch-Hand waits beneath oilcloth in the stable yard. The county seal at its collar grants use, not ownership. Eda Pell’s return terms remain folded inside your coat.",
          ]
        : []),
    ],
    choices: [
      {
        id: "attune",
        label: "Listen beneath the floorboards",
        detail:
          "Open yourself fully to the voice below and let the innkeeper keep his bottle.",
        effect: "attune",
      },
      {
        id: "take-tonic",
        label: "Buy the innkeeper’s black tonic",
        detail:
          "Leave the voice unanswered and carry the black bottle onto the road.",
        effect: "take-tonic",
      },
      {
        id: "burial-cut",
        label: "Leave by the burial cut",
        detail:
          "Take the lesser road while the voice and the black bottle remain in the inn.",
        effect: "take-burial-cut",
        signal: "tradeoff",
      },
    ],
  },
  "burial-cut": {
    id: "burial-cut",
    eyebrow: "North of Maldirin · The Burial Cut",
    title: "The flood has found the old road",
    paragraphs: (run) => {
      const resolution = burialCutResolution(run);
      if (!resolution) {
        return [
          "The burial cut runs below the county road, between alder roots and stones too old to bear legible names. Overnight rain has put brown water across it.",
          "A county crew waits beside a cart carrying three shrouded dead. The lead mule will not enter the washout. Neither will the foreman risk turning the cart on the narrow bank.",
          "The dead are expected before noon. The crew has rope, clean linen, and a funerary tally for whoever gets them across.",
        ];
      }
      const consequence =
        resolution.choiceId === "give-use-name"
          ? resolution.succeeded
            ? `The crew has heard the name ${useNameFor(run.player)} and chosen not to carry it farther.`
            : `The crew has heard the name ${useNameFor(run.player)}. The county clerk’s road book will reach a reeve post before night.`
          : resolution.succeeded
            ? "The foreman presses a stamped funerary tally into your palm. It is still warm from the ward box."
            : "No body entered the flood. The foreman gives you clean linen and says nothing about the way you hold your ribs.";
      return [
        "The cart stands on the far bank. Water passes over the old road as though nothing crossed it.",
        consequence,
        "Beyond the alder trees, the burial paving climbs toward a roofless tollhouse. Smoke rises from its cold chimney.",
      ];
    },
    choices: burialCutChoices,
  },
} satisfies Partial<Record<StoryId, StoryScene>>;
