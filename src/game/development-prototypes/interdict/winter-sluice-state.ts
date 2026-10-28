import type { TacticalSceneEvent } from "../../tactical-scene";

export const INTERDICT_WINTER_SLUICE_ID =
  "development:interdict:winter-sluice" as const;

export type WinterSluiceOutcome =
  | "claimant-cut"
  | "assumed-delay"
  | "independent-release"
  | "interdiction-blocked"
  | "abandoned";

export interface WinterSluiceConsequences {
  readonly sluice: "held" | "failed";
  readonly flood: "contained" | "lower-bank" | "lower-and-burial-bank";
  readonly displacedHouseholds: number;
  readonly injuredPeople: number;
  readonly burialLoss: "none" | "ground-flooded" | "remains-lost";
}

/**
 * Development-only state. It is intentionally separate from RunState and save
 * migrations until the interaction form has earned production integration.
 */
export interface WinterSluiceState {
  readonly version: 1;
  readonly phase: "preparation" | "resolved";
  readonly practice: "medium";
  readonly water: "upstream-thaw";
  readonly waterRead: boolean;
  readonly masonRecord: "unfound" | "recovered";
  readonly crack: "unknown" | "proved";
  readonly timberAccess: "withheld" | "released";
  readonly millerExchange: "closed" | "open";
  readonly timberSettlement:
    | "purchase"
    | "flood-right"
    | "witnessed-refusal"
    | null;
  readonly millerLabor: "withheld" | "retained" | "withdrawn";
  readonly readyObols: number;
  readonly shoring: 0 | 1 | 2;
  readonly evacuation: 0 | 2;
  readonly treatment: 0 | 1;
  readonly burialCustody: 0 | 1;
  readonly millerAccount: "private" | "public";
  readonly inspector: "unfound" | "hosted" | "at-rest";
  readonly stopGate: "unknown" | "located" | "closed";
  readonly counterRelation: "untested" | "understood" | "misaligned";
  readonly severance: "announced" | "prevented" | "completed" | "superseded";
  readonly instrument: "intact" | "spent";
  readonly binding: "coercive" | "released";
  readonly outcome: WinterSluiceOutcome | null;
  readonly consequences: WinterSluiceConsequences | null;
  readonly completedActionIds: readonly string[];
  readonly events: readonly TacticalSceneEvent[];
}

export const createWinterSluiceState = (): WinterSluiceState => ({
  version: 1,
  phase: "preparation",
  practice: "medium",
  water: "upstream-thaw",
  waterRead: false,
  masonRecord: "unfound",
  crack: "unknown",
  timberAccess: "withheld",
  millerExchange: "closed",
  timberSettlement: null,
  millerLabor: "withheld",
  readyObols: 8,
  shoring: 0,
  evacuation: 0,
  treatment: 0,
  burialCustody: 0,
  millerAccount: "private",
  inspector: "unfound",
  stopGate: "unknown",
  counterRelation: "untested",
  severance: "announced",
  instrument: "intact",
  binding: "coercive",
  outcome: null,
  consequences: null,
  completedActionIds: [],
  events: [],
});

export const copyWinterSluiceState = (
  state: WinterSluiceState,
): WinterSluiceState => ({
  ...state,
  consequences: state.consequences ? { ...state.consequences } : null,
  completedActionIds: [...state.completedActionIds],
  events: [...state.events],
});

export const winterSluiceActionCompleted = (
  state: WinterSluiceState,
  actionId: string,
): boolean => state.completedActionIds.includes(actionId);
