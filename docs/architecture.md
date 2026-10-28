# Extension architecture

Necromancer keeps its rules independent from its current HTML renderer. New systems should preserve the following boundaries so the project can grow without making scenes, saves, and combat depend on one another accidentally.

## Domain state and transitions

`src/game/types.ts` defines persisted game state. `src/game/engine.ts` is the stable public facade and coordinates story transitions. Focused modules under `src/game/engine/` own combatant factories, battle openings, player actions, round lifecycle, shared battle state, and public battle transitions. Cohesive transition domains live beside that facade: `inventory-engine.ts` owns inventory, equipment, market, consumption, and treatment operations. Transitions clone their input before changing it and return an `EngineResult`. UI code dispatches those transitions; it does not reproduce their eligibility rules.

Pure calculations should not require the transition facade. `combat-math.ts`, for example, owns effective statistics and hit chance so combat resolution and UI previews consume the same rules without importing orchestration. The facade re-exports established public functions when that preserves compatibility.

`persistence.ts` is the stable storage facade. Save keys and version contracts live in `persistence/schema.ts`; structural guards live in `persistence/validation.ts`; current additive defaults live in `persistence/current-save.ts`; combatant compatibility and historical migrations remain separate concerns. Additive persisted fields must receive a current-save default, while older readable saves should be normalized on load rather than rejected. The v4 boundary adds the structured world memory; v3 migration supplies its empty default. The v3 boundary added attributes, mundane skills, Spirit, and Forewarned status support; v2 migration maps Focus into Spirit and supplies the tradition’s starting character profile. V1 migration creates the same fields explicitly.

`campaign-continuity.ts` owns the additive campaign identity, active-testament
identity, terminal-reason classification, closed-testament summaries, and
idempotent synchronization at ending and load boundaries. The Chronicle reads
only that bounded history; it never imports the Journal's knowledge projection.
The current proving-ground `world` and `economy` fields remain under `RunState`
for save compatibility, but are campaign-owned in the normative model and must
move behind a campaign-state facade before a real successor transition. See
[the continuity contract](testament-continuity.md).

## Content and rules

`content.ts` is a stable registry facade. Authored routes are split by campaign stretch under `src/game/content/`; shared scene contracts and selectors stay small and route-independent. Bulk authored text is data, not engine control flow: use typed records and compact selectors/formatters rather than a switch whose branches merely return prose. Reusable mechanical definitions belong in their own domain module:

- `anatomy.ts` is the stable facade for body definitions, wound catalogs and creation, consequence selectors, convalescence, and scars; those concerns live separately under `src/game/anatomy/`.
- `character.ts` owns core-attribute and mundane-skill definitions, normalization, rank labels, and every derived character formula.
- `encounters.ts` owns seeded encounter-variant definitions: scene identity, enemy rosters, rewards, and variant-specific outcome copy.
- `enemy-actions.ts` is the stable intent facade. Typed technique definitions and deterministic cadence sequences live under `src/game/enemy-actions/`; validation proves every cadence reference resolves. Add enemies through those catalogs rather than an enemy-ID switch.
- `road-events.ts` owns the seeded friendly and neutral event deck, its authored choices, and repeat exclusion.
- `statuses.ts` owns status names, mechanical consequence summaries, and duration language.
- `story-validation.ts` validates scene identity, rendered branches, choice stability, outcome-card contracts, and effect coverage against representative run states.
- `world.ts` is the stable facade for regional foundations and the focused
  modules under `world/`. Compact actor and fact identifiers are separated from
  `world/actors.ts` and `world/facts.ts`, which own their authored definitions;
  `world/state.ts` owns beliefs, evidence, claims, provenance and custody,
  relationships, scoped pressures, standing, and their transitions. Chance-based
  material recovery remains exposed through the facade.
- `journal.ts` is the stable player-facing campaign-memory facade. Known-fact presentation remains there; typed preparation records and their active/spent transitions live in `campaign-preparations.ts`. The eager shell obtains only a prose-free entry count through `journal-count.ts`; only the optional Journal renderer constructs the full authored read model.
- `items.ts` owns inventory definitions and pure calculations: equipment,
  armor coverage, weapon profiles, off-hand contribution, sale values, and
  market stock. `item-design.ts` records provenance, economy role, and
  acquisition intent for catalog expansions; `item-visuals.ts` owns accessible
  sprite mappings. Production item sheets use 256-pixel cells and are rebuilt
  through `scripts/optimize-item-sprites.mjs`.
- `inventory-engine.ts` owns mutable inventory/equipment/treatment/market transitions and their post-death guards.
- `combat-math.ts` owns pure effective-stat, accuracy, evasion, and hit-chance calculations.
- `damage-resolution.ts` owns hit rolls, mitigation order, body-condition damage, wound creation, and defeat-cause calculation. It returns structured results; it does not author Witness prose.
- `combat-action-narration-catalog.ts` owns typed hit and miss language for named actions. `combat-action-narration.ts` expands its small token vocabulary and resolves explicit aliases; `combat-witness.ts` combines that language with structured mechanical segments.
- `progression.ts` owns experience thresholds and level calculation.
- `advancements.ts` owns advancement definitions, eligibility, application, and named combat modifiers. Safe-screen location resolution and graph validation live in `advancement-presentation-location.ts` and `advancement-validation.ts` so the public advancement facade does not accumulate unrelated control flow.

