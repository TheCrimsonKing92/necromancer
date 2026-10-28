import {
  MUSIC_PREFERENCE_STORAGE_KEY,
  musicControlLabel,
  readMusicPreference,
  type MusicPreference,
} from "./music-preference-state";
import { BackgroundMusicController } from "./background-music-controller";

export const installMusicPreference = (
  documentRef: Document,
  storage: Pick<Storage, "getItem" | "setItem">,
  controllerFactory: () => BackgroundMusicController = () =>
    new BackgroundMusicController(documentRef, () => {
      const element = documentRef.createElement("audio");
      documentRef.body.append(element);
      return Object.assign(element, { element });
    }),
): (() => void) => {
  const control = documentRef.querySelector<HTMLButtonElement>("[data-music-control]");
  if (!control) return () => undefined;

  let preference: MusicPreference = readMusicPreference(storage);
  let controller: BackgroundMusicController | undefined;
  let disposed = false;

  const renderControl = (): void => {
    control.setAttribute("aria-pressed", String(preference === "on"));
    control.setAttribute("aria-label", musicControlLabel(preference));
    control.dataset.musicState = preference;
    const status = control.querySelector<HTMLElement>("[data-music-status]");
    if (status) status.textContent = preference === "on" ? "On" : "Off";
  };

  const ensureController = (): BackgroundMusicController | undefined => {
    if (disposed) return undefined;
    if (controller) return controller;
    controller = controllerFactory();
    return controller;
  };

  const handleControl = (): void => {
    preference = preference === "on" ? "off" : "on";
    storage.setItem(MUSIC_PREFERENCE_STORAGE_KEY, preference);
    renderControl();
    if (preference === "on") void ensureController()?.play();
    else controller?.pause();
  };

  const resumePersistedPreference = (): void => {
    documentRef.removeEventListener("pointerdown", resumePersistedPreference, true);
    documentRef.removeEventListener("keydown", resumePersistedPreference, true);
    void ensureController()?.play();
  };

  renderControl();
  control.addEventListener("click", handleControl);
  if (preference === "on") {
    documentRef.addEventListener("pointerdown", resumePersistedPreference, true);
    documentRef.addEventListener("keydown", resumePersistedPreference, true);
  }

  return () => {
    disposed = true;
    control.removeEventListener("click", handleControl);
    documentRef.removeEventListener("pointerdown", resumePersistedPreference, true);
    documentRef.removeEventListener("keydown", resumePersistedPreference, true);
    controller?.dispose();
  };
};
