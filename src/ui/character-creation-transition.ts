import { createCharacter } from "../game/engine";
import {
  ensureProductionPracticePack,
  practicePackIdForTradition,
} from "../game/content-packs";
import {
  loadGame,
  type SaveEnvelope,
  type StorageLike,
} from "../game/persistence";
import type {
  CharacterSex,
  EngineResult,
  GameState,
  TraditionId,
} from "../game/types";
import { ensureBonebinderSurface } from "./bonebinder-surface-loader";

export const createPlayableCharacter = async (
  name: string,
  tradition: TraditionId,
  sex: CharacterSex,
): Promise<EngineResult> => {
  const runtime = await ensureProductionPracticePack(tradition);
  let result = createCharacter(name, tradition, sex);
  if (result.error || !runtime) return result;

  const packId = practicePackIdForTradition(tradition);
  const initializePractice = packId
    ? runtime.lifecycles.get(packId)?.initializePractice
    : undefined;
  result = initializePractice?.(result.state) ?? result;
  if (tradition === "summoner") await ensureBonebinderSurface();
  return result;
};

export const ensurePlayablePractice = async (
  state: GameState,
): Promise<GameState> => {
  const run = state.run;
  if (!run) return state;
  const runtime = await ensureProductionPracticePack(run.player.tradition);
  const packId = practicePackIdForTradition(run.player.tradition);
  if (!runtime || !packId) return state;

  const lifecycle = runtime.lifecycles.get(packId);
  lifecycle?.normalizeRunState?.(run);
  const practiceInitialized =
    run.player.tradition === "summoner"
      ? Boolean(run.practiceStates?.bonebinder)
      : run.player.tradition === "grave-warden"
        ? Boolean(run.practiceStates?.graveWarden)
        : true;
  const playable = practiceInitialized
    ? state
    : lifecycle?.initializePractice?.(state).state ?? state;
  if (run.player.tradition === "summoner") await ensureBonebinderSurface();
  return playable;
};

export interface PlayableSaveAdmission {
  readonly saved: SaveEnvelope | null;
  readonly preliminaryFound: boolean;
}

export const loadPlayableSave = async (
  storage: StorageLike,
): Promise<PlayableSaveAdmission> => {
  const preliminary = loadGame(storage);
  if (!preliminary) return { saved: null, preliminaryFound: false };
  const tradition = preliminary.state.run?.player.tradition;
  if (tradition) await ensureProductionPracticePack(tradition);
  const saved = loadGame(storage);
  if (!saved) return { saved: null, preliminaryFound: true };
  return {
    saved: {
      ...saved,
      state: await ensurePlayablePractice(saved.state),
    },
    preliminaryFound: true,
  };
};