The renderer consumes derived values from these modules. It should never maintain a second table of wound penalties or advancement effects merely to explain them. Choice labels and details may be functions of `RunState`; completed optional interactions should rewrite any remaining route copy that would otherwise describe an unresolved situation. Pooled road events also provide resolved scene paragraphs for this reason.

Rich scenes may expose a validated authored-approach catalog through the
structured explorer described in `story-approach-explorer.md`. The scene owns
each approach and its transition; objective, capability, and target are pure
indexes over authored approaches, never generators of arbitrary outcomes.
Availability is a disclosure-safe domain projection with a truthful reason, not
a renderer inference. Future natural-language intent remains a query adapter
over that same catalog and cannot mutate game state or invent consequences.
Loaded story definitions and transitions reach the eager content and engine
facades through `content-packs/story-runtime-port.ts`; the owning runtime installs
the implementation when its pack is admitted. Keep optional story catalogs and
their explorer renderer/action/CSS behind that port so a proof or future region
cannot enter bootstrap or ordinary playable transfer merely through a facade
import.

## Presentation delivery contracts

The CSS import graph is part of the UI architecture. `src/styles.css` is the eager presentation baseline for every screen that can render during ordinary title, creation, story, and battle flow. Inventory, Journal, and Stats each have a screen-scoped stylesheet facade and a matching promise in `optional-surface-styles.ts`; their markup may render only after its specific loader resolves. The title-level Chronicle is likewise a separate lazy renderer and stylesheet. Do not merge those imports back into one optional bundle: opening one surface must not fetch its siblings.

The title has a stricter JavaScript admission boundary. `src/main.ts` mounts `NecromancerBootstrap`, which may render the title, inspect bounded save-envelope metadata, delete known save generations, and admit the playable application after an explicit Start or Continue action. It must not import game transitions, full save validation/migrations, authored catalogs, or playable renderers eagerly. Chronicle is the one read-only exception: an explicit open action dynamically loads its full-save reader, bounded campaign-history selector, renderer, and stylesheet without admitting the playable app. `src/ui/bootstrap.ts` is a browser controller—not a renderer—and is the only UI module besides `app.ts` allowed to import `app.ts`; that import must remain dynamic. Continue performs full validation and migration only after admission. The loading state is immediate, keyboard-visible, and remains recoverable if the runtime import fails.

Moving a renderer or stylesheet across this boundary is therefore an API change, not a mechanical file move. A shared component rendered on an eager screen must have its required styles in the eager graph even if the same component also appears inside an optional surface. Likewise, optional event handlers and assets must load before their markup becomes interactive.

Architecture checks enforce named cross-boundary contracts, while `scripts/check-ui-contracts.mjs` exercises conditions static analysis cannot prove: a cold battle before optional styles load, computed dossier layout, and hover/focus explanation visibility. Add a named static contract and a cold-path browser assertion when introducing another shared component across a delivery boundary.

## Encounters

Every active battle records an `encounterId`; variable encounters also record a typed `variantId`. `RunState.wakeVariant` preserves a rolled future encounter while the player is still in its preceding story scene. Older v2 saves may omit these fields, so persistence infers known active encounters from enemy IDs and supplies null variant defaults.

`rollWakeVariant` hashes and advances the run seed before selecting from a stable ordered ID list. This produces replay variation while keeping bug reports and tests reproducible. Optional actions with an uncertain outcome consume the same persisted seed; guaranteed disadvantages are labeled as tradeoffs instead of risks. Rules shared by every battle remain in `engine.ts`; roster, reward, scene, escape, and ending identity live with the variant definition in `encounters.ts`.

Enemy actions are selected through one typed cadence function rather than encounter-specific turn loops. A new enemy can add a cadence without duplicating Ward, wound, status, or Witness resolution.

Capability constraints are shared rules rather than enemy exceptions.
`capability-conditions.ts` evaluates known training, required and amplifying
facts, opportunities, costs, portable preparations, and setup/fallback
expressions without mutating actor or site state. A condition may come from the
actor, an item, preparation, target, ally, patron, relationship, time, site, or
another authored source; the evaluator is not an environmental permission
system. Condition and capability IDs belong to validated content packs, which
must declare why each requirement exists rather than inherit a universal magic
grammar.

Scoped providers are narrower than regions. When a capability genuinely uses a
site, locality, route, catchment, jurisdiction, network, or other provider, that
provider declares its reach, access, and degradation. Region and institution
tags orient which population profiles, training, equipment, patrons, and
preparations are plausible, but never grant a capability condition by
themselves. `procedural-enemies/population.ts` combines those independent
concerns: local specialists normally require an operational defining
capability, while travel or migration requires an origin and reason, and a
deliberately deprived specialist requires a separate deprivation reason plus a
real fallback. A specialist whose defining capability is portable needs no
invented site dependency. Omitting a population request preserves the original
composer exactly.

