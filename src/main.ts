import "./styles.css";
import { NecromancerBootstrap } from "./ui/bootstrap";
import { installTextScalePreference } from "./ui/text-scale-preference";
import { installMusicPreference } from "./ui/music-preference";

if (import.meta.env.DEV) void import("./styles/development-tools.css");

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Necromancer could not find its application root.");
}

installTextScalePreference(document, window.localStorage);
const disposeMusic = installMusicPreference(document, window.localStorage);
window.addEventListener("pagehide", disposeMusic, { once: true });
new NecromancerBootstrap(root, window.localStorage).mount();
