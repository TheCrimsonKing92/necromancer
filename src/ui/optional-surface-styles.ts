let inventorySurfaceStyles: Promise<unknown> | undefined;
let journalSurfaceStyles: Promise<unknown> | undefined;
let statsSurfaceStyles: Promise<unknown> | undefined;

export const ensureInventorySurfaceStyles = (): Promise<unknown> => {
  inventorySurfaceStyles ??= import("../styles/inventory-surface.css");
  return inventorySurfaceStyles;
};

export const ensureJournalSurfaceStyles = (): Promise<unknown> => {
  journalSurfaceStyles ??= import("../styles/journal-surface.css");
  return journalSurfaceStyles;
};

export const ensureStatsSurfaceStyles = (): Promise<unknown> => {
  statsSurfaceStyles ??= import("../styles/stats-surface.css");
  return statsSurfaceStyles;
};
