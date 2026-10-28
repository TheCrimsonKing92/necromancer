# Structured story approach explorer

## Status and purpose

The structured approach explorer is the approved foundation for giving a player
more ways to work on a situation without rendering every credible action as one
flat list. It does not replace authored major decisions, and it is not a freeform
game-master system.

The governing rule is:

> A scene owns authored approaches and their outcomes. Objectives,
> capabilities, and targets are indexes over those approaches; they never
> generate arbitrary action and outcome combinations.

The general definition, validation, and pure index selectors live in
`src/game/story-approaches.ts`. The isolated HTML projection and delegated-event
reducer live in `src/ui/story-approach-explorer-render.ts` and
`src/ui/story-approach-explorer-action.ts`. No canonical production scene uses
them yet; the development-only Fire Road proof exercises the complete seam.

## Existing compatibility contract

The current story surface remains authoritative until a scene explicitly opts
into an approach catalog:

- `StoryScene.choices` resolves to one visible list of authored decisions and
  interactions.
- Browser input is delegated through `data-action="choose-story"`; renderers do
  not resolve eligibility or outcomes.
- A non-navigating interaction records authoritative state, leaves the scene
  identity intact, removes the completed interaction, and may show a closable
  result card.
- `story-dom-patch.ts` updates the story's stable regions in place. The app shell,
  story panel, and dossier retain identity.
- Page navigation focuses the title, in-scene outcomes focus the result, and
  local controls restore focus by semantic key.
- Story state is persisted only after an authoritative engine result. Browser-
  local disclosure state is not part of the save.
- Current story catalogs are in the playable graph. Future region or integration
  approach catalogs must remain pack-private and load before their scene first
  renders.

Characterization coverage in
`src/ui/story-choice-contract.characterization.test.ts` protects the first two
observable story states: ordinary authored choices before an interaction and the
remaining decision/result surface afterward.

## Authored model

Every approach has a stable namespaced ID and a stable namespaced transition
reference. Display labels are not identities.

```ts
interface StoryApproachDefinition {
  id: `${string}:${string}`;
  label: string;
  lead: string;
  detail: string;
  objectives: readonly string[];
  capabilities: readonly StoryApproachCapabilityId[];
  capabilityMode?: "combined";
  targets: readonly string[];
  timing: "observation" | "preparation" | "decision";
  repeatability: "once" | "while-opportunity-remains" | "repeatable";
  transitionId: `${string}:${string}`;
  prominence?: "practice";
  resolution:
    | { kind: "mundane-check"; skill: MundaneSkillId; difficulty?: number }
    | { kind: "certain" };
  tempo?: {
    cost: number;
    relief: Partial<Record<"success" | "failure" | "certain", number>>;
    label: string;
    detail: string;
  };
  knownImmediateCost?: string;
}
```

Capability IDs may name a mundane skill, practice capability, item, actor,
known fact, or relationship. They describe why the approach is credible. An
approach normally has one primary capability so it appears under one capability
facet. Multiple capabilities are reserved for a genuinely combined method in
which each listed capability contributes; those definitions must say
`capabilityMode: "combined"`. The authoritative `resolution` identifies the
check that actually resolves the work, or records that an applicable authored
capability is certain. The transition referenced by `transitionId` consumes that
same resolution data and owns costs, seed consumption, state changes, and
outcome narration through the content-owned `storyTransitions` rule port.

The scene or pack also declares the player-facing objective, capability, and
target facets used to browse its catalog. Validation rejects:

- invalid or duplicate namespaced approach IDs;
- duplicate or dangling facet references;
- missing transition owners;
- approaches without at least one index on every axis;
- ambiguous multi-capability indexing that is not declared as a combined method;
- availability records for unknown approaches; and
- unavailable states without a truthful player-safe reason.

Catalog validation occurs once when its content runtime is assembled. Selectors
remain pure and never validate or scan unrelated packs during a render.

## Availability is an authored read model

The four player-facing availability states are:

