import { WAKE_VARIANTS } from "../game/encounters";
import type { GameState, RunState } from "../game/types";
import type { EndingContent } from "./ending-surface-loader";

export const endingContentFor = (
  run: RunState,
  ending: NonNullable<GameState["ending"]>,
): EndingContent => {
  const encounterId = run.battle?.encounterId;
  const vaultEncounter =
    encounterId === "saint-orra" || (!encounterId && run.battlesWon === 2);
  const wakeEncounter =
    encounterId === "black-mile-wake" || (!encounterId && run.battlesWon >= 3);
  const roadEncounter =
    encounterId === "ossuary-road" || (!encounterId && run.battlesWon === 1);
  const wakeVariant =
    wakeEncounter && run.battle?.variantId
      ? WAKE_VARIANTS[run.battle.variantId]
      : null;
  const continueLabel =
    ending === "victory" && (roadEncounter || vaultEncounter)
      ? roadEncounter
        ? "Take the road to the tollhouse"
        : "Follow the names into the rain"
      : null;
  const content =
    ending === "victory" && wakeEncounter
      ? {
          eyebrow: "Opening testament complete",
          title:
            wakeVariant?.endingTitle ??
            "The Black Mile releases its breath.",
          body:
            wakeVariant?.endingBody ??
            "Whatever followed you from Saint Orra’s vault has spent its final borrowed shape. Dawn finds the road empty and your name still answering to you.",
          note: `You survived three encounters with ${run.player.hp} Health, earned ${run.player.xp} experience, and carried ${run.player.scars.length} ${run.player.scars.length === 1 ? "scar" : "scars"} into the dawn.`,
        }
      : ending === "victory" && vaultEncounter
        ? {
            eyebrow: "The account breaks open",
            title: "Every stolen name escapes at once.",
            body:
              "Saint Orra comes apart denomination by denomination. The names in her walls rise through the vault in a storm of whispers—but the storm bends toward the stair, gathering weight as it climbs.",
            note: `You survived the saint with ${run.player.hp} Health and reached level ${run.player.level}. A discipline point waits in Stats; what escaped has not waited for it.`,
          }
        : ending === "defeat" && wakeVariant
          ? {
              eyebrow: "Testament taken by the wake",
              title: wakeVariant.defeatTitle,
              body: wakeVariant.defeatBody,
              note:
                "This autosave closes the testament. The campaign remains.",
            }
          : ending === "fled" && wakeVariant
            ? {
                eyebrow: "A name carried elsewhere",
                title: wakeVariant.fledTitle,
                body: wakeVariant.fledBody,
                note:
                  "You escaped with every wound, scar, and possession you could carry.",
              }
            : ending === "defeat" && vaultEncounter
              ? {
                  eyebrow: "Testament entered as payment",
                  title: "The saint balances her book.",
                  body:
                    "The jawbone walls take your name. By morning, one more copper tally hangs beneath the tollhouse. The voices below have stopped.",
                  note:
                    "This autosave closes the testament. The campaign remains.",
                }
              : ending === "fled" && vaultEncounter
                ? {
                    eyebrow: "A debt deferred",
                    title: "The stair still leads upward.",
                    body:
                      "You leave Saint Orra the counting room and reach the stair alive. Behind you, every jaw in the wall speaks your name. The sound follows as far as the road.",
                    note:
                      "You escaped the vault with every wound and possession you could carry.",
                  }
                : {
                    victory: {
                      eyebrow: "The road opens",
                      title: "Something moves beneath the tollhouse.",
                      body:
                        "Hollis Vane will collect no more tolls. The ash hound lies still among the markers. Farther north, a warm hearth burns beneath the roofless tollhouse.",
                      note: `You survived with ${run.player.hp} Health, earned ${run.player.xp} experience, and stripped the road of useful spoils.`,
                    },
                    defeat: {
                      eyebrow: "Testament interrupted",
                      title: "The rain closes the book.",
                      body:
                        "Your body remains beside the burial markers. Before dawn, someone takes the hooked knife and leaves the rest to the rain.",
                      note:
                        "This autosave closes the testament. The campaign remains.",
                    },
                    fled: {
                      eyebrow: "The road remains closed",
                      title: "The ditch takes you out of sight.",
                      body:
                        "You crawl through runoff and grave silt until the voices behind you fade. Hollis keeps the road. You leave it alive.",
                      note: "The opening encounter ended in escape.",
                    },
                  }[ending];
  return { ...content, continueLabel };
};
