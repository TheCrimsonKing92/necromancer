import { nextRandom, normalizeSeed } from "../random";
import { cloneRouteState } from "./navigation";
import { routeRequirementsSatisfied } from "./predicates";
import type {
  RegionalRouteGraph,
  RegionalRouteState,
  RoutePoolEntryDefinition,
  RoutePoolSelectionResult,
  RouteReadContext,
} from "./types";

const hashId = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const mixSelectionSeed = (seed: number, poolId: string): number => {
  let mixed = normalizeSeed(seed) ^ hashId(poolId);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return normalizeSeed((mixed ^ (mixed >>> 16)) >>> 0);
};

const eligibleEntries = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
  poolId: string,
): readonly RoutePoolEntryDefinition[] =>
  (graph.pools[poolId]?.entries ?? []).filter((entry) =>
    routeRequirementsSatisfied(
      state,
      context,
      entry.requires,
      entry.excludes,
    ),
  );

export const selectRoutePoolEntry = (
  graph: RegionalRouteGraph,
  state: RegionalRouteState,
  context: RouteReadContext,
  poolId: string,
): RoutePoolSelectionResult | null => {
  const eligible = eligibleEntries(graph, state, context, poolId);
  if (eligible.length === 0) return null;

  const seen = state.seenByPool[poolId] ?? [];
  const unseen = eligible.filter((entry) => !seen.includes(entry.id));
  const candidates = unseen.length > 0 ? unseen : eligible;
  const totalWeight = candidates.reduce((total, entry) => total + entry.weight, 0);
  if (totalWeight <= 0) return null;

  const random = nextRandom(mixSelectionSeed(state.seed, poolId));
  const threshold = random.value * totalWeight;
  let cursor = 0;
  let selected = candidates[candidates.length - 1]!;
  for (const candidate of candidates) {
    cursor += candidate.weight;
    if (threshold < cursor) {
      selected = candidate;
      break;
    }
  }

  const next = cloneRouteState(state);
  next.seed = random.seed;
  next.seenByPool[poolId] =
    unseen.length === 0 ? [selected.id] : [...seen, selected.id];

  return {
    state: next,
    selection: {
      seed: random.seed,
      poolId,
      entryId: selected.id,
      contentId: selected.contentId,
      disposition: selected.disposition,
    },
  };
};
