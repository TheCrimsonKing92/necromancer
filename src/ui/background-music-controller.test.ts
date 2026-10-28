import { describe, expect, it, vi } from "vitest";
import {
  BackgroundMusicController,
  type MusicAudio,
} from "./background-music-controller";

const documentHarness = () => {
  const listeners = new Map<string, EventListener>();
  return {
    documentRef: {
      hidden: false,
      addEventListener: (name: string, listener: EventListenerOrEventListenerObject) => {
        listeners.set(name, listener as EventListener);
      },
      removeEventListener: (name: string) => listeners.delete(name),
    },
    dispatch: (name: string) => listeners.get(name)?.(new Event(name)),
    listenerCount: () => listeners.size,
  };
};

const audioHarness = () => {
  const listeners = new Map<string, EventListener>();
  const audio: MusicAudio = {
    src: "",
    loop: true,
    preload: "auto",
    volume: 1,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
    remove: vi.fn(),
    load: vi.fn(),
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
  };
  return {
    audio,
    dispatch: (name: "ended" | "error") =>
      listeners.get(name)?.(new Event(name)),
    listenerCount: () => listeners.size,
  };
};

const cues = [
  { id: "first", url: "https://example.test/first.ogg" },
  { id: "second", url: "https://example.test/second.ogg" },
] as const;

describe("background music controller", () => {
  it("does not create or decode audio until explicitly played", async () => {
    const page = documentHarness();
    const media = audioHarness();
    const createAudio = vi.fn(() => media.audio);
    const controller = new BackgroundMusicController(
      page.documentRef,
      createAudio,
      cues,
    );

    expect(createAudio).not.toHaveBeenCalled();
    await controller.play();

    expect(createAudio).toHaveBeenCalledOnce();
    expect(media.audio.src).toBe(cues[0].url);
    expect(media.audio.preload).toBe("auto");
    expect(media.audio.loop).toBe(false);
    expect(media.audio.volume).toBe(0.22);
    expect(media.audio.load).toHaveBeenCalledOnce();
    expect(media.audio.play).toHaveBeenCalledOnce();
  });

  it("cycles without an immediate repeat and uses one media element", async () => {
    const page = documentHarness();
    const media = audioHarness();
    const createAudio = vi.fn(() => media.audio);
    const controller = new BackgroundMusicController(
      page.documentRef,
      createAudio,
      cues,
    );
    await controller.play();

    media.dispatch("ended");
    await Promise.resolve();
    expect(media.audio.src).toBe(cues[1].url);
    expect(media.audio.play).toHaveBeenCalledTimes(2);

    media.dispatch("ended");
    await Promise.resolve();
    expect(media.audio.src).toBe(cues[0].url);
    expect(media.audio.play).toHaveBeenCalledTimes(3);
    expect(createAudio).toHaveBeenCalledOnce();
  });

  it("skips an erroring cue and stops retrying when every cue has failed", async () => {
    const page = documentHarness();
    const media = audioHarness();
    const controller = new BackgroundMusicController(
      page.documentRef,
      () => media.audio,
      cues,
    );
    await controller.play();

    media.dispatch("error");
    await Promise.resolve();
    expect(media.audio.src).toBe(cues[1].url);
    expect(media.audio.play).toHaveBeenCalledTimes(2);

    media.dispatch("ended");
    await Promise.resolve();
    expect(media.audio.src).toBe(cues[1].url);
    expect(media.audio.play).toHaveBeenCalledTimes(3);

    media.dispatch("error");
    await Promise.resolve();
    expect(media.audio.play).toHaveBeenCalledTimes(3);
  });

  it("pauses while hidden, resumes only while requested, and releases listeners and resources", async () => {
    const page = documentHarness();
    const media = audioHarness();
    const controller = new BackgroundMusicController(
      page.documentRef,
      () => media.audio,
      cues,
    );
    await controller.play();

    page.documentRef.hidden = true;
    page.dispatch("visibilitychange");
    expect(media.audio.pause).toHaveBeenCalledOnce();

    page.documentRef.hidden = false;
    page.dispatch("visibilitychange");
    expect(media.audio.play).toHaveBeenCalledTimes(2);

    controller.pause();
    page.dispatch("visibilitychange");
    expect(media.audio.play).toHaveBeenCalledTimes(2);

    controller.dispose();
    expect(media.audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(media.audio.load).toHaveBeenCalledTimes(2);
    expect(media.audio.remove).toHaveBeenCalledOnce();
    expect(media.listenerCount()).toBe(0);
    expect(page.listenerCount()).toBe(0);
  });
});
