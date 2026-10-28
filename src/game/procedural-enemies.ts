export {
  NORTH_VEY_ROAD_THREAT_FIXTURE,
  composeProceduralEnemyRoster,
  enemyThreatCost,
  validateGeneratedEnemyRoster,
  validateProceduralEnemyCatalogs,
  validateProceduralRosterRequest,
} from "./procedural-enemies/composer";
export type {
  GeneratedEnemySpec,
  ProceduralEnemyRoster,
  ProceduralEnemyRosterRequest,
} from "./procedural-enemies/composer";
export {
  PROCEDURAL_ENEMY_LOADOUT_IDS,
  PROCEDURAL_ENEMY_ROLE_IDS,
} from "./procedural-enemies/catalogs";
export {
  proceduralPopulationPlanIsOperational,
  resolveProceduralPopulationCandidate,
  validateProceduralPopulationRequest,
} from "./procedural-enemies/population";
export type {
  ProceduralEncounterPopulationContext,
  ProceduralPlacementState,
  ProceduralPopulationOrientation,
  ProceduralPopulationPlan,
  ProceduralPopulationPresence,
  ProceduralPopulationProfile,
  ProceduralPopulationRequest,
  ProceduralPopulationSelector,
} from "./procedural-enemies/population";
export type {
  ProceduralEnemyLoadoutId,
  ProceduralEnemyRoleId,
} from "./procedural-enemies/catalogs";
