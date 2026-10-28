# World, economy, and noncombat roadmap

This document proposes systems that could grow beyond the opening testament.
It does not promote the testament’s local roads, offices, or customs into
campaign-wide institutions. Each proposal names the state it needs, the system
that owns it, and the first content that could prove it after the relevant
world assumptions are confirmed.

## Confirmed constraints

1. Necromancers remain exceptional specialists. Magic itself is specialized,
   and necromancy is only one minority practice within it.
2. There is no single morality, reputation, or wanted meter. A deed, evidence
   of that deed, knowledge held by a person or faction, standing, and legal
   pressure remain separate.
3. An occult-market resource such as black obols must not silently define the
   ordinary economy. The wider currency and exchange model remains undecided.
4. Materials have provenance. A saint-bone, lawful grave good, rendered recent
   corpse, and unidentified residue may share a crafting tag while carrying
   very different sale access and consequences.
5. Mundane skills create approaches and alter consequences. They should not be
   a sequence of isolated pass/fail gates, nor should failure merely remove
   content.
6. Friendly and neutral scenes are first-class campaign nodes. They can consume
   time, reveal facts, create obligations, change access, and recur later
   without becoming combat.
7. The authored main threat supplies direction, but the road to each required
   story beat is selected from a stateful region graph rather than one fixed
   scene chain.

## Canon boundary

- **Inherited setting fact:** Maldirin is the broader setting, probably the
  world. Its internal geography, cultures, and political forms remain
  undecided.
- **Mechanical proving ground:** the played slice contains the Black Mile,
  Saint Orra, North Vey, a hollow tollhouse, county workers, and reeves. These
  test the systems but do not establish canonical geography or history.
- **System fact:** the game already records deeds, knowledge, standing,
  pressure, materials, and seeded outcomes.
- **Proposal only:** “North Vey” as a full first region, Maldirin as its market
  town, river ossuaries, northern marches, a standard county legal model, and
  black obols as a portable economy. None should harden into canon before the
  surrounding world is defined.

## Current foundation

The repository already has the minimum pieces needed to grow without replacing
the model:

- `WorldState` separates `facts`, `playerKnowledge`, faction `knowledge`,
  bounded relation `standing`, and the `escapedNames` and `countyNotice`
  pressures.
- The world facade now backs those compatibility fields with typed actor
  beliefs, evidence, claims, provenance and custody history, relationships, and
  scoped pressure records. Current saves normalize missing records additively.
  The witnessed-rendering route is the first vertical slice: the deed remains
  an objective fact, the report creates a reeve belief, and that belief makes
  the later patrol pursuit deterministic.
- Proving-ground actors have per-practice postures and concrete concerns.
  These are local authored viewpoints rather than a universal necromancy
  reaction table or moral alignment.
- The opening currently models overlapping household claim, custody, local
  authority, and possible religious privilege over the dead.
- The current testament distinguishes reeves, burial workers, brokers,
  roadside households, and Iven Saye. Whether those groups recur elsewhere is
  a worldbuilding decision.
- Seeded mundane checks cover Athletics, Medicine, Survival, Perception,
  Persuasion, and Barter.
- Friendly and neutral road events are drawn without repeats and persist their
  completed interaction state.
- Inventory already tracks black obols, weight, equipment, consumables,
  materials, purchase prices, and sale values.
- The journal exposes known facts and campaign preparations.

The next step is to generalize these pieces into registries and transition
modules. Do not add region routing, vendors, legal consequences, or skill
resolution as more branches in `engine.ts`.

## Regions, settlements, and attitudes

Before choosing a first complete region, establish Maldirin’s scale, the
political geography around the opening, and which local institutions are meant
to recur. The following table is a working proposal, not established lore.

| Place | Function | Authority and scarcity | Necromancy attitude |
|---|---|---|---|
| Maldirin | County-edge market town and first safe hub | Magistrate, reeve post, licensed apothecaries; reliable common goods, scrutinized occult goods | Legal work is tolerated with papers or a sponsor. Public corpse-work draws notice quickly. |
| Black Mile | The particular worked road in the opening testament, with toll ruins, burial markers, pits, and scattered homes | Reeve patrols are intermittent; local workers and households hold practical authority | Help is judged by its effect on bodies and travelers. Need can outweigh doctrine, but memory travels. |
| Vey limestone villages | Labor settlements and exhausted pits | Household elders, quarry factors, shrine keepers; medicine and food vary with weather | Suspicious of commanded human dead; more accepting of warding and the quieting of mine dead. |
| River ossuaries | Processing, storage, and lawful transport of old remains | Shrine charters and broker licenses overlap | Licensed relic work is normal. Unsealed material and unnamed recent remains threaten the entire trade. |
| Northern marches | Later border region and campaign pressure outlet | Thin county reach, military or estate authority, irregular supply | A necromancer may be valued as scarce military labor and feared as an agent of whichever power trained them. |

