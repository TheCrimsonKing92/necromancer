export interface BackgroundMusicCue {
  readonly id: string;
  readonly url: string;
}

export const BACKGROUND_MUSIC_CUES: readonly BackgroundMusicCue[] = Object.freeze([
  {
    id: "ominous3-calm",
    url: new URL(
      "../assets/audio/ominous3-calm-loop.ogg",
      import.meta.url,
    ).href,
  },
  {
    id: "atmosphere-dark",
    url: new URL(
      "../assets/audio/atmosphere-dark-loop.ogg",
      import.meta.url,
    ).href,
  },
]);
