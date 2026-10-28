import type {
  EconomyServiceId,
  EngineResult,
  GameState,
  ItemId,
} from "../types";

export interface ReliquaryMarketRuntime {
  isOpen: (state: GameState) => boolean;
  sell: (state: GameState, itemId: ItemId) => EngineResult;
  buy: (state: GameState, itemId: ItemId) => EngineResult;
  barter: (state: GameState, itemId: ItemId) => EngineResult;
  buyService: (
    state: GameState,
    serviceId: EconomyServiceId,
  ) => EngineResult;
}

let runtime: ReliquaryMarketRuntime | undefined;

export const installReliquaryMarketRuntime = (
  next: ReliquaryMarketRuntime,
): void => {
  runtime = next;
};

const unavailable = (state: GameState): EngineResult => ({
  state,
  error: "The reliquary counter has not been prepared.",
});

export const isReliquaryOpen = (state: GameState): boolean =>
  runtime?.isOpen(state) ?? false;

export const sellItem = (state: GameState, itemId: ItemId): EngineResult =>
  runtime?.sell(state, itemId) ?? unavailable(state);

export const buyItem = (state: GameState, itemId: ItemId): EngineResult =>
  runtime?.buy(state, itemId) ?? unavailable(state);

export const barterForItem = (
  state: GameState,
  itemId: ItemId,
): EngineResult => runtime?.barter(state, itemId) ?? unavailable(state);

export const buyReliquaryService = (
  state: GameState,
  serviceId: EconomyServiceId,
): EngineResult => runtime?.buyService(state, serviceId) ?? unavailable(state);
