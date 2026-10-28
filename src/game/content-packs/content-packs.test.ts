import { describe, expect, it, vi } from "vitest";
import {
  ContentPackValidationError,
  assembleContentRuntime,
  createContentPackLoader,
  createContentPackManifest,
  expandContentPackDependencies,
} from ".";
import type {
  ContentPack,
  ContentPackId,
  ContentPackKind,
  ContentPackManifestEntry,
} from ".";

const kindFor = (id: ContentPackId): ContentPackKind => {
  if (id === "core") return "core";
  if (id.startsWith("practice:")) return "practice";
  if (id.startsWith("region:")) return "region";
  return "integration";
};

const fixturePack = (
  id: ContentPackId,
  dependencies: readonly ContentPackId[] = [],
  overrides: Partial<ContentPack> = {},
): ContentPack => ({
  id,
  version: 1,
  dependencies,
  definitions: {},
  ...overrides,
});

const manifestEntry = (
  pack: ContentPack,
  load = vi.fn(async () => ({ default: pack })),
): ContentPackManifestEntry => ({
  id: pack.id,
  kind: kindFor(pack.id),
  version: pack.version,
  dependencies: pack.dependencies,
  load,
});

const errorWithCode = (code: ContentPackValidationError["code"]) =>
  expect.objectContaining({ code });

describe("content pack manifest", () => {
  it("expands transitive dependencies into stable pack-id order", () => {
    const core = fixturePack("core");
    const practice = fixturePack("practice:medium", ["core"]);
    const region = fixturePack("region:north-vey", ["core"]);
    const integration = fixturePack("integration:north-vey:medium", [
      "region:north-vey",
      "practice:medium",
    ]);
    const manifest = createContentPackManifest([
      integration,
      region,
      practice,
      core,
    ].map((pack) => manifestEntry(pack)));

    expect(
      expandContentPackDependencies(manifest, [
        "integration:north-vey:medium",
      ]),
    ).toEqual([
      "core",
      "integration:north-vey:medium",
      "practice:medium",
      "region:north-vey",
    ]);
  });

  it("rejects duplicate ids, missing dependencies, and dependency cycles", () => {
    const core = fixturePack("core");
    expect(() =>
      createContentPackManifest([
        manifestEntry(core),
        manifestEntry(core),
      ]),
    ).toThrowError(errorWithCode("duplicate-manifest-id"));

    const missingManifest = createContentPackManifest([
      manifestEntry(fixturePack("practice:medium", ["core"])),
    ]);
    expect(() =>
      expandContentPackDependencies(missingManifest, ["practice:medium"]),
    ).toThrowError(errorWithCode("missing-pack"));

    const cycleManifest = createContentPackManifest([
      manifestEntry(fixturePack("practice:medium", ["region:north-vey"])),
      manifestEntry(fixturePack("region:north-vey", ["practice:medium"])),
    ]);
    expect(() =>
      expandContentPackDependencies(cycleManifest, ["practice:medium"]),
    ).toThrowError(errorWithCode("dependency-cycle"));
  });

  it("rejects invalid versions, repeated dependencies, and mismatched kinds", () => {
    const invalidVersion = manifestEntry(fixturePack("core"));
    expect(() =>
      createContentPackManifest([{ ...invalidVersion, version: 0 }]),
    ).toThrowError(errorWithCode("invalid-manifest-entry"));

    const repeatedDependency = manifestEntry(
      fixturePack("practice:medium", ["core", "core"]),
    );
    expect(() => createContentPackManifest([repeatedDependency])).toThrowError(
      errorWithCode("invalid-manifest-entry"),
    );

    const wrongKind = manifestEntry(fixturePack("region:north-vey"));
    expect(() =>
      createContentPackManifest([{ ...wrongKind, kind: "practice" }]),
    ).toThrowError(errorWithCode("invalid-manifest-entry"));
  });
});