Settlement attitude should not be stored as a single number. Define a stable
local policy and derive access from world state:

```ts
interface SettlementDefinition {
  id: SettlementId;
  regionId: RegionId;
  authorityFactionIds: WorldFactionId[];
  marketIds: MarketId[];
  serviceIds: ServiceId[];
  necromancyPolicy: {
    acceptedTags: PracticeTag[];
    restrictedTags: PracticeTag[];
    forbiddenTags: PracticeTag[];
  };
  scenePoolIds: ScenePoolId[];
}
```

An act such as opening a recent body has tags like `corpse-work`,
`recent-dead`, and `public-road`. Whether it is accepted depends on claim,
permission, location, witnesses, evidence, and the local policy. This prevents
each scene from implementing a special “necromancy bad here” conditional.

### Faction growth

Retain the current four faction viewpoints and add factions only when they
create different decisions:

- Shrine custodians: care about vows, named remains, seals, and sacrilege;
  may oppose brokers despite both handling relics.
- Licensed practitioners: thaumaturgists, wardwrights, surgeons, and rare
  necromancers protecting professional access; useful as trainers and rivals.
- Estate factors or quarry companies: care about labor, output, and liability;
  willing to sanction dangerous work while concealing its cost.
- A later anti-necromancy movement only if it has material support, local
  history, and internally varied people. It should not be a generic zealot
  faction.

Standing remains bounded and relational. Faction knowledge determines whether
a deed can affect standing. Legal heat is an authority pressure, not universal
disapproval.

## Economy and scarcity

### Loops

The economy should support four overlapping loops:

1. **Survival:** obtain dressings, medicine, food/rest, repair, and limited
   Spirit recovery; scarcity makes injury and route length matter.
2. **Salvage:** take gear and materials from encounters, then decide what is
   worth its weight, evidence, and sale restrictions.
3. **Practice:** spend materials, services, and favors on tradition-specific
   preparations, crafting, research, and advancement access.
4. **Standing:** perform work or settle obligations to unlock trusted vendors,
   quiet services, instruction, papers, and safer prices.

Black obols remain the first implemented currency. Ordinary transactions can
initially resolve as item exchange, service cost, or faction obligation.
Introduce common coin only when repeated ordinary purchases need a visible
budget rather than flavor.

### Markets, vendors, and services

Replace global reliquary stock with market definitions whose listings are
derived at entry:

```ts
interface MarketDefinition {
  id: MarketId;
  settlementId: SettlementId;
  keeperId: WorldPersonId;
  currency: "black-obol" | "barter";
  listingRules: MarketListingRule[];
  buyPolicy: {
    acceptedKinds: ItemKind[];
    refusedProvenanceTags: ProvenanceTag[];
    heatTolerance: number;
  };
}

interface MarketListingRule {
  itemId: ItemId;
  basePrice: number;
  quantity: number;
  restock: "never" | "chapter" | "visit";
  requires?: WorldPredicate[];
}

interface ServiceDefinition {
  id: ServiceId;
  providerId: WorldPersonId;
  cost: ResourceCost[];
  requires?: WorldPredicate[];
  outcomeId: ServiceOutcomeId;
  timeCost: number;
}
```

Barter modifies price or terms once per transaction; it must not invite
re-rolling until success. A provider may trade because of standing, accept a
specific material, demand a favor, or refuse conspicuous goods even when the
player has enough obols.

Services should include wound care, safe rest, equipment repair, appraisal,
legal papers, discreet transport, rumor verification, instruction, and
tradition-specific preparation. Iven’s surgery and cordial are the seed of
this model.

### Provenance

Do not multiply item IDs for every history. Stackable inventory needs a
lightweight lot model only for goods whose origin matters:

