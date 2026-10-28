import type { TacticalSceneTransition } from "../../tactical-scene";
import { copyWinterSluiceState, type WinterSluiceState } from "./winter-sluice-state";
import {
  createWinterSluiceEvent,
  finishWinterSluiceAction,
} from "./winter-sluice-events";

type WaterActionHandler = (
  state: WinterSluiceState,
  actionId: string,
) => TacticalSceneTransition<WinterSluiceState>;

const finishWaterAction = (
  state: WinterSluiceState,
  actionId: string,
  subjectId: string,
  next: WinterSluiceState,
  copy: {
    readonly eyebrow: string;
    readonly title: string;
    readonly detail: string;
    readonly result: string;
  },
): TacticalSceneTransition<WinterSluiceState> => finishWinterSluiceAction(
  next,
  actionId,
  createWinterSluiceEvent(
    state,
    actionId,
    subjectId,
    copy.eyebrow,
    copy.title,
    copy.detail,
    copy.result,
  ),
);

export const WINTER_SLUICE_WATER_HANDLERS: Readonly<Record<string, WaterActionHandler>> = {
  "read-winter-water": (state, actionId) => finishWaterAction(
    state,
    actionId,
    "river-presence",
    { ...copyWinterSluiceState(state), waterRead: true },
    {
      eyebrow: "THE THAW IS READ",
      title: "The lower bank lies first in the water's road.",
      detail: "Ice marks and reed fall show the upstream thaw pressing toward the occupied bank before the burial rise.",
      result: "First flood path known · evacuation routes and treatment stations can be placed before the water arrives",
    },
  ),
  "inspect-old-stone": (state, actionId) => finishWaterAction(
    state,
    actionId,
    "old-sluice",
    { ...copyWinterSluiceState(state), crack: "proved" },
    {
      eyebrow: "THE HOLLOW COURSE",
      title: "The old measurements no longer fit.",
      detail: "Hammer-sound breaks hollow beneath a course the mason marked sound. The damage runs below Sivra's estimate; his notes end where the covered works begin.",
      result: "Deep crack proved · the reeve takes the mason's measure and turns back toward the mill yard",
    },
  ),
  "evacuate-lower-bank": (state, actionId) => finishWaterAction(
    state,
    actionId,
    "lower-bank",
    { ...copyWinterSluiceState(state), evacuation: 2 },
    {
      eyebrow: "THE LOWER BANK MOVES",
      title: "Carts take households before property.",
      detail: "Cart places and the care of unattended homes are settled. Four households refuse the road; no one will drag them from their thresholds.",
      result: state.waterRead
        ? "Evacuation prepared along the first flood path · displacement and injury sharply reduced if the sluice fails"
        : "Evacuation prepared by the town's best estimate · tracing the thaw can reduce missed households if the sluice fails",
    },
  ),
  "establish-treatment": (state, actionId) => finishWaterAction(
    state,
    actionId,
    "lower-bank",
    { ...copyWinterSluiceState(state), treatment: 1 },
    {
      eyebrow: "WARM HANDS WAIT",
      title: "The flood will not deliver its wounded to bare stone.",
      detail: state.waterRead
        ? "Bindings, lamps, and warmed shelter stand above the marked flood path under a healer's direction."
        : "Bindings, lamps, and warmed shelter stand on the reeve's safest high ground. Without the thaw traced, the wounded may arrive elsewhere.",
      result: state.waterRead
        ? "Treatment established along the first flood path · later injuries sharply reduced"
        : "Treatment established · later injuries reduced; tracing the thaw can place the stations better",
    },
  ),
};
