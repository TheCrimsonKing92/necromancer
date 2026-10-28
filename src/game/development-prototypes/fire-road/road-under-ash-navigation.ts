export type FireRoadLocationId =
  | "safety-road"
  | "west-verge"
  | "yard-lane"
  | "carter-side"
  | "bridge-approach"
  | "wagon-flank"
  | "eastern-road"
  | "evacuee-line"
  | "brush-edge";

export type FireRoadPositionId =
  | FireRoadLocationId
  | "bridge-support"
  | "far-scrub";

export interface FireRoadLocationDefinition {
  readonly id: FireRoadPositionId;
  readonly label: string;
  readonly neighbors: readonly FireRoadPositionId[];
  readonly playerReachable: boolean;
}

export const FIRE_ROAD_LOCATIONS: Readonly<Record<FireRoadPositionId, FireRoadLocationDefinition>> = {
  "safety-road": { id: "safety-road", label: "the western road", neighbors: ["west-verge"], playerReachable: false },
  "west-verge": { id: "west-verge", label: "the village verge", neighbors: ["safety-road", "yard-lane", "bridge-approach"], playerReachable: true },
  "yard-lane": { id: "yard-lane", label: "the yard lane", neighbors: ["west-verge", "carter-side"], playerReachable: true },
  "carter-side": { id: "carter-side", label: "the dead carter", neighbors: ["yard-lane", "bridge-approach"], playerReachable: true },
  "bridge-approach": { id: "bridge-approach", label: "the bridge approach", neighbors: ["west-verge", "carter-side", "bridge-support", "wagon-flank"], playerReachable: true },
  "bridge-support": { id: "bridge-support", label: "beneath the bridge", neighbors: ["bridge-approach", "wagon-flank"], playerReachable: false },
  "wagon-flank": { id: "wagon-flank", label: "the broken wagon", neighbors: ["bridge-approach", "bridge-support", "eastern-road"], playerReachable: true },
  "eastern-road": { id: "eastern-road", label: "the eastern road", neighbors: ["wagon-flank", "evacuee-line", "brush-edge"], playerReachable: true },
  "evacuee-line": { id: "evacuee-line", label: "Sera's household line", neighbors: ["eastern-road", "brush-edge"], playerReachable: true },
  "brush-edge": { id: "brush-edge", label: "the resin-scrub verge", neighbors: ["eastern-road", "evacuee-line", "far-scrub"], playerReachable: true },
  "far-scrub": { id: "far-scrub", label: "the burning scrub", neighbors: ["brush-edge"], playerReachable: false },
};

const blockedSet = (blocked: readonly FireRoadPositionId[]): ReadonlySet<FireRoadPositionId> =>
  new Set(blocked);

export const fireRoadAdjacent = (from: FireRoadPositionId, to: FireRoadPositionId): boolean =>
  FIRE_ROAD_LOCATIONS[from].neighbors.includes(to);

export const fireRoadWithinReach = (from: FireRoadPositionId, to: FireRoadPositionId): boolean =>
  from === to || fireRoadAdjacent(from, to);

export const fireRoadRoute = (
  from: FireRoadPositionId,
  to: FireRoadPositionId,
  blocked: readonly FireRoadPositionId[] = [],
): readonly FireRoadPositionId[] => {
  if (from === to) return [from];
  const unavailable = blockedSet(blocked);
  const queue: FireRoadPositionId[][] = [[from]];
  const visited = new Set<FireRoadPositionId>([from]);
  while (queue.length) {
    const route = queue.shift()!;
    const current = route.at(-1)!;
    for (const next of FIRE_ROAD_LOCATIONS[current].neighbors) {
      if (visited.has(next) || unavailable.has(next)) continue;
      const candidate = [...route, next];
      if (next === to) return candidate;
      visited.add(next);
      queue.push(candidate);
    }
  }
  return [];
};

export const fireRoadDistance = (from: FireRoadPositionId, to: FireRoadPositionId): number => {
  const route = fireRoadRoute(from, to);
  return route.length ? route.length - 1 : Number.POSITIVE_INFINITY;
};

export const fireRoadStepToward = (
  from: FireRoadPositionId,
  to: FireRoadPositionId,
  blocked: readonly FireRoadPositionId[] = [],
): FireRoadPositionId => fireRoadRoute(from, to, blocked)[1] ?? from;

export const fireRoadPlayerDestinations = (
  from: FireRoadLocationId,
  blocked: readonly FireRoadPositionId[] = [],
): readonly FireRoadLocationId[] => {
  const unavailable = blockedSet(blocked);
  return FIRE_ROAD_LOCATIONS[from].neighbors.filter((id): id is FireRoadLocationId =>
    FIRE_ROAD_LOCATIONS[id].playerReachable && !unavailable.has(id));
};

export const FIRE_ROAD_EVACUATION_ROUTE = [
  "evacuee-line",
  "eastern-road",
  "wagon-flank",
  "bridge-approach",
  "west-verge",
  "safety-road",
] as const satisfies readonly FireRoadLocationId[];

export const nextEvacuationLocation = (current: FireRoadLocationId): FireRoadLocationId => {
  const index = FIRE_ROAD_EVACUATION_ROUTE.indexOf(current as typeof FIRE_ROAD_EVACUATION_ROUTE[number]);
  return FIRE_ROAD_EVACUATION_ROUTE[index + 1] ?? current;
};
