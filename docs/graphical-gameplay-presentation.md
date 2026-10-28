# Graphical gameplay direction

## Reframed question

The relevant question is not whether Necromancer needs more visual controls
around its prose. It is whether the player should be able to **see and operate
the world itself**: roads, rooms, people, bodies, fires, thresholds, evidence,
enemies, and the durable consequences of prior decisions.

The answer is yes, if the graphical form is chosen carefully. Necromancer could
be substantially more immediate and memorable as a graphical game without
discarding its authored prose or deterministic hardcore rules. The best fit is
not a freely navigated CRPG or a tactical grid. It is a **2D illustrated scene
tableau RPG** supported by a schematic regional travel map:

- each location is a composed, wide scene with visible actors, objects, hazards,
  and a small number of meaningful spatial anchors;
- the player selects a visible person, object, or part of the environment, then
  chooses from authored actions that are actually valid for that focus;
- authoritative state changes alter the tableau: a road is blocked, a bridge is
  sealed, carts arrive, a body is opened, evidence changes hands, a servant
  takes position, or fire claims another part of town;
- combat occurs on the same kind of scene stage, using figures, targeting,
  intent poses, conditions, wounds, and short deterministic action animations;
- regional travel uses a known-world route diagram, not continuous walking; and
  prose remains the voice of interiority, exact terms, aftermath, and Witness.

This form preserves the current game more faithfully than an isometric walking
world or grid tactics. It adds visual presence and spatial memory where the
current systems already have place, materiality, anatomy, routes, and persistent
consequence, without silently inventing movement, range, collision, reflex, or
line-of-sight rules.

## Recommended form: the illustrated scene tableau

### What it looks like

Think of a stage-sized environmental illustration rather than a visual novel
portrait box. A location fills most of the viewport in a fixed wide or shallow
three-quarter composition. It has foreground, working ground, and distance, but
not free camera movement. Full or three-quarter figures occupy authored anchors.
Important objects and environmental features are part of the scene rather than
icons floating over a generic backdrop.

The visual language should extend the current severe black, bone, brass, and
grave-violet presentation: layered ink, cut-paper, etched, or restrained
painterly figures with strong silhouettes and limited animation. This is both
tonally appropriate and producible as separable 2D layers. It should not look
like a conventional bright icon-map RPG or an anime visual novel with two busts
in front of a blurred background.

A typical desktop composition is:

```text
+------------------------------------------------------------------+
| location name / pressure / immediate condition                   |
+------------------------------------------------------------------+
|                                                                  |
|        illustrated location with actors and stateful anchors     |
|                                                                  |
|   scrub line       wells       east road      bridge       host  |
+--------------------------------------+---------------------------+
| focused subject and authored caption | applicable actions        |
| known condition, relation, or stakes | costs / prospect / confirm|
+--------------------------------------+---------------------------+
```

The labels do not need to remain visibly attached to every anchor. They show
focus, keyboard traversal, or a dedicated accessible overlay. On narrow screens,
the scene remains a bounded establishing image followed by focused subject and
action panels in semantic order; it does not become a tiny pannable playfield.

### Moment-to-moment play

The primary loop becomes:

1. arrive from the route map or previous scene;
2. see the location, present actors, immediate hazard, and visible legacy of
   earlier choices;
3. read or hear a short authored establishing passage;
4. focus a person, object, body, path, or environmental feature;
5. inspect what the character presently knows and the authored actions that can
   bear on it;
6. preview method, known cost, qualitative prospect, and pressure relationship;
7. confirm one authoritative action;
8. watch a short skippable resolution staged in the scene;
9. read the authored result while the scene settles into its new state; and
10. continue working, enter combat, negotiate terms, or travel.

The scene is not a hidden-object hunt. Every interactive focus appears in a
semantic focus list and has a visible focus treatment. Perception checks may
reveal a new focus after resolution, but the player's eyesight and pixel accuracy
never substitute for the character's Perception.

### How much text remains

Necromancer should still be recognizably prose-led, but prose no longer has to
describe every fact that is now visible. A good target is:

- one short establishing passage when a scene or phase begins;
- concise dialogue or captions attached to the speaking figure;
- full authored action labels, methods, costs, and unavailable reasons;
- a short result passage after a consequential action;
- the full structured Witness, Journal, and detailed rules on demand; and
- an always-available reading view containing the complete semantic account of
  the current scene and its actions.