| State | Meaning |
| --- | --- |
| `available` | The approach can be confirmed now. |
| `needs-preparation` | A named obtainable condition, access, resource, or setup is missing. |
| `inapplicable` | The capability does not belong to this character or cannot credibly do this work here; omit it from browsing. |
| `opportunity-closed` | A material state change has ended the opportunity. |

The scene's pure disclosure-safe selector produces these states. The renderer
must not infer them from inventory, flags, raw beliefs, or hidden pressure. A
non-available approach always explains the present obstacle without exposing a
seeded result or another actor's future use of time.

An approach remains browsable while unavailable only when it identifies
attainable preparation for this character. `inapplicable` approaches—including
other practices' signature methods—and closed opportunities are removed from
every axis. Their facets disappear when no live approach remains beneath them.
Any lasting or uncertain result belongs in the prepared-so-far summary instead
of occupying the action catalog. Within a facet, available methods precede those
that still need preparation while preserving authored order within each group.

## Inline interaction

A scene may frame the explorer as an explicit preparation phase before its major
decisions. `Explore another approach` then opens the complete authored catalog
inline in the story flow, not in a modal or another screen. Scenes where the
catalog is genuinely peripheral may retain the compact standalone control.

The distinction is information architecture, not a separate class of action.
The primary surface may feature the character's applicable practice response;
`Browse every approach` exposes that same authoritative action alongside the
other authored work, indexed from different player intentions.

The section has three equivalent browse axes:

1. **By objective** — what the player wants to accomplish.
2. **By capability** — a skill, practice capability, item, actor, fact, or
   relationship the player wants to bring to bear.
3. **By target** — a person, place, object, hazard, or institution in the scene.

Selecting a facet reveals only authored approaches indexed under it. Browse rows
carry a title, one authored suggestive lead, the method that will resolve it, a
current qualitative prospect, and present availability; they do not repeat the
full method or unavailable reason. The prospect is a stable broad band, never an
exact percentage. It remains visible under every browse axis so objective- and
target-first discovery does not conceal which character capability bears the
risk. Selecting an approach opens a preview with:

- the attempted work;
- its timing and purpose;
- the current skill and rank or authored non-check capability;
- a qualitative prospect under present conditions;
- its authored relationship to present scene pressure;
- its known immediate cost;
- a truthful obstacle when unavailable; and
- a separate confirmation control.

Selection is reversible until confirmation. Opening, closing, changing axes,
changing facets, and selecting a preview are browser-local disclosure state and
must patch only the explorer region. They do not clone the run, write storage,
consume a seed, or rerender the app.

Confirmation resolves the approach ID to its one content-owned transition and
then follows the ordinary authoritative result pipeline. A preparation that
retains scene identity patches the story-owned regions. A terminal decision or
navigation receives a full page transition. The explorer state resets when
story identity changes and retains or reselects a valid facet after an in-scene
result.

## Authored scene pressure

A time-sensitive scene may expose a qualitative status and give each approach an
authored `tempo` rule. This is not a universal countdown. The owning transition
decides whether work consumes operating room, happens in parallel, preserves the
present opening on success, or materially buys more time. The preview states that
relationship before confirmation, and the featured result states what actually
happened afterward. Pressure state belongs to the scene's versioned state and old
pack values require a compatibility default.

Primary preparation surfaces may promote the one applicable `practice` approach
before the complete browser. Promotion changes discovery, never authority: the
player still opens the ordinary preview, sees capability, qualitative prospect,
cost, and pressure, and confirms through the same transition. Major decisions
remain outside the catalog; closed preparations disappear rather than becoming a
growing checklist.

## Prepared-so-far summary

The scene may project a compact ordered list of authoritative preparation facts.
This is not another mutable state bag. Each entry derives from versioned scene or
campaign state and names actual work, uncertainty, or visible cost:

```text
Four carts secured
The eastern edge slowed
The lower households remain unwarned
```

The summary changes with the same targeted story patch as the choices and scene
copy. Superseded approaches disappear; incompatible alternatives do not all
become “completed.”

## Accessibility and focus

- Every control is a native button and remains usable by keyboard and touch.
- Axis controls are a labelled group of toggle buttons with `aria-pressed` and
  ordinary Tab traversal. If they later adopt ARIA tab semantics, arrow-key
  behavior, controlled panels, and roving focus must land together.
