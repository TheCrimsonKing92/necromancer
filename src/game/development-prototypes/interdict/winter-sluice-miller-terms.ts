import type {
  TacticalSceneCost,
  TacticalSceneKnownConsequence,
} from "../../tactical-scene";
import type { WinterSluiceState } from "./winter-sluice-state";

export const millerLaborPrice = (state: WinterSluiceState): number =>
  state.timberSettlement === "witnessed-refusal" ? 5 : 3;

export const millerCourseCosts = (
  actionId: string,
  state: WinterSluiceState,
): readonly TacticalSceneCost[] | undefined => {
  const amount = actionId === "buy-mill-stores"
    ? 6
    : actionId === "retain-miller-crews" ? millerLaborPrice(state) : null;
  return amount === null ? undefined : [{
    kind: "resource",
    resourceId: "obols",
    resourceLabel: "obols",
    amount,
    available: state.readyObols,
  }];
};

export const millerShoringConsequence = (
  state: WinterSluiceState,
): TacticalSceneKnownConsequence => ({
  kind: "world-state",
  label: state.millerLabor === "retained" ? "Complete shoring" : "Emergency shoring",
  detail: state.millerLabor === "retained"
    ? "The miller's foreman knows the covered face and keeps his crews at the wall."
    : "Town crews have the material, but not the miller's foreman or his practiced hands.",
});
