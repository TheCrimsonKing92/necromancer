import { normalizeSeed, rollInteger } from "../random";
import type { Player, WakeVariantId, WorldState } from "../types";
import { factionKnows } from "./state";

export type RenderingYield = "fouled" | "usable" | "pure";

export interface RoadsideRenderingResult {
  seed: number;
  yield: RenderingYield;
  witnessed: boolean;
  yieldChance: number;
  witnessChance: number;
}

const boundedChance = (value: number): number =>
  Math.max(5, Math.min(95, Math.trunc(value)));

export const roadsideRenderingYieldChance = (
  player: Player,
  trainingBonus = 0,
): number =>
  boundedChance(
    30 +
      player.attributes.intelligence * 6 +
      player.skills.medicine * 7 +
      trainingBonus,
  );

export const roadsideRenderingWitnessChance = (
  player: Player,
): number =>
  boundedChance(
    55 -
      player.skills.perception * 8 -
      player.skills.survival * 6,
  );

export const rollRoadsideRendering = (
  seed: number,
  player: Player,
  trainingBonus = 0,
): RoadsideRenderingResult => {
  const yieldChance = roadsideRenderingYieldChance(player, trainingBonus);
  let mixed = normalizeSeed(seed) ^ 0x72656e64;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
  mixed = (mixed ^ (mixed >>> 15)) >>> 0;
  const yieldRoll = rollInteger(normalizeSeed(mixed), 1, 100);
  const pureThreshold = Math.max(5, yieldChance - 60);
  const yieldResult: RenderingYield =
    yieldRoll.value > yieldChance
      ? "fouled"
      : yieldRoll.value <= pureThreshold
        ? "pure"
        : "usable";

  const witnessChance = roadsideRenderingWitnessChance(player);
  const witnessRoll = rollInteger(yieldRoll.seed, 1, 100);

  return {
    seed: witnessRoll.seed,
    yield: yieldResult,
    witnessed: witnessRoll.value <= witnessChance,
    yieldChance,
    witnessChance,
  };
};

export const wakeVariantPoolForWorld = (
  world: WorldState,
): WakeVariantId[] =>
  factionKnows(
    world,
    "county-reeves",
    "hollis-vane-rendered",
  ) || world.pressures.countyNotice >= 2
    ? ["reeve-patrol"]
    : [
        "bell-widow",
        "name-thieves",
        "bone-procession",
        "reliquary-poachers",
        "reeve-patrol",
      ];