Do not set a word quota before prototyping. The criterion is division of labor:
visuals establish who and what is present, where known relationships lie, and
what materially changed; prose handles voice, ambiguity, testimony, terms,
memory, and consequences that cannot be honestly pictured.

The game should not replace strong sentences with generic animation. “The body
remembers work” belongs in prose even if the servant visibly lifts the beam.

## A complete play example: the Fire Road

The development Fire Road proof is the best world-presentation prototype because
it already contains a location, a spreading hazard, multiple actors, material
resources, work in parallel, authored approaches, discrete operating room, a
foreign host, and several visibly different outcomes.

### Arrival

The initial tableau is a wide eastern edge of town:

- resin scrub burns on one side;
- the household roofs, locked wells, and smoke-struck occupy the middle ground;
- the east road and timber bridge form the evacuation route;
- grain wagons wait near the warehouse row; and
- the foreign host is visible beyond the road beneath still, elevated vanes.

Sera, the grain factor, householders, and the air-speaker occupy distinct scene
anchors. The stage conveys that the military force is present but not already
inside the town. A short passage names the unnatural relation between smoke and
shade that the image cannot explain by itself.

### Preparation

The player can traverse visible focuses by pointer, touch list, or keyboard:

- selecting the scrub line offers the authored firebreak approach;
- selecting the smoke-struck offers the Medicine station;
- selecting the locked wells exposes the factor's claim and the Persuasion
  approach;
- selecting the east road offers carts and, for the Renderer, the grave-salted
  lane;
- selecting the bridge offers the Grave Warden's continuity work;
- selecting the dead bell keeper offers the Medium's hosting approach; and
- selecting the servant allows the Bonebinder to assign its one bounded task.

The existing objective/capability/target explorer remains useful as a compact
alternative and discovery aid. The tableau does not generate combinations. It
selects the same authored approach IDs and opens the same preview and transition.

### Authoritative changes

When a preparation resolves, the stage visibly changes:

- the firebreak becomes a black cut through the scrub, complete or ragged
  according to the seeded result;
- clean cloth and sorted bodies appear at a working smoke station;
- opened wells produce bucket lines; disputed wells show forced locks and
  disorder instead;
- hired carts turn against the fleeing crowd and take places on the east road;
- Ditch-Hand disappears into smoke and later returns visibly heat-damaged;
- grave salt creates one cold white track through the fire;
- a Warden seal joins the bridge while its outer rail burns away;
- a successful reading marks visible weaknesses in the host's supply train; and
- operating room changes only when the authoritative transition says it does.

These are state visuals, not flavor. Reloading the save reconstructs the same
stage. A result card still explains the outcome, including facts that cannot be
reliably inferred from art.

### Final terms and seasonal result

During the counteroffer, the camera does not cut to a generic dialogue screen.
It narrows attention to Sera, the town witnesses, and the distant air-speaker
while the burning town remains visible. On failure, one grain wagon is visibly
lost during the delayed answer because the domain result recorded that loss. On
success, foreign soldiers shelter the marked road but remain outside subject
households. The ending tableau can then show rescued households, surviving
wagons, occupied or unoccupied civic space, and the host's eventual departure
relation.

This is the central promise of graphical Necromancer: the player sees the town
they affected, not just an illustration of the town before a text result.

## Combat on the scene stage

### Preserve the current combat rules

Current combat has target selection, deterministic attacks and checks, enemy
intent, anatomy, armor, Ward, wounds, statuses, practice actions, and persistent
servant direction. It does not have tile movement, range bands, facing, cover,
or area geometry. A graphical presentation should not imply that those missing
rules exist.

Combat therefore uses **staged relations, not tactical coordinates**:

- the player and persistent allies occupy one side or foreground anchors;
- enemies occupy distinct targetable anchors arranged for silhouette and
  hierarchy;
- interposition, guarding, a Warden's relation to a marked enemy, and the
  selected target receive visible relational lines or poses because they are
  real rules;
- the background is the actual place where the confrontation began; and
- figures may step, recoil, overlap, or cross the stage during a bounded action
  animation, but their resting pixel coordinates do not change hit chance.

### Moment-to-moment combat

1. The enemy's next intent is conveyed by an authored tell pose or effect and
   the same textual intent description used today.
2. The player selects an enemy by selecting its figure or using the equivalent
   target list.
3. The selected figure exposes condition, materiality, Ward, statuses, wounds,
   and target-specific action previews.
