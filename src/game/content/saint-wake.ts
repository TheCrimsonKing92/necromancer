import { allWounds } from "../anatomy";
import { WAKE_VARIANTS } from "../encounters";
import { useNameFor } from "../identity";
import {
  ROAD_EVENTS,
  roadEventChoicesFor,
  roadEventParagraphsFor,
} from "../road-events";
import { factionKnows } from "../world/state";
import type { StoryId, StoryScene } from "../types";
import {
  poacherRecognitionParagraph,
  saintRecoveryResult,
} from "./outcome-copy";

export const SAINT_WAKE_SCENES = {
  "saint-orra-aftermath": {
    id: "saint-orra-aftermath",
    eyebrow: "Saint Orra’s Vault · After the Accounting",
    title: "What remains when a saint is spent",
    paragraphs: (run) => [
      "Saint Orra comes apart where she stood. An empty mask, finger bones, warm copper, and a dark residue remain on the counting-room floor.",
      "The names she kept tear free of the jawbone walls and stream toward the stair. Most remember the sky. A few remember only how badly they wanted a body.",
      "A reliquary broker waits beneath the stair with a mourning cart and a wet cough. His mule stands under the broken roof. He offers black obols for relics and medicine for the road above.",
      allWounds(run.player).length > 0
        ? `You carry ${allWounds(run.player).length} recorded ${allWounds(run.player).length === 1 ? "wound" : "wounds"} from the accounting. Saint-wax still gutters on the altar. It is warm enough to aid the flesh, though not always cleanly.`
        : "Your body has survived the accounting without an open wound, but the altar’s saint-wax still holds a little stolen warmth.",
    ],
    choices: [
      {
        id: "dress-saint-wounds",
        label: "Dress your wounds in saint-wax",
        detail:
          "Take one unhurried measure of recovery while the escaped names keep their lead.",
        effect: "dress-saint-wounds",
        signal: "tradeoff",
        mode: "interaction",
        outcome: {
          eyebrow: "The flesh remembers",
          title: "What closes does not leave.",
          body:
            "The wax enters every seam warm and leaves it cold. Fresh injuries settle under careful hands; older wounds close unevenly and leave their record in the flesh.",
          result: saintRecoveryResult,
        },
      },
      {
        id: "follow-name-storm",
        label: "Climb after the stolen names",
        detail:
          "The whispers have found the stair. Follow before the Black Mile gives them another body.",
        effect: "follow-name-storm",
      },
    ],
  },
  "road-interlude": {
    id: "road-interlude",
    eyebrow: (run) =>
      ROAD_EVENTS[run.roadEvent ?? "mourning-caravan"].eyebrow,
    title: (run) =>
      ROAD_EVENTS[run.roadEvent ?? "mourning-caravan"].title,
    paragraphs: (run) =>
      roadEventParagraphsFor(
        ROAD_EVENTS[run.roadEvent ?? "mourning-caravan"],
        run,
      ),
    choices: (run) => {
      const event = ROAD_EVENTS[run.roadEvent ?? "mourning-caravan"];
      return roadEventChoicesFor(event, run);
    },
  },
  "black-mile-wake": {
    id: "black-mile-wake",
    eyebrow: "Black Mile · What Followed",
    title: "The names find weather",
    paragraphs: (run) => {
      const variant =
        WAKE_VARIANTS[run.wakeVariant ?? "bell-widow"];
      const variantParagraphs =
        variant.id === "reeve-patrol" &&
        factionKnows(
          run.world,
          "county-reeves",
          "gave-use-name-to-burial-crews",
        )
          ? [
              "Three hooded lanterns descend from the north. A county road book hangs open beneath the first.",
              factionKnows(
                run.world,
                "county-reeves",
                "hollis-vane-rendered",
              )
                ? `Sergeant Elian Rusk speaks the use-name ${useNameFor(run.player)}, then names Hollis Vane and the cuts found in his body. Tess Fen lowers her spear while the sergeant orders you to show your hands.`
                : `Sergeant Elian Rusk speaks the use-name ${useNameFor(run.player)} exactly as the burial clerk wrote it. Tess Fen lowers her spear while the sergeant asks what work brought a necromancer onto the county road.`,
            ]
          : variant.id === "reeve-patrol" &&
              factionKnows(
                run.world,
                "county-reeves",
                "hollis-vane-rendered",
              )
            ? [
                "Three hooded lanterns descend from the north. A carrier’s cart follows behind them. The driver keeps her face turned from you.",
                "Sergeant Elian Rusk names Hollis Vane, then names the cuts found in his body. The carrier has described your glass and instruments. Tess Fen lowers her spear while the sergeant orders you to show your hands.",
              ]
            : variant.id === "reliquary-poachers"
              ? [
                  variant.sceneParagraphs[0],
                  poacherRecognitionParagraph(run),
                ]
              : variant.sceneParagraphs;
      return [
        variant.nature === "mundane"
          ? "You reach the road beneath a sky paling toward an unhealthy dawn. Saint Orra’s open vault has drawn lanterns, boot tracks, and armed people toward the stair."
          : "You reach the road beneath a sky paling toward an unhealthy dawn. Saint Orra’s vault exhales behind you, and the Black Mile draws that breath into something unfinished.",
        ...variantParagraphs,
      ];
    },
    choices: [
      {
        id: "wake-guarded",
        label: "Stand behind a funerary ward",
        detail:
          "Hold the threshold and add 5 Ward to whatever still surrounds you, up to 12.",
        effect: "wake-guarded",
      },
      {
        id: "wake-severing",
        label: "Strike before they close",
        detail:
          "Spend 1 Spirit to deal 4 opening damage to every enemy before they settle into formation.",
        effect: "wake-severing",
      },
    ],
  },
} satisfies Partial<Record<StoryId, StoryScene>>;