```ts
interface InventoryLot {
  lotId: string;
  itemId: ItemId;
  quantity: number;
  provenance: {
    sourceFactId?: WorldFactId;
    ownerClaim?: WorldFactionId | "household" | "none";
    tags: ProvenanceTag[];
  };
}
```

Common linen can remain in the current compact count map. Grave copper, named
relics, recent-body reagents, and licensed goods use lots. Markets inspect lot
tags; journals expose provenance the player knows. Transferring or consuming a
lot records an event before removing it.

Renderer harvesting should use a seeded yield table:

```ts
interface HarvestDefinition {
  id: HarvestId;
  sourceTags: SourceTag[];
  skill: MundaneSkillId;
  attribute: AttributeId;
  timeCost: number;
  witnessExposure: number;
  yields: HarvestYieldBand[];
}
```

Skill progression raises yield reliability and can unlock rare bands. It
should not erase witness risk, ownership, carrying weight, or the need for
proper tools.

### Heat, evidence, and enforcement

Generalize `countyNotice` into named authority pressures only when a second
authority exists. Keep the current field through migration.

```ts
interface LegalCaseState {
  authorityId: WorldFactionId;
  allegedFactIds: WorldFactId[];
  evidence: EvidenceRecord[];
  status: "unknown" | "rumor" | "inquiry" | "warrant" | "closed";
}

interface EvidenceRecord {
  id: string;
  factId: WorldFactId;
  kind: "witness" | "body" | "object" | "record" | "occult-trace";
  holderId?: WorldRelationId;
  strength: 1 | 2 | 3;
}
```

Evidence can be moved, concealed, contradicted, or connected to a use-name.
Standing affects discretion and terms; it does not make evidence disappear.
The player sees observable consequences (“the carrier saw the opened body”),
not hidden numeric notice gains.

## Mundane skills and noncombat interactions

### Check contract

Keep seeded resolution, but replace ad hoc effects with an authored challenge:

```ts
interface ChallengeDefinition {
  id: ChallengeId;
  approaches: ChallengeApproach[];
  stakes: string;
}

interface ChallengeApproach {
  id: string;
  skill: MundaneSkillId;
  attribute?: AttributeId;
  difficulty: number;
  costs?: ResourceCost[];
  requires?: WorldPredicate[];
  onSuccess: ConsequenceId[];
  onFailure: ConsequenceId[];
}
```

Rules:

- Present the fictional approach before its skill label.
- Reveal immediate, reasonably knowable stakes; do not reveal exact hidden
  downstream responses.
- Spend costs and advance the seed once. A failed approach changes the scene,
  consumes time/resources, worsens terms, or creates evidence; it does not
  merely leave the same button available.
- Allow preparation, tools, assistance, wounds, and world knowledge to apply
  named modifiers. Show the reason, not necessarily the final percentage.
- Offer non-check choices where expertise is irrelevant or the player accepts
  a certain cost.

### Skill identities

- Athletics: carry, climb, force, endure, control a struggling body.
- Medicine: diagnose, stabilize, operate, judge contamination and recovery.
- Survival: route, weather, camp, forage, conceal tracks, handle animals.
- Perception: notice evidence, danger, lies in physical detail, and occult
  irregularities visible to trained attention.
- Persuasion: establish trust, invoke obligation, calm, negotiate permission,
  and offer a name deliberately.
- Barter: appraise, identify leverage, structure exchange, and read scarcity.

Common experience justifies starting values, including zero as “untrained but
capable of ordinary action.” Zero blocks specialist outcomes, not basic human
behavior.

### Multi-step scenes

Use a small scene-local state record for negotiations, investigations, medical
work, and social confrontations:

```ts
interface SceneProgress {
  sceneInstanceId: string;
  phaseId: string;
  completedApproachIds: string[];
  leverageIds: string[];
  localPressure: number;
}
```

This supports non-mutually-exclusive actions, revised onward text after helping
someone, and outcomes that feature what happened. Persist it only while the
scene can be revisited; convert durable consequences into world facts,
knowledge, relations, evidence, preparations, or obligations.

## Friendly and neutral scene design

A noncombat scene earns its place when it changes at least two of:

- route or time;
- resources, wounds, Spirit, or carrying burden;
- player knowledge;
- another person’s or faction’s knowledge;
- standing or an obligation;
- market/service access;
- evidence or legal exposure;
- a later scene’s cast, terms, or available approaches.

