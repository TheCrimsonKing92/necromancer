import type {
  TacticalSceneEvent,
  TacticalSceneTransition,
} from "../../tactical-scene";
import type { WinterSluiceState } from "./winter-sluice-state";

export const createWinterSluiceEvent = (
  state: WinterSluiceState,
  actionId: string,
  subjectId: string | undefined,
  eyebrow: string,
  title: string,
  detail: string,
  result?: string,
): TacticalSceneEvent => ({
  id: `${actionId}:${state.completedActionIds.length + 1}`,
  subjectId,
  eyebrow,
  title,
  detail,
  result,
});

export const finishWinterSluiceAction = (
  state: WinterSluiceState,
  actionId: string,
  event: TacticalSceneEvent,
): TacticalSceneTransition<WinterSluiceState> => {
  const next = {
    ...state,
    completedActionIds: [...state.completedActionIds, actionId],
    events: [...state.events, event],
  };
  return { state: next, event };
};
