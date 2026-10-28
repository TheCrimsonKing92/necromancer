import type {
  WorldFactionId,
  WorldPersonId,
  WorldRelationId,
} from "../types";

const WORLD_FACTION_ID_SET = {
  "county-reeves": true,
  "burial-crews": true,
  "reliquary-brokers": true,
  "north-road-households": true,
} as const satisfies Record<WorldFactionId, true>;

const WORLD_PERSON_ID_SET = {
  "iven-saye": true,
  "eda-pell": true,
  "oren-vask": true,
} as const satisfies Record<WorldPersonId, true>;

const WORLD_RELATION_ID_SET = {
  ...WORLD_FACTION_ID_SET,
  ...WORLD_PERSON_ID_SET,
} as const satisfies Record<WorldRelationId, true>;

export const WORLD_FACTION_IDS = Object.keys(
  WORLD_FACTION_ID_SET,
) as WorldFactionId[];

export const WORLD_PERSON_IDS = Object.keys(
  WORLD_PERSON_ID_SET,
) as WorldPersonId[];

export const WORLD_RELATION_IDS = Object.keys(
  WORLD_RELATION_ID_SET,
) as WorldRelationId[];

export const isWorldRelationId = (
  value: unknown,
): value is WorldRelationId =>
  typeof value === "string" &&
  Object.hasOwn(WORLD_RELATION_ID_SET, value);
