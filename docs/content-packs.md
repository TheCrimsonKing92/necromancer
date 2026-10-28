# Content-pack boundary

This document defines the delivery boundary for adding practices and regions
without making every authored rule, scene, and asset part of the initial
browser payload. It is a migration target, not a second engine. Existing
facades remain the public vocabulary; packs supply definitions and narrowly
typed implementations to a runtime that is complete before synchronous play
begins.

The governing rule is:

> Loading may be asynchronous at a deliberate journey boundary. Rules and
> transitions are synchronous and deterministic after that boundary resolves.

## Why a pack boundary is needed

The current prototype already has useful lazy-delivery seams, but its game
content is still largely one eager graph:

- `content.ts` statically combines the opening, toll-road, and Saint Wake scene
  catalogs. Importing one story selector currently brings every proving-ground
  stretch into the same graph.
- `advancements.ts` combines authored advancement data with common selection
  and application rules. Persistence imports its complete ID catalog to
  validate a save.
- `engine.ts` and focused battle modules statically import Bonebinder battle,
  servant, and advancement behavior. The compatibility facade `practices.ts`
  also re-exports the complete Bonebinder implementation.
- `persistence/current-save.ts` and `persistence/validation.ts` statically
  import full story, advancement, and Bonebinder catalogs. A save cannot yet be
  inspected to determine its dependencies without first loading those
  dependencies.
- `character-creation-transition.ts` dynamically imports the Ditch-Hand
  initializer and awaits the Bonebinder presentation surface. This is the
  correct shape for a loading boundary, but it cannot remove the rest of the
  Bonebinder implementation from the eager graph while the engine and
  persistence import that implementation directly.
- The `types.ts` reference to `BonebinderPracticeState` is type-only and has no
  browser cost, but it shows that practice-owned persisted state is not yet a
  generic namespaced contract.

The Inventory, Journal, Stats, ending, and Bonebinder surface loaders establish
the presentation precedent: a feature's markup is not exposed until its
required code and styles are ready. Content packs extend the same contract to
domain capability and authored definitions.

## What belongs in a pack

A pack is a cohesive authored extension with a stable identity and its own
version. It is one of these kinds:

- **core**: shared schemas, anatomy, combat math, common transitions, world
  primitives, persistence framing, and the minimal title/creation shell;
- **practice**: a playable practice's definitions, starting operation,
  practice-owned state normalizer, actions, advancements, and rule adapters;
- **region**: route graph, scenes, encounters, actors, local items, event pools,
  and world definitions for one campaign region;
- **integration**: optional authored reactions or situations that require both
  a particular practice and a region. An integration pack may depend on both;
  the practice and region must not import one another.

Core owns reusable algorithms. A pack should normally contribute typed data to
those algorithms. It may contribute executable behavior only through an
explicit, capability-specific port, such as a practice initializer or a combat
action resolver. There is no generic event bus and no unordered `hooks[]`
array.

Practice packs must not import region packs. Region packs describe eligibility
in terms of world facts, tags, and practice capabilities rather than branching
on a concrete practice ID. Cross-specific prose or mechanics belong in an
integration pack so either side remains independently loadable.

## Stable identities

IDs are persisted API. They are never derived from display names, file paths,
array positions, or chunk names.

```ts
export type ContentPackId =
  | "core"
  | `practice:${PracticeId}`
  | `region:${RegionId}`
  | `integration:${RegionId}:${PracticeId}`;

export interface ContentKey<K extends string = string> {
  readonly pack: ContentPackId;
  readonly id: K;
}

export interface ContentPackReference {
  readonly id: ContentPackId;
  readonly version: number;
}
```

Existing IDs can remain plain string unions during migration. The owning pack
must declare them, and the assembled runtime must reject duplicates. A later
change may adopt qualified keys at registry boundaries without rewriting
player-facing IDs.

Pack versions and `SAVE_SCHEMA_VERSION` solve different problems:

- the save schema version describes the core envelope and shared state shape;
- a pack version describes state and authored-ID compatibility owned by that
  pack.

Neither version is the application release or the Vite chunk hash.

## Manifest: small, eager, and data-free

The eager manifest contains only dependency metadata and literal loader
functions. It must not import a pack implementation or duplicate its catalogs.
Literal dynamic imports keep Vite's chunk graph reviewable.

```ts
export interface ContentPackManifestEntry {
  readonly id: ContentPackId;
  readonly kind: "core" | "practice" | "region" | "integration";
  readonly version: number;
  readonly dependencies: readonly ContentPackId[];
  readonly load: () => Promise<{ readonly default: ContentPack }>;
}

export const CONTENT_PACK_MANIFEST = {
  "practice:bonebinder": {
    id: "practice:bonebinder",
    kind: "practice",
    version: 1,
    dependencies: ["core"],
    load: () => import("./practice/bonebinder/pack"),
  },
  "region:north-vey": {
    id: "region:north-vey",
    kind: "region",
    version: 1,
    dependencies: ["core"],
    load: () => import("./region/north-vey/pack"),
  },
} as const satisfies ContentPackManifest;
```