The present battle contract persists one static cadence per combatant. The
composer therefore emits only capability plans that can be represented
honestly as a direct cadence, an encounter-scoped portable preparation, or an
explicit fallback cadence. It rejects setup, per-action consumption, and an
unmapped amplifying effect with a named validation error. The pure evaluator
still reports those states so a later battle-site transition can establish,
consume, degrade, and persist them before enemy intent adopts them. Do not turn
setup metadata into a cadence that repeats forever or let the renderer infer
availability.

That cadence is also the source of enemy intent. Forecasting is a pure read of enemy identity and the current round: it cannot advance the seed or mutate combat. The intent exposes an authored physical tell, damage type, exceptional wound risk, and explicit special effects, but not a guaranteed damage number or hit result. If an attack applies a timed effect, its potency and duration live on the attack definition and are consumed by both intent and resolution.

Attack resolution is seeded and deterministic. The engine derives physical accuracy from Dexterity, occult accuracy from the tradition’s occult aptitude, and evasion from Dexterity or the non-player defense profile. A miss is a resolved action, not an error: costs and enemy answers still occur, while on-hit damage, statuses, healing, and Ward gains do not. Scripted scene-opening damage remains guaranteed because it represents an authored consequence rather than an attack roll.

Delayed preparation must name what can use the time. Encounter variants declare a `delayAffinity`; an occult delay intended for escaped names cannot silently prepare unrelated poachers or reeves selected later. Ward grants pass through one capped operation that returns requested, admitted, and final amounts. Repeatable Witness copy should report those authoritative values once, especially when a discipline adds to a base effect. Brace raises Ward to an attribute-derived threshold rather than stacking it or restoring Spirit; defeating an enemy provides the small universal Spirit recovery, with disciplines or equipment responsible for improving that cadence.

## World routes and replay variation

The opening testament still has a deliberate main arc, but scenes should not accumulate as one hard-coded chain. Variable stretches are represented as content pools selected by persisted, seeded rules. `road-interlude` is a reusable presentation node: `road-events.ts` supplies its friendly or neutral identity, prose, choices, and consequences; `RunState.roadEvent` records the active draw; and `seenRoadEvents` prevents repeats until the pool is exhausted. Wake encounters follow the same division between a stable route node and a rolled authored definition.

New replay variation must change at least one of these:

- the situation or people encountered;
- the available decision and its opportunity cost;
- a later scene’s eligibility, preparation, or consequence;
- the tactical roster, materiality, or cadence;
- what the player learns about the world.

Synonym swaps and shuffled paragraphs can keep repeated exposition from sounding mechanical, but they do not count as route variety. Seeded presentation lines may texture a stable scene; they should not disguise an unchanged decision as new content.

`RunState.world` separates five kinds of consequence:

- facts record what actually happened;
- player knowledge records what may be exposed safely in the Journal;
- actor beliefs record what a person or faction currently accepts and the
  evidence supporting that belief; the legacy faction-knowledge projection is
  retained for save compatibility;
- standing records a particular person or faction’s disposition;
- pressure records regional conditions that can change encounter eligibility.

These values must not be collapsed into one morality or wanted score. A hidden act can remain a fact without granting every faction knowledge of it. Evidence or a witness reveals that fact to a specific faction; only then should its standing or routes respond. The roadside rendering is the first complete example: yield and witness checks consume the persisted seed independently, and a reported body turns the later reeve patrol from a random possibility into pursuit.

Claims, provenance, custody, and evidence are also distinct. A claim says who
asserts ownership, custody, authority, or identity over a subject. Provenance
records the subject’s origin and custody history. Evidence points toward a fact
and has a current custodian; moving or concealing it does not alter the
objective fact. Relationships and standing remain separate because employment,
kinship, membership, custody, and obligation are not interchangeable with
affection. Named pressure records carry a scope, stakeholders, sources, and
active/resolved status while the proving ground’s numeric pressure fields remain
as compatibility projections.

`world/journal-visibility.ts` is the eligibility boundary for the Journal’s
structured world sections. `world/read-model.ts` turns that safe projection into
authored entries; UI
renderers must not traverse raw beliefs, standing, pressure intensity, or the
complete world record. New evidence, claim, relationship, provenance, or
concern displays require a safe visibility rule there before they can appear.

Practice reactions are actor-authored attitudes with a posture, concrete
concerns, and an explanation. Content may combine that stable outlook with
claim, permission, location, evidence, standing, and circumstance. It must not
infer a setting-wide morality from the practice ID.

The campaign-length route foundation lives under `src/game/routes/`. Typed
regional definitions own nodes, edges, objectives, non-navigating
interactions, and tagged authored event pools. Pure route operations own
navigation, discovery, revisit history, objective progress, disclosure-safe
summaries, deterministic pool selection, and structural/reachability
validation. Definitions hold IDs and player-safe summaries; they do not encode
bulk story prose as control flow.

