import { describe, expect, it } from "vitest";
import {
  LEGACY_SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  SAVE_KEY,
  V2_SAVE_KEY,
} from "./schema";
import { clearSaveKeys, readSaveMetadata } from "./save-metadata";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("save metadata", () => {
  it("reads the current envelope header without requiring its state", () => {
    const storage = new MemoryStorage();
    storage.values.set(
      SAVE_KEY,
      `{"schemaVersion":4,"savedAt":"2026-08-04T12:00:00.000Z","state":${" ".repeat(10_000)}}`,
    );

    expect(readSaveMetadata(storage)).toEqual({
      key: SAVE_KEY,
      savedAt: "2026-08-04T12:00:00.000Z",
    });
  });

  it("falls through malformed and missing headers to an older envelope", () => {
    const storage = new MemoryStorage();
    storage.values.set(SAVE_KEY, "not-json");
    storage.values.set(
      PREVIOUS_SAVE_KEY,
      '{"schemaVersion":3,"savedAt":"older","state":{}}',
    );

    expect(readSaveMetadata(storage)).toEqual({
      key: PREVIOUS_SAVE_KEY,
      savedAt: "older",
    });
  });

  it("does not mistake state-owned text for envelope metadata", () => {
    const storage = new MemoryStorage();
    storage.values.set(
      SAVE_KEY,
      '{"schemaVersion":4,"state":{"savedAt":"not-envelope-metadata"}}',
    );

    expect(readSaveMetadata(storage)).toBeNull();
  });

  it("clears every supported save generation", () => {
    const storage = new MemoryStorage();
    for (const key of [SAVE_KEY, PREVIOUS_SAVE_KEY, V2_SAVE_KEY, LEGACY_SAVE_KEY]) {
      storage.values.set(key, "save");
    }

    expect(clearSaveKeys(storage)).toBe(true);
    expect(storage.values.size).toBe(0);
  });
});
