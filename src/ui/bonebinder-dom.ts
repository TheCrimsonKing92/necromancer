import { BODY_PARTS } from "../game/anatomy";
import {
  repairBonebinderServant,
  resolveServantBattleCommand,
} from "../game/engine";
import { resolveCalledCounsel } from "../game/engine/bonebinder-transitions";
import { setServantServicePurpose } from "../game/practices/bonebinder/advancement-transitions";
import { SERVANT_COMMANDS } from "../game/practices/bonebinder/commands";
import {
  SERVANT_SERVICE_PURPOSES,
  ServantServicePurposeId,
} from "../game/practices/bonebinder/compact";
import type { ServantCommandId } from "../game/practices/bonebinder/types";
import type {
  BodyPartId,
  EngineResult,
  GameState,
} from "../game/types";
import type { FocusIntent } from "./focus-management";

export interface BonebinderDomResult {
  result: EngineResult;
  announcesWitness: boolean;
  focusIntent?: FocusIntent;
  patchKind?: "battle-direction";
}

const isServantCommandId = (
  value: string,
): value is ServantCommandId =>
  Object.hasOwn(SERVANT_COMMANDS, value);

const isBodyPartId = (value: string): value is BodyPartId =>
  BODY_PARTS.some(({ id }) => id === value);

const isServicePurposeId = (
  value: string,
): value is ServantServicePurposeId =>
  Object.hasOwn(SERVANT_SERVICE_PURPOSES, value);

export const resolveBonebinderDomAction = (
  state: GameState,
  origin: HTMLElement,
  selectedTargetId?: string,
): BonebinderDomResult | null => {
  if (origin.dataset.action === "servant-command") {
    const commandId = origin.dataset.commandId;
    if (
      !commandId ||
      !isServantCommandId(commandId) ||
      commandId === "await" ||
      commandId === "counsel" ||
      commandId === "labor"
    ) {
      return null;
    }
    return {
      result: resolveServantBattleCommand(
        state,
        commandId,
        commandId === "harry" ? selectedTargetId : undefined,
      ),
      announcesWitness: true,
      patchKind: "battle-direction",
      focusIntent: state.run?.practiceStates?.bonebinder?.servant?.command.current.id === "await"
        ? "act"
        : "preserve",
    };
  }
  if (origin.dataset.action === "called-counsel") {
    return {
      result: resolveCalledCounsel(state, selectedTargetId),
      announcesWitness: true,
      patchKind: "battle-direction",
      focusIntent: state.run?.practiceStates?.bonebinder?.servant?.command.current.id === "await"
        ? "act"
        : "preserve",
    };
  }
  if (origin.dataset.action === "set-servant-service") {
    const purposeId = origin.dataset.purposeId;
    if (!purposeId || !isServicePurposeId(purposeId)) return null;
    return {
      result: setServantServicePurpose(state, purposeId),
      announcesWitness: false,
    };
  }
  if (origin.dataset.action === "repair-servant-part") {
    const part = origin.dataset.partId;
    if (!part || !isBodyPartId(part)) return null;
    return {
      result: repairBonebinderServant(state, {
        kind: "reinforce-part",
        part,
      }),
      announcesWitness: false,
    };
  }
  if (origin.dataset.action === "stabilize-servant-wound") {
    const woundId = origin.dataset.woundId;
    if (!woundId) return null;
    return {
      result: repairBonebinderServant(state, {
        kind: "stabilize-wound",
        woundId,
      }),
      announcesWitness: false,
    };
  }
  return null;
};