Do not use `import.meta.glob` for the first implementation. Its convenience
makes accidental mega-chunks and eager glob options less obvious. A literal
entry also makes a missing pack and its dependency list a compile-time review
point.

## Pack contract

The pack root is declarative except for named lifecycle ports. Definitions are
grouped by the domain that validates and consumes them; the pack does not
receive write access to arbitrary engine registries.

```ts
export interface ContentPack {
  readonly id: ContentPackId;
  readonly version: number;
  readonly dependencies: readonly ContentPackId[];
  readonly definitions: Readonly<{
    practices?: readonly PracticeDefinition[];
    actions?: readonly ActionDefinition[];
    advancements?: readonly AdvancementDefinition[];
    regions?: readonly RegionalRouteGraph[];
    scenes?: readonly StoryScene[];
    encounters?: readonly EncounterVariant[];
    roadEvents?: readonly RoadEventDefinition[];
    items?: readonly ItemDefinition[];
    worldFacts?: readonly WorldFactDefinition[];
  }>;
  readonly lifecycle?: Readonly<{
    initializePractice?: PracticeInitializer;
    normalizeState?: PackStateNormalizer;
  }>;
  readonly rules?: Readonly<{
    playerActions?: readonly PlayerActionRule[];
    advancementEffects?: readonly AdvancementEffectRule[];
    battleParticipants?: readonly BattleParticipantRule[];
    departureEffects?: readonly DepartureEffectRule[];
  }>;
}
```

Each rule port has a distinct input and output type and an explicit uniqueness
or composition policy. For example, one action ID has exactly one resolver,
while battle-participant rules may compose in sorted pack-ID order. A new kind
of behavior requires a new named port and validation; it must not tunnel
through an `unknown` payload or a general callback switchboard.

The first extraction should keep shared selectors and transitions in their
current modules. Pack roots contribute frozen catalogs; domain registry
builders validate them once. Renderer modules continue to consume domain
selectors and do not query packs directly.

## Runtime assembly

Loading produces an explicit immutable runtime. Module evaluation must not
mutate a process-global registry.

```ts
export interface ContentRuntime {
  readonly packs: ReadonlyMap<ContentPackId, LoadedPackSummary>;
  readonly story: StoryRegistry;
  readonly actions: ActionRegistry;
  readonly advancements: AdvancementRegistry;
  readonly encounters: EncounterRegistry;
  readonly items: ItemRegistry;
  readonly routes: RouteRegistry;
  readonly practicePorts: PracticePortRegistry;
  readonly world: WorldDefinitionRegistry;
}

export interface ContentPackLoader {
  load(
    requested: readonly ContentPackId[],
  ): Promise<ContentRuntime>;
}
```

Assembly follows these steps:

1. Expand dependencies from the eager manifest and reject missing references or
   cycles.
2. Import every required pack at most once. Concurrent requests share the same
   promise.
3. Verify that the returned ID, version, and dependencies match the manifest.
4. Sort by pack ID for deterministic composition; dependency order is used only
   to prove readiness, never as hidden rule priority.
5. Validate duplicate IDs, dangling references, advancement graphs, route
   reachability, action narration coverage, and declared rule-port ownership.
6. Freeze the composed registries and expose the runtime.

Tests should construct a fresh runtime. The browser app may hold one sealed
runtime for its current testament. During migration, stable facades such as
`content.ts` and `advancements.ts` may delegate to an installed default runtime,
but only the app bootstrap may install it, and tests must have an explicit reset
or, preferably, inject a runtime. Mutable singleton registration from pack
module side effects is forbidden.

## Deliberate loading lifecycle

There are three supported asynchronous boundaries.

### New character

1. The creation shell records the selected practice.
2. The app requests `core`, the opening North Vey region used by the proving
   ground, and the selected practice pack (plus any matching integration pack).
3. The runtime is assembled and validated.
4. The synchronous character constructor and the pack's practice initializer
   run as one transition.
5. Required practice presentation code and styles resolve.
6. Only then does the app persist or render the playable state.

This replaces the practice-specific `tradition !== "summoner"` branch in
`createPlayableCharacter`. It preserves the important existing guarantee that
there is no rendered Bonebinder state without its servant and surface.

### Continue save

1. Core persistence parses a small envelope and validates pack references
   without importing their implementations.
2. The app loads exactly the referenced packs and their dependencies.
3. Core migrations run, then each pack normalizes its namespaced state from the
   saved pack version to the loaded version.