The route layer does not own campaign truth. `RouteReadContext` is a narrow
read model projected from the authoritative character and `RunState.world`
domains. Actor standing, relationships, knowledge, pressure, resources, and
practice capability remain in their existing owners. Route predicates read
that projection, while route state records only position, visits,
discoveries, completed interactions, route milestones/objectives, seed, and
per-pool history.

`PROVING_GROUND_ROUTE_GRAPH` models the current sequence as a compatibility
fixture. `NORTH_VEY_EXPANSION_ROUTE_GRAPH` exercises the intended architecture
with simultaneous objectives, revisitable locations, alternate order, a
discovered shortcut, grounded noncombat scenes, and a rejoin toward one larger
objective. Neither fixture is yet persisted or called by the engine.

Engine integration should preserve this dependency flow:

`campaign/world state -> RouteReadContext -> route selectors/transitions -> authored content ID -> existing story consequence`

Persistence must add and normalize `RegionalRouteState` before the engine
adopts it. Renderers consume only the route summary selectors; they must not
inspect predicates to explain hidden requirements or future outcomes.
Converging routes carry their consequences forward rather than erase them, and
selection remains deterministic from the persisted seed so saves, bug reports,
and tests reproduce the same world.

For early-failure freshness, the opening region should eventually have more than one valid first problem and at least one noncombat route through it. A failed run may see familiar landmarks, but its first meaningful decision should not always have the same people, stakes, and correct response. This is content breadth built on the pool/history contract; it is not permanent power granted for dying.

See [the world foundation](world.md) for setting rules and [the replayability target](replayability.md) for the content rules and staged expansion plan.

## Advancements

An advancement node is data with a branch, minimum level, point cost, prerequisites, optional practice restriction, player-facing copy, and an effect. Target nodes can also declare a permanent doctrine group or a prepared dual expression. Prepared expressions are learned together, occupy a typed practice or universal readiness slot, and contribute effects only while readied. Immediate maximum-resource and mundane-skill changes are applied once when selected. Technique changes are queried as named modifiers when an action resolves. Earned discipline points are derived from character level; saves retain chosen node IDs and the small normalized readiness record.

To add a later tier:

1. Add its IDs and definitions.
2. Connect each node to earlier prerequisites, doctrine exclusion, and the intended practice or universal branch.
3. For prepared duality, define both complete expressions in the target catalog and assign the appropriate readiness kind.
4. Consume any new named modifier in the relevant engine rule.
5. Attribute that modifier in affected action cards and structured Witness entries.
6. Test point spending, prerequisites/exclusions, readiness persistence and capacity, the advertised effect, and the action’s dynamic description.

`validateAdvancementGraph` rejects missing links, cycles, invalid costs, cross-practice prerequisites, and empty node or expression effects. `getAdvancementOffer` derives every learned, available, excluded, and locked node from the player instead of storing a parallel tree state. Crossing an experience threshold leaves an unspent point available through the persistent Stats surface at any safe noncombat pause; it does not replace a featured story result or gate travel. Node inspection is UI-local, while confirmation and readiness changes dispatch authoritative transitions. Readiness is normalized against learned nodes and slot capacity on load, preserving older saves with an empty default.

## Witness events

New combat entries should be created through `witness.ts`. A `WitnessEvent` stores structured segments for damage, misses, defeat transitions, mitigation, wounds, statuses, Health loss, rewards, learned-skill contributions, or deliberate prose. One formatter controls ordering and terminology.

Each entry also stores the formatted text snapshot and tone. This keeps older text-only logs readable while allowing new renderers and tests to inspect structured mechanics. Damage and miss segments retain the action name as metadata but obtain authored action language from the typed narration catalog rather than “actor uses action” or a formatter switch. Explicit aliases share copy intentionally; an uncatalogued action receives legible fallback text and should be caught by catalog coverage tests when it is part of the authored roster. A defeat transition records whether Health reached zero or a vital body region collapsed; its prose should reflect corporeal, quadruped, or incorporeal form. Discipline segments likewise retain the node name as metadata while displaying action flavor instead of a repeated skill label. A new repeatable mechanical message should become a segment type; one-off atmosphere can remain a text segment.

Every mechanical contribution belongs before the transition it can cause. A paired weapon, for example, follows the committed main-hand attack before the target’s death is narrated. Resource-generating actions must not describe a total and then repeat one component as though it were additional; one structured segment owns the before/after accounting.

## Wounds

`woundEffects` is the single source for the consequence of one wound. `combinedWoundEffects` powers effective combat statistics and player-facing summaries. Every wound also exposes the number of convalescence opportunities needed to close it, so a minor hurt without an immediate combat penalty still creates recovery burden and possible scarring. A wound’s `care` distinguishes open injuries that linen can dress from closed injuries that require safe rest. A field dressing consumes linen and makes a seeded Dexterity-and-Medicine attempt; success stops bleeding and restores Medicine-derived condition without erasing deeper penalties, while failure spoils the binding.

`convalesceWounds` owns safe-scene recovery. An untreated injury becomes stabilized; an already stabilized injury improves by one severity; an already stabilized minor injury closes into a persisted scar. Scars record their source and any body-part maximum-condition loss. Recovery disciplines alter this operation through named modifiers rather than UI conditionals.