4. The player chooses an action from visible semantic controls.
5. The engine resolves the complete deterministic exchange before presentation
   starts.
6. A short sequence stages hit or miss, mitigation, body-region injury, status,
   servant answer, enemy answer, defeat, and resource changes in authoritative
   order.
7. The latest Witness exchange remains readable and the full history remains
   available without being replayed as a live region.

Animation explains the result; it never decides it. There are no dodge prompts,
timed blocks, animation cancels, hit boxes, or projectile collisions.

### Characters and enemies

Use full or three-quarter figures with strong silhouette before investing in
large portrait libraries. This lets materiality, equipment, body form, wounds,
and servant presence live in the same world frame.

An efficient hierarchy is:

- a reusable base figure or rig for ordinary human archetypes;
- authored equipment, posture, head, and condition layers for variation;
- unique silhouettes and effect layers for exceptional manifestations such as
  the Bell-Widow;
- a small pose vocabulary: rest, intent/tell, commit, struck, guarded, wounded,
  defeated, and practice-specific action; and
- portrait crops derived from the same figure art when closer dialogue framing
  is useful.

A "rig" here is not synonymous with a human paper doll. It is a semantic visual
assembly whose nodes follow the entity: human limbs and grips for a person;
forequarters, paws, tail, neck, and back mounts for a hound; reaches and tethers
for a manifestation; or authored state regions for a distributed or
architectural being. Anatomy bindings may be many-to-many. Equipment declares a
compatible mount family, so a knife cannot appear in an invented hound hand and
a human helmet cannot silently become universal headwear. When an odd entity
does not admit honest modular assembly, use its bespoke authored states.

The sustainable field implementation is a derived appearance recipe: one
field-scale base or fallback figure plus only the equipped, wounded, repaired,
or supernatural layers currently needed. Recipes contain semantic visual IDs,
not asset paths, and are reconstructed from authoritative state. They may be
composed when appearance changes and reused while a figure moves; they are not
persisted as another character model. Progressive disclosure may hide dense
visual labels, but every figure retains the same authoritative accessible name.

Do not promise a unique fully animated model for every procedurally composed
enemy. The procedural composer can select only visual components declared
compatible with the archetype, anatomy, materiality, equipment, and cadence.
If a composition has no honest visual assembly, retain the authored generic
archetype figure rather than fabricating a mismatch.

### Wounds and materiality

Visual feedback should reflect structured results:

- the affected body region receives one brief highlight and its condition/wound
  state updates;
- armor visibly receives or turns force only where equipped;
- Ward breaks before corporeal impact when mitigation resolved in that order;
- incorporeal enemies distort, disperse, or fail to register ordinary physical
  force according to materiality; and
- scars and persistent servant repairs may alter the inspection figure, with
  text retaining the exact consequence.

Avoid gore-detail multiplication. A bounded severity/region overlay system can
communicate embodied cost without requiring bespoke wound art for every wound
label.

## Travel and exploration

### Regional route map

Between scene tableaux, use a schematic illustrated route map derived from the
authoritative regional graph. It shows only current place, known/discovered
locations, known connections, player-safe blocked summaries, and active
objectives. A discovered shortcut visibly changes the network. Travel cost and
arrival consequence remain explicit before confirmation.

This is not a miniature open world. The player chooses a road rather than
steering a character along it. Travel may receive one or two short illustrated
vignettes chosen from the seeded route/event state, then resolves at the next
scene tableau.

North Vey already offers an appropriate shape: Vey market, tenant fold, flooded
weir, reed ferry, abandoned weigh house, and quarry assembly, with a discovered
sluice route and simultaneous objectives. The visual map would make revisiting,
alternate order, and shortcut discovery intelligible in a way a destination
list cannot.

### Local exploration

Within a scene, exploration means changing focus, revealing authored details,
and sometimes entering a closely connected sub-stage such as the inside of a
weigh house. It does not mean walking an avatar around until a hotspot lights up.

An investigation can still feel exploratory:

- the visible yard presents scales, ruts, a locked office, and present actors;
- focusing each yields only observable information;
- a Perception or knowledge action may reveal the lesser track or an altered
  weight record;
- the stage adds the discovered trace and the route map may then gain an edge;
  and
- returning later shows altered custody, removed evidence, weather, or a new
  claimant when the world state supports it.

This retains character capability, failure-forward consequence, and deterministic
discovery while giving the player spatial memory of the investigation.

