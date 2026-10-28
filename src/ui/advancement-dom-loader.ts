import type {
  AdvancementId,
  EngineResult,
  GameState,
} from "../game/types";

type AdvancementDom = typeof import("./advancement-dom");

let loading: Promise<AdvancementDom> | undefined;

const loadAdvancementDom = (): Promise<AdvancementDom> =>
  loading ??= import("./advancement-dom");

export const selectAdvancementFromElement = async (
  root: HTMLElement,
  state: GameState,
  origin: HTMLElement,
): Promise<AdvancementId | undefined> => {
  const domain = await loadAdvancementDom();
  const advancementId = domain.advancementSelectionFromElement(state, origin);
  if (advancementId) {
    domain.patchAdvancementSelection(root, state, advancementId);
  }
  return advancementId;
};

export const transitionAdvancementFromElement = async (
  state: GameState,
  origin: HTMLElement,
): Promise<{
  advancementId: AdvancementId;
  result: EngineResult;
} | undefined> => {
  const domain = await loadAdvancementDom();
  return domain.advancementTransitionFromElement(state, origin);
};

export const patchAdvancementTransition = async (
  root: HTMLElement,
  state: GameState,
  selectedId: string,
): Promise<boolean> => {
  const domain = await loadAdvancementDom();
  return domain.patchAdvancementTransition(root, state, selectedId);
};