An `AttackProfile` belongs to the weapon, player action, or enemy technique that delivers it. Its damage type governs defenses and materiality, its injury profile governs wound language, bleeding, and care, and its trauma value governs wound severity. The target owns any damage-type modifier to body-condition loss and the list of body regions whose destruction is fatal. This keeps Grave Salt from producing impact fractures, lets incorporeal forms resist physical disruption without wearing armor, and prevents a projected head or torso from automatically ending Saint Orra while her Health remains.

Any future wound consequence—casting failure, equipment restrictions, recovery time, prosthetics—should be added to the domain result model first, then consumed by both the engine and UI.

## Equipment and exchange

The readied main-hand profile owns a normal strike’s damage type, injury profile, and trauma. A paired off-hand weapon contributes a smaller derived damage value, which is used by combat and equipment previews from the same `items.ts` helper. Physical protection only turns physical damage. Incorporeal combatants shed half the physical force that remains after Ward, while occult damage bypasses both that resistance and ordinary armor. Anatomy and materiality are separate: a corporeal revenant can still wear or grow protection, while a manifestation has form regions rather than human limbs.

The reliquary market is a safe-scene capability, not a separate mutable screen state. Eligibility and transactions live in `inventory-engine.ts`; stock and sale values live in `items.ts`; the inventory renderer presents both. Purchases still pass through ordinary currency and carrying-capacity rules. `validateReliquaryEconomy` rejects missing or duplicate stock, invalid prices, and profitable buyback loops at startup.

A defeated character’s inventory remains available as a final record, but the body is read-only. Equipment changes, consumption, treatment, buying, and selling all pass through the same domain-level post-death guard; hidden UI controls are presentation reinforcement, not the rule itself. The defeat ending remains authoritative even if an older save contains Health that was incorrectly restored after death.

## Presentation

`src/ui/render.ts` is a stable screen dispatcher and re-export facade. Cohesive screens and shell regions live in focused renderer modules: `home-render.ts` owns the title content; `bootstrap-render.ts` composes its lean pre-admission shell; `shell-render.ts` owns character creation and the playable application header; `story-render.ts`, `battle-render.ts`, `advancement-render.ts`, and `ending-render.ts` own their named screens; `combatant-render.ts` owns the player dossier; `result-render.ts` owns featured outcome cards; and `journal-render.ts` owns the Journal. `inventory-render.ts` is a facade over equipment, pack/item-card, anatomy, and market renderers under `src/ui/inventory/`. Shared shell chrome lives in `app-chrome-render.ts`; other shared presentation-only code lives in small modules such as `html.ts`, `render-context.ts`, `player-presentation.ts`, and `wound-presentation.ts`.

UI updates carry an explicit context contract. Navigation focuses the new page title; an in-scene outcome focuses its result heading; local mutations restore a semantic control key rather than a stale DOM node. A dismissed result restores the originating decision when it remains actionable, otherwise the next available decision. `focus-management.ts` owns that policy. Do not encode this as scattered booleans or depend on element position.

Active battles are the leading stable-section implementation. `battle-dom-patch.ts` preserves action controls and player resource meters across exchanges, updates their content in place, and appends only new Witness rows. Servant-direction changes use the narrower `bonebinder-app-action.ts` coordinator and a battle-owned decision/log fragment, so they do not render or parse unchanged enemies, dossiers, or anatomy. Stats follows the same bounded pattern: `stats-app-action.ts` coordinates opening and pane selection, while `stats-surface-loader.ts` replaces only the Character/Disciplines pane. Level-one inspection defaults to the lighter Character projection; an available discipline point opens the full tree directly. This allows bounded CSS transitions to interpolate and keeps input focus stable without putting mutable rule state in the DOM. If a future screen needs similar continuity, extract a screen-owned patcher; do not turn the app into a generic virtual DOM. The visual Witness history is not a live region. `app.ts` announces only newly appended structured Witness entries through one persistent off-screen status channel.

`same-screen-dom-patch.ts` is the narrow dispatcher for authoritative transitions that remain on the same screen. Story, inventory, battle, and advancement surfaces own their DOM patch rules; the dispatcher does not reproduce game eligibility or diff arbitrary HTML. Those screens expose typed, screen-owned markup fragments for their stable regions. Presentation dependency selectors that decide which fragments changed live beside those fragments and receive focused tests; do not recreate those dependencies as ad hoc event branches in `app.ts`. A patcher should consume the fragments directly instead of rendering a duplicate page into a detached template and then parsing the same changed markup again through `innerHTML`. Successful transition messages update the persistent notice independently and must not force a full render. A screen-owned patcher returns `false` when its structural contract is absent, allowing `app.ts` to fall back safely. Browser contracts assert that the application shell and unaffected semantic sections retain object identity through representative local mutations. Genuine navigation, encounter entry or exit, and changed story identity still receive a full page render.