4. Full cross-catalog validation runs against the assembled runtime.
5. Practice readiness and screen-specific presentation loaders resolve.
6. The state renders.

An unavailable pack leaves the save intact and returns an actionable
"testament content unavailable" result naming the missing pack. It must not
silently strip practice state, substitute a different region, or fall through
to a new game.

### Enter region

The route transition first resolves the destination's region pack and any
eligible integration pack. Only after validation may the synchronous travel
transition spend resources, advance a seed, choose a scene, or save the new
position. A failed download therefore cannot leave a half-entered region.

After any of these boundaries, ordinary engine operations are synchronous.
They may assert that `requiredPacksForRun(state)` is a subset of
`runtime.packs`; they never trigger a network request from combat resolution or
a pure selector.

## Persistence and normalization

The save envelope should gain a compact content descriptor before any region is
actually split:

```ts
export interface PersistedContentSet {
  readonly packs: readonly ContentPackReference[];
  readonly activePractice: ContentPackId;
  readonly activeRegions: readonly ContentPackId[];
}

export interface PackStateEnvelope {
  readonly version: number;
  readonly value: unknown;
}

export type NamespacedPackState = Partial<
  Record<ContentPackId, PackStateEnvelope>
>;
```

The descriptor is authoritative for loading; the character title and current
story ID are not reverse-looked-up to guess dependencies. Historical saves
without the descriptor receive an explicit migration based on their schema
version and known legacy IDs. That inference exists only in the migration.

Pack state must be namespaced. Core validation checks that each envelope is a
record with a numeric version but leaves `value` opaque. The loaded pack owns:

- structural validation of its value;
- additive defaults for current saves;
- migrations from every supported earlier pack version;
- rejection of future or irrecoverably malformed versions.

The pack normalizer is pure: it receives cloned data and returns normalized
data plus notices. It cannot read storage, load another pack, consume a random
number, or inspect presentation state. Cross-pack references are validated only
after every required pack is normalized.

The existing Bonebinder state can move first from
`run.practiceStates.bonebinder` into a pack-state envelope through a schema
migration. Keep a compatibility selector/facade while engine call sites are
converted; do not maintain two mutable copies.

## Seeded determinism

Code splitting must not change outcomes. Enforce these rules:

- Loading, registry assembly, normalization, validation, and rendering consume
  no game seed.
- No pack chooses content during module evaluation.
- Every random outcome is selected inside an authoritative transition using a
  persisted seed or named persisted seed stream.
- Candidate lists are stable authored arrays or explicitly sorted IDs. Never
  depend on import completion, object insertion, filesystem, or manifest order.
- Pack-ID sorting determines composition only. It cannot change the number or
  order of random draws.
- Adding a pack that is not referenced by a run cannot alter that run's
  candidate set or seed progression.
- A selected future encounter/event remains persisted by ID before leaving the
  transition, as `wakeVariant` does now.

Determinism tests must compare uninterrupted play with save/load at every new
loading boundary and assert the same state, selected content IDs, Witness
events, and next seed.

## Bundler and asset contract

The intended Vite graph is:

```text
eager shell + core runtime + compact manifest
  -> selected practice chunk
  -> current region chunk
  -> eligible integration chunk (only when both sides are active)
  -> screen- and pack-private styles/assets on demand
```

Rules for keeping that graph intact:

- Only the compact manifest may import pack roots, and those imports are
  dynamic literal imports.
- Core and one pack may share a domain module; two feature packs must not import
  each other's roots.
- A pack root must not import a barrel that re-exports other packs.
- Shared runtime rules move to core only when at least two packs genuinely use
  them. Shared prose and speculative helpers do not earn eager residency.
- Pack-private images, sprites, and styles are referenced only by that pack or
  its surface loader. A manifest thumbnail, if needed, is a separately budgeted
  compact asset.
- Chunk filenames and hashes are delivery details and never persisted.

Do not force one source file to equal one output chunk. The contract is graph
reachability and cold-path transfer, not a particular Vite filename.

## Executable checks

Land these checks with the migration phase that makes them meaningful.

### Static architecture checks

Extend `check-architecture.mjs` to assert:

1. modules under `src/game/content-packs/practice/`, `region/`, and
   `integration/` are not statically imported from the eager graph;
2. only `content-packs/manifest.ts` contains dynamic imports of pack roots;
3. practice packs do not import region packs, region packs do not import
   practice packs, and integration packs declare both dependencies;
4. pack roots do not import UI code, and presentation loaders do not own domain
   definitions;
5. the old `practices.ts` facade no longer wildcard-re-exports a complete pack
   after its migration phase;
6. each manifest ID is unique and has a matching pack contract.

These should be named failures. Do not enforce a future directory convention
before its first real pack lands.

