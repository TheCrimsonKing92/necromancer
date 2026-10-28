import type { GameState, ScreenId } from "../types";

export const SAVE_KEY = "necromancer:save:v4";
export const PREVIOUS_SAVE_KEY = "necromancer:save:v3";
export const V2_SAVE_KEY = "necromancer:save:v2";
export const LEGACY_SAVE_KEY = "necromancer:save:v1";
export const SAVE_SCHEMA_VERSION = 4;

export const RESUMABLE_SCREENS = new Set<ScreenId>([
  "story",
  "battle",
  "inventory",
  "journal",
  "ending",
]);

export const LEGACY_RESUMABLE_SCREENS = new Set<ScreenId>([
  "story",
  "battle",
  "ending",
]);

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveEnvelope {
  schemaVersion: 4;
  savedAt: string;
  state: GameState;
}