Contextual knowledge must be available to pointer, keyboard, and touch users without revealing hidden outcomes. Result rewards use explicit native popovers, which supply tap/click toggling, Escape dismissal, focus handling, and light dismissal. Repeat this pattern for durable known facts; do not use `title` as the sole carrier of unavailable reasons or rules. Bounded entry motion is permitted only when it clarifies a new result or state delta and must remain covered by the global reduced-motion rule.

`src/ui/bootstrap.ts` owns delegated pre-admission title events and hands one explicit intent to `src/ui/app.ts`. The playable app translates delegated browser events into domain transitions, performs deliberately targeted DOM updates for local interaction state, and handles full persistence. Renderers remain pure string projections and never mutate state. `styles.css` is an ordered import facade; feature styles live under `src/styles/`, with `responsive.css` last so the original cascade remains explicit. `styles/inventory.css` is itself an ordered facade over inventory shell, equipment, pack, anatomy, and market styles.

Enemy cards render the pure intent projection rather than reconstructing cadence rules. Active status badges render their domain consequence and unabbreviated remaining duration; action cards preview the duration they will create. This keeps “what happens” and “how long it remains” consistent across the opposition, player dossier, and authored actions.

This boundary leaves room to replace the renderer later without rewriting combat, progression, advancement, or save migration.

### Semantic tactical scenes

An isometric scene is a projection of authoritative state, not a second rules engine. `src/game/tactical-scene.ts` defines the shared semantic contract: selectable subjects, visible connections and measures, authored actions, and activation references. Coordinates determine presentation only. They never establish range, access, line of sight, adjacency, or eligibility unless the owning domain rule exposes that relationship explicitly.

Tactical course presentation distinguishes five facts rather than compressing them into prose tags: title and lead; the actual player-facing method/capability; qualitative prospect; assets directly deducted as structured costs; and known scene/world consequences such as time, exposure, or obligations. Internal action categories (`observe`, `negotiate`, and so on) are dispatch and styling metadata, never character capabilities. A consequence borne by a town or faction is not labeled as the player's cost. Undiscovered approaches are omitted from the projection; a disabled course may explain a known unmet requirement but must never disclose an unknown solution.

Existing story scenes activate their existing choice or approach transitions. A visual marker must not manufacture an outcome or maintain hidden state in the DOM. Standalone development proofs may own small pure prototype transitions under `src/game/development-prototypes/`, but remain noncanonical and unpersisted until their rules are deliberately admitted into the campaign model. Every authoritative visual change is projected back from domain state.

When an authoritative transition exposes materially new choices at another subject, the subject projection may carry a stable generic attention key. Every tactical renderer presents that state as the same restrained marker and accessible “new choices” description. The marker points back to the person, place, or danger; it never names or previews the newly exposed course. The inspector remains the only place that explains the course after the player selects its subject.

The scene plate, ordered subject controls, inspector, available-reason text, and result history are one equivalent interaction surface. Pointer position is never required: every subject and act must be reachable by keyboard and touch with a stable accessible name. Selection is a targeted presentation update; an act uses the owning screen's authoritative patch path. Development proofs and their art/styles remain lazy delivery units so experiments cannot enlarge the ordinary playable bootstrap.

Direct play is world-first. Do not render the full authored action catalog as a permanent strip beneath the field. Persistent player verbs—movement, equipped attacks, prepared abilities, and ending an exchange—may occupy a compact character bar. Scene-specific courses belong to the represented person, body, object, or place that makes them possible and appear only after that subject is selected. Selecting, hovering, focusing, or closing a subject is presentation-only and never advances time; the explicit world act owns its cost. Completed courses disappear, unknown courses do not leak through disabled controls, and a servant assignment or targeted ability resolves by choosing a represented target rather than selecting a prose bundle that silently includes one. The ordered accessible subject list must expose the same affordances without turning the visual field into a pixel hunt.

Navigation-grade scene art is authored against the scene topology before painting. A typed UI-owned scene-art definition names responsive desktop and portrait plates, maps every authoritative position to real ground in both compositions, records figure scale and depth, and owns state-layer assets such as wreckage or fire. Renderers consume that definition rather than maintaining parallel coordinate tables. A painted landmark is never made interactable merely because it looks useful, and an authoritative position is not admitted until the art gives it plausible ground. Large source images are production masters; runtime plates and portraits use reviewed, addressable WebP derivatives and remain inside the lazy proof or region pack.

Dialogue inside direct play is a foreground state of the same world view, not a second page below it. The current scene remains visible but de-emphasized while one or two authored portraits foreground posture, clothing, equipment, wounds, exact speech, and a small response set. The conversation renderer is UI-owned and deterministic; any choice that changes the world must invoke an authored domain transition rather than changing rules inside the overlay. Pointer, keyboard, touch, close, focus return, and reduced-motion behavior are part of the contract. Regional visual and prose defaults for the first production theater live in `docs/first-theater-regional-foundation.md`; every deviation needs an owning content fact rather than renderer improvisation.

### Anatomy-independent visual rigs

