import type { WorldFactId } from "../types";

const WORLD_FACT_ID_SET = {
  "hollis-vane-dead": true,
  "hollis-vane-rendered": true,
  "saint-orra-unbound": true,
  "shared-mourning-fire": true,
  "aided-county-burial": true,
  "gave-use-name-to-burial-crews": true,
  "dealt-with-iven": true,
  "roadside-bundle-examined": true,
  "bundle-trace-points-to-broker": true,
  "bundle-left-under-burial-custody": true,
  "bundle-released-to-broker": true,
  "ditch-hand-body-recognized": true,
} as const satisfies Record<WorldFactId, true>;

export const WORLD_FACT_IDS = Object.keys(
  WORLD_FACT_ID_SET,
) as WorldFactId[];

export const isWorldFactId = (
  value: unknown,
): value is WorldFactId =>
  typeof value === "string" && Object.hasOwn(WORLD_FACT_ID_SET, value);
