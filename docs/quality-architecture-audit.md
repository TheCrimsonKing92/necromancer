# Quality and architecture audit

Audit date: 2026-07-26  
Scope: repository-wide, report only  
Baseline: the working tree as inspected, including the current uncommitted rewrite

## 1. Executive assessment

Necromancer has a strong small-application architecture. Its strict TypeScript
domain, serializable transitions, deterministic seed, semantic string renderer,
delegated browser events, versioned saves, typed catalogs, and unusually explicit
architectural guidance are all sound foundations. A textual scan of 340 relative
imports among implementation modules found no circular dependency. The current
architecture check passes, as do all 20 tooling tests and 181 game/UI tests.

The repository is not suffering from indiscriminate large-file sprawl. Most large
files are recognizably catalogs or cohesive domains. The most important problems
are cross-cutting ownership problems: a concept is locally well implemented but
several modules each know a different part of it. That pattern is already visible
in encounters, scene outcomes, combatant identity, eligibility previews, and save
compatibility. It will become expensive when the route graph, settlements,
services, provenance, evidence, crafting, recurring people, and additional
traditions arrive.

### What is strongest

- The dependency direction is respected at its coarsest boundaries: no game
  module imports UI, and no renderer imports `app.ts`.
- `src/game/anatomy/`, `src/game/engine/`, `src/game/persistence/`,
  `src/game/enemy-actions/`, `src/ui/inventory/`, and `src/styles/inventory/`
  demonstrate useful concept-owned decomposition.
- Combat calculations and damage resolution are substantially separated from
  prose. Technique cadence and action narration are typed catalogs rather than
  enemy/action prose switches.
- Saves have explicit version keys, legacy migrations, current normalization,
  and reproducible seeds.
- The UI uses one delegated click handler and a targeted target-selection update;
  renderers are pure string projections.
- Catalog validation is extensive: advancements, encounters, road events,
  story scenes, economy definitions, narration, item visuals, and enemy cadences
  all have some contract coverage.
- There are no runtime dependencies, and `tsconfig.json` enables strictness,
  unused-symbol checks, unchecked-index checks, and fallthrough protection.

### What is fragile

1. `RunState.flags` is simultaneously a boolean fact bag, a scene-progress
   store, an advancement presentation queue, a preparation ledger, and a
   colon-delimited result database. The 25-case story-effect switch is its main
   writer. This is the largest obstacle to richer noncombat scenes and safe save
   evolution.
2. Encounter identity is not owned by one contract. Road, vault, and wake
   encounters are treated differently, while lifecycle rewards, routing,
   titles, defeat copy, persistence inference, combatant forms, and narration
   each branch independently.
3. UI modules reproduce live rule calculations and availability conditions.
   This has already created parallel formulas and partial eligibility lists.
4. Current-save validation is structurally broad but semantically permissive,
   while compatibility code repeats enemy anatomy/materiality/armor facts by ID.
5. Mechanical catalogs are exported through an aggregate content registry that
   also imports dynamic route content, and `types.ts` has become a 66-importer
   dependency magnet. These are cycle and discoverability risks for the planned
   campaign layer.

### Top five priorities

1. Introduce typed `SceneProgress`, `ChallengeResult`, `Consequence`, and
   predicate contracts; migrate two proving-ground interactions before adding
   more scenes.
2. Establish a common encounter contract and a combatant-archetype/form catalog
   used by openings, lifecycle, rendering selectors, and persistence.
3. Add pure query/preview selectors for story choices, combat actions, item use,
   and market transactions; render exactly those results.
4. Make current-save normalization reconstruct semantic invariants from owned
   catalogs and split legacy compatibility from current-state repair.
5. Separate mechanical action/tradition catalogs and domain type contracts from
   the aggregate authored-story registry; strengthen automated dependency and
   registry checks after each migration.

## 2. Current architecture map

The intended flow in `docs/architecture.md` is:

```text
definitions/content -> pure domain rules -> transitions -> renderers -> app
```

The implementation is closer to:

```text
Mechanical catalogs (actions, traditions, items, advancements, techniques)
        |                         |
        v                         v
Pure rules (character, anatomy, combat math, damage, checks, random)
        |                         |
        +----------+--------------+
                   v
Authored state-aware scene projections (content/*, road-events, encounters)
                   |
                   v
Transitions (engine.ts, engine/*, inventory-engine.ts)
                   |
                   v
Pure HTML renderers (ui/*)
                   |
                   v
Browser wiring and persistence dispatch (ui/app.ts)

Persistence validation/migration -> root state + catalogs + compatibility data
```

