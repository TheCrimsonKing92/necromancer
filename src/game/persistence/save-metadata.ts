import {
  LEGACY_SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  SAVE_KEY,
  V2_SAVE_KEY,
  type StorageLike,
} from "./schema";

const SAVE_KEYS = [
  SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  V2_SAVE_KEY,
  LEGACY_SAVE_KEY,
] as const;
const METADATA_PREFIX_LIMIT = 4_096;
const SAVED_AT_FIELD = /"savedAt"\s*:\s*("(?:\\.|[^"\\])*")/u;
const STATE_FIELD = /"state"\s*:/u;

export interface SaveMetadata {
  readonly savedAt: string;
  readonly key: (typeof SAVE_KEYS)[number];
}

const savedAtFromSerializedEnvelope = (raw: string): string | null => {
  const prefix = raw.slice(0, METADATA_PREFIX_LIMIT);
  const stateField = STATE_FIELD.exec(prefix);
  const envelopeHeader = stateField
    ? prefix.slice(0, stateField.index)
    : prefix;
  const match = SAVED_AT_FIELD.exec(envelopeHeader);
  if (!match?.[1]) return null;
  try {
    const savedAt: unknown = JSON.parse(match[1]);
    return typeof savedAt === "string" ? savedAt : null;
  } catch {
    return null;
  }
};

/**
 * Read only the small envelope header used by the title screen. Full parsing,
 * migration, validation, and practice admission remain loadGame concerns.
 */
export const readSaveMetadata = (
  storage: Pick<StorageLike, "getItem">,
): SaveMetadata | null => {
  for (const key of SAVE_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const savedAt = savedAtFromSerializedEnvelope(raw);
      if (savedAt) return { savedAt, key };
    } catch {
      return null;
    }
  }
  return null;
};

export const clearSaveKeys = (
  storage: Pick<StorageLike, "removeItem">,
): boolean => {
  try {
    for (const key of SAVE_KEYS) storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export type { StorageLike };
