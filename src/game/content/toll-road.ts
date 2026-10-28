import {
  allWounds,
  bodyConditionPercentage,
} from "../anatomy";
import { equippedWeapon } from "../items";
import { CAMPAIGN_PREPARATIONS } from "../campaign-preparations";
import { worldHasFact } from "../world/state";
import type { StoryId, StoryScene } from "../types";
import { TRADITIONS } from "./definitions";
import {
  renderingOutcomeBody,
  renderingOutcomeResult,
  renderingOutcomeRewards,
  tollhouseRecoveryParagraph,
} from "./outcome-copy";
import { seededLine } from "./shared";

export const TOLL_ROAD_SCENES = {
  "ossuary-road": {
    id: "ossuary-road",
    eyebrow: "North of Vey · Ossuary Road",
    title: "The toll collectors",
    paragraphs: (run) => [
      seededLine(run, 0x6f737375, [
        "The rain thins to a gray veil. Ahead, old burial markers lean from the ditch like rotten teeth.",
        "Runoff has filled the cart ruts with white grave silt. Every burial marker on the north verge tilts toward the road.",
        "The mile smells of wet limestone and dog. Someone has tied fresh red cord around three of the oldest burial posts.",
      ]),
      run.flags.includes("heard-warning")
        ? "The floorboard ghost spoke truly: one silhouette closes the road while an ash-colored hound circles through the sedge. Its warning arrives a heartbeat before each movement, and the hush it opened behind your breath has not closed."
        : "One silhouette closes the road. His ash-colored hound is already circling through the sedge.",
      "The man sees the grave instruments at your belt. His hand closes around a hooked knife. “Road tax,” he says. The hound lowers itself in the wet grass.",
    ],
    choices: [
      {
        id: "open-ground",
        label: "Meet them in the open",
        detail:
          "Step into view and set your feet before the hound can finish circling.",
        effect: "open-ground",
      },
      {
        id: "dead-advance",
        label: "Let the buried announce you",
        detail:
          "Spend 1 Spirit and let the graves reach the toll collectors before you do.",
        effect: "dead-advance",
      },
    ],
  },
  "road-aftermath": {
    id: "road-aftermath",
    eyebrow: "Ossuary Road · After the toll",
    title: "What the reeve kept",
    paragraphs: (run) => {
      const wounds = allWounds(run.player);
      const weapon = equippedWeapon(run.player);
      const ledgerText = run.flags.includes("read-ledger")
        ? "Hollis’s ledger lies open to the rain. The ward-name now reads plainly. The map calls the tollhouse abandoned; the name beneath it remains active."
        : "Inside Hollis’s satchel, a toll ledger records payments from travelers who never reached either end of the road. Beneath the final name is a map of the abandoned tollhouse ahead—and a ward-name written backward in grave wax.";
      const traditionClue =
        run.player.tradition === "medium"
          ? run.flags.includes("hollis-testimony")
            ? "Hollis’s jaw has gone still. The taste of grave wax and his last frightened memory remain behind your teeth."
            : "Hollis’s dead tongue moves around an unfinished word. You could let him borrow your mouth long enough to finish it. The crossing will cost you."
          : run.player.tradition === "summoner"
            ? run.flags.includes("bound-ash-hound")
              ? "The hound’s carcass casts no shadow. Its shade waits at your heel, newly attentive to your voice."
              : "The hound’s shade worries at its own teeth, unable to follow the body into stillness. It looks from the road to you, waiting for an authority it understands."
            : run.player.tradition === "grave-warden"
              ? run.flags.includes("grave-warden-road-seal")
                ? "The failed funerary boundary has narrowed under your custody. It waits on the road as a line that can be carried forward."
                : "Hollis died across a funerary boundary he did not understand. Its broken line still holds enough continuity to be taken into custody."
              : worldHasFact(run.world, "hollis-vane-rendered")
              ? "Hollis lies opened beneath the burial markers. Rain gathers in the cut vessels and carries a thin gray wash toward the ditch."
              : run.flags.includes("rendered-grave-heat")
                ? "The hound’s rendered heat rests in your glass. Hollis still carries Saint Orra’s residue in his blood and burial wax."
                : "Saint Orra’s residue remains in Hollis’s blood and burial wax. On an open road, recovering it will take time and leave a recognizable body.";

      return [
        weapon.name === "Hollis’s hooked knife"
          ? "Hollis Vane lies among the leaning markers. His road leathers, the hound’s teeth, and the hooked knife are wet with the same rain."
          : `Hollis Vane lies among the leaning markers. Beside him are road leathers, the hound’s teeth, and a hooked knife heavier than your ${weapon.name.toLowerCase()}.`,
        wounds.length > 0
          ? `The fight has left you with ${wounds.length} ${wounds.length === 1 ? "wound" : "wounds"}. Your body holds at ${bodyConditionPercentage(run.player)} percent condition. Rainwater runs through the injuries without cleaning them.`
          : "You have taken no new wound. Rain runs through Hollis’s blood and gathers in the cart ruts.",
        ledgerText,
        traditionClue,
      ];
    },
    choices: [
      {
        id: "read-ledger",
        label: "Learn the ward-name",
        detail:
          "Study the backward inscription before the rain takes the ink. Ward-names sometimes notice who turns them.",
        effect: "study-ledger",
        signal: "risk",
        mode: "interaction",
        outcome: {
          eyebrow: "The ledger answers",
          title: "The name turns right-side out.",
          body: (run) =>
            run.flags.includes("ward-name-noticed")
              ? "Grave wax loosens under your thumb. The ward-name turns right-side out and strips certainty from Saint Orra. The ink splits around one pale eye. It looks your way, and your own certainty goes thin beneath its notice."
              : "Grave wax loosens under your thumb. The ward-name turns right-side out and strips certainty from Saint Orra. For one breath, something on the other side of the ink considers looking back, then passes over you.",
          result: (run) =>
            run.flags.includes("ward-name-noticed")
              ? "5 experience gained · Saint Orra begins with −1 Defense · The name looks back: you begin Exposed 1 for 2 rounds"
              : "5 experience gained · Saint Orra begins with −1 Defense · The name passes over you without answering",
          rewards: [
            {
              kind: "effect",
              label: CAMPAIGN_PREPARATIONS["ward-name"].name,
              description:
                CAMPAIGN_PREPARATIONS["ward-name"].description,
            },
          ],
        },
      },
      {
        id: "question-hollis",
        label: "Give Hollis your mouth",
        detail:
          "Surrender up to 2 Health and let the dead reeve finish speaking through you.",
        effect: "medium-communion",
        tradition: "medium",
        mode: "interaction",
        outcome: {
          eyebrow: "Communion",
          title: "Hollis speaks with your teeth.",
          body:
            "His last memory arrives as a mouthful of copper: the cellar, the counting room, and the moment he learned what Saint Orra collects from those who cannot pay.",
          result: (run) => {
            const costFlag = [...run.flags]
              .reverse()
              .find((flag) =>
                flag.startsWith("hollis-health-cost:") ||
                flag.startsWith("hollis-vitality-cost:"),
              );
            const healthCost = costFlag?.split(":").at(-1) ?? "0";
            return `${healthCost} Health surrendered · Maximum Spirit +1 · Spirit +1 · 3 Ward reserved for Saint Orra`;
          },
          rewards: [
            {
              kind: "effect",
              label:
                CAMPAIGN_PREPARATIONS["hollis-testimony"].name,
              description:
                CAMPAIGN_PREPARATIONS["hollis-testimony"]
                  .description,
            },
          ],
        },
      },
      {
        id: "bind-hound",
        label: "Teach the hound a new master",
        detail:
          "Spend one ash-hound tooth and offer its lingering shade a binding.",
        effect: "summoner-hound",
        tradition: "summoner",
        mode: "interaction",
        outcome: {
          eyebrow: "The binding takes",
          title: "The shade submits.",
          body:
            "The tooth cracks between your fingers. Its shade noses the powder, remembers the shape of obedience, and settles at your heel.",
          result: () =>
            "Ash-hound tooth −1 · The shade will join the next encounter for 3 rounds",
          rewards: [
            {
              kind: "effect",
              label:
                CAMPAIGN_PREPARATIONS["bound-ash-hound"].name,
              description:
                CAMPAIGN_PREPARATIONS["bound-ash-hound"]
                  .description,
            },
          ],
        },
      },
      {
        id: "render-hollis",
        label: "Render what Hollis carried",
        detail:
          "Work on a recent body beside an open road. The yield is uncertain, and the road is not empty.",
        effect: "thaumaturgist-render",
        tradition: "thaumaturgist",
        signal: "risk",
        mode: "interaction",
        outcome: {
          eyebrow: "Roadside rendering",
          title: "The road keeps the evidence.",
          body: renderingOutcomeBody,
          result: renderingOutcomeResult,
          rewards: renderingOutcomeRewards,
        },
      },
      {
        id: "keep-road-seal",
        label: "Take custody of the broken boundary",
        detail:
          "Spend 1 Spirit to keep one fold of the failed funerary line for the confrontation ahead.",
        effect: "grave-warden-road-seal",
        tradition: "grave-warden",
        mode: "interaction",
        outcome: {
          eyebrow: "Threshold custody",
          title: "The broken line holds.",
          body:
            "You mark where the boundary failed, close one end beneath your hand, and leave the other answerable to whatever ordered the crossing.",
          result: () =>
            "1 Spirit spent · One threshold seal will begin the Saint Orra encounter already set",
          rewards: [
            {
              kind: "effect",
              label:
                CAMPAIGN_PREPARATIONS["grave-warden-road-seal"].name,
              description:
                CAMPAIGN_PREPARATIONS["grave-warden-road-seal"].description,
            },
          ],
        },
      },
      {
        id: "leave-aftermath",
        label: "Follow the map to the hollow tollhouse",
        detail:
          "Leave the wet markers behind and follow Hollis’s map to the roofless tollhouse.",
        effect: "leave-aftermath",
      },
    ],
  },
  "hollow-tollhouse": {
    id: "hollow-tollhouse",
    eyebrow: "Black Mile · The Hollow Tollhouse",
    title: "Warmth beneath the ruin",
    paragraphs: (run) => {
      const pathClue = run.flags.includes("burial-cut-route")
        ? run.flags.includes("burial-tally")
          ? "The burial crew’s lower road ends at the cold hearth. Their stamped tally warms over a cellar door hidden under the ash."
          : "The burial paving ends at the cold hearth. Water from the washout slips between the stones and vanishes beneath a cellar door hidden under the ash."
        : run.flags.includes("hollis-testimony")
          ? "Hollis’s borrowed memory leads you to a cellar door hidden under the cold hearth. From below, Saint Orra counts each heartbeat twice."
          : run.flags.includes("bound-ash-hound")
            ? "The hound’s new shade circles the hearth, hackles raised at a cellar door hidden under the ash. Something below remembers training it."
            : worldHasFact(run.world, "hollis-vane-rendered")
              ? "A line of gray salt left from Hollis’s rendering darkens when you cross the hearth. It points toward a cellar door hidden under the ash."
              : run.flags.includes("rendered-grave-heat")
                ? "The hound’s rendered heat clouds its glass near a cellar door hidden under the ash."
                : "Hollis’s map leads to a cellar door hidden under the cold hearth. Something below counts your footsteps as you approach.";
      const ledgerClue = run.flags.includes("read-ledger")
        ? [
            "The ledger names the presence below: Saint Orra, patron of debts that survive the debtor. Her ward-name is also the first thing she surrendered.",
          ]
        : [];

      return [
        "The tollhouse has no roof, yet its hearth is warm. Every coin nailed over the lintel bears the same erased face.",
        pathClue,
        ...ledgerClue,
        "The cellar door is not locked. Below it, the counting continues.",
      ];
    },
    choices: [
      {
        id: "rest-first",
        label: "Take one careful hour",
        detail:
          "Tend what hurts and gather your Spirit while the presence below prepares.",
        effect: "rest-tollhouse",
      },
      {
        id: "descend-now",
        label: "Keep the advantage of surprise",
        detail:
          "Go now, before the thing beneath the hearth can finish what it has begun.",
        effect: "press-descent",
      },
    ],
  },
  "ossuary-vault": {
    id: "ossuary-vault",
    eyebrow: "Below the Black Mile · Saint Orra’s Vault",
    title: "The debt that learned to pray",
    paragraphs: (run) => [
      "The stair ends in a counting room built from jawbones. Copper tallies hang from every tooth. Together they chatter out the names from Hollis’s ledger.",
      ...(run.flags.includes("rested-at-tollhouse")
        ? [tollhouseRecoveryParagraph(run)]
        : []),
      run.flags.includes("pressed-descent")
        ? "You arrive before the room can finish becoming a body. A grave-iron mask turns toward you while its ribs are still assembling."
        : "The room has used your hour well. It waits upright in a grave-iron mask, one hand closed around a crozier made from linked finger bones.",
      `“Outstanding balance,” Saint Orra says. The voice comes from every jaw in the walls. “One life, payable now.” Your training as a ${TRADITIONS[run.player.tradition].name.toLowerCase()} tells you what remains: a hunger held together by ledgers, burial vows, and stolen names.`,
    ],
    choices: [
      {
        id: "warded-descent",
        label: "Enter under a funerary ward",
        detail:
          "Add 6 Ward to whatever you already carry, up to 12.",
        effect: "warded-descent",
      },
      {
        id: "break-jaw-seal",
        label: "Break the jaw-seal",
        detail:
          "Spend 1 Spirit to tear at the jawbone seal holding Saint Orra together.",
        effect: "shatter-seal",
      },
    ],
  },
} satisfies Partial<Record<StoryId, StoryScene>>;