Friendly does not mean free. A burial crew can need labor; a household can
offer shelter while refusing grave copper; a surgeon can save a limb and
demand scarce ichor. Neutral scenes can become friendly, hostile, avoidable, or
unresolved according to behavior.

Recurring people should remember specific interactions. Use person standing
for accumulated trust, facts for deeds, knowledge for what they know, and
obligations for unsettled exchanges:

```ts
interface ObligationState {
  id: string;
  creditorId: WorldRelationId;
  originFactId: WorldFactId;
  status: "owed" | "called" | "settled" | "defaulted";
  dueBeforeBeatId?: StoryBeatId;
}
```

Iven is the first recurrence candidate: treatment quality, cordial access,
future referrals, and willingness to conceal evidence can respond separately
to payment, persuasion, medical respect, and trouble brought to his awning.

## Authored data architecture

Use registries with references rather than executable effects embedded
throughout prose:

- `world/regions.ts`, `world/settlements.ts`, `world/factions.ts`
- `economy/markets.ts`, `economy/services.ts`, `economy/provenance.ts`
- `challenges/definitions/*.ts`, with resolution in `challenges.ts`
- `content/<region>/<route-or-pool>.ts`
- `campaign/beats.ts`, `campaign/routes.ts`, `campaign/selection.ts`
- `consequences.ts` as the typed transition vocabulary

Keep these registries in TypeScript while IDs, predicates, and consequence
contracts are still changing: `satisfies` checks and typed references make
authoring safer than loose JSON without requiring a content toolchain. Move
stable catalogs to validated JSON or another authoring format only when an
external editor or non-code authoring workflow justifies that boundary.

Scene modules own prose, available approaches, and references to consequences.
Domain modules resolve checks, costs, evidence, knowledge, inventory, and
relations. Renderers consume selectors and outcome records.

Replace free-form durable flags gradually. New persistent behavior should use
typed state or event records. Legacy flags remain readable until a migration
converts them.

Validation should reject:

- missing registry references and duplicate IDs;
- route nodes without valid exits;
- impossible beat gates;
- checks with no authored failure consequence;
- markets with profitable buy/sell loops or invalid providers;
- consequence IDs with no resolver;
- scene copy that references a person, item, preparation, or fact absent from
  the corresponding definition.

## Making the campaign less on rails

### Campaign topology

Use a directed region graph with required story beats layered over optional
and reactive nodes:

```ts
interface CampaignNodeDefinition {
  id: CampaignNodeId;
  regionId: RegionId;
  kind: "story" | "service" | "social" | "hazard" | "combat";
  scenePoolId: ScenePoolId;
  requires: WorldPredicate[];
  excludes?: WorldPredicate[];
  weight: number;
  once: boolean;
  exits: RouteEdgeDefinition[];
}

interface RouteEdgeDefinition {
  to: CampaignNodeId;
  travelCost: number;
  requires?: WorldPredicate[];
  consequenceIds?: ConsequenceId[];
}
```

At a route decision, select eligible nodes deterministically from the persisted
seed, region, history, pressures, and tags. Show destinations the character can
understand—settlement, named road, smoke, patrol risk—not the pool algorithm.

The opening should eventually offer at least two first problems and one
noncombat route. Routes converge on the Saint Orra beat because it advances
the campaign threat, but arrive with different people, preparations, wounds,
knowledge, evidence, and time.

### Clocks and fronts

A pressure is a number; a front gives it authored thresholds and actions:

```ts
interface FrontDefinition {
  id: FrontId;
  pressureKey: PressureId;
  thresholds: Array<{
    at: number;
    consequenceId: ConsequenceId;
    scenePoolId?: ScenePoolId;
  }>;
  advanceTriggers: FrontTrigger[];
}
```

Initial fronts:

- Escaped names: changes supernatural pools, possessions, and the urgency of
  the wake.
- County inquiry: begins with reports/evidence, adds patrol and market
  reactions, and can become a warrant.
- Unresolved local obligation: a front defined by the actual situation, such
  as the delayed corpse-cart in the current testament. It is not a generic
  “burial-road” institution carried into unrelated regions.

Clocks advance for time-consuming rest, travel, unresolved threats, and
specific consequences—not simply for clicking optional content.

### Gated beats and fail-forward

Required beats use predicates such as “learn one route to the vault,” not a
single required choice such as “read Hollis’s ledger.” Testimony, burial
knowledge, a broker’s map, a shade’s memory, or following the escaped-name
front can all satisfy the gate.

