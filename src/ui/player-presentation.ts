import type { Player } from "../game/types";

export const inventoryQuantity = (player: Player): number =>
  Object.values(player.inventory).reduce(
    (total, quantity) => total + (quantity ?? 0),
    0,
  );
