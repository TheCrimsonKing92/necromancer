import "../styles/chronicle.css";
import { readStoredChronicle } from "../game/persistence/chronicle-storage";
import type { StorageLike } from "../game/persistence/schema";
import { renderChronicle } from "./chronicle-render";

export const renderSavedChronicle = (storage: StorageLike): string =>
  renderChronicle(readStoredChronicle(storage));
