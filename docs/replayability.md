# Replayability target

Necromancer should feel authored without feeling recited. The world can have a recognizable geography and a strong central plot, but repeated runs should produce different problems, relationships, and tactical demands—not merely the same rooms with alternate adjectives.

## Design principles

### Remember decisions, not only destinations

Optional actions should write useful facts into run state: who was helped, what was delayed, which debts were accepted, what evidence was learned, and which communities now recognize the necromancer. Later event eligibility and outcomes should read those facts. Converging paths may return to the same landmark, but they should not arrive in the same world state.

### Draw situations, then author their consequences

A route slot can draw from an eligible pool, but each result is a complete authored situation with its own people, choices, tradeoffs, and follow-through. Procedural selection is useful; procedural mush is not. The seed makes a run reproducible, while `seen` history keeps a short run from repeating itself.

### Vary pressure as well as content

The same road can feel different when the player is injured, pursued, carrying forbidden evidence, owed a favor, or short on supplies. Eligibility and choice copy may respond to those pressures. Difficulty should emerge from the state of the journey rather than every event secretly resolving into combat.

### Let the ordinary world persist

Friendly, neutral, and mundane scenes are not pauses between the “real” supernatural content. They establish what necromancy costs ordinary people, provide services and relationships, and make genuinely otherworldly encounters exceptional. Mundane opposition should have motives and alternatives; “ordinary” must not become shorthand for another category of target.

### Preserve mechanical identity

Encounter variety must exercise different tools. Corporeal bodies, armored bodies, quadrupeds, manifestations, and incorporeal forms should create distinct equipment and damage-type decisions. A new enemy portrait with the same cadence and defenses is presentation variety, not tactical variety.

## Content shape

A campaign region should eventually contain:

- two or more possible opening problems, including a noncombat problem;
- route slots that draw friendly, neutral, hazardous, and hostile events;
- at least one branch created by a prior relationship or discovered fact;
- a pressure clock or opportunity cost that makes every optional action nontrivial;
- converging landmarks whose setup changes with the route taken;
- encounter pools that exclude recently seen entries;
- several presentation variants for unavoidable exposition.

Individual scenes remain hand-authored. The graph chooses which scene is eligible and how the route reaches it; it does not synthesize plot sentences from interchangeable fragments.

## State contract

Route selection should be a pure, testable operation over:

- the persisted random seed;
- region and route position;
- seen event IDs;
- world facts and relationships;
- current pressure;
- character condition, tradition, and resources.

The operation returns the advanced seed and one eligible content ID. Rendering reads that selected definition. Resolving it writes explicit consequences back to state. Save normalization supplies empty history and safe defaults for older testaments.

The first engine-independent implementation of that contract lives under
`src/game/routes/`. It separates:

- authored nodes, edges, objectives, interactions, and event-pool entries;
- a route-owned state record for position, discoveries, visits, completed
  interactions, objective progress, per-pool history, and seed;
- a read context projected from the larger campaign state for practices,
  capabilities, knowledge, actors, relationships, pressure, and resources;
- pure navigation, interaction, disclosure, seeded selection, and validation
  operations.

Player-facing route selectors return only authored labels and summaries. They
do not return failed predicate IDs, undiscovered edges, future content IDs, or
the exact consequence hidden behind an uncertain choice. Optional
interactions never move the current node; travel is an explicit edge
transition.

`PROVING_GROUND_ROUTE_GRAPH` is a compatibility fixture for the present
testament, not a claim that its linear content shape is the campaign model.
`NORTH_VEY_EXPANSION_ROUTE_GRAPH` is a design fixture: it carries multiple
objectives at once, permits revisits, supports two objective orders, discovers
a hidden route through play, and rejoins at an overarching destination.
Friendly, neutral, service, and ordinary hazard content appears without making
necromancy or Saint Orra the cause of every local problem.

These fixtures are not wired into `RunState` yet. The integration boundary is
deliberately small:

1. project the authoritative campaign/world state into `RouteReadContext`;
2. add `RegionalRouteState` to the save schema with normalization and migration;
3. let story transitions resolve an authored consequence, then call
   `completeRouteInteraction` or `navigateRoute`;
4. resolve selected `contentId` values through the existing authored content
   registries;
5. render only `routeObjectiveSummaries`, `routeActionsFor`, and
   `routeOptionsFor`.

This sequencing keeps the graph from becoming a second world model or a second
story engine.

## Staged expansion

1. The current slice establishes the content contract with seeded wake variants, seed-textured early landmarks, and a friendly/neutral road-event deck that remembers seen entries.
2. The isolated route foundation proves navigation, optional interactions, discovery, revisit, deterministic pools, and required-objective reachability without changing the live testament.
3. Persistence and story coordination adopt the route state through the integration boundary above; the proving-ground fixture remains the parity target.
4. The opening region gains alternate first problems and at least one path that does not require killing Hollis Vane. The tollhouse becomes a converging landmark whose occupants, access, and preparation respond to prior facts.
5. Relationships and regional pressure select later events, close opportunities, and change prices or aid. Additional regions reuse the same graph and pool rules instead of adding bespoke sequence engines.

## Tests required for every pool

- The same seed and state select the same content.
- Every authored entry can be selected.
- Seen entries are excluded until exhaustion.
- Ineligible entries are never selected.
- A selected event survives save and load unchanged.
- Every event has a valid onward edge.
- Its advertised tradeoffs match the actual state transition.
- Presentation and tactical variants do not refer to anatomy, armor, or dispositions they do not have.

Every regional graph must also validate that all referenced nodes, actions,
objectives, pools, and discovered edges exist, and that every currently
playable practice can complete every required objective. External actor,
resource, and world predicates are treated as satisfiable during that parity
proof; practice gates and route-owned facts are evaluated exactly.
