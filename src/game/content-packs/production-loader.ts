import { createContentPackLoader } from "./loader";
import { PRODUCTION_CONTENT_PACK_MANIFEST } from "./manifest";
import type {
  ContentPackId,
  ContentRuntime,
} from "./types";

const loader = createContentPackLoader(PRODUCTION_CONTENT_PACK_MANIFEST);

export const ensureProductionContentPacks = async (
  requested: readonly ContentPackId[],
): Promise<ContentRuntime> => {
  const runtime = await loader.load(requested);
  const { installContentStoryRuntime } = await import("./story-runtime");
  installContentStoryRuntime(runtime);
  for (const lifecycle of runtime.lifecycles.values()) lifecycle.activate?.();
  return runtime;
};

export const practicePackIdForTradition = (
  tradition: string,
): ContentPackId | null =>
  tradition === "summoner"
    ? "practice:bonebinder"
    : tradition === "grave-warden"
      ? "practice:grave-warden"
      : null;

export const ensureProductionPracticePack = async (
  tradition: string,
): Promise<ContentRuntime | null> => {
  const packId = practicePackIdForTradition(tradition);
  return packId ? ensureProductionContentPacks([packId]) : null;
};
