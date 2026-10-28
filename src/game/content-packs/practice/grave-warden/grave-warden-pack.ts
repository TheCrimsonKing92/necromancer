import type { ContentPack } from "../../types";
import { installGraveWardenRuntimeAdapter } from "../../grave-warden-runtime";
import {
  breachAnswerBonusFor,
  closeGateUnavailableReason,
  closeTheGate,
  commitBreachAnswer,
  graveWardenBattleSummary,
  initializeGraveWardenBattle,
  resolveThresholdSealBreach,
  setThresholdSeal,
  thresholdSealUnavailableReason,
} from "../../../practices/grave-warden/battle";
import {
  beginGraveWardenPractice,
  normalizeGraveWardenRun,
} from "../../../practices/grave-warden/practice-state";

export const activateGraveWardenPackRuntime = (): void => {
  installGraveWardenRuntimeAdapter({
    initializeBattle: initializeGraveWardenBattle,
    sealUnavailableReason: thresholdSealUnavailableReason,
    setSeal: setThresholdSeal,
    resolveBreach: resolveThresholdSealBreach,
    commitAnswer: commitBreachAnswer,
    answerBonusFor: breachAnswerBonusFor,
    closeUnavailableReason: closeGateUnavailableReason,
    closeGate: closeTheGate,
    battleSummary: graveWardenBattleSummary,
    initializePractice: beginGraveWardenPractice,
    normalizeRun: normalizeGraveWardenRun,
    validatePracticeState: (value) =>
      value === undefined || typeof value === "object" && value !== null,
    validateBattleState: (value) =>
      value === undefined || typeof value === "object" && value !== null,
  });
};

const GRAVE_WARDEN_CONTENT_PACK: ContentPack = Object.freeze({
  id: "practice:grave-warden",
  version: 1,
  dependencies: ["core"] as const,
  definitions: {},
  lifecycle: {
    activate: activateGraveWardenPackRuntime,
    initializePractice: beginGraveWardenPractice,
    normalizeRunState: normalizeGraveWardenRun,
  },
  rules: {
    playerActions: [
      { id: "set-threshold-seal" },
      { id: "answer-the-breach" },
      { id: "close-the-gate" },
    ],
    advancementEffects: [{ id: "threshold-discipline" }],
  },
});

export default GRAVE_WARDEN_CONTENT_PACK;