## Visual forms considered

| Form | What play feels like | Strength | Structural problem | Verdict |
| --- | --- | --- | --- | --- |
| Illustrated scene tableau + route map | Focus world entities, choose authored work, watch the place change | Represents locations, people, hazard, material consequence, combat, and travel without inventing locomotion rules | Requires disciplined layered art and visual-state coverage | **Recommended primary form** |
| Graphic-novel panels | Read and choose through composed sequential panels | Strong voice, pacing, and hero moments; easiest visual retrofit | Mostly illustrates prose after the fact; weak continuous sense of place | Use for openings, transitions, and endings, not the whole interaction model |
| Conventional visual novel | Background plus portraits and dialogue choices | Efficient character presence and dialogue | Environment becomes wallpaper; anatomy, routes, objects, and consequences remain menus | Too narrow as the primary form |
| First-person illustrated point-and-click | Inspect a place directly through viewpoint panels | Intimate investigation and atmosphere | Hides the player body and social staging; invites pixel hunting and many camera plates | Possible one-off scene family, not the foundation |
| Side-view battle lineup | Select visible enemies and watch attacks | Excellent combat clarity at bounded cost | Weak for social scenes, travel, objects, and environmental consequence | Use as the combat composition inside the wider tableau system |
| Top-down or isometric node scene | Move among actors and props in a compact location | Strong spatial presence and familiar controls | Movement implies collision, pathing, distance, stealing, sight, and timing rules the game does not have | Reconsider only after those rules are intentionally designed |
| Grid-tactical combat | Position, cover, range, and turn order become direct play | Potentially deep on its own terms | It would replace, not merely present, the current combat system and greatly expand encounter/AI/content burden | Separate redesign, not current evolution |
| Continuous 2D/3D exploration | Embodied traversal and spectacle | Maximum world presence | Highest asset, animation, camera, navigation, accessibility, save, and performance cost; dilutes prose and authored consequence | Do not pursue |

## Decorative illustration versus authoritative visuals

A richer game can use both, but must name the difference.

| Visual | Decorative when... | Authoritative when... |
| --- | --- | --- |
| Location background | It merely matches scene mood | Its selected state/variant identifies the actual location and persisted phase |
| Weather, smoke, or fire | It loops regardless of rules | Its bounded extent corresponds to a disclosed hazard state or resolved consequence |
| Actor figure | It is a generic portrait beside dialogue | Presence, identity, equipment, condition, command, and posture come from current state |
| Object or body | It is scenery that disappears after prose | Its presence, claim, custody, condition, or availability follows the domain model |
| Route | It is a painted line between decorative landmarks | Connectivity, discovery, cost, blockage, and destination are projected from route state |
| Enemy position | Pixel distance appears meaningful but is not | The position expresses an actual relation such as interposition or selected target |
| Intent pose | It looks threatening in general | It corresponds to the pure next-intent projection and is paired with its text |
| Wound/equipment layer | It is a generic damaged costume | Region, severity band, armor coverage, and repair reflect current anatomy/items |
| Practice effect | It is the same purple flare for every spell | Its form communicates hosting, binding, rendering, keeping, or passage and its actual target/state |
| Result animation | It plays the hoped-for action | It is selected only after resolution and depicts hit/miss/cost/status/defeat in correct order |

Decorative visuals are allowed, but they cannot contradict authoritative state or
carry required information alone. A static ashfall or candle gutter can establish
place; it should not suggest a timer or hazard that the rules do not contain.

## Scene and camera grammar

### Recommended camera

Use a fixed wide or shallow three-quarter environmental camera per scene phase,
with optional authored crops for dialogue or results. Do not allow continuous
pan, zoom, orbit, or player-controlled camera motion in the first implementation.

This provides:

- a stable mental model of the location;
- room for several actors and environmental subjects;
- deterministic authored composition;
- straightforward keyboard and screen-reader ordering;
- bounded asset dimensions and decoded-memory cost; and
- continuity when the same location changes after an action.

A camera change should mean a real phase change: entering the vault, narrowing
to negotiated terms, moving from road to battle confrontation, or viewing an
ending consequence. Camera cuts are authored transitions, not idle spectacle.

### Scene anchors and zones

Each scene definition may provide a small number of semantic anchors such as:

- actor position;
- body or object position;
- work site;
- threshold or road connection;
- foreground conflict position;
- background institution or hazard source; and
- result/camera focus.

