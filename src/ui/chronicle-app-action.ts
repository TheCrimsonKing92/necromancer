import type { StorageLike } from "../game/persistence";
import { completeDomUpdate } from "./focus-management";

export const openChronicleAppSurface = async (
  root: HTMLElement,
  storage: StorageLike,
): Promise<boolean> => {
  try {
    const chronicle = await import("./chronicle-surface");
    root.innerHTML = chronicle.renderSavedChronicle(storage);
    completeDomUpdate(root, "page");
    return true;
  } catch {
    return false;
  }
};
