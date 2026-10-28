import type { ServantCompact, ServantServicePurposeId } from "./compact";
import type { SomaticCounselActionId } from "./counsel";

export interface BonebinderCounselHistoryEntry {
  actionId: SomaticCounselActionId;
  memoryId: string;
  workReference: string;
  battleReference: string;
  round: number;
}

export interface BonebinderAdvancementState {
  compact: ServantCompact | null;
  counsel: {
    sequence: number;
    lastAction: BonebinderCounselHistoryEntry | null;
  };
}

export const createBonebinderAdvancementState =
  (): BonebinderAdvancementState => ({
    compact: null,
    counsel: { sequence: 0, lastAction: null },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const PURPOSE_IDS = new Set<ServantServicePurposeId>([
  "keep-custody",
  "hold-watch",
  "road-labor",
]);

const COUNSEL_ACTION_IDS = new Set<SomaticCounselActionId>([
  "brace",
  "shove",
  "weapon-technique",
  "guarded-movement",
]);

const isCompact = (value: unknown): value is ServantCompact =>
  isRecord(value) &&
  typeof value.purposeId === "string" &&
  PURPOSE_IDS.has(value.purposeId as ServantServicePurposeId) &&
  (value.status === "kept" || value.status === "breached") &&
  ((value.status === "kept" && value.breachReference === null) ||
    (value.status === "breached" &&
      typeof value.breachReference === "string" &&
      value.breachReference.length > 0));

const isCounselHistoryEntry = (
  value: unknown,
): value is BonebinderCounselHistoryEntry =>
  isRecord(value) &&
  typeof value.actionId === "string" &&
  COUNSEL_ACTION_IDS.has(value.actionId as SomaticCounselActionId) &&
  typeof value.memoryId === "string" &&
  typeof value.workReference === "string" &&
  typeof value.battleReference === "string" &&
  typeof value.round === "number" &&
  Number.isInteger(value.round) &&
  value.round >= 1;

export const isBonebinderAdvancementState = (
  value: unknown,
): value is BonebinderAdvancementState =>
  isRecord(value) &&
  (value.compact === null || isCompact(value.compact)) &&
  isRecord(value.counsel) &&
  typeof value.counsel.sequence === "number" &&
  Number.isInteger(value.counsel.sequence) &&
  value.counsel.sequence >= 0 &&
  (value.counsel.lastAction === null ||
    isCounselHistoryEntry(value.counsel.lastAction));

export const normalizeBonebinderAdvancementState = (
  value: unknown,
): BonebinderAdvancementState => {
  if (!isRecord(value)) return createBonebinderAdvancementState();
  const compact = isCompact(value.compact) ? value.compact : null;
  const counsel = isRecord(value.counsel) ? value.counsel : null;
  const sequence =
    counsel &&
    typeof counsel.sequence === "number" &&
    Number.isFinite(counsel.sequence)
      ? Math.max(0, Math.trunc(counsel.sequence))
      : 0;
  const lastAction =
    counsel && isCounselHistoryEntry(counsel.lastAction)
      ? counsel.lastAction
      : null;
  return {
    compact: compact ? { ...compact } : null,
    counsel: {
      sequence,
      lastAction: lastAction ? { ...lastAction } : null,
    },
  };
};