Coordinates are presentation data only. Domain rules reference actor, target,
condition, route, body, or task IDs. A renderer may move an anchor responsively
without changing the action or outcome.

### Bounded animation

Use pose changes, short transforms, opacity reveals, masks, and two-to-six frame
effects where they clarify causality. Examples include:

- a bell veil tying into a face;
- Ward taking force before the body;
- a seal line breaking after its final test;
- Ditch-Hand entering smoke and returning scorched;
- a wound appearing on the resolved region; or
- a newly opened route drawing onto the map.

The animation begins only after the engine has returned a structured result. It
is skippable, does not block input longer than necessary, has an immediate
reduced-motion form, and never runs continuously while nothing changes. Ambient
rain, smoke, embers, or cloth can use a still layer or a brief settle on scene
entry rather than an endless loop.

Each rig exposes only a small finite motion profile suited to its form. Shared
tokens such as settle, advance, commit, recoil, and dissolve describe causality,
not identical anatomy: a hound lunges and bunches its hindquarters where a human
steps from the shoulder, while a shade may lose coherence. Use event-driven CSS
or Web Animations over transform, opacity, or a few sprite frames. Do not attach
listeners to figures, start a continuous JavaScript render loop, or animate
layout. Field motion assets remain lazy with the owning scene and are admitted
only when the current rig and action use them.

## Authored and procedural scene variation

Graphical presentation increases the cost of every variation unless assets are
designed around the same content boundaries as the rules. The right strategy is
**authored modular composition**, not runtime image generation and not universal
mix-and-match.

### Visual content layers

A scene family can draw from:

1. **location plate:** the stable physical place;
2. **phase plate or camera crop:** arrival, confrontation, aftermath, interior;
3. **environmental state layers:** flooded, burned, sealed, occupied, cleared,
   night, or weather where authoritative;
4. **actor figures:** identity/archetype, equipment, posture, and condition;
5. **objects and evidence:** wagons, body, dispatch case, broken gate, claimed
   item, tools;
6. **practice and status effects:** bounded overlays tied to current state; and
7. **short event/result animation:** loaded only for the active action or phase.

The scene visual selector composes only validated combinations. A unique authored
situation such as the Bell-Widow remains a unique visual package; it should not
be synthesized from “woman + rain + veil” tags merely because the content system
has tags.

### Variation policy

Seeded variation may safely select among pre-authored:

- weather/light variants that do not imply different rules;
- crowd or camp arrangements;
- compatible ordinary-human heads, clothing, equipment, and posture;
- approach/result overlays with explicit state predicates; and
- travel vignettes associated with the selected route/event.

It may not freely combine actors, hazards, props, or outcomes in ways the scene
definition did not validate. Existing rules that variation must change the
situation, opportunity, later consequence, tactical roster, or knowledge still
apply; a changed sky or shuffled figure is presentation variation, not replay
breadth.

### Production tiers

Use three asset tiers:

- **system assets:** reusable human bodies, common equipment, anatomy overlays,
  status/effect grammar, route marks, and interaction focus treatments;
- **scene-family assets:** one location plate, its meaningful state layers,
  recurring actors, and common event staging; and
- **hero assets:** a unique manifestation, climactic location, ending panel, or
  consequence whose identity justifies bespoke work.

This prevents every three-paragraph road event from demanding the asset budget
of a boss encounter. A road event can reuse a road stage, awning/fire/cart props,
and actor figures while still adding one authored composition or key object.

### Text-first fallback and incomplete coverage

The full semantic scene can render without its optional visual package. This is
important for accessibility, content development, modding, failure recovery,
and keeping large authored catalogs releasable. Missing hero art should degrade
to the reading presentation rather than a misleading generic scene.

Do not let fallback make art coverage invisible. Validation and content reports
should name which canonical scenes, phases, actors, outcomes, and persistent
state layers have intended visual coverage.

## Architecture and data implications

### Keep domain rules authoritative

The current dependency direction remains correct:

`content definitions -> pure domain selectors -> transitions -> visual read model -> renderer -> delegated app`

Visuals consume explicit scene read models. They do not inspect raw flags,
world beliefs, route predicates, or practice internals to guess what should be
visible. A click on a figure or anchor selects a stable semantic reference; the
available action selector resolves authored approaches and previews; confirmation
dispatches the existing transition.

### Visual definitions and read models

An owning content pack may define presentation assets and anchors:

