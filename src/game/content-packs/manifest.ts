import { cloneAndFreeze, immutableMap } from "./immutable-map";
import type {
  ContentPackId,
  ContentPackKind,
  ContentPackManifest,
  ContentPackManifestEntry,
} from "./types";
import { ContentPackValidationError } from "./types";

const CORE_CONTENT_PACK = Object.freeze({
  id: "core" as const,
  version: 1,
  dependencies: [] as const,
  definitions: {},
});

export const contentPackKindForId = (id: ContentPackId): ContentPackKind => {
  if (id === "core") return "core";
  if (id.startsWith("practice:")) return "practice";
  if (id.startsWith("region:")) return "region";
  return "integration";
};

const assertValidEntry = (entry: ContentPackManifestEntry): void => {
  if (!Number.isSafeInteger(entry.version) || entry.version < 1) {
    throw new ContentPackValidationError(
      "invalid-manifest-entry",
      `Content pack "${entry.id}" has invalid version ${entry.version}.`,
    );
  }
  if (contentPackKindForId(entry.id) !== entry.kind) {
    throw new ContentPackValidationError(
      "invalid-manifest-entry",
      `Content pack "${entry.id}" cannot declare kind "${entry.kind}".`,
    );
  }
  if (new Set(entry.dependencies).size !== entry.dependencies.length) {
    throw new ContentPackValidationError(
      "invalid-manifest-entry",
      `Content pack "${entry.id}" declares a dependency more than once.`,
    );
  }
};

export const createContentPackManifest = (
  entries: readonly ContentPackManifestEntry[],
): ContentPackManifest => {
  const normalized = entries.map((entry) => {
    assertValidEntry(entry);
    return cloneAndFreeze(entry);
  });
  const byIdEntries: Array<readonly [ContentPackId, ContentPackManifestEntry]> =
    [];
  for (const entry of normalized) {
    if (byIdEntries.some(([id]) => id === entry.id)) {
      throw new ContentPackValidationError(
        "duplicate-manifest-id",
        `Content pack manifest contains duplicate id "${entry.id}".`,
      );
    }
    byIdEntries.push([entry.id, entry]);
  }

  return Object.freeze({
    entries: Object.freeze(normalized),
    byId: immutableMap(byIdEntries),
  });
};

export const expandContentPackDependencies = (
  manifest: ContentPackManifest,
  requested: readonly ContentPackId[],
): readonly ContentPackId[] => {
  const visited = new Set<ContentPackId>();
  const active: ContentPackId[] = [];

  const visit = (id: ContentPackId): void => {
    const cycleStart = active.indexOf(id);
    if (cycleStart >= 0) {
      const cycle = [...active.slice(cycleStart), id].join(" -> ");
      throw new ContentPackValidationError(
        "dependency-cycle",
        `Content pack dependency cycle: ${cycle}.`,
      );
    }
    if (visited.has(id)) return;

    const entry = manifest.byId.get(id);
    if (!entry) {
      throw new ContentPackValidationError(
        "missing-pack",
        `Content pack "${id}" is not present in the manifest.`,
      );
    }

    active.push(id);
    for (const dependency of [...entry.dependencies].sort()) visit(dependency);
    active.pop();
    visited.add(id);
  };

  for (const id of [...new Set(requested)].sort()) visit(id);
  return Object.freeze([...visited].sort());
};

export const PRODUCTION_CONTENT_PACK_MANIFEST = createContentPackManifest([
  {
    id: "core",
    kind: "core",
    version: 1,
    dependencies: [],
    load: async () => ({ default: CORE_CONTENT_PACK }),
  },
  {
    id: "practice:bonebinder",
    kind: "practice",
    version: 1,
    dependencies: ["core"],
    load: () => import("./practice/bonebinder/bonebinder-pack"),
  },
  {
    id: "practice:grave-warden",
    kind: "practice",
    version: 1,
    dependencies: ["core"],
    load: () => import("./practice/grave-warden/grave-warden-pack"),
  },
]);
