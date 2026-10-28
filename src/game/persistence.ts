import type { GameState } from "./types";
import { clearSaveKeys } from "./persistence/save-metadata";
import { parseCurrentEnvelope, parseCurrentValue } from "./persistence/current-save";
import {
  migrateLegacyState,
  promoteV2Value,
  promoteV3Value,
} from "./persistence/legacy-migrations";
import {
  LEGACY_SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  RESUMABLE_SCREENS,
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  V2_SAVE_KEY,
} from "./persistence/schema";
import type {
  SaveEnvelope,
  StorageLike,
} from "./persistence/schema";
import { isRecord } from "./persistence/validation";

export {
  LEGACY_SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  V2_SAVE_KEY,
};
export type { SaveEnvelope, StorageLike };

export const saveGame = (
  storage: StorageLike,
  state: GameState,
  now: () => Date = () => new Date(),
): boolean => {
  if (!state.run || !RESUMABLE_SCREENS.has(state.screen)) return false;

  const envelope: SaveEnvelope = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: now().toISOString(),
    state,
  };

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
};

const persistMigratedSave = (
  storage: StorageLike,
  envelope: SaveEnvelope,
): void => {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // A readable prior save remains playable if migration cannot persist.
  }
};

const loadPromotedSave = (
  storage: StorageLike,
  key: string,
  promote: (parsed: unknown) => unknown,
): SaveEnvelope | null => {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const promoted = promote(JSON.parse(raw));
  const envelope = parseCurrentValue(promoted);
  if (envelope) persistMigratedSave(storage, envelope);
  return envelope;
};

const loadLegacySave = (
  storage: StorageLike,
): SaveEnvelope | null => {
  const raw = storage.getItem(LEGACY_SAVE_KEY);
  if (!raw) return null;
  const legacyEnvelope: unknown = JSON.parse(raw);
  if (
    !isRecord(legacyEnvelope) ||
    legacyEnvelope.schemaVersion !== 1 ||
    typeof legacyEnvelope.savedAt !== "string"
  ) {
    return null;
  }

  const state = migrateLegacyState(legacyEnvelope.state);
  if (!state) return null;
  const migrated: SaveEnvelope = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: legacyEnvelope.savedAt,
    state,
  };
  persistMigratedSave(storage, migrated);
  return migrated;
};

export const loadGame = (
  storage: StorageLike,
): SaveEnvelope | null => {
  try {
    const currentRaw = storage.getItem(SAVE_KEY);
    if (currentRaw) {
      const current = parseCurrentEnvelope(currentRaw);
      if (current) return current;
    }

    const previous = loadPromotedSave(
      storage,
      PREVIOUS_SAVE_KEY,
      promoteV3Value,
    );
    if (previous) return previous;

    const v2 = loadPromotedSave(
      storage,
      V2_SAVE_KEY,
      promoteV2Value,
    );
    if (v2) return v2;

    return loadLegacySave(storage);
  } catch {
    return null;
  }
};

export const clearSave = clearSaveKeys;
