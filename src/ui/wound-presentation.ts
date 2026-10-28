import {
  allWounds,
  combinedWoundEffects,
  woundEffects,
} from "../game/anatomy";
import type { Player, Wound } from "../game/types";

export const woundEffectLabels = (wound: Wound): string[] => {
  const effects = woundEffects(wound);
  return [
    effects.attackPenalty > 0
      ? `−${effects.attackPenalty} Attack and Accuracy`
      : "",
    effects.defensePenalty > 0
      ? `−${effects.defensePenalty} Defense and Evasion`
      : "",
    effects.fleePenalty > 0
      ? `−${effects.fleePenalty} points to flee chance`
      : "",
    effects.bleedPerRound > 0
      ? `Loses ${effects.bleedPerRound} Health each round until dressed`
      : "",
  ].filter(Boolean);
};

export const combinedWoundEffectLabels = (
  player: Player,
): string[] => {
  const effects = combinedWoundEffects(player);
  return [
    effects.attackPenalty > 0
      ? `−${effects.attackPenalty} Attack and Accuracy`
      : "",
    effects.defensePenalty > 0
      ? `−${effects.defensePenalty} Defense and Evasion`
      : "",
    effects.fleePenalty > 0
      ? `−${effects.fleePenalty} points to flee chance`
      : "",
    effects.bleedPerRound > 0
      ? `${effects.bleedPerRound} Health lost each round`
      : "",
  ].filter(Boolean);
};

export const recoveryBurdenLabel = (player: Player): string => {
  const steps = combinedWoundEffects(player).recoverySteps;
  const wounds = allWounds(player);
  const hasBindingWound = wounds.some(
    (wound) => wound.care === "binding",
  );
  const hasRestInjury = wounds.some((wound) => wound.care === "rest");
  const outcomes = [
    hasBindingWound ? "bound wounds may close as scars" : "",
    hasRestInjury ? "closed injuries heal with safe rest" : "",
  ].filter(Boolean);
  return `${steps} ${steps === 1 ? "recovery" : "recoveries"} before the slowest injury resolves${outcomes.length > 0 ? `; ${outcomes.join("; ")}` : ""}`;
};