- Facet and approach selection expose `aria-current` or `aria-pressed` state.
- Unavailable reasons are visible text associated with their controls. `title`
  is never the only carrier.
- Opening focuses the explorer heading. Axis/facet changes restore the selected
  semantic control. Approach selection focuses the preview heading. Closing
  restores the compact browse control.
- The explorer result list is not live. Authoritative action results continue to
  use the existing result-focus and announcement contracts.
- Bounded opacity/transform entry motion is allowed only if it clarifies opening
  or a changed preview and is covered by reduced motion. No height animation,
  ambient effect, or continuous loop is permitted.

## Targeted integration calls

The production integration should remain screen-owned rather than adding a
generic UI framework:

1. A loaded scene read model exposes its catalog, validated index, availability
   context, suggestions, and preparation summary.
2. `story-render.ts` places the isolated explorer markup between suggested
   approaches and major decisions only when that read model exists.
3. `app.ts` passes delegated explorer controls through
   `reduceStoryApproachExplorerAction`. Disclosure-only results patch the one
   explorer host and use semantic focus keys.
4. A confirmation passes the selected approach ID to one pure selector that
   resolves its `transitionId`; the app invokes the content-owned
   `storyTransitions` transition exactly as it invokes other authoritative
   actions.
5. `story-dom-patch.ts` receives an explorer fragment/dependency selector rather
   than parsing a duplicate page. It preserves unrelated story regions whenever
   their projected dependencies have not changed.

Do not put approach IDs or candidate-specific branches into `app.ts`,
`story-render.ts`, or `engine.ts`.

## Delivery and lifecycle contract

The general algorithms are small and prose-free. Candidate or regional catalogs,
labels, target definitions, availability rules, transitions, styles, and assets
belong to the owning region or integration pack. In particular, the Moving Shade
Fire Road remains a noncanonical candidate and must not enter the core or cold
playable graph.

A content pack and its required styles/handlers finish loading at the stable
journey boundary before explorer markup becomes usable. Loading and building the
index consume no seed. Adding an unloaded pack cannot change another scene's
index order or result.

The eager story renderer reaches the explorer only through the small installed
renderer and content-story runtime ports. The explorer algorithms, app action,
CSS, transitions, and candidate pack remain separately admitted. Development
launcher markup and CSS are eliminated from production output rather than merely
hidden, so a proof scene cannot tax the normal title or playable request graph.

Repeated explorer open/close and axis/selection changes must return DOM nodes and
documents to baseline. A production integration requires:

- a browser contract for keyboard, touch, unavailable explanation, and focus
  restoration;
- a cold-resource assertion proving candidate/private catalogs remain absent;
- a same-surface identity assertion for disclosure and in-scene action patches;
- a lifecycle soak for repeated open/close;
- `npm run check`; and
- `npm run perf:trace` because the interaction and story patch surface materially
  change.

## Future “I’m trying to…” adapter

Natural-language input is explicitly deferred. When added, it is a query adapter
over the loaded authored index:

```text
player text
  -> tentative objective/capability/target terms
  -> ranked authored approach IDs
  -> ordinary preview and confirmation
  -> content-owned authoritative transition
```

The adapter may propose matches, nearby alternatives, or a truthful absence of a
match. It may not invent an approach, resolve a check, author consequences,
mutate state, consume randomness, or bypass confirmation. Persisted outcomes
remain reproducible without the language model or parser.

## Deferred product decisions

- Whether suggested approaches are authored explicitly or selected by a small
  deterministic priority field.
- Which unavailable approaches teach an attainable route and therefore remain
  worth showing; opportunities already closed never remain in the explorer.
- Which observations are genuinely free in a pressured scene. The model permits
  them, but each scene must answer honestly and player-facing copy must not imply
  free reflection when the work consumes an opening.
- Exact compact-screen layout and whether the three-pane desktop layout collapses
  to a stepwise drill-down on narrow screens.
- Final labels for `observation`, `preparation`, and `decision` in player-facing
  copy.
- The query vocabulary and confidence behavior of the later natural-language
  adapter.
