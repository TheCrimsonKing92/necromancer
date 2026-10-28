import type { GameState, RunState } from "../game/types";

export interface EndingContent {
  eyebrow: string;
  title: string;
  body: string;
  note: string;
  continueLabel: string | null;
}

type EndingContentSelector = (
  run: RunState,
  ending: NonNullable<GameState["ending"]>,
) => EndingContent;

let endingContentFor: EndingContentSelector | undefined;
let pendingSurface: Promise<void> | undefined;

export const ensureEndingSurface = (): Promise<void> => {
  pendingSurface ??= Promise.all([
    import("./ending-content"),
    import("../styles/ending.css"),
  ]).then(([ending]) => {
    endingContentFor = ending.endingContentFor;
  });
  return pendingSurface;
};

export const loadedEndingContentFor = (
  state: GameState,
): EndingContent | null =>
  state.run && state.ending && endingContentFor
    ? endingContentFor(state.run, state.ending)
    : null;
