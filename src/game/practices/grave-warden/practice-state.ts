import type { EngineResult, GameState, RunState } from "../../types";
import type {
  GraveWardenBattleState,
  GraveWardenPracticeState,
  ThresholdSealState,
} from "./types";

export const GRAVE_WARDEN_STATE_VERSION = 1 as const;
export const BASE_SEAL_CAPACITY = 2;

export const createGraveWardenPracticeState = (): GraveWardenPracticeState => ({
  version: GRAVE_WARDEN_STATE_VERSION,
  sealCapacity: BASE_SEAL_CAPACITY,
});

export const createGraveWardenBattleState = (): GraveWardenBattleState => ({
  version: GRAVE_WARDEN_STATE_VERSION,
  sealsPlaced: 0,
  breachRecoveries: 0,
  nextSealId: 1,
  seals: [],
});

const isSealState = (value: unknown): value is ThresholdSealState => {
  if (!value || typeof value !== "object") return false;
  const seal = value as Partial<ThresholdSealState>;
  return (
    Number.isInteger(seal.id) &&
    (seal.id ?? 0) > 0 &&
    typeof seal.targetId === "string" &&
    seal.targetId.trim().length > 0 &&
    Number.isInteger(seal.integrity) &&
    (seal.integrity ?? -1) >= 0 &&
    Number.isInteger(seal.maxIntegrity) &&
    (seal.maxIntegrity ?? 0) >= 1 &&
    (seal.integrity ?? 0) <= (seal.maxIntegrity ?? 0) &&
    typeof seal.breached === "boolean"
  );
};

export const isGraveWardenPracticeState = (
  value: unknown,
): value is GraveWardenPracticeState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GraveWardenPracticeState>;
  return (
    state.version === GRAVE_WARDEN_STATE_VERSION &&
    Number.isInteger(state.sealCapacity) &&
    (state.sealCapacity ?? 0) >= 1 &&
    (state.sealCapacity ?? 0) <= BASE_SEAL_CAPACITY
  );
};

export const isGraveWardenBattleState = (
  value: unknown,
): value is GraveWardenBattleState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GraveWardenBattleState>;
  return (
    state.version === GRAVE_WARDEN_STATE_VERSION &&
    Number.isInteger(state.sealsPlaced) &&
    (state.sealsPlaced ?? -1) >= 0 &&
    (state.sealsPlaced ?? 0) <= BASE_SEAL_CAPACITY &&
    Number.isInteger(state.breachRecoveries) &&
    (state.breachRecoveries ?? -1) >= 0 &&
    (state.breachRecoveries ?? 0) <= 2 &&
    Number.isInteger(state.nextSealId) &&
    (state.nextSealId ?? 0) >= 1 &&
    Array.isArray(state.seals) &&
    state.seals.every(isSealState) &&
    new Set(state.seals.map((seal) => seal.id)).size === state.seals.length &&
    new Set(state.seals.map((seal) => seal.targetId)).size === state.seals.length &&
    state.seals.length <= BASE_SEAL_CAPACITY &&
    state.seals.every((seal) => seal.id < (state.nextSealId ?? 0))
  );
};

const finiteInteger = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;

export const normalizeGraveWardenPracticeState = (
  value: unknown,
): GraveWardenPracticeState => {
  const raw = value && typeof value === "object"
    ? value as Partial<GraveWardenPracticeState>
    : {};
  return {
    version: GRAVE_WARDEN_STATE_VERSION,
    sealCapacity: Math.min(
      BASE_SEAL_CAPACITY,
      Math.max(1, finiteInteger(raw.sealCapacity, BASE_SEAL_CAPACITY)),
    ),
  };
};

export const normalizeGraveWardenBattleState = (
  value: unknown,
): GraveWardenBattleState => {
  const raw = value && typeof value === "object"
    ? value as Partial<GraveWardenBattleState>
    : {};
  const sourceSeals = Array.isArray(raw.seals) ? raw.seals : [];
  const ids = new Set<number>();
  const targets = new Set<string>();
  const seals: ThresholdSealState[] = [];
  for (const candidate of sourceSeals) {
    if (!candidate || typeof candidate !== "object") continue;
    const seal = candidate as Partial<ThresholdSealState>;
    const id = finiteInteger(seal.id, -1);
    const targetId = typeof seal.targetId === "string"
      ? seal.targetId.trim()
      : "";
    if (
      id < 1 ||
      !targetId ||
      ids.has(id) ||
      targets.has(targetId) ||
      seals.length >= BASE_SEAL_CAPACITY
    ) continue;
    const maxIntegrity = Math.min(
      2,
      Math.max(1, finiteInteger(seal.maxIntegrity, 2)),
    );
    const integrity = Math.min(
      maxIntegrity,
      Math.max(0, finiteInteger(seal.integrity, maxIntegrity)),
    );
    const breached = seal.breached === true || integrity < maxIntegrity;
    if (integrity === 0 && !breached) continue;
    ids.add(id);
    targets.add(targetId);
    seals.push({ id, targetId, integrity, maxIntegrity, breached });
  }
  const highestId = seals.reduce((highest, seal) => Math.max(highest, seal.id), 0);
  return {
    version: GRAVE_WARDEN_STATE_VERSION,
    sealsPlaced: Math.min(
      BASE_SEAL_CAPACITY,
      Math.max(seals.length, finiteInteger(raw.sealsPlaced, seals.length), 0),
    ),
    breachRecoveries: Math.min(
      2,
      Math.max(0, finiteInteger(raw.breachRecoveries, 0)),
    ),
    nextSealId: Math.max(
      highestId + 1,
      1,
      finiteInteger(raw.nextSealId, highestId + 1),
    ),
    seals,
  };
};

export const normalizeGraveWardenRun = (run: RunState): void => {
  if (run.player.tradition !== "grave-warden") return;
  run.practiceStates ??= {};
  run.practiceStates.graveWarden = normalizeGraveWardenPracticeState(
    run.practiceStates.graveWarden,
  );
  if (run.battle) {
    run.battle.practiceStates ??= {};
    const battleState = normalizeGraveWardenBattleState(
      run.battle.practiceStates.graveWarden,
    );
    const enemyIds = new Set(run.battle.enemies.map((enemy) => enemy.id));
    battleState.seals = battleState.seals.filter((seal) =>
      enemyIds.has(seal.targetId),
    );
    run.battle.practiceStates.graveWarden = battleState;
  }
};

export const beginGraveWardenPractice = (state: GameState): EngineResult => {
  if (!state.run || state.run.player.tradition !== "grave-warden") {
    return { state, error: "Only a Grave Warden can establish threshold custody." };
  }
  normalizeGraveWardenRun(state.run);
  return { state };
};
