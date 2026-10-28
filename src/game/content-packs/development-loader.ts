import { createContentPackLoader } from "./loader";
import { createContentPackManifest } from "./manifest";
import { installContentStoryRuntime } from "./story-runtime";
import type { ContentPack } from "./types";
import { ensureProductionPracticePack, practicePackIdForTradition } from "./production-loader";
import { createCharacter } from "../engine";
import { addItem } from "../items";
import type { GameState, TraditionId } from "../types";
import {
  fireRoadIsResolved,
  initializeFireRoadState,
  FIRE_ROAD_SCENE_ID,
} from "./integration/moving-shade-fire-road/state";

const CORE_CONTENT_PACK: ContentPack = Object.freeze({
  id: "core",
  version: 1,
  dependencies: [],
  definitions: {},
});

export const MOVING_SHADE_PROTOTYPE_PACK_ID =
  "integration:fire-road:moving-shade-proof" as const;

const manifest = createContentPackManifest([
  {
    id: "core",
    kind: "core",
    version: 1,
    dependencies: [],
    load: async () => ({ default: CORE_CONTENT_PACK }),
  },
  {
    id: MOVING_SHADE_PROTOTYPE_PACK_ID,
    kind: "integration",
    version: 1,
    dependencies: ["core"],
    load: () => import("./integration/moving-shade-fire-road/pack"),
  },
]);
const loader = createContentPackLoader(manifest);

export const createMovingShadePrototypeState = async (
  tradition: TraditionId,
): Promise<GameState> => {
  const practiceRuntime = await ensureProductionPracticePack(tradition);
  const runtime = await loader.load([MOVING_SHADE_PROTOTYPE_PACK_ID]);
  installContentStoryRuntime(runtime);
  for (const lifecycle of runtime.lifecycles.values()) lifecycle.activate?.();
  let result = createCharacter("Mara Venn", tradition, "other", 0x5ade);
  const practiceId = practicePackIdForTradition(tradition);
  if (!result.error && practiceRuntime && practiceId) {
    result = practiceRuntime.lifecycles.get(practiceId)
      ?.initializePractice?.(result.state) ?? result;
  }
  if (result.error || !result.state.run) {
    throw new Error(result.error ?? "The Fire Road prototype could not begin.");
  }
  const state = result.state;
  const run = state.run!;
  state.screen = "story";
  state.storyId = FIRE_ROAD_SCENE_ID;
  run.player.obols = 5;
  run.player.spirit = run.player.maxSpirit;
  addItem(run.player.inventory, "linen-binding", 2);
  addItem(run.player.inventory, "grave-salt", 2);
  initializeFireRoadState(run);
  return state;
};

export const movingShadePrototypeIsComplete = (state: GameState): boolean =>
  state.screen === "story" &&
  state.storyId === FIRE_ROAD_SCENE_ID &&
  Boolean(state.run && fireRoadIsResolved(state.run));