```ts
interface SceneVisualDefinition {
  sceneId: string;
  phases: readonly {
    id: string;
    locationAssetId: string;
    camera: "wide" | "near" | "aftermath";
    anchors: readonly {
      id: string;
      kind: "actor" | "object" | "site" | "route" | "hazard";
      semanticOrder: number;
      placement: { x: number; y: number; depth: number };
    }[];
  }[];
}
```

The pure scene selector combines that definition with authoritative state and
returns a disclosure-safe projection:

```ts
interface SceneVisualReadModel {
  sceneId: string;
  phaseId: string;
  locationAssetId: string;
  layers: readonly { assetId: string; state: string }[];
  subjects: readonly {
    ref: string;
    anchorId: string;
    label: string;
    summary: string;
    visualState: string;
    focusable: boolean;
  }[];
  currentPressure?: { label: string; state: string };
}
```

These shapes are illustrative. Route, battle, anatomy, and world knowledge keep
their own domain types. Do not create a generic visual graph that becomes a
second game engine.

### Structured presentation results

The visual renderer needs more than an old state/new state diff. Transitions
should expose or allow selectors to derive a player-safe, ordered presentation
result: actor acted, target, hit/miss, mitigation, affected body region, wound,
resource change, status, defeat, learned fact, moved custody, opened route,
environmental state change, and result reference.

This aligns with the existing structured Witness and UX recommendation for typed
presentation deltas. Do not compare arbitrary saves to infer a fire advancing or
a wagon burning; the owning transition/result must identify the meaningful
change.

### UI-local versus persisted state

Current visual focus, camera crop, open caption, hover, and skipped animation are
UI-local. They do not consume a seed or enter the save. Actual location, route
discovery, actor presence, body condition, preparation, custody, pressure,
servant direction, and scene phase remain authoritative and persisted in their
own domains.

After load, visuals reconstruct from persisted state. If a scene cannot do so,
the art is decorative rather than trustworthy.

### Delivery boundaries

Large visual packages belong to the owning scene, encounter, region, practice,
or optional surface and load at a stable transition before the first frame that
requires them. The title stays lean. Entering Fire Road does not fetch Bell-Widow
or North Vey art; opening the Journal does not fetch combat poses.

Executable presentation code should remain small and reusable. Large assets are
releasable data fetched by manifest. Region boundaries may continue to use the
existing autosave/document-reload strategy when that is the cleanest way to
release long-session modules, styles, decoded images, and compositor resources.

## Accessibility and input

Graphical Necromancer must have one game state and two equally authoritative ways
to perceive and operate it, not a “real” graphical game plus a reduced text mode.

### Required scene description

Every stage has a semantic scene description generated from the same safe read
model. It states:

- location and phase;
- present people and significant bodies/objects;
- observable environmental conditions;
- current selected focus;
- authoritative changes since the last action; and
- every available or meaningfully preparable action with its reason/cost.

This should be an organized reading surface, not one enormous `alt` attribute.
Decorative layers are hidden from assistive technology; each meaningful subject
appears once as a native control or structured entry.

### Input parity

- Pointer and touch may select visible subjects directly.
- Ordinary Tab order follows semantic order, not x/y coordinate order.
- Optional arrow-key spatial navigation may exist only in addition to the stable
  ordered path and complete focus semantics.
- A subject list is always available when hit areas overlap or the scene is
  magnified.
- No action requires hover, drag, long press, precise targeting, rhythm, or a
  timer.
- Result focus, focus restoration, and one-new-Witness-entry announcement retain
  the current contracts.
- Gamepad support, if later desired, operates the same focus and action model; it
  does not create a different combat cadence.

### Visual access

High contrast focus and selected states must remain legible over varied art.
Color never distinguishes claim, danger, ally, materiality, wound, or route
alone. Provide text labels, patterns/forms, and a high-contrast visual treatment.
Support browser zoom and a reading layout rather than requiring map panning at
320 CSS px.

Reduced motion receives immediate state changes and still result poses. A global
skip/fast presentation control is valuable even for players who do not request
reduced motion because repeated deterministic exchanges should not become slow.

Audio descriptions and one-shot effects may supplement the stage, but no clue,
intent, identity, timing, or result depends on hearing them.

## Performance implications

The primary risk is decoded image and compositor residency, not TypeScript rule
cost. Use the current performance baseline as an admission gate.

### Preferred implementation envelope