### Registry and persistence tests

- reject duplicate owned IDs, dependency cycles, manifest/pack version
  mismatch, undeclared dependencies, and duplicate exclusive rule ports;
- load the same requested set in different promise-completion orders and obtain
  structurally identical registries;
- normalize legacy, current, missing-default, malformed, and future-version
  pack state;
- preserve an unavailable-pack save unchanged;
- prove uninterrupted and save/load-seamed outcomes are identical;
- prove a nonselected practice pack is never evaluated during another
  practice's new run or continue flow.

### Build-graph and browser contracts

Generate Vite's build manifest in the performance build or inspect browser
resource entries. Assert that:

- cold title/creation does not fetch any practice or region implementation;
- choosing Medium does not fetch Bonebinder or Renderer;
- continuing a Bonebinder save fetches Bonebinder before usable markup renders
  and does not fetch unrelated practices;
- the current opening region loads before its first scene, while a later region
  remains absent;
- a cold battle remains styled and interactive without visiting any optional
  screen;
- all fetched chunks are counted by the representative transfer and
  compound-load-tail gate.

Maintain a small allowlist per journey rather than snapshotting hashed asset
names. Map resource URLs through the Vite manifest to stable source entry IDs.

### Performance checks

- Keep the existing representative cold-path transfer threshold failing. Pack
  extraction is not permission to fill the recovered core headroom.
- Record eager entry transfer and every newly selected pack separately.
- Compare first-use latency, long tasks, allocation, retained heap, and
  compound-load tail at creation, continue, and region entry.
- Repeated new-run/continue cycles must not retain old runtimes, pack state, DOM
  nodes, or documents.
- Pack validation happens once per loaded content set, not on every selector or
  action.

## Migration sequence

Each phase preserves observable behavior and lands its characterization tests
before moving ownership.

### Phase 0: characterize the current seams

- Add cold new-character and continue-save resource assertions for all three
  prototype choices.
- Record current result state, required styles, focus, save output, and seeded
  first encounter across those journeys.
- Record entry transfer and Bonebinder first-use cost.

### Phase 1: core loader and content descriptor

- Add pack contract types, compact manifest, dependency expansion, immutable
  registry assembly, and validation tests with small fixture packs.
- Add `PersistedContentSet` and namespaced state envelopes with legacy defaults.
- Do not move production definitions yet. The default runtime still assembles
  today's core catalogs, so behavior and chunks should remain unchanged.

### Phase 2: Bonebinder as the proving pack

- Move Bonebinder definition, initialization, state normalization, battle
  participant behavior, commands, and advancement-specific ports behind
  `practice:bonebinder`.
- Replace the hard-coded creation/continue branch with a practice-pack lookup.
- Keep stable selectors and transition facades for callers while removing
  direct engine imports of Bonebinder implementation modules.
- Move its UI surface independently but coordinate both promises before render.
- Verify Medium and Renderer cold runs no longer transfer the Bonebinder pack.

Bonebinder is the right first extraction because it has domain state,
persistence, combat behavior, advancements, and a dedicated surface. A boundary
that handles only its prose would not prove the architecture.

### Phase 3: advancement and action catalogs

- Separate common advancement algorithms from pack-contributed definitions and
  effect rules.
- Replace persistence's eager full-catalog imports with core framing followed by
  loaded-runtime validation.
- Move Medium and Renderer authored actions and trees into their practice
  packs. Preserve compatibility IDs for the three prototype traditions.

### Phase 4: North Vey proving-ground region

- Split current route scenes, encounter variants, event pools, local actors,
  facts, and region-private items into one `region:north-vey` pack. The current
  testament remains a proving-ground route through that region, not the
  region's universal name.
- Keep genuinely global items and world primitives in core.
- Introduce one integration fixture to prove practice-aware regional content
  without direct practice/region imports.

### Phase 5: second region and budget lock

- Add the first real later region through the new boundary.
- Enforce static graph rules and stable source-entry resource allowlists.
- Lower eager transfer and aggregation-file ceilings to the achieved values.

## Review checklist

Before accepting a pack or moving content across the boundary, answer all of
these:

- Is the content owned by core, one practice, one region, or an integration?
- Can core determine that the pack is required using only persisted stable IDs?
- Does every required dependency resolve before state mutation or markup?
- Are rules data-driven where the algorithm is shared, and behind a named port
  where it is not?
- Can load order or module evaluation consume randomness or alter candidate
  ordering?
- Can the pack normalize every persisted version it claims to support?
- Does an unavailable pack leave the save recoverable?
- Do cold-path resource contracts prove unrelated packs remain absent?
- Did eager transfer stay flat or fall after the extraction?
- Are the stable facades smaller, and was any grandfathered ceiling lowered?
