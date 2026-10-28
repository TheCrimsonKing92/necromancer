import { mundaneCheckChance, type MundaneCheck } from "../../../checks";
import { checkProspectForChance, type CheckProspect } from "../../../check-prospect";
import type { Player } from "../../../types";
import type { FireRoadPreparationId, FireRoadState } from "./state";

const LEVERAGE_PREPARATIONS = new Set<FireRoadPreparationId>([
  "open-wells",
  "host-need",
  "witnessed-offer",
]);

export const fireRoadNegotiatingLeverage = (state: FireRoadState): number =>
  state.preparations.filter(
    (id) =>
      LEVERAGE_PREPARATIONS.has(id) &&
      state.preparationResults[id] !== "failure",
  ).length;

export const fireRoadCounterofferCheck = (
  state: FireRoadState,
): MundaneCheck => ({
  skill: "persuasion",
  difficulty: Math.max(0, 20 - fireRoadNegotiatingLeverage(state) * 8),
});

export const fireRoadCounterofferChance = (
  player: Player,
  state: FireRoadState,
): number => mundaneCheckChance(player, fireRoadCounterofferCheck(state));

export const fireRoadCounterofferProspect = (
  player: Player,
  state: FireRoadState,
): CheckProspect => checkProspectForChance(fireRoadCounterofferChance(player, state));

export const fireRoadCounterofferFooting = (
  state: FireRoadState,
): "weak" | "uncertain" | "credible" => {
  const leverage = fireRoadNegotiatingLeverage(state);
  if (leverage === 0) return "weak";
  if (leverage === 1) return "uncertain";
  return "credible";
};
