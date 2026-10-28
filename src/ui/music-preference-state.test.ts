import { describe, expect, it } from "vitest";
import {
  MUSIC_PREFERENCE_STORAGE_KEY,
  musicControlLabel,
  readMusicPreference,
} from "./music-preference-state";

describe("music preference", () => {
  it("defaults to silence and admits only the explicit on value", () => {
    expect(readMusicPreference({ getItem: () => null })).toBe("off");
    expect(readMusicPreference({ getItem: () => "broken" })).toBe("off");
    expect(readMusicPreference({
      getItem: (key) => key === MUSIC_PREFERENCE_STORAGE_KEY ? "on" : null,
    })).toBe("on");
  });

  it("describes both control states as actions", () => {
    expect(musicControlLabel("off")).toContain("Activate to turn it on");
    expect(musicControlLabel("on")).toContain("Activate to turn it off");
  });
});