Character appearance is a UI-owned derivation, never another persisted body or
equipment model. A visual rig declares semantic nodes, many-to-many bindings
from authoritative anatomy parts, rig-specific compatible mounts, ordered and
occluding layers, poses, and a finite motion profile. It must not assume that
every entity has a human head, torso, hands, or equipment slots: a hound may
bind the domain's foreleg parts to forequarters, legs, and paws and expose only
neck or back mounts; a manifestation or distributed form may use entirely
different nodes. Game modules never import rigs or asset references.

The appearance recipe projects current entity, anatomy, equipment, wound, and
status state into semantic visual IDs. Asset paths remain in screen- or
pack-owned presentation catalogs, and saves contain neither those paths nor a
duplicate appearance snapshot. Incompatible equipment is rejected by mount
compatibility rather than forced onto a universal slot. One anatomy part may
affect several visual nodes and several parts may share a node; exact mechanical
consequences remain in the domain and accessible copy.

Layered art is additive. The current painted figure or authored state sprite is
the honest fallback when a rig lacks a compatible component, and exceptional
entities may remain bespoke authored states rather than being assembled from
misleading generic pieces. Field-scale layers use the smallest addressable
asset that preserves silhouette; high-resolution portraits and inactive scene
packs do not enter the field budget.

Motion is a presentation token applied only after an authoritative transition.
Profiles contain finite settle, advance, commit, recoil, or dissolution motions;
they use transform, opacity, or a bounded frame change and never create an idle
loop, timer-driven rule, hit box, or input gate. Reduced motion receives the
resolved still pose immediately. Figure accessible names and the semantic
action path remain authoritative whether art or animation loads or not.

## Modularity and performance budgets

`npm run check:architecture` enforces line ceilings for implementation files. The ordinary ceiling is 650 lines for TypeScript and 800 lines for a component stylesheet. Existing aggregation points have explicit shrinking ceilings in `scripts/check-architecture.mjs`; these are migration constraints, not preferred sizes. After extracting a cohesive responsibility, lower its old file’s ceiling. Do not raise a budget simply to land a feature.

The intended dependency direction is:

`definitions and content -> pure domain rules -> transition modules -> render modules -> playable app -> bootstrap admission`

Game modules cannot import UI code. A renderer cannot import either browser controller. The bootstrap may dynamically import the playable app, but the playable app must never import the bootstrap. A new screen or modal-sized surface should be its own renderer; a self-contained mechanical subsystem should be its own domain or transition module. Avoid generic utility modules: an extracted module should have an owned concept that tells future contributors where its tests and next rules belong.

The completed performance pass is a baseline. Preserve delegated events, targeted local interaction updates, passive scroll handling, frame-batched visual work, and screen-scoped asset loading. Do not introduce layout reads after writes in a hot input path, whole-app rendering for hover or scrolling, continuous idle animation, or eager full-resolution asset loading. High-frequency state such as battle targeting changes immediately; it must not perpetually restart a longer transition. Infrequent meter motion uses transform from a fixed track. New hot-path motion should use bounded opacity/transform only after proving that the interaction cadence lets it settle; never animate width, padding, background, or shadow in a repeated input path.

The eager request graph is a scarce shared budget, not the default home of static definitions. Before admission, only the title shell and bounded save metadata may be eager. Character creation, the selected opening, shared rules, and full persistence enter together only after Start or Continue. Practice-, region-, scene-family-, journal-, inventory-, and art-specific catalogs should enter through a typed pack loaded at a stable transition before first use. Once admitted, the active pack exposes synchronous immutable definitions so seeded transitions and save/load behavior do not depend on network timing. Opening one optional UI surface must not fetch sibling surfaces; static architecture checks protect the stylesheet boundary and cold browser contracts protect the built request graph. The browser contract must also prove that a cold title has not fetched the playable runtime and that Start admits it.

Background music follows the same admission rule at media granularity. Its small preference, cue catalog, and controller may live in the title capability because the control is always available, but no audio request or media element exists before explicit opt-in. The preference defaults to silence, is stored independently from campaign state, and a returning opt-in resumes only after a new user gesture. The controller owns a deterministic non-repeating cue cycle, skips a failed cue without retrying forever, pauses for page visibility, and releases its media source and listeners on document teardown; scene renderers do not own playback.

Cold-resource limits are capability envelopes, not a frozen snapshot of one build. `scripts/performance-cold-resource-budget.mjs` assigns each first-use checkpoint three hard incremental limits: compressed encoded-body bytes, resource count, and observed transfer derived from payload plus bounded per-request overhead. The performance trace reports and enforces those dimensions separately. A legitimate core capability—such as a preference that must work on the title screen—belongs to that stage and may use its existing headroom. Raising a stage budget requires a named capability owner, an explanation of why later admission would break the experience, before/after request-graph evidence, and cold contracts proving optional siblings remain isolated. Never raise a budget to absorb an unexplained eager import, and never tighten it to the latest observed byte count merely to manufacture a passing number.

Run `npm run check` for ordinary changes. Run `npm run perf:trace` after material changes to rendering, scrolling, browser interaction, or asset loading. Its established thresholds are a failing gate; also compare frame pacing, compound-load tail, long tasks, CPU, and memory rather than reporting only a headline frame rate.

