import {
  barterForItem,
  buyItem,
  buyReliquaryService,
  sellItem,
  activateReliquaryMarketRuntime,
} from "../../game/economy/reliquary-transitions";
import type { EngineResult, GameState } from "../../game/types";
import { RELIQUARY_SERVICES, type ReliquaryServiceId } from "../../game/reliquary-market";
import { isItemId } from "../input-identifiers";

activateReliquaryMarketRuntime();

const isReliquaryServiceId = (
  value: string,
): value is ReliquaryServiceId =>
  RELIQUARY_SERVICES.some(({ id }) => id === value);

export const resolveReliquaryMarketAppAction = (
  state: GameState,
  origin: HTMLElement,
): EngineResult | null => {
  if (origin.dataset.action === "sell-item") {
    const itemId = origin.dataset.itemId;
    return itemId && isItemId(itemId) ? sellItem(state, itemId) : null;
  }
  if (origin.dataset.action === "buy-item") {
    const itemId = origin.dataset.itemId;
    return itemId && isItemId(itemId) ? buyItem(state, itemId) : null;
  }
  if (origin.dataset.action === "barter-item") {
    const itemId = origin.dataset.itemId;
    return itemId && isItemId(itemId)
      ? barterForItem(state, itemId)
      : null;
  }
  if (origin.dataset.action === "buy-reliquary-service") {
    const serviceId = origin.dataset.serviceId;
    return serviceId && isReliquaryServiceId(serviceId)
      ? buyReliquaryService(state, serviceId)
      : null;
  }
  return null;
};
