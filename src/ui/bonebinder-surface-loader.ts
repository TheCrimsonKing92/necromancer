import type { GameState, RunState } from "../game/types";
import type { BonebinderDomResult } from "./bonebinder-dom";

type BattleSurface = typeof import("./battle-servant-render");
type InventorySurface = typeof import("./inventory/servant-render");
type DomSurface = typeof import("./bonebinder-dom");

let battleSurface: BattleSurface | undefined;
let inventorySurface: InventorySurface | undefined;
let domSurface: DomSurface | undefined;
let pendingSurface: Promise<void> | undefined;

export const bonebinderSurfaceNeeded = (
  state: GameState,
): boolean => Boolean(state.run?.practiceStates?.bonebinder);

export const ensureBonebinderSurface = (): Promise<void> => {
  if (battleSurface && inventorySurface && domSurface) return Promise.resolve();
  pendingSurface ??= Promise.all([
    import("./battle-servant-render"),
    import("./inventory/servant-render"),
    import("./bonebinder-dom"),
    import("../styles/battle-servant.css"),
  ]).then(([battle, inventory, dom]) => {
    battleSurface = battle;
    inventorySurface = inventory;
    domSurface = dom;
  });
  return pendingSurface;
};

export const renderLoadedServantCommands = (
  state: GameState,
  selectedTargetId: string | undefined,
): string => battleSurface?.renderServantCommands(
  state,
  selectedTargetId,
) ?? "";

export const loadedServantDirectionRequired = (
  state: GameState,
): boolean => battleSurface?.servantDirectionRequired(state) ?? false;

export const renderLoadedServantDossier = (
  state: GameState,
): string => battleSurface?.renderPersistentServantDossier(state) ?? "";

export const renderLoadedBonebinderInventoryContents = (
  run: RunState,
  readOnly: boolean,
): string => inventorySurface?.renderBonebinderServantContents(run, readOnly) ?? "";

const BONEBINDER_ACTIONS = new Set([
  "servant-command",
  "called-counsel",
  "set-servant-service",
  "repair-servant-part",
  "stabilize-servant-wound",
]);

export const resolveLoadedBonebinderDomAction = (
  state: GameState,
  origin: HTMLElement,
  selectedTargetId?: string,
): Promise<BonebinderDomResult | null> | null => {
  if (!BONEBINDER_ACTIONS.has(origin.dataset.action ?? "")) return null;
  return ensureBonebinderSurface().then(() =>
    domSurface?.resolveBonebinderDomAction(state, origin, selectedTargetId) ?? null
  );
};
