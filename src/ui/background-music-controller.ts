import {
  BACKGROUND_MUSIC_CUES,
  type BackgroundMusicCue,
} from "./background-music-catalog";

const RESTRAINED_VOLUME = 0.22;

export interface MusicAudio {
  src: string;
  loop: boolean;
  preload: string;
  volume: number;
  play: () => Promise<void>;
  pause: () => void;
  removeAttribute: (name: string) => void;
  remove?: () => void;
  readonly element?: Node;
  load: () => void;
  addEventListener: (
    type: "ended" | "error",
    listener: EventListener,
  ) => void;
  removeEventListener: (
    type: "ended" | "error",
    listener: EventListener,
  ) => void;
}

export class BackgroundMusicController {
  private audio?: MusicAudio;
  private requested = false;
  private cueIndex = 0;
  private readonly failedCueIndexes = new Set<number>();

  constructor(
    private readonly documentRef: Pick<Document, "hidden" | "addEventListener" | "removeEventListener">,
    private readonly createAudio: () => MusicAudio,
    private readonly cues: readonly BackgroundMusicCue[] = BACKGROUND_MUSIC_CUES,
  ) {
    if (cues.length === 0) throw new Error("Background music requires at least one cue.");
    documentRef.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  async play(): Promise<void> {
    this.requested = true;
    if (this.documentRef.hidden) return;
    const audio = this.audio ?? this.createCue();
    try {
      await audio.play();
    } catch {
      // A browser may still withhold playback. The explicit control remains available.
    }
  }

  pause(): void {
    this.requested = false;
    this.failedCueIndexes.clear();
    this.audio?.pause();
  }

  dispose(): void {
    this.requested = false;
    this.documentRef.removeEventListener("visibilitychange", this.handleVisibilityChange);
    if (!this.audio) return;
    this.audio.removeEventListener("ended", this.handleCueEnded);
    this.audio.removeEventListener("error", this.handleCueError);
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio.remove?.();
    this.audio = undefined;
  }

  private createCue(): MusicAudio {
    const audio = this.createAudio();
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = RESTRAINED_VOLUME;
    audio.src = this.cueAt(this.cueIndex).url;
    audio.addEventListener("ended", this.handleCueEnded);
    audio.addEventListener("error", this.handleCueError);
    audio.load();
    this.audio = audio;
    return audio;
  }

  private handleVisibilityChange = (): void => {
    if (this.documentRef.hidden) {
      this.audio?.pause();
    } else if (this.requested) {
      void this.play();
    }
  };

  private handleCueEnded = (): void => {
    this.advanceCue(false);
  };

  private handleCueError = (): void => {
    this.advanceCue(true);
  };

  private advanceCue(failed: boolean): void {
    if (!this.requested || this.documentRef.hidden || !this.audio) return;
    if (failed) this.failedCueIndexes.add(this.cueIndex);

    const nextIndex = this.findNextPlayableCue();
    if (nextIndex === undefined) {
      this.audio.pause();
      return;
    }

    this.audio.pause();
    this.cueIndex = nextIndex;
    this.audio.src = this.cueAt(nextIndex).url;
    this.audio.load();
    void this.play();
  }

  private findNextPlayableCue(): number | undefined {
    for (let offset = 1; offset <= this.cues.length; offset += 1) {
      const candidate = (this.cueIndex + offset) % this.cues.length;
      if (!this.failedCueIndexes.has(candidate)) return candidate;
    }
    return undefined;
  }

  private cueAt(index: number): BackgroundMusicCue {
    const cue = this.cues[index];
    if (!cue) throw new Error(`Unknown background music cue index: ${index}.`);
    return cue;
  }
}