That second map is not inherently wrong. Authored choice copy legitimately reads
pure selectors. The problem is that `src/game/content.ts` combines the mechanical
catalog side and the state-aware route-registry side. Pure modules such as
`combat-math.ts`, `damage-resolution.ts`, combatant factories, and persistence
import that aggregate facade for `TRADITIONS` or `ACTIONS`
([`content.ts:1-26`](../src/game/content.ts#L1)). Fourteen implementation
modules import the facade. As more route modules import world, inventory,
campaign, and predicate selectors, the aggregate becomes an avoidable cycle
surface.

### Ownership findings

| Concept | Current owner | Assessment |
|---|---|---|
| Character formulas | `character.ts` | Strong, pure, reused. |
| Anatomy/wounds/recovery | `anatomy.ts` facade + `anatomy/*` | Strong decomposition; compatibility facade is useful. |
| Damage resolution | `damage-resolution.ts` | Strong mechanical boundary. |
| Enemy techniques/cadence | `enemy-actions.ts` facade + catalogs | Strong and appropriately data-driven. |
| Player action execution | `engine/player-actions.ts` | Cohesive distinct algorithms; previews are not co-owned. |
| Story effects | `engine.ts` | Under-abstracted: 25 unrelated effects and scene-specific result storage. |
| Encounters | `encounters.ts`, factories, openings, lifecycle, UI, persistence | Fragmented; wake variants have a richer contract than road/vault encounters. |
| World model | `world.ts` | Correct state semantics, but definitions, mutations, harvesting, and encounter eligibility are accumulating together. |
| Inventory/equipment/market | `items.ts` + `inventory-engine.ts` | Healthy for one market; global stock/location checks will not scale to providers/services. |
| Witness | `witness.ts`, `combat-witness.ts`, narration catalog | Structured core is strong; defeat/pronoun prose still branches on entity IDs. |
| Persistence | facade + schema/validation/current/migrations/compatibility | Good top-level separation; normalization sources duplicate domain identity. |
| UI | named renderers + `app.ts` | Strong dispatch and event delegation; several renderers reproduce eligibility/effect rules. |
| Item visuals | `game/item-visuals.ts` | Misowned presentation metadata inside the game domain. |
| CSS | feature files + ordered facades + final responsive file | Healthy and explicit; responsive file is a future cross-feature hotspot, not a current defect. |

### Facades

The small facades (`anatomy.ts`, `enemy-actions.ts`, `content.ts`,
`persistence.ts`, `render.ts`, `inventory-render.ts`) preserve public imports and
are generally useful. They should not become the default internal import path.
For example, inventory equipment presentation imports pure combat formulas from
the transition facade
([`equipment-render.ts:1-18`](../src/ui/inventory/equipment-render.ts#L1)).
Internal modules should normally import the narrow owner; facades should serve
external compatibility and top-level composition.

No static import cycle was found. The risk is prospective, not a claim that the
current graph is cyclic.

## 3. Quantitative hotspot inventory

Counts use physical lines from `rg -c "^"` and a simple scan of relative
TypeScript imports.

| Measure | Current value |
|---|---:|
| TypeScript implementation files | 78 |
| TypeScript implementation lines | 15,003 |
| CSS files / lines | 16 / 2,896 |
| TypeScript test files / lines | 25 / 5,859 |
| Vitest cases | 181 |
| Tooling `node:test` cases | 20 |
| Relative implementation import edges | 340 |
| Static relative-import cycles found | 0 |
| Architecture-checked implementation files (TS + CSS) | 94 |

### Largest implementation modules

| File | Lines | Health assessment |
|---|---:|---|
| `game/engine.ts` | 803 | Fragile: scene coordination plus 25 story-effect algorithms. |
| `game/encounters.ts` | 594 | Mostly data; validation should split before a large content expansion. |
| `game/advancements.ts` | 571 | Catalog + graph rules are coherent; presentation deferral in flags is not. |
| `game/items.ts` | 558 | Healthy at current scale; market/economy concerns need extraction at second provider. |
| `game/types.ts` | 537 | Dependency magnet: root state plus unrelated domain-definition contracts. |
| `game/engine/player-actions.ts` | 481 | Ten genuinely distinct actions; acceptable, but needs shared query models. |
| `game/engine/battle-lifecycle.ts` | 480 | Fragile encounter-specific finish/reward/routing branches. |
| `ui/app.ts` | 445 | Cohesive delegated browser coordinator; size is acceptable. |
| `game/world.ts` | 418 | Four concepts now share one module; split on campaign expansion. |
| `game/witness.ts` | 407 | Cohesive but close to a scale trigger for formatter/validator separation. |
| `game/inventory-engine.ts` | 402 | Healthy for current scope; services and multiple markets need new owners. |
| `game/road-events.ts` | 398 | Authored data is mixed with parsing of string result records and validation. |
| `game/engine/battle-openings.ts` | 392 | Three authored openings are legitimate; common battle construction is repeated. |
| `ui/battle-render.ts` | 388 | Fragile because it calculates action mechanics as well as rendering. |
| `game/persistence/validation.ts` | 379 | Cohesive structural guard, but semantic normalization is incomplete. |

The 650-line default ceiling does not identify `player-actions.ts`,
`battle-lifecycle.ts`, `world.ts`, `road-events.ts`, or `battle-render.ts` as
hotspots even though each is already at an important responsibility boundary.
The audit therefore treats ceilings as protection, not as evidence of cohesion.

### Import concentration

Top implementation fan-in:

| Module | Importers |
|---|---:|
| `game/types.ts` | 66 |
| `game/anatomy.ts` | 23 |
| `game/items.ts` | 22 |
| `ui/html.ts` | 15 |
| `game/character.ts` | 15 |
| `game/content.ts` | 14 |
| `game/advancements.ts` | 13 |
| `game/encounters.ts` | 10 |
| `game/random.ts` | 10 |
| `game/witness.ts` | 9 |

Top fan-out includes `engine.ts` (16), `battle-render.ts` (14),
`inventory-render.ts` and `battle-lifecycle.ts` (12 each), and
`story-render.ts`, `render.ts`, `battle-transitions.ts`, and
`combatant-render.ts` (11 each).

High fan-in is not automatically bad: `types.ts`, `anatomy.ts`, and `html.ts`
are intended shared contracts/facades. It becomes a concern when the imported
module assembles high-level content, as `content.ts` does.

### Switches and encoded state

| File | `case` labels | Assessment |
|---|---:|---|
| `game/engine.ts` | 25 | Bulk authored/story behavior encoded as control flow. |
| `ui/app.ts` | 22 | Appropriate delegated action dispatch. |
| `game/witness.ts` | 20 | Two appropriate exhaustive discriminated-union switches. |
| `game/engine/player-actions.ts` | 10 | Distinct algorithms; not merely prose/data. |
| `game/statuses.ts` | 8 | Small closed union; acceptable. |
| `ui/render.ts` | 7 | Appropriate screen dispatch. |

The implementation has 95 `flags` push/include/filter or related prefix-parsing
matches across 11 modules: 37 are in `engine.ts`, and 21 use prefix matching.
Representative encoded records include:

- `burial-cut-result:<choice>:<outcome>` and
  `burial-cut-roll:<choice>:<chance>:<roll>`
  ([`engine.ts:362-417`](../src/game/engine.ts#L362));
- `hollis-rendering:<yield>:<witness>`
  ([`engine.ts:515-547`](../src/game/engine.ts#L515));
- `surgeon-recovery:<health>:<stabilized>:<improved>:<healed>:<scars>`
  ([`engine.ts:639-657`](../src/game/engine.ts#L639));
- `iven-cordial-result:<outcome>:<chance>:<roll>:<restored>`
  ([`engine.ts:659-698`](../src/game/engine.ts#L659)).

Those strings are decoded in content and rendering, for example
[`road-events.ts:36-51`](../src/game/road-events.ts#L36),
[`road-events.ts:163-193`](../src/game/road-events.ts#L163), and
[`outcome-copy.ts:103-165`](../src/game/content/outcome-copy.ts#L103).

### Test concentration

`engine.test.ts` is 2,583 lines (44% of all TypeScript test lines) and contains
64 cases (35% of Vitest cases). `render.test.ts` is 769 lines with 31 cases.
The large engine file covers setup, combat, inventory, wounds, world
consequences, advancement, three encounter stages, road events, and every wake
variant ([`engine.test.ts:184-2583`](../src/game/engine.test.ts#L184)).
Its scenario builders are useful, but many tests mutate enemy HP, seeds, flags,
and inventories directly
([`engine.test.ts:59-181`](../src/game/engine.test.ts#L59)).

## 4. Findings by domain

Labels used below:

- **Defect**: a current contract accepts or produces an invalid state.
- **Risk**: current behavior works, but ownership can drift.
- **Scale trigger**: acceptable now, with a named point at which extraction is required.
- **Recommendation**: subjective design guidance.

### Game content and pure rules

#### A. Story behavior has outgrown the effect switch — high confidence risk

`StoryEffect` is a central 25-ID tuple
([`types.ts:464-491`](../src/game/types.ts#L464)), and
`chooseStoryChoice` resolves every effect in one 425-line switch
([`engine.ts:300-771`](../src/game/engine.ts#L300)). The branches cover travel,
battle openings, inventory, checks, XP, wounds, convalescence, world knowledge,
standing, pressure, road selection, and result-record creation.

This is exactly the future growth path rejected by the roadmap
([`world-economy-noncombat-roadmap.md:263-334`](world-economy-noncombat-roadmap.md#L263)).
Adding a second settlement by extending this switch would make scene content,
transition algorithms, and persistence evolve in lockstep.

**Owned target:** `challenges/` owns check definitions and resolution;
`consequences.ts` owns a small exhaustive mechanical vocabulary;
`scene-progress.ts` owns transient multi-action state. `engine.ts` coordinates
the result and route, but does not implement every consequence.

#### B. Seed-domain mixing is repeated — confirmed duplication

The same integer mixer constants occur in `encounters.ts:69-72`,
`road-events.ts:321-324`, `world.ts:324-327`, and a shorter variant in
`content/shared.ts:9-12`. Divergent seed mixing can silently change reproducible
selection when new pools are added.

**Owned target:** `random.ts` should expose `mixSeed(seed, domainSalt)` and a
generic `rollStableEntry`/index operation. Preserve existing salts and add golden
sequence tests before replacing calls.

#### C. `world.ts` has four responsibilities — medium confidence scale trigger

`world.ts` owns region/faction/fact prose (lines 11-195), state construction and
mutation (197-280), Thaumaturgist harvesting probability (282-347), wake
eligibility (349-364), and validation (366-418). This is coherent enough for the
proving ground, but not for three regions, evidence, authority cases, and fronts.

Split when Stage 1 begins:

- `world/definitions.ts`: regions, factions, relations, facts;
- `world/state.ts`: constructors, fact/knowledge/standing/pressure operations;
- `harvesting.ts`: yield/witness checks;
- campaign/encounter selection owns wake eligibility.

Do not create empty region/faction directories before the first additional
definition exists.

#### D. Parallel ordered IDs need one deliberate policy — low risk

`WAKE_VARIANT_IDS`, `ROAD_EVENT_IDS`, `WORLD_FACT_IDS`, central unions in
`types.ts`, and record keys overlap. Explicit order is correct for seeded pools;
unordered registries do not need separate manual key arrays. The story validation
test additionally hardcodes road and wake IDs rather than importing the existing
ordered catalogs
([`story-validation.test.ts:15-47`](../src/game/story-validation.test.ts#L15)).
A new entry can therefore miss the sample matrix.

Use explicit order only where order affects deterministic selection. Otherwise
derive keys from a `satisfies`-checked registry. Tests should iterate the
production order.

### Transitions and state

#### E. `flags` is an untyped event store — highest-priority risk

`RunState.flags: string[]` appears beside the typed world model
([`types.ts:358-367`](../src/game/types.ts#L358)) but carries:

- durable booleans (`heard-warning`);
- completed choices and dismissed outcomes;
- advancement deferral/presentation;
- active/spent campaign preparations;
- check rolls and recovery summaries;
- transient scene-local outcomes.

This makes queries linear and string-based, permits duplicates, hides
cardinality, and forces prose code to understand transition serialization.
Colons in future identifiers or a changed field order become save-format changes
without a schema declaration.

**Migration:** add typed fields additively in the next schema; dual-read legacy
flags, write only typed state for converted scenes, and remove each legacy flag
family only in a later migration. Convert burial cut and Iven first, as the
roadmap already recommends. Do not attempt a one-shot rewrite.

#### F. Scene availability is not authoritative — confirmed duplication/risk

The engine checks scene, advancement, choice existence, tradition, completion,
and then effect-specific resources
([`engine.ts:300-344`](../src/game/engine.ts#L300)). `story-render.ts` separately
knows only the Spirit checks for two choices, hound-tooth availability, and
Iven’s surgery payment
([`story-render.ts:104-129`](../src/ui/story-render.ts#L104)). Other effect
requirements remain click-time errors.

Introduce `storyChoiceAvailability(state, choice)` returning a structured
`{ available, reason }`. Both `chooseStoryChoice` and the renderer consume it.
The same predicate vocabulary can later power route edges and service access.

#### G. `EngineResult` is too loose for the planned consequence system — design recommendation

`EngineResult` allows `state`, `error?`, and `message?` simultaneously
([`types.ts:533-537`](../src/game/types.ts#L533)); `app.ts` gives errors
precedence, then saves, then handles messages
([`app.ts:314-340`](../src/ui/app.ts#L314)). This works, but it cannot express a
typed challenge outcome, changed facts, or presentation result without flags.

When Stage 1 lands, evolve this into a discriminated result such as
`failure | transition | transition-with-outcome`, or keep `EngineResult` as the
facade while it contains a structured outcome. Do not refactor it merely for
style before the new result contract exists.

#### H. Full-state cloning is consistent but locally repeated — low risk

`engine.ts`, `inventory-engine.ts`, and `battle-transitions.ts` each call
`structuredClone` at the transition boundary. This consistency is a strength.
A shared clone helper by itself would be abstraction without ownership. If
profiling or campaign-state size later requires structural sharing, introduce a
`transition-state.ts` policy with purity tests; until then, leave the local calls.

### Encounters and combatant identity

#### I. Wake variants have a contract; road and vault encounters have branches — highest-priority risk

`WakeVariantDefinition` owns scene/battle/outcome/escape/reward data
([`encounters.ts:10-51`](../src/game/encounters.ts#L10)). Road and Saint Orra
metadata instead appears in:

- `continueJourney` routing (`engine.ts:150-191`);
- battle construction (`battle-openings.ts:45-392`);
- XP, loot, world facts, victory/defeat copy
  (`battle-lifecycle.ts:379-477`);
- battle headings (`battle-render.ts:327-342`);
- ending copy (`ending-render.ts:29-96`);
- market location (`inventory-engine.ts:225-229`);
- save inference (`current-save.ts:121-141`).

This asymmetry is a direct cause of on-rails conditionals. Create a common
`EncounterDefinition` for all encounter IDs. It should own stable lifecycle
metadata: XP, rewards, facts, presentation IDs, escape policy, and onward
objective/route reference. Authored opening algorithms remain in named opening
handlers because Saint Orra genuinely differs from a generic roster.

#### J. Physical form and grammar are repeated by entity ID — high confidence risk

`persistence/combatant-compatibility.ts` independently maps IDs to anatomy,
materiality, vital parts, damage modifiers, materiality labels, armor labels,
and body scale
([`combatant-compatibility.ts:38-121`](../src/game/persistence/combatant-compatibility.ts#L38)).
Factories repeat the current values
([`combatants.ts:108-214`](../src/game/engine/combatants.ts#L108)).
`combat-witness.ts` hardcodes Hollis and Orra pronouns and branches on hound and
Saint Orra identity for defeat prose
([`combat-witness.ts:20-76`](../src/game/combat-witness.ts#L20)).

Create a stable combatant-form/archetype catalog with anatomy, materiality,
body scale, default defenses, grammar/pronouns, and defeat narration profile.
Encounter entries reference an archetype and supply encounter-local name/stats.
Persistence uses the same catalog for missing-field defaults. Do not put every
enemy stat and every line of prose into one universal enemy object.

### Persistence

#### K. Current saves accept semantically invalid finite values — confirmed defect

The v4 guards accept finite status turns/potency, wound bleed, body condition,
HP/max HP, attack, defense, Ward, attributes, skills, world pressures, and
standing without consistently enforcing domain ranges
([`validation.ts:76-168`](../src/game/persistence/validation.ts#L76),
[`validation.ts:176-253`](../src/game/persistence/validation.ts#L176)).
`parseCurrentValue` clamps Spirit and obols and normalizes some identities, but
does not clamp all of those fields
([`current-save.ts:29-155`](../src/game/persistence/current-save.ts#L29)).
A structurally valid local save can therefore load negative Ward, negative
status duration, HP above maximum, or body condition above its maximum.

Add catalog-driven current normalizers that reconstruct/clamp each domain:
combatant resources/statuses/body, player stats/inventory, and world state.
Validation should first establish safe structure; normalization should establish
semantic invariants; a final invariant check should reject anything still
impossible.

#### L. Persisted and derived state are not fully explicit — medium risk

`Player` stores `attack`, `defense`, and `level`
([`types.ts:201-240`](../src/game/types.ts#L201)). Player effective attack and
defense are derived from attributes rather than those stored fields
([`combat-math.ts:30-79`](../src/game/combat-math.ts#L30)). Level is derived from
XP, but current normalization preserves a saved level above the derived result
([`current-save.ts:86-89`](../src/game/persistence/current-save.ts#L86)).

Document persisted-vs-derived status per field. Prefer a discriminated player
type that does not require enemy base attack/defense fields, and normalize level
exactly from XP unless an intentional non-XP level source is introduced.
Maximum Health/Spirit need a clearer permanent-bonus model before they can be
fully derived.

#### M. Migration organization is good but contract tests should become matrix-based

The schema/current/migration/compatibility split is a strength. Current tests
cover v1-v4 examples and basic round trips. Future schemas need a fixture matrix:
each supported version × representative screen × battle/no-battle × typed world
state. Add invariant assertions after migration, not only shape assertions.

### Witness and narration

#### N. Action narration is strong; defeat narration is still control flow

The action narration catalog and token validator are a good pattern
([`combat-action-narration.ts:17-93`](../src/game/combat-action-narration.ts#L17)).
`defeatTransitionSegment`, by contrast, combines algorithmic cause selection with
ID/name-specific authored prose. Move the prose templates to typed defeat
profiles keyed by form/archetype; keep the small cause/location selection
algorithm.

`possessive()` is also duplicated in `combat-action-narration.ts:14-15` and
`combat-witness.ts:17-18`. Grammar belongs in a small named narration/identity
module, not a generic utility module.

#### O. `witness.ts` is cohesive enough today — explicit non-urgent scale trigger

The 407-line file owns constructors, formatting, append/truncation, runtime
validation, and legacy presentation fallback. Its two exhaustive segment
switches are appropriate. Split formatter, validator, and event constructors
only when new segment families make changes regularly touch unrelated halves.
Do not replace the discriminated union with an opaque prose-event abstraction.

### UI, rendering, and browser app

#### P. Combat action descriptions reimplement execution formulas — high confidence risk

`battle-render.ts:91-155` calculates strike/off-hand damage, Brace gain, tonic
healing, Spirit Lash modifiers, shade attack/duration, and Corpsefire duration.
The corresponding rules are separately executed in
`player-actions.ts:54-475`. The renderer uses several shared primitive helpers,
but the composition is still duplicated.

Add a pure `playerActionPreview(player, actionId, target?)` returning structured
cost, damage/profile, hit chance, generated resource, duration/statuses, and
availability. Execution should consume the same effect calculation where
possible; the renderer supplies authored phrasing around the preview. This
preserves informative cards without making the UI a second rules engine.

#### Q. Inventory/market UI also duplicates availability — medium risk

The market renderer recalculates affordability/carrying
([`market-render.ts:26-50`](../src/ui/inventory/market-render.ts#L26)) while
`buyItem` repeats the rules
([`inventory-engine.ts:263-304`](../src/game/inventory-engine.ts#L263)).
Pack rendering separately decides whether a tonic can be used
([`pack-render.ts:18-66`](../src/ui/inventory/pack-render.ts#L18)).

Introduce transaction/use query results before adding finite stock, providers,
services, provenance, or Barter. Equipment comparison is different: its
preview composes existing pure calculations and is appropriately
presentation-focused.

#### R. `app.ts` and renderer dispatch are healthy

The 22-case click switch is an appropriate single delegated adapter
([`app.ts:99-253`](../src/ui/app.ts#L99)). Target switching updates only selected
cards and hit-chance spans, with a safe render fallback
([`app.ts:343-399`](../src/ui/app.ts#L343)). Do not replace it with per-element
listeners or an event-bus framework.

#### S. Item visuals are in the wrong dependency layer — confirmed ownership issue

`src/game/item-visuals.ts` contains sprite URLs, crop geometry, CSS background
properties, aspect ratios, and alt copy; its only production consumer is
`ui/inventory/item-render.ts`. Move it to `src/ui/assets/item-visuals.ts` (or a
similarly named UI-owned module) and keep catalog coverage tests. The game domain
should know item identity, not CSS sprites.

#### T. Small UI duplication is present but not worth broad abstraction

Percentage clamping is duplicated in `combatant-render.ts:36-39` and
`inventory/anatomy-render.ts:20-26`; recovery-result list wording is
near-duplicated in `road-events.ts:177-193` and
`content/outcome-copy.ts:119-132`. Extract the latter into a named recovery
presentation function. A shared percentage helper is optional; do not create a
general `ui/utils.ts`.

### CSS and assets

The CSS split is healthy. The ordered root facade and inventory sub-facade make
the cascade explicit. No component stylesheet exceeds 455 lines. Design tokens
are centralized in `base.css:1-26`; responsive rules are isolated to three
viewport breakpoints plus reduced motion
([`responsive.css:1-285`](../src/styles/responsive.css#L1)).

Risks:

- `responsive.css` must know every feature selector. At a second campaign/map
  layout, decide whether its responsive rules remain globally understandable or
  should move beside the owning component while preserving import order.
- `story-progression.css` owns both scene choices and advancement/result-card
  components. Split only if those components start evolving independently.
- Preserve the current screen-scoped item-art loading and optimized sprite
  dimensions. Do not introduce a generalized asset abstraction that eagerly
  imports all future portraits or maps.

### Tests and tooling

#### U. Tests are broad but concentrated and state-coupled — high confidence risk

The engine suite provides valuable end-to-end domain confidence, but direct
mutation and long journey setup make failures far from their cause. Split by
public contract:

- `story-transitions.test.ts`;
- `battle-actions.test.ts`;
- `battle-lifecycle.test.ts`;
- `inventory-engine.test.ts`;
- `encounter-progression.test.ts`;
- `world-consequences.integration.test.ts`.

Create test-only scenario builders with explicit named operations, not snapshots
of internal object layout. Keep a small number of complete-testament integration
tests.

Missing high-value contracts:

- every successful transition leaves the input state unchanged;
- every rejected transition returns the original state unchanged;
- all seeded selectors preserve golden sequences during refactors;
- every catalog reference resolves across encounter, cadence, archetype,
  reward, fact, route, provider, and consequence registries;
- current and migrated saves satisfy semantic invariants;
- every route pool entry is reachable and has a valid onward edge;
- every UI availability result matches transition acceptance;
- a browser smoke suite verifies semantic landmarks, focus, keyboard use, and
  save/resume, rather than relying only on HTML substrings.

#### V. Architecture enforcement is much narrower than the written agreement

`check-architecture.mjs:43-90` enforces line budgets, game-to-UI imports, and
renderer-to-app imports. It does not enforce the documented layer flow, detect
cycles, distinguish test files beyond size exclusion, detect high-growth
facades, or validate catalog ownership.

This is not a current failure—the check accurately reports what it implements.
Its success should not be summarized as “architecture is clean” without the
more limited wording “size and two dependency boundaries pass.”

## 5. Prioritized remediation

| Priority | Finding and evidence | Impact / confidence | Effort / risk | Proposed owner | Migration and feature-preservation constraints |
|---|---|---|---|---|---|
| P0 | Typed scene progress and consequence resolver; `engine.ts:300-771`, `types.ts:358-367`, 95 flag operations | Very high / high | High / medium | `challenges/`, `consequences.ts`, `scene-progress.ts` | Convert burial cut + one Iven interaction first; dual-read v4 flags; preserve prose, seed consumption, optional-choice independence, result cards, and saves. |
| P0 | Common encounter/lifecycle contract; `battle-lifecycle.ts:379-477`, `battle-render.ts:327-342`, `current-save.ts:121-141` | Very high / high | High / medium | `encounters/definitions.ts`, `encounters/lifecycle.ts` | Unify metadata without forcing scripted openings into generic data; golden-test rewards, facts, Witness order, endings, and onward route. |
| P0 | Combatant form/archetype catalog; `combatant-compatibility.ts:38-121`, `combatants.ts:108-214`, `combat-witness.ts:20-76` | High / high | Medium / medium | `combatants/archetypes.ts` + narration profile catalog | Preserve old-save inference and exact anatomy/materiality; migrate persistence to catalog defaults before deleting ID branches. |
| P1 | Pure action/choice/transaction query models; `battle-render.ts:91-181`, `story-render.ts:104-129`, `market-render.ts:26-50` | High / high | Medium / low | `player-action-query.ts`, `story-choice-query.ts`, economy selectors | UI and transition must consume the same result; preserve detailed dynamic copy and targeted DOM updates. |
| P1 | Semantic current-save normalization; `validation.ts:76-253`, `current-save.ts:29-155` | High / high | Medium / medium | `persistence/current-*` normalizers delegated to domain defaults | Clamp/dedupe/reconstruct, then validate; never silently discard a readable legacy run when a safe default exists. |
| P1 | Separate mechanical catalogs from aggregate story registry; `content.ts:1-26`, 14 importers | Medium-high / high | Low-medium / low | `actions.ts`, `traditions.ts`, `content.ts` compatibility facade | Keep public re-exports; change internal pure imports first; no authored behavior change. |
| P1 | Split tests by contract and add scenario builders; `engine.test.ts` 2,583 lines | Medium-high / high | Medium / low | test-only modules | Preserve a few full-run tests; builders express public transitions and only deliberately expose seed/HP fixtures. |
| P2 | Split world state/definitions/harvesting/eligibility; `world.ts:11-418` | Medium / high | Medium / low | `world/*`, `harvesting.ts`, campaign selector | Trigger with Stage 1 or second region; preserve fact/knowledge/standing distinction. |
| P2 | Generalize market/service queries; `items.ts:301-378`, `inventory-engine.ts:225-304` | High at Stage 2 / high | High / medium | `economy/markets.ts`, `economy/services.ts`, transition module | Trigger before second provider; keep ordinary economy distinct from black obols and add provenance lots only where needed. |
| P2 | Central seed mixing; four duplicate mixers | Medium / high | Low / low if golden-tested | `random.ts` | Preserve exact current sequences and domain salts. |
| P2 | Split root domain types; `types.ts` 537 lines, 66 importers | Medium / medium | Medium / medium | persisted state remains in `types.ts`; contracts move beside owners | Type-only facade re-exports preserve imports; do this alongside real domain extractions, not as a standalone reshuffle. |
| P3 | Move item visuals to UI; `game/item-visuals.ts:1-76` | Low-medium / high | Low / low | `ui/assets/item-visuals.ts` | Preserve sprite strategy, alt text, and coverage test. |
| P3 | Recovery presentation and grammar helpers | Low / high | Low / low | named narration/recovery presentation modules | No generic utils; preserve exact authored voice unless separately edited. |

## 6. Staged work

### Immediate low-risk cleanup

1. Move item visual metadata to UI ownership with a compatibility re-export only
   if consumers outside the repository require it.
2. Make story-validation samples iterate `ROAD_EVENT_IDS` and
   `WAKE_VARIANT_IDS`.
3. Centralize seed mixing in `random.ts` behind golden sequence tests.
4. Extract a shared recovery-result presentation function.
5. Add semantic invalid-save tests for negative Ward/status turns, over-max HP
   and body condition, duplicate facts, and out-of-range standing/pressure;
   then add narrow normalizers.
6. Add one contract test proving a representative successful and failed
   transition does not mutate its input.
7. Change internal pure modules to import action/tradition definitions from the
   narrow catalog rather than the aggregate `content.ts` facade.

### Medium-term structural work

1. Deliver the challenge/consequence vertical slice and typed `SceneProgress`.
2. Introduce authoritative story-choice and transaction availability selectors.
3. Create the common encounter definition and combatant archetype/form catalog.
4. Move lifecycle metadata for all three current encounter stages into the
   common definition while retaining named scripted openings.
5. Split `engine.test.ts` along the newly established contracts.
6. Add a save invariant pass and catalog-driven combatant normalization.

### Future scale-triggered work

- **Before a second provider/settlement:** market/service definitions, finite
  stock state, authoritative transaction queries, and selective provenance lots.
- **Before a second route pool/region:** campaign node/edge/history/front
  registries and a deterministic selection module; do not add more
  `continueJourney` branches.
- **Before the next large action tier:** structured action previews and either
  action-family executors or focused technique modules; retain explicit
  algorithms where mechanics differ.
- **Before a second evidence authority:** named legal case/evidence records and
  typed authority pressures.
- **When `witness.ts` gains several more segment families:** split event
  construction, formatting, and runtime validation behind its current facade.
- **When responsive selectors for a new major screen materially enlarge
  `responsive.css`:** revisit component-owned responsive rules and import order.

## 7. Explicit non-recommendations

- Do not introduce React, Vue, a state-machine framework, an ORM-like state
  layer, or dependency injection to solve these ownership issues. The native DOM
  and pure-transition approach remains appropriate.
- Do not replace authored TypeScript catalogs with JSON while IDs and contracts
  are still changing. The current `satisfies` and union checks provide useful
  authoring safety.
- Do not turn every story effect into a universal declarative mini-language.
  Use typed consequences for reusable state changes and named handlers for
  genuinely distinct algorithms.
- Do not create a universal `utils.ts`, `helpers.ts`, or “common” module.
  Extraction proposals above name stable concepts.
- Do not merge every enemy property, cadence, scene line, and reward into one
  giant enemy registry. Separate stable form/archetype, encounter composition,
  technique cadence, and authored scene ownership.
- Do not split catalogs solely to reduce line count. `encounters.ts`,
  `advancements.ts`, and `wound-catalog.ts` are allowed to be data-heavy.
- Do not replace exhaustive discriminated-union switches in `witness.ts`,
  `render.ts`, or `statuses.ts` with weakly typed handler objects merely to
  remove the word `switch`.
- Do not replace the single delegated click handler with per-card listeners or
  rerender the app for pointer/scroll state.
- Do not adopt structural sharing or a state library without profiling the
  larger campaign state. Current transition cloning is clear and deterministic.
- Do not generalize North Vey’s institutions, black obols, or the proving-ground
  route into universal Maldirin systems. The world documents correctly forbid
  that shortcut.

## 8. Proposed guidance and architecture-check refinements

These are proposals only; this audit does not edit `AGENTS.md` or the check.

### `AGENTS.md`

Add or clarify:

1. `RunState.flags` is legacy compatibility storage. New persistent behavior
   requires a typed state/event/scene-progress field; new colon-delimited records
   are prohibited.
2. A renderer must consume authoritative availability/preview selectors. It may
   format results, but must not reproduce resource, chance, duration, damage, or
   eligibility rules.
3. Pure domain modules should import narrow mechanical catalogs, not the
   aggregate story/content facade.
4. New encounter identities require a common encounter definition and
   archetype/form reference; persistence and narration may not add standalone
   ID branches.
5. Seeded selection uses the shared seed-domain mixer and a stable explicit
   order. Changing an existing sequence requires an intentional migration or
   documented compatibility decision.
6. Persisted fields must state whether they are authoritative, cached/derived,
   or legacy compatibility fields.
7. A second provider, settlement, region pool, evidence authority, or recurring
   scene triggers the corresponding economy/campaign/world extraction named in
   the roadmap.
8. Test fixtures should prefer public transition builders; direct state mutation
   must be isolated and named as a mechanical fixture.

### `check-architecture.mjs`

Incrementally add:

1. Relative-import cycle detection.
2. Zone rules:
   - `src/game` cannot import `src/ui`;
   - renderers cannot import `app`;
   - pure rule modules cannot import transition modules;
   - content definitions cannot import renderers/app/persistence;
   - persistence compatibility can import catalogs/pure defaults but never UI.
3. A temporary report (warning first) for facade fan-in/fan-out and top file
   growth, so ceilings are not the only signal.
4. After typed scene migration, reject new direct `run.flags.push`,
   `startsWith`, or colon-record patterns outside one legacy compatibility
   module.
5. Registry-reference validation as a test command: encounter → archetype,
   cadence, rewards, facts, route; scene → effects/consequences; market →
   provider/listing/service.
6. A test-size warning (not a hard failure) for files exceeding roughly
   1,000-1,200 lines, with explicit exemptions for coherent case matrices.
7. Lower grandfathered ceilings only after extraction. In particular,
   `engine.ts` should return to the ordinary ceiling after story effects move.
8. Optionally generate `output/architecture/import-graph.json` and hotspot
   summaries for review without adding a runtime dependency.

## 9. Commands and validation status

All commands were read-only except creation of this report.

Core preparation and structure:

```text
rg --files -g "AGENTS.md" -g "README.md" -g "docs/*.md"
rg -n "^" AGENTS.md README.md docs/architecture.md docs/world.md docs/replayability.md docs/world-economy-noncombat-roadmap.md docs/lineage.md
rg -n "^#{1,3} " README.md docs/world-economy-noncombat-roadmap.md
rg -n "^" README.md
rg -n -A 220 "## Modularity and performance budgets" docs/architecture.md
rg -n -A 126 "## Confirmed constraints" docs/world-economy-noncombat-roadmap.md
rg -n -A 145 "## Economy and scarcity" docs/world-economy-noncombat-roadmap.md
rg -n -A 151 "## Mundane skills and noncombat interactions" docs/world-economy-noncombat-roadmap.md
rg -n -A 235 "## Authored data architecture" docs/world-economy-noncombat-roadmap.md
rg --files src scripts public
git status --short
```

Quantitative scans:

```text
rg -c "^" src scripts -g "*.ts" -g "*.css" -g "*.mjs"
rg -c "^" src -g "*.ts"
rg -c "^" src -g "*.css"
rg -c "\b(it|test)\(" src -g "*.test.ts"
rg -n "from" src -g "*.ts" -g "!*.test.ts"
rg -n "\b(switch|case)\b" src -g "*.ts"
rg -c "^[[:space:]]*case " src -g "*.ts" -g "!*.test.ts"
rg -n "structuredClone|cloneState|cloneRun|JSON\.parse|JSON\.stringify|return \{ state|EngineResult|error:" src/game src/ui -g "*.ts"
rg -n "flags\.(includes|push|filter)|startsWith\(|split\(|find\(\(flag|road-interlude-delay|iven-cordial|burial-cut" src/game src/ui -g "*.ts"
rg -c "flags\.(push|includes|filter)|flag\.startsWith|record\.split|flag\.split" src -g "*.ts" -g "!*.test.ts"
rg -n "Math\.imul\(.*0x21f0aaad|0x735a2d97" src/game -g "*.ts" -g "!*.test.ts"
rg -n "road-reeve|ash-hound|ossuary-saint|wake-bell-widow|wake-redactor|wake-pallbearer" src/game -g "*.ts" -g "!*.test.ts"
rg -n "ossuary-road|saint-orra|black-mile-wake" src -g "*.ts" -g "!*.test.ts"
```

Focused evidence reads used `rg -n "^"` or `rg -n -A/-B` on:

```text
scripts/check-architecture.mjs
src/game/types.ts
src/game/engine.ts
src/game/engine/player-actions.ts
src/game/engine/battle-lifecycle.ts
src/game/engine/battle-openings.ts
src/game/engine/combatants.ts
src/game/content.ts
src/game/content/definitions.ts
src/game/content/outcome-copy.ts
src/game/road-events.ts
src/game/world.ts
src/game/items.ts
src/game/advancements.ts
src/game/encounters.ts
src/game/random.ts
src/game/journal.ts
src/game/combat-math.ts
src/game/combat-witness.ts
src/game/combat-action-narration.ts
src/game/witness.ts
src/game/persistence.ts
src/game/persistence/schema.ts
src/game/persistence/validation.ts
src/game/persistence/current-save.ts
src/game/persistence/combatant-compatibility.ts
src/ui/app.ts
src/ui/story-render.ts
src/ui/battle-render.ts
src/ui/inventory/pack-render.ts
src/ui/inventory/equipment-render.ts
src/ui/inventory/market-render.ts
src/game/engine.test.ts
src/game/story-validation.test.ts
src/styles.css
src/styles/inventory.css
src/styles/responsive.css
src/styles/story-progression.css
```

Validation:

```text
npm run check:architecture
npm test
npm run check
```

Status:

- Architecture budgets and the two currently enforced dependency boundaries:
  **passed for 94 implementation files**.
- Tooling tests: **20 passed**.
- Vitest: **25 files, 181 tests passed**.
- TypeScript and Vite production build: **passed**.
- Static relative-import scan: **no cycles found**.
- Production code/config/tests changed by this audit: **none**.
