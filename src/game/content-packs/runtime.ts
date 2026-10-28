import { cloneAndFreeze, immutableMap } from "./immutable-map";
import type {
  ContentDefinitionCatalogName,
  ContentDefinitionRegistry,
  ContentPack,
  ContentPackDefinitions,
  ContentPackId,
  ContentPackLifecycle,
  ContentPackManifest,
  ContentRulePortName,
  ContentRuleRegistry,
  ContentRuntime,
  ContentStoryTransitionContribution,
  ContentStoryTransitionId,
  LoadedPackSummary,
  LoadedRuleContribution,
  LoadedStoryTransitionContribution,
} from "./types";
import { ContentPackValidationError } from "./types";

const EXCLUSIVE_RULE_PORTS = [
  "playerActions",
  "advancementEffects",
  "storyTransitions",
] as const satisfies readonly ContentRulePortName[];

const COMPOSABLE_RULE_PORTS = [
  "battleParticipants",
  "departureEffects",
] as const satisfies readonly ContentRulePortName[];

const samePackIds = (
  left: readonly ContentPackId[],
  right: readonly ContentPackId[],
): boolean => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((id, index) => id === sortedRight[index]);
};

const verifyPackContract = (
  manifest: ContentPackManifest,
  pack: ContentPack,
): void => {
  const entry = manifest.byId.get(pack.id);
  if (!entry) {
    throw new ContentPackValidationError(
      "manifest-id-mismatch",
      `Loaded content pack "${pack.id}" is not present in the manifest.`,
    );
  }
  if (pack.version !== entry.version) {
    throw new ContentPackValidationError(
      "manifest-version-mismatch",
      `Content pack "${pack.id}" loaded version ${pack.version}; manifest requires ${entry.version}.`,
    );
  }
  if (!samePackIds(pack.dependencies, entry.dependencies)) {
    throw new ContentPackValidationError(
      "manifest-dependencies-mismatch",
      `Content pack "${pack.id}" dependencies do not match the manifest.`,
    );
  }
};

const createDefinitionRegistry = (
  packs: readonly ContentPack[],
): ContentDefinitionRegistry => {
  const createCatalog = <K extends ContentDefinitionCatalogName>(
    catalogName: K,
  ): ReadonlyMap<
    string,
    import("./types").LoadedOwnedDefinition<
      NonNullable<ContentPackDefinitions[K]>[number]["value"]
    >
  > => {
    type Definition = import("./types").LoadedOwnedDefinition<
      NonNullable<ContentPackDefinitions[K]>[number]["value"]
    >;
    const entries: Array<readonly [string, Definition]> = [];
    for (const pack of packs) {
      const definitions = pack.definitions[catalogName] as
        | readonly NonNullable<ContentPackDefinitions[K]>[number][]
        | undefined;
      for (const definition of definitions ?? []) {
        if (entries.some(([id]) => id === definition.id)) {
          throw new ContentPackValidationError(
            "duplicate-definition",
            `Definition "${definition.id}" is duplicated in catalog "${catalogName}".`,
          );
        }
        entries.push([
          definition.id,
          cloneAndFreeze({ ...definition, packId: pack.id }),
        ] as unknown as readonly [string, Definition]);
      }
    }
    return immutableMap(entries);
  };

  return Object.freeze({
    practices: createCatalog("practices"),
    actions: createCatalog("actions"),
    advancements: createCatalog("advancements"),
    regions: createCatalog("regions"),
    scenes: createCatalog("scenes"),
    encounters: createCatalog("encounters"),
    roadEvents: createCatalog("roadEvents"),
    items: createCatalog("items"),
    worldFacts: createCatalog("worldFacts"),
  });
};

const createRuleRegistry = (packs: readonly ContentPack[]): ContentRuleRegistry => {
  const exclusive = (
    port: Exclude<(typeof EXCLUSIVE_RULE_PORTS)[number], "storyTransitions">,
  ) => {
    const entries: Array<readonly [string, LoadedRuleContribution]> = [];
    for (const pack of packs) {
      for (const contribution of pack.rules?.[port] ?? []) {
        if (entries.some(([id]) => id === contribution.id)) {
          throw new ContentPackValidationError(
            "duplicate-rule-owner",
            `Exclusive rule "${contribution.id}" has more than one owner in port "${port}".`,
          );
        }
        entries.push([
          contribution.id,
          cloneAndFreeze({ ...contribution, packId: pack.id }),
        ]);
      }
    }
    return immutableMap(entries);
  };

  const storyTransitions = () => {
    const entries: Array<
      readonly [ContentStoryTransitionId, LoadedStoryTransitionContribution]
    > = [];
    for (const pack of packs) {
      for (const contribution of pack.rules?.storyTransitions ?? []) {
        if (entries.some(([id]) => id === contribution.id)) {
          throw new ContentPackValidationError(
            "duplicate-rule-owner",
            `Exclusive rule "${contribution.id}" has more than one owner in port "storyTransitions".`,
          );
        }
        entries.push([
          contribution.id,
          cloneAndFreeze({
            ...(contribution as ContentStoryTransitionContribution),
            packId: pack.id,
          }),
        ]);
      }
    }
    return immutableMap(entries);
  };

  const composable = (port: (typeof COMPOSABLE_RULE_PORTS)[number]) => {
    const groups = new Map<string, LoadedRuleContribution[]>();
    for (const pack of packs) {
      for (const contribution of pack.rules?.[port] ?? []) {
        const group = groups.get(contribution.id) ?? [];
        group.push(cloneAndFreeze({ ...contribution, packId: pack.id }));
        groups.set(contribution.id, group);
      }
    }
    return immutableMap(
      [...groups.entries()].map(
        ([id, contributions]) =>
          [id, Object.freeze(contributions)] as const,
      ),
    );
  };

  return Object.freeze({
    playerActions: exclusive("playerActions"),
    advancementEffects: exclusive("advancementEffects"),
    storyTransitions: storyTransitions(),
    battleParticipants: composable("battleParticipants"),
    departureEffects: composable("departureEffects"),
  });
};

export const assembleContentRuntime = (
  manifest: ContentPackManifest,
  loadedPacks: readonly ContentPack[],
): ContentRuntime => {
  const packs = [...loadedPacks].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  const summaries: Array<readonly [ContentPackId, LoadedPackSummary]> = [];

  for (const pack of packs) {
    verifyPackContract(manifest, pack);
    if (summaries.some(([id]) => id === pack.id)) {
      throw new ContentPackValidationError(
        "manifest-id-mismatch",
        `Content pack "${pack.id}" was loaded more than once.`,
      );
    }
    const entry = manifest.byId.get(pack.id)!;
    summaries.push([
      pack.id,
      cloneAndFreeze({
        id: pack.id,
        kind: entry.kind,
        version: pack.version,
        dependencies: pack.dependencies,
      }),
    ]);
  }

  const loadedIds = new Set(summaries.map(([id]) => id));
  for (const pack of packs) {
    for (const dependency of pack.dependencies) {
      if (!loadedIds.has(dependency)) {
        throw new ContentPackValidationError(
          "missing-pack",
          `Content pack "${pack.id}" requires unloaded dependency "${dependency}".`,
        );
      }
    }
  }

  return Object.freeze({
    packs: immutableMap(summaries),
    definitions: createDefinitionRegistry(packs),
    rules: createRuleRegistry(packs),
    lifecycles: immutableMap(
      packs.flatMap((pack): Array<readonly [ContentPackId, ContentPackLifecycle]> =>
        pack.lifecycle ? [[pack.id, cloneAndFreeze(pack.lifecycle)]] : [],
      ),
    ),
  });
};
