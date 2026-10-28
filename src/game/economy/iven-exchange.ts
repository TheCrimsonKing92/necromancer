import { itemCount, removeItem } from "../items";
import type { RunState } from "../types";
import { learnWorldFact } from "../world/state";

export const IVEN_GRAVE_SALT_PRICE = 3;

export const sellGraveSaltToIven = (run: RunState): string | null => {
  if (itemCount(run.player.inventory, "grave-salt") < 1) {
    return "Iven cannot weigh grave salt you do not carry.";
  }

  removeItem(run.player.inventory, "grave-salt");
  run.player.obols += IVEN_GRAVE_SALT_PRICE;
  learnWorldFact(run.world, "dealt-with-iven");
  return null;
};