Failure changes the price of progress:

- a failed route check causes injury, delay, lost goods, or a worse arrival;
- failed persuasion may create a record while still securing basic passage;
- a lost battle may allow capture, debt, rescue, or retreat when fictionally
  credible;
- missing a clue shifts the player toward a riskier source rather than ending
  the route.

Do not guarantee survival. Fail-forward preserves decisions and campaign
movement; it does not remove lethal combat or resource collapse.

### Recurrence and variation

Variation comes from different situations, not synonym rotation:

- event pools are tagged by region, disposition, front, cast, need, and prior
  history;
- recurring people have changed roles and terms;
- completed optional interactions rewrite remaining scene copy;
- once-only events leave the pool, while recurrence templates require a new
  phase or changed world predicate;
- encounter rosters, noncombat approaches, and rewards can vary independently
  within authored bounds.

Track per-pool history rather than one global `seenRoadEvents` list:

```ts
interface CampaignHistory {
  visitedNodeIds: CampaignNodeId[];
  seenByPool: Record<ScenePoolId, string[]>;
  completedBeatIds: StoryBeatId[];
  activeFronts: Record<FrontId, number>;
}
```

### Save compatibility

Add campaign state as an additive schema migration:

1. Preserve `storyId`, `roadEvent`, `seenRoadEvents`, existing pressures, and
   flags when loading schema v4.
2. Infer completed opening beats and the current node from existing story,
   battle, facts, and victory state.
3. Seed the first `CampaignHistory` from `seenRoadEvents`.
4. Map `countyNotice` and `escapedNames` into initial fronts without deleting
   the legacy pressure fields during the migration version.
5. Continue persisting the RNG seed before every selection or check.

Selection must depend only on persisted state and ordered stable ID lists.
Never derive a saved route from object iteration order or current wall time.

## Staged implementation objectives

### Stage 1 — Generic consequences and challenges

- Define `WorldPredicate`, `Consequence`, `ChallengeDefinition`, and one
  resolver module.
- Convert the proving-ground burial cut and one Iven interaction without
  changing prose; treat them as a disposable system test.
- Persist one `SceneProgress` record and prove save/load determinism.
- Add registry validation and table-driven outcome tests.

### Stage 2 — First canonical settlement economy

- After Maldirin’s cultures and central conflict are established, define one
  canonical settlement, two providers, and several ordinary and occult
  services.
- Move existing global stock behind a market selector.
- Add finite stock, service costs, Barter terms, and access predicates.
- Introduce provenance lots for one ordinary good and one occult material.

### Stage 3 — Region route graph

- Add campaign nodes, edges, history, and seeded eligible-node selection.
- Build two opening problems, two routes toward the first canonical story
  anchor, and one noncombat convergence.
- Gate that anchor on an achieved objective rather than one specific prior
  scene.
- Migrate v4 saves into the graph.

### Stage 4 — Fronts and social consequence

- Define fronts from the canonical conflict and local institutions; reuse the
  proving ground’s escaped-name and notice pressures only as test cases.
- Add evidence records, one investigation scene, and one nonviolent way to
  answer or redirect an inquiry.
- Make two vendors and one household respond to knowledge and heat without
  sharing a global reaction.

### Stage 5 — Recurrence and campaign breadth

- Return a canonical person in a changed context.
- Add a second settlement and an institution that creates different choices.
- Add obligations, referrals, instruction, and faction-specific services.
- Expand route pools until an early replay can differ in first problem, first
  ally, and first material constraint.

## Prioritized stretch roadmap

1. **Challenge/consequence vertical slice:** burial cut plus Iven, with typed
   resolution, scene progress, and deterministic saves. This unlocks richer
   mundane scenes without enlarging the engine.
2. **First-settlement economy slice:** two providers, four services, finite
   stock, Barter terms, and provenance-sensitive sale of one occult material.
3. **Branching opening slice:** two first problems, three route nodes, and
   multiple predicates satisfying the first canonical story gate.
4. **Authority-response slice:** evidence, faction knowledge, an escalating front,
   and combat, social, concealment, and restitution responses.
5. **Recurring-world slice:** three canonical people return
   once with terms derived from facts, knowledge, standing, obligation, and
   current scarcity.

The first three stretches should land before adding a large volume of new
scenes. They establish the contracts that let later authored content multiply
without rebuilding routing, checks, or persistence each time.
