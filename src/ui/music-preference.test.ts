import { describe, expect, it, vi } from "vitest";
import { installMusicPreference } from "./music-preference";
import { MUSIC_PREFERENCE_STORAGE_KEY } from "./music-preference-state";

const controlHarness = () => {
  const listeners = new Map<string, EventListener>();
  const status = { textContent: "Off" };
  const attributes = new Map<string, string>();
  const control = {
    dataset: { musicState: "off" },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    querySelector: () => status,
    addEventListener: (name: string, listener: EventListenerOrEventListenerObject) =>
      listeners.set(name, listener as EventListener),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  return {
    control,
    status,
    attributes,
    click: () => listeners.get("click")?.(new Event("click")),
    listenerCount: () => listeners.size,
  };
};

describe("music preference control", () => {
  it("loads only on an explicit opt-in, persists, toggles locally, and disposes", () => {
    const harness = controlHarness();
    const documentListeners = new Map<string, EventListener>();
    const documentRef = {
      querySelector: () => harness.control,
      addEventListener: (name: string, listener: EventListenerOrEventListenerObject) =>
        documentListeners.set(name, listener as EventListener),
      removeEventListener: (name: string) => documentListeners.delete(name),
    } as unknown as Document;
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const controller = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      dispose: vi.fn(),
    };
    const factory = vi.fn(() => controller as never);

    const dispose = installMusicPreference(documentRef, storage, factory);
    expect(factory).not.toHaveBeenCalled();
    expect(harness.attributes.get("aria-pressed")).toBe("false");

    harness.click();
    expect(factory).toHaveBeenCalledOnce();
    expect(controller.play).toHaveBeenCalledOnce();
    expect(values.get(MUSIC_PREFERENCE_STORAGE_KEY)).toBe("on");
    expect(harness.status.textContent).toBe("On");

    harness.click();
    expect(controller.pause).toHaveBeenCalledOnce();
    expect(values.get(MUSIC_PREFERENCE_STORAGE_KEY)).toBe("off");

    dispose();
    expect(controller.dispose).toHaveBeenCalledOnce();
    expect(harness.listenerCount()).toBe(0);
  });
});