- Responsive WebP/AVIF location plates sized for their actual display class.
- Individually addressable actor, object, and state layers, not giant sprite
  sheets admitted wholesale.
- Native lazy/async decoding where presentation timing allows; preload only the
  active scene's immediate layers before making it interactive.
- Semantic HTML controls laid over or beside the scene; bounded inline SVG only
  for connectors, masks, and focus geometry.
- CSS/Web Animations for short opacity/transform/clip sequences driven by a
  completed result.
- No WebGL/canvas renderer, continuous requestAnimationFrame loop, live
  particle field, parallax, shader weather, or force-directed layout.
- Tear down prior scene assets and DOM at navigation boundaries and verify they
  return to baseline after garbage collection.

The art style should embrace stillness. A tableau that changes decisively after
an action is more appropriate than a constantly breathing screen, and it is
considerably cheaper.

### Measurement

A graphical prototype requires `npm run check`, `npm run perf:trace`, and, when
combat targeting or repeated animation changes, the eligible high-refresh
cohort. Add measurements for:

- cold transfer and interaction readiness at first scene;
- per-scene decoded asset upper bounds and actual browser/GPU evidence;
- next-paint latency for focus, target selection, action resolution, and state
  layer replacement;
- repeated transition/animation frame pacing and skip behavior;
- reduced-motion equivalence;
- scene enter/leave lifecycle with zero retained documents/nodes and bounded
  heap/image growth; and
- a long session crossing several visually distinct scene packages.

Do not hide a scene behind markup until its necessary styles, controls, and
semantic fallback are ready. A failed optional visual load should expose the
reading presentation immediately and recoverably.

## Production implications

### The real cost

The largest cost is not drawing one beautiful background. It is covering the
state matrix honestly:

- which actors can be present;
- which bodies, items, evidence, and claims are visible;
- before/after versions of meaningful environmental work;
- equipment and anatomy differences;
- practice-specific actions and effects;
- seeded success and failure outcomes where they look materially different;
- combat poses and status/defeat states; and
- returns to a changed location later in the campaign.

Every new prose scene is currently relatively cheap. A canonical graphical scene
needs visual direction, asset manifest, semantic anchors, safe selectors, state
coverage, responsive composition, accessibility description, and performance
testing. The content roadmap must therefore budget for fewer but deeper locations
with recurrence and state change, which already fits the stated world and
replayability direction better than disposable scene chains.

### Sustainable scope

Prefer recurring location families and actors. Vey market, a north road stage,
the flooded weir, a household interior, a reliquary workroom, and several combat
grounds can host multiple authored events while retaining changed state. A
location earns bespoke art when it recurs, bears consequence, or establishes a
major culture/institution.

Hero manifestations and endings can justify unique art. Ordinary road events
should reuse visual grammar and assets while differing in people, key objects,
posture, and consequence. Do not visually homogenize events merely to save art;
if a concept cannot be made distinct within a scene family, keep it text-first
until it can.

### Tooling needs before scale

Before broad production, create:

- a visual asset manifest with dimensions, variants, ownership pack, and
  semantic purpose;
- a scene-state coverage report;
- a preview harness that renders each phase and state without playing the game;
- validation for dangling anchors/assets and hidden-state exposure;
- image optimization and responsive derivative generation;
- screenshot baselines for composition, not as the only behavioral test; and
- authoring guidance for separating visual fact from atmospheric illustration.

Runtime generative imagery is not recommended. It conflicts with stable art
direction, exact state continuity, reproducible saves, content review, layout,
accessibility description, and bounded transfer/performance. Generation may be
useful in the offline concept and asset-production workflow, followed by human
selection, editing, optimization, and a fixed manifest.

## Prototype directions

### Prototype A: Fire Road living tableau

**Purpose:** determine whether graphical world state makes a rich noncombat scene
more fun and more comprehensible.

Scope one development-only stage:

- one wide location plate;
- eight semantic focuses matching existing authored targets;
- Sera, the factor, the air-speaker/host, households, and the servant where
  applicable;
- authoritative overlays for hazard phase, firebreak, wells, station, carts,
  cold lane, kept bridge, host leverage, lost grain, and final occupation terms;
- the existing approach previews, seeded outcomes, result cards, and text mode;
  and
- simple entry/result/settle transitions with reduced-motion stills.

Do not add new rules. Compare against the existing proof on:

- whether players understand who/what is in danger and how the route fits
  together;
