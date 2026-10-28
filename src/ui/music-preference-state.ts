export const MUSIC_PREFERENCE_STORAGE_KEY = "necro:music:v1";

export type MusicPreference = "off" | "on";

export const readMusicPreference = (
  storage: Pick<Storage, "getItem">,
): MusicPreference =>
  storage.getItem(MUSIC_PREFERENCE_STORAGE_KEY) === "on" ? "on" : "off";

export const musicControlLabel = (preference: MusicPreference): string =>
  preference === "on"
    ? "Background music: on. Activate to turn it off."
    : "Background music: off. Activate to turn it on.";
