import type { ContentPack } from "../../types";
import { installBonebinderRuntimeAdapter } from "../../bonebinder-runtime";
import {
  allocateServantCommand,
  completeServantCommand,
  deployPersistentServantForBattle,
  getServantCommandUnavailableReason,
  interposingServantFor,
  resolvePersistentServantCommand,
  servantDirectionRequiredFor,
  syncPersistentServantFromBattle,
} from "../../../practices/bonebinder/battle";
import { resolveQueuedServantCounsel } from "../../../practices/bonebinder/advancement-battle-hooks";
import "../../../practices/bonebinder/advancement-battle";
import { raisePreparedInterpositionWard } from "../../../practices/bonebinder/interposition-advancement";
import { beginDitchHandPractice } from "../../../practices/bonebinder/ditch-hand";
import { repairBonebinderServantInPack } from "../../../practices/bonebinder/inventory";
import {
  isBonebinderPracticeStateInPack,
  normalizeCurrentBonebinderRunInPack,
} from "../../../practices/bonebinder/persistence-runtime";

export const activateBonebinderPackRuntime = (): void => {
  installBonebinderRuntimeAdapter({
    deployForBattle: deployPersistentServantForBattle,
    syncFromBattle: syncPersistentServantFromBattle,
    commandUnavailableReason: getServantCommandUnavailableReason,
    allocateCommand: allocateServantCommand,
    directionRequiredFor: servantDirectionRequiredFor,
    resolveCommand: resolvePersistentServantCommand,
    interposingServantFor,
    completeCommand: completeServantCommand,
    resolveQueuedCounsel: resolveQueuedServantCounsel,
    raisePreparedInterpositionWard,
    repairServant: repairBonebinderServantInPack,
    normalizeCurrentRun: normalizeCurrentBonebinderRunInPack,
    validatePracticeState: isBonebinderPracticeStateInPack,
  });
};

const BONEBINDER_CONTENT_PACK: ContentPack = Object.freeze({
  id: "practice:bonebinder",
  version: 1,
  dependencies: ["core"] as const,
  definitions: {},
  lifecycle: {
    activate: activateBonebinderPackRuntime,
    initializePractice: beginDitchHandPractice,
    normalizeRunState: normalizeCurrentBonebinderRunInPack,
  },
});

export default BONEBINDER_CONTENT_PACK;