- whether they notice and remember visible consequences;
- whether operating room and parallel servant work are clearer;
- whether selecting the world feels better than browsing a taxonomy alone;
- whether prose remains enjoyable rather than becoming redundant; and
- keyboard, touch, screen-reader, narrow-view, transfer, memory, and frame
  evidence.

This is the best first prototype because it tests world, actors, environment,
practice variation, state change, and negotiation without requiring new combat
mechanics.

### Prototype B: one complete wake combat stage

**Purpose:** test whether staged figures and bounded animation improve tactical
clarity and impact without slowing the turn loop.

Use either the Bell-Widow for one exceptional materiality/intent test or the
name-thieves for multi-target readability. Include:

- actual encounter background;
- player, any active servant/ally, and enemy figures;
- click/list target parity;
- intent pose plus current textual tell;
- Ward, armor, body-region, wound, status, and defeat presentation from structured
  results;
- one action per current practice in the prototype fixture; and
- normal, fast, and reduced-motion resolution.

Reject or simplify it if players wait for animation, lose the Witness causal
order, mistake composition for tactical distance, or perform worse with keyboard
or touch.

### Prototype C: North Vey route and location pair

**Purpose:** test continuity between travel topology and represented places.

After route state becomes authoritative, build the known route map plus two
connected tableaux, preferably Vey market and the flooded weir. Let discovering
the old waterline add the weigh-house/sluice connection on the map and alter the
weir stage. This proves that visual travel, local investigation, and durable
world change use one state rather than three unrelated illustrations.

### Prototype order

Run A first, B second, and C only after route integration. A and B together are a
credible graphical vertical slice: one difficult place before conflict, one
complete fight, and visible aftermath. Do not build global scene tooling until
those two establish that the form is genuinely more enjoyable and that the asset
scope is supportable.

## Success and rejection criteria

The graphical direction succeeds if playtests show that players:

- form a stronger memory of locations, actors, and what they changed;
- understand environmental stakes and combat causality at least as accurately as
  in the reading presentation;
- prefer selecting and revisiting represented world subjects over navigating
  equivalent lists;
- continue to value the prose and can distinguish visual fact from atmosphere;
- do not infer nonexistent distance, timing, or freeform action rules;
- can play at a satisfying cadence with animation on, fast, or reduced;
- experience the same actions and disclosed information with keyboard, touch,
  pointer, screen reader, and zoom; and
- fit within cold-load, frame, memory, and lifecycle budgets in representative
  scene packages.

Reject or narrow the direction if it becomes:

- a visual novel skin in which backgrounds never reflect action;
- a hotspot hunt with text choices hidden behind scenery;
- a fake tactical battlefield whose positions have no rule meaning;
- an animation tax between deterministic turns;
- an art pipeline that forces shallow repeated scenes or prevents authored
  consequence from being shown;
- a less complete text experience presented as an accessibility fallback; or
- a second game engine encoded in anchor coordinates and visual scripts.

## Final recommendation

Prototype Necromancer as an **illustrated, stateful scene-stage RPG with a
schematic route map**, not as a continuous-movement or grid-tactical game.

The stage should represent the world directly: locations, people, bodies,
objects, claims, hazards, routes, and material consequences. Interaction begins
by selecting those represented subjects, then passes through the game's existing
authored approaches and deterministic transitions. Combat uses the same stage
grammar, with targetable figures and result-driven animation, while avoiding
invented spatial mechanics.

Fire Road is the decisive first experiment. If seeing its roads, bridge, wells,
host, smoke, carts, servant labor, and final occupation state does not make the
scene more compelling than the current excellent prose surface, graphical
expansion will not justify its cost. If it does, one wake battle can prove that
the same form carries Necromancer's body, materiality, and Witness systems. Those
two prototypes provide enough evidence to choose a production direction without
committing the entire campaign to an untested art and animation pipeline.

## Repository grounding and status

This memo is grounded in the current extension architecture, Fire Road approach
and pressure model, regional route graph, seeded encounter variants and enemy
composer, structured Witness/damage/anatomy/equipment systems, persistent
Bonebinder servant, world knowledge/claim/custody separation, scene-variation
roadmap, content-pack delivery model, and established accessibility/performance
contracts.

No production code, rules, persistence, UI, or assets were changed. This replaces
the earlier, narrower rule-widget memo and records a prototype recommendation,
not an implementation commitment.
