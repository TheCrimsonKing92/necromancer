import type { PersistentServantCombatant } from "./types";
import { normalizeCurrentCombatant } from "../../persistence/combatant-compatibility";
import {
  isCombatant,
  isFiniteNumber,
  isRecord,
} from "../../persistence/validation";
import type { RunState } from "../../types";
import {
  isBonebinderAdvancementState,
  normalizeBonebinderAdvancementState,
} from "./advancement-persistence";

export const normalizeCurrentBonebinderRunInPack = (run: RunState): void => {
  const practice = run.practiceStates?.bonebinder;
  if (!practice) return;
  practice.advancement = normalizeBonebinderAdvancementState(
    practice.advancement,
  );
  const servant = practice.servant;
  if (!servant) return;
  normalizeCurrentCombatant(servant.combatant);
  servant.combatant.kind = "ally";
  servant.combatant.materiality = "corporeal";
  servant.combatant.anatomy = "humanoid";
  servant.combatant.lifetime = {
    kind: "persistent",
    servantId: servant.identity.id,
  };
  servant.command.sequence = Math.max(0, Math.trunc(servant.command.sequence));
  servant.repairs.sequence = Math.max(0, Math.trunc(servant.repairs.sequence));
  servant.repairs.history = servant.repairs.history.map((record) => ({
    ...record,
    healthRestored: Number.isFinite(record.healthRestored)
      ? Math.max(0, Math.trunc(record.healthRestored))
      : 0,
  }));
};

export const isBonebinderPracticeStateInPack = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (
    value.advancement !== undefined &&
    !isBonebinderAdvancementState(value.advancement)
  ) {
    return false;
  }
  if (value.servant === null) return true;
  const servant = value.servant;
  return (
    isRecord(servant) &&
    isRecord(servant.identity) &&
    typeof servant.identity.id === "string" &&
    typeof servant.identity.useName === "string" &&
    isRecord(servant.identity.bodyIdentity) &&
    Array.isArray(servant.identity.bodyIdentity.recognitionMarks) &&
    servant.identity.bodyIdentity.recognitionMarks.every(
      (mark) => typeof mark === "string",
    ) &&
    isCombatant(servant.combatant) &&
    isRecord(servant.combatant) &&
    isRecord(servant.combatant.lifetime) &&
    servant.combatant.lifetime.kind === "persistent" &&
    typeof servant.combatant.lifetime.servantId === "string" &&
    isRecord(servant.worldReferences) &&
    typeof servant.worldReferences.provenanceId === "string" &&
    Array.isArray(servant.worldReferences.claimIds) &&
    servant.worldReferences.claimIds.every((id) => typeof id === "string") &&
    Array.isArray(servant.worldReferences.recognitionEvidenceIds) &&
    servant.worldReferences.recognitionEvidenceIds.every(
      (id) => typeof id === "string",
    ) &&
    Array.isArray(servant.capabilities) &&
    Array.isArray(servant.somaticMemories) &&
    isRecord(servant.command) &&
    isFiniteNumber(servant.command.sequence) &&
    isRecord(servant.command.current) &&
    typeof servant.command.current.id === "string" &&
    isRecord(servant.repairs) &&
    isFiniteNumber(servant.repairs.sequence) &&
    Array.isArray(servant.repairs.history)
  );
};

export const syncSavedPersistentServant = (run: RunState): void => {
  const servant = run.practiceStates?.bonebinder?.servant;
  const activePersistent = servant
    ? run.battle?.allies.find(
        (ally) =>
          ally.lifetime.kind === "persistent" &&
          ally.lifetime.servantId === servant.identity.id,
      )
    : undefined;
  if (servant && activePersistent?.materiality === "corporeal") {
    servant.combatant = structuredClone(
      activePersistent,
    ) as PersistentServantCombatant;
  }
};
