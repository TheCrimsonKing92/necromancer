import type { RunState } from "../../../types";

export const FIRE_ROAD_PACK_ID =
  "integration:fire-road:moving-shade-proof" as const;
export const FIRE_ROAD_SCENE_ID = "moving-shade:fire-road" as const;
export const FIRE_ROAD_HOUSEHOLDS_AT_RISK = 18;
export const FIRE_ROAD_GRAIN_LOADS_AT_RISK = 12;
export const FIRE_ROAD_INITIAL_OPERATING_ROOM = 3;
export const FIRE_ROAD_MAX_OPERATING_ROOM = 4;
export const FIRE_ROAD_FAILED_NEGOTIATION_GRAIN_COST = 1;

export type FireRoadHazard = "east-wind" | "kiln-fall" | "warehouse-sparks";
export type FireRoadOutcome =
  | "subjected"
  | "bounded-passage"
  | "ordinary-rescue"
  | "array-broken"
  | "abandoned";
export type FireRoadPreparationId =
  | "firebreak"
  | "smoke-station"
  | "open-wells"
  | "secure-carts"
  | "dead-keeper"
  | "servant-labor"
  | "rendered-lane"
  | "kept-bridge"
  | "host-need"
  | "witnessed-offer";

export interface FireRoadState {
  phase: "arrival" | "response" | "resolved";
  hazard: FireRoadHazard;
  preparations: FireRoadPreparationId[];
  preparationResults: Partial<
    Record<FireRoadPreparationId, "success" | "failure" | "certain">
  >;
  /** Remaining substantial preparations before the fire closes this phase. */
  operatingRoom: number;
  counterofferAttempted: boolean;
  counterofferAccepted: boolean | null;
  outcome: FireRoadOutcome | null;
  rescuedHouseholds: number | null;
  lostGrainLoads: number | null;
}

export const createFireRoadState = (seed: number): FireRoadState => ({
  phase: "arrival",
  hazard: (["east-wind", "kiln-fall", "warehouse-sparks"] as const)[
    Math.abs(seed) % 3
  ]!,
  preparations: [],
  preparationResults: {},
  operatingRoom: FIRE_ROAD_INITIAL_OPERATING_ROOM,
  counterofferAttempted: false,
  counterofferAccepted: null,
  outcome: null,
  rescuedHouseholds: null,
  lostGrainLoads: null,
});

export const fireRoadStateFor = (run: RunState): FireRoadState => {
  const envelope = run.packStates?.[FIRE_ROAD_PACK_ID];
  const value = envelope?.version === 1 ? envelope.value : undefined;
  if (value && typeof value === "object" && "phase" in value) {
    return value as FireRoadState;
  }
  throw new Error("The Fire Road proof state has not been initialized.");
};

export const fireRoadIsResolved = (run: RunState): boolean =>
  (run.packStates?.[FIRE_ROAD_PACK_ID]?.value as
    | Partial<FireRoadState>
    | undefined)?.phase === "resolved";

export const fireRoadOperatingRoom = (state: FireRoadState): number =>
  typeof state.operatingRoom === "number"
    ? Math.max(0, Math.min(FIRE_ROAD_MAX_OPERATING_ROOM, state.operatingRoom))
    : FIRE_ROAD_INITIAL_OPERATING_ROOM;

export const initializeFireRoadState = (run: RunState): FireRoadState => {
  const state = createFireRoadState(run.seed);
  run.packStates ??= {};
  run.packStates[FIRE_ROAD_PACK_ID] = { version: 1, value: state };
  return state;
};

const RESCUE_PREPARATIONS = new Set<FireRoadPreparationId>([
  "firebreak",
  "smoke-station",
  "open-wells",
  "secure-carts",
  "dead-keeper",
  "servant-labor",
  "rendered-lane",
  "kept-bridge",
]);

export const fireRoadRescueScore = (state: FireRoadState): number =>
  state.preparations.filter((id) => RESCUE_PREPARATIONS.has(id)).reduce(
    (score, id) =>
      score +
      (state.preparationResults[id] === "failure" ? 1 : 2),
    0,
  );

export const fireRoadHouseholdsUnaccountedFor = (state: FireRoadState): number =>
  Math.max(0, FIRE_ROAD_HOUSEHOLDS_AT_RISK - (state.rescuedHouseholds ?? 0));

export const fireRoadSavedGrainLoads = (state: FireRoadState): number =>
  Math.max(
    0,
    FIRE_ROAD_GRAIN_LOADS_AT_RISK -
      (state.lostGrainLoads ?? FIRE_ROAD_GRAIN_LOADS_AT_RISK),
  );

export type FireRoadWinterOutlook =
  | "supplied"
  | "rationed"
  | "shortage"
  | "dire-shortage";

export const fireRoadWinterOutlook = (
  state: FireRoadState,
): FireRoadWinterOutlook => {
  const saved = fireRoadSavedGrainLoads(state);
  if (saved >= 9) return "supplied";
  if (saved >= 6) return "rationed";
  if (saved >= 3) return "shortage";
  return "dire-shortage";
};
