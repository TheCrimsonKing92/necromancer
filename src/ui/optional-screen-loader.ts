import type { GameState } from "../game/types";
import {
  ensureInventorySurfaceStyles,
  ensureJournalSurfaceStyles,
} from "./optional-surface-styles";

type InventoryScreen = typeof import("./inventory-render");
type InventoryDom = typeof import("./inventory-dom-patch");
type InventoryMarketActions = typeof import("./inventory/market-app-action");
type JournalScreen = typeof import("./journal-render");

let inventoryScreen: InventoryScreen | undefined;
let inventoryDom: InventoryDom | undefined;
let inventoryMarketActions: InventoryMarketActions | undefined;
let journalScreen: JournalScreen | undefined;
let pendingInventory: Promise<void> | undefined;
let pendingJournal: Promise<void> | undefined;

export const ensureInventoryScreenSurface = (): Promise<void> => {
  pendingInventory ??= Promise.all([
    ensureInventorySurfaceStyles(),
    import("./inventory-render"),
    import("./inventory-dom-patch"),
    import("./inventory/market-app-action"),
  ]).then(([, inventory, inventoryPatcher, marketActions]) => {
    inventoryScreen = inventory;
    inventoryDom = inventoryPatcher;
    inventoryMarketActions = marketActions;
  });
  return pendingInventory;
};

export const ensureJournalScreenSurface = (): Promise<void> => {
  pendingJournal ??= Promise.all([
    ensureJournalSurfaceStyles(),
    import("./journal-render"),
  ]).then(([, journal]) => {
    journalScreen = journal;
  });
  return pendingJournal;
};

/** Compatibility entry point for callers that intentionally need both screens. */
export const ensureOptionalScreenSurface = async (): Promise<void> => {
  await Promise.all([
    ensureInventoryScreenSurface(),
    ensureJournalScreenSurface(),
  ]);
};

export const renderLoadedInventory = (state: GameState): string =>
  inventoryScreen?.renderInventory(state) ?? "";

export const renderLoadedJournal = (state: GameState): string =>
  journalScreen?.renderJournal(state) ?? "";

export const patchLoadedInventoryDom = (
  root: HTMLElement,
  previousState: GameState,
  nextState: GameState,
): boolean =>
  inventoryDom?.patchInventoryDom(root, previousState, nextState) ?? false;

export const resolveLoadedReliquaryMarketAppAction = (
  state: GameState,
  origin: HTMLElement,
) =>
  inventoryMarketActions?.resolveReliquaryMarketAppAction(state, origin) ?? null;