Run `npm run perf:trace:120` after changing battle targeting, high-frequency input, scrolling, or hot-path motion. This installed-Chrome cohort requires a hardware-rendered active display observed at 114 Hz or more. The application gate owns synchronous handler tails, Chrome task/script/style/layout work per frame, and app-attributed long work. End-to-end presentation gaps are retained separately because the browser compositor, DWM, GPU driver, focus/occlusion, and host scheduling are outside JavaScript ownership. `perf:trace:120:repeat` requires every run to pass the application gate; the stricter `perf:trace:120:delivery` additionally requires 99.5% aggregate physical delivery and belongs only on a quiet, foreground, high-refresh host. Never reclassify an attributed application stall as host noise merely to pass either cohort.

`npm run perf:trace:deep` is the local high-confidence cohort. In addition to the representative path, it records Long Animation Frames and Event Timing attribution, JavaScript/CSS byte coverage, exact 100KB/250KB/500KB/1MB persistence phases, schema-valid worst-case Battle/Inventory/Journal/Stats surfaces, and 1,000 warm reversible surface interactions. The soak enforces zero retained nodes/documents, at most 750KB total retained heap, at most 250KB second-half growth, and a 150ms cycle p95. `perf:trace:deep:repeat` supplies a 30-run p95/p99 distribution and Wilson failure interval; `perf:trace:nightly` raises that to 100 local runs. CPU-throttled evidence has a distinct cohort ID and advisory thresholds until it has its own repeated baseline.

The default performance gate measures two deliberately separate cohorts. The representative cold-load/combat path owns navigation, transfer, cadence, long-task, CPU, and retained-resource baselines. After those metrics are sealed, isolated local-mutation pages measure Stats disclosure and discipline-pane construction, in-scene outcomes, inventory workbench changes, and servant direction changes. The local cohort records synchronous handler cost, immediate and settled paint latency, main-thread work, allocation and retained-heap deltas, DOM mutation volume, semantic surface identity, exact clone/stringify/storage duration, and repeated Stats open/close retention. Do not move local scenarios into the representative path or include their setup work in a measured mutation.

Graphics cohorts include the observed browser product/version and selected executable or channel as well as renderer, device, backend, and driver identity. Installed Chrome, bundled Chromium, and software rendering are separate evidence. A hardware-requested run must reject software or unknown rendering before measurement rather than silently admitting it to a hardware series.

Local mutations must preserve the identity of unrelated screen surfaces. When adding a same-screen patch contract, add both a functional identity assertion to `scripts/check-ui-contracts.mjs` and a measured scenario to `scripts/performance-local-mutations.mjs` when the interaction is performance-sensitive or representative of a new patching strategy.

Lifecycle stability is also a contract. The Stats lifecycle gate collects 24 open/close cycles and requires every collected DOM node and document count to return exactly to baseline after garbage collection. Its current retained-heap peak is roughly 121 KB; growth above 200 KB is advisory and growth above 300 KB fails the established software-rendering gate. Recalibrate those bounds only from a repeated same-cohort distribution, never to admit one failing feature. Treat rising retained heap across later checkpoints as a leak signal even when the final absolute delta still passes. State cloning, serialization, and storage remain simple deterministic transition boundaries while their representative medians remain below 2 ms; replace them only from trace evidence, never as speculative complexity.

The scale persistence gate applies the same 2ms standard to projected state. Current evidence keeps the synchronous design comfortable through 250KB and crosses an individual-operation budget at approximately 500KB. Do not migrate to IndexedDB or background serialization merely because a larger design exists; do begin that migration before production saves approach the measured crossing point.

Production item art uses individually addressable 256px WebP images with native lazy loading and asynchronous decoding. Source sprite sheets remain useful masters and experiment baselines, but must not re-enter runtime inventory markup. This bounds initial transfer and decoded residency to the items actually presented. The build-only source coordinates and reproducible loading comparison live under `scripts/item-art-*`.

The production build may use explicit Rolldown chunk groups only for cohesive modules whose cold consumers coincide. `title-bootstrap` keeps the admission controller and its small presentation/schema dependencies isolated and also absorbs the tiny character, random, and HTML modules that were measured to be co-requested on every admitted path; `playable-runtime` is the explicit post-intent application boundary. Group ordering is significant: shared title dependencies must stay in `title-bootstrap`, or the playable group can become preloaded. Do not recreate a separate tiny shared request without evidence, and do not create a broad shared group: an experiment moved roughly 83.5KB into an eager shared chunk and collapsed the content-pack boundary. Every grouping change must pass the built-resource contracts and compare cold title transfer, admitted transfer, whole-path bytes, and Start/Continue next-paint latency.

Loaded ECMAScript modules remain resident in a document's module map. Content packs therefore separate small executable behavior from large fetched authored data that can be dereferenced and collected. At a major region boundary the app may autosave and perform a deliberate document reload to reset the module map, heap, styles, and compositor resources; that is an architectural resource boundary, not a substitute for ordinary local cleanup.
