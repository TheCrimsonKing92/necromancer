import { expandContentPackDependencies } from "./manifest";
import { assembleContentRuntime } from "./runtime";
import type {
  ContentPack,
  ContentPackId,
  ContentPackLoader,
  ContentPackManifest,
} from "./types";
import { ContentPackValidationError } from "./types";

export const createContentPackLoader = (
  manifest: ContentPackManifest,
): ContentPackLoader => {
  const pending = new Map<ContentPackId, Promise<ContentPack>>();

  const loadPack = (id: ContentPackId): Promise<ContentPack> => {
    const existing = pending.get(id);
    if (existing) return existing;

    const entry = manifest.byId.get(id);
    if (!entry) {
      throw new ContentPackValidationError(
        "missing-pack",
        `Content pack "${id}" is not present in the manifest.`,
      );
    }
    const loading = Promise.resolve()
      .then(() => entry.load())
      .then(({ default: pack }) => {
        if (pack.id !== entry.id) {
          throw new ContentPackValidationError(
            "manifest-id-mismatch",
            `Manifest entry "${entry.id}" loaded content pack "${pack.id}".`,
          );
        }
        return pack;
      });
    pending.set(id, loading);
    return loading;
  };

  return Object.freeze({
    async load(requested: readonly ContentPackId[]) {
      const required = expandContentPackDependencies(manifest, requested);
      const packs = await Promise.all(required.map(loadPack));
      return assembleContentRuntime(manifest, packs);
    },
  });
};