describe("content pack loading", () => {
  it("loads each dependency once across concurrent runtime requests", async () => {
    const core = fixturePack("core");
    const practice = fixturePack("practice:medium", ["core"]);
    const region = fixturePack("region:north-vey", ["core"]);
    const coreLoad = vi.fn(async () => ({ default: core }));
    const practiceLoad = vi.fn(async () => ({ default: practice }));
    const regionLoad = vi.fn(async () => ({ default: region }));
    const manifest = createContentPackManifest([
      manifestEntry(core, coreLoad),
      manifestEntry(practice, practiceLoad),
      manifestEntry(region, regionLoad),
    ]);
    const loader = createContentPackLoader(manifest);

    const [practiceRuntime, regionRuntime] = await Promise.all([
      loader.load(["practice:medium"]),
      loader.load(["region:north-vey"]),
    ]);

    expect([...practiceRuntime.packs.keys()]).toEqual([
      "core",
      "practice:medium",
    ]);
    expect([...regionRuntime.packs.keys()]).toEqual(["core", "region:north-vey"]);
    expect(coreLoad).toHaveBeenCalledTimes(1);
    expect(practiceLoad).toHaveBeenCalledTimes(1);
    expect(regionLoad).toHaveBeenCalledTimes(1);
  });

  it("composes identical registries regardless of manifest and request order", async () => {
    const core = fixturePack("core", [], {
      definitions: {
        worldFacts: [
          { id: "core-fact", value: { title: "Core", description: "Core" } },
        ],
      },
    });
    const region = fixturePack("region:north-vey", ["core"], {
      definitions: {
        worldFacts: [
          {
            id: "region-fact",
            value: { title: "Region", description: "Region" },
          },
        ],
      },
      rules: { battleParticipants: [{ id: "opening-company" }] },
    });
    const practice = fixturePack("practice:medium", ["core"], {
      rules: { battleParticipants: [{ id: "opening-company" }] },
    });
    const first = createContentPackLoader(
      createContentPackManifest(
        [practice, core, region].map((pack) => manifestEntry(pack)),
      ),
    );
    const second = createContentPackLoader(
      createContentPackManifest(
        [region, core, practice].map((pack) => manifestEntry(pack)),
      ),
    );

    const [firstRuntime, secondRuntime] = await Promise.all([
      first.load(["region:north-vey", "practice:medium"]),
      second.load(["practice:medium", "region:north-vey"]),
    ]);
    const project = (runtime: Awaited<ReturnType<typeof first.load>>) => ({
      packs: [...runtime.packs.keys()],
      facts: [...runtime.definitions.worldFacts.keys()],
      participants: [
        ...(runtime.rules.battleParticipants.get("opening-company") ?? []),
      ].map(({ packId }) => packId),
    });

    expect(project(firstRuntime)).toEqual(project(secondRuntime));
    expect(project(firstRuntime).participants).toEqual([
      "practice:medium",
      "region:north-vey",
    ]);
  });

  it("rejects loaded contracts that disagree with manifest identity", async () => {
    const core = fixturePack("core");

    const wrongId = createContentPackLoader(
      createContentPackManifest([
        {
          ...manifestEntry(core),
          load: async () => ({ default: fixturePack("practice:medium") }),
        },
      ]),
    );
    await expect(wrongId.load(["core"])).rejects.toMatchObject(
      errorWithCode("manifest-id-mismatch"),
    );

    const wrongVersion = createContentPackLoader(
      createContentPackManifest([
        {
          ...manifestEntry(core),
          load: async () => ({ default: { ...core, version: 2 } }),
        },
      ]),
    );
    await expect(wrongVersion.load(["core"])).rejects.toMatchObject(
      errorWithCode("manifest-version-mismatch"),
    );

    const practice = fixturePack("practice:medium", ["core"]);
    const wrongDependencies = createContentPackLoader(
      createContentPackManifest([
        manifestEntry(core),
        {
          ...manifestEntry(practice),
          load: async () => ({ default: { ...practice, dependencies: [] } }),
        },
      ]),
    );
    await expect(
      wrongDependencies.load(["practice:medium"]),
    ).rejects.toMatchObject(errorWithCode("manifest-dependencies-mismatch"));
  });
});

describe("content runtime validation and immutability", () => {
  it("cannot assemble a runtime without every declared dependency", () => {
    const practice = fixturePack("practice:medium", ["core"]);
    const manifest = createContentPackManifest([
      manifestEntry(fixturePack("core")),
      manifestEntry(practice),
    ]);

    expect(() => assembleContentRuntime(manifest, [practice])).toThrowError(
      errorWithCode("missing-pack"),
    );
  });

  it("rejects duplicate definitions and exclusive rule owners", async () => {
    const first = fixturePack("practice:medium", [], {
      definitions: {
        worldFacts: [
          { id: "shared", value: { title: "First", description: "First" } },
        ],
      },
      rules: { playerActions: [{ id: "shared-action" }] },
    });
    const second = fixturePack("region:north-vey", [], {
      definitions: {
        worldFacts: [
          {
            id: "shared",
            value: { title: "Second", description: "Second" },
          },
        ],
      },
    });
    const duplicateDefinitions = createContentPackLoader(
      createContentPackManifest(
        [first, second].map((pack) => manifestEntry(pack)),
      ),
    );
    await expect(
      duplicateDefinitions.load([first.id, second.id]),
    ).rejects.toMatchObject(errorWithCode("duplicate-definition"));

    const duplicateRule = fixturePack("region:south-vey", [], {
      rules: { playerActions: [{ id: "shared-action" }] },
    });
    const duplicateRules = createContentPackLoader(
      createContentPackManifest(
        [first, duplicateRule].map((pack) => manifestEntry(pack)),
      ),
    );
    await expect(
      duplicateRules.load([first.id, duplicateRule.id]),
    ).rejects.toMatchObject(errorWithCode("duplicate-rule-owner"));
  });

  it("exposes sealed snapshots rather than mutable maps or source objects", async () => {
    const source = { title: "Kept", description: "Original" };
    const core = fixturePack("core", [], {
      definitions: { worldFacts: [{ id: "kept", value: source }] },
    });
    const runtime = await createContentPackLoader(
      createContentPackManifest([manifestEntry(core)]),
    ).load(["core"]);
    source.description = "Changed after assembly";

    const definition = runtime.definitions.worldFacts.get("kept");
    expect(definition?.value.description).toBe("Original");
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Object.isFrozen(runtime.definitions)).toBe(true);
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition?.value)).toBe(true);
    expect("set" in runtime.packs).toBe(false);
    expect("set" in runtime.definitions.worldFacts).toBe(false);
  });
});
