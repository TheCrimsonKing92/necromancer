import type {
  WinterSluiceConsequences,
  WinterSluiceState,
} from "./winter-sluice-state";

export const winterSluiceWaterConsequences = (
  state: WinterSluiceState,
): WinterSluiceConsequences => {
  const held = state.shoring === 2 || state.stopGate === "closed";
  const partialBrace = state.shoring === 1;
  const displacedHouseholds = held ? 0 : state.evacuation === 2
    ? state.waterRead
      ? partialBrace ? 2 : 4
      : partialBrace ? 4 : 8
    : partialBrace ? 20 : 40;
  const injuredPeople = held ? 0 : state.evacuation === 2
    ? state.treatment === 1
      ? state.waterRead ? partialBrace ? 0 : 1 : partialBrace ? 1 : 3
      : state.waterRead ? partialBrace ? 2 : 5 : partialBrace ? 4 : 8
    : state.treatment === 1
      ? state.waterRead ? partialBrace ? 3 : 6 : partialBrace ? 4 : 8
      : partialBrace ? 9 : 17;
  return {
    sluice: held ? "held" : "failed",
    flood: held
      ? "contained"
      : state.burialCustody === 1
        ? "lower-bank"
        : "lower-and-burial-bank",
    displacedHouseholds,
    injuredPeople,
    burialLoss: held
      ? "none"
      : state.burialCustody === 1 ? "ground-flooded" : "remains-lost",
  };
};

export const winterSluiceResolutionResult = (
  consequences: WinterSluiceConsequences,
): string => consequences.sluice === "held"
  ? "Sluice held · flood contained · no households displaced · burial ground dry"
  : `Sluice failed · ${consequences.displacedHouseholds} households displaced · ${consequences.injuredPeople} injured · ${consequences.burialLoss === "remains-lost" ? "remains lost" : "marked remains retained"}`;
