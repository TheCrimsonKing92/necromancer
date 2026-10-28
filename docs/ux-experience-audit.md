# UX and interaction-quality audit

Audit date: 2026-07-26  
Scope: current opening testament, report only  
Required inputs: [`performance-deep-dive.md`](performance-deep-dive.md),
[`quality-architecture-audit.md`](quality-architecture-audit.md),
[`architecture.md`](architecture.md), [`world.md`](world.md), and
[`replayability.md`](replayability.md)

## 1. Executive experience assessment

Necromancer already has a strong information-first game interface. The story and
battle screens share a coherent hierarchy; enemy intent is unusually legible without
promising an outcome; optional actions remain visible after completion; result cards
preserve narrative consequences; rewards can be inspected; combat ends with a final
exchange rather than erasing the decisive blow; the Body & Equipment page exposes
Health before allowing tonic use; wound consequences are substantially more legible
than in the earlier screenshots; and a defeated character's body is correctly
read-only. These are not temporary demo niceties. They are the foundation.

The interface is nevertheless less continuous than it looks. Several CSS meters
declare transitions, but most game actions replace the complete application subtree,
so the old and new values never coexist for the browser to interpolate
([`app.ts:427-443`](../src/ui/app.ts#L427),
[`dossier.css:77-80`](../src/styles/dossier.css#L77),
[`battle.css:144-148`](../src/styles/battle.css#L144)). The same replacement drops
keyboard focus after local inventory, advancement, result-dismissal, and combat
actions. Every story choice requests page-title focus, including optional actions that
remain in the same scene and open a nearby result card
([`app.ts:197-202`](../src/ui/app.ts#L197)). The active Witness live region is also
destroyed and recreated with the last ten entries after every combat action, so
`aria-relevant="additions"` cannot reliably constrain the announcement to the new
exchange ([`battle-render.ts:259-286`](../src/ui/battle-render.ts#L259)).

The next UX pass should therefore prioritize **continuity, causality, and accessible
context**, not ornament:

1. Establish a focus, announcement, and stable-section update contract. Local actions
   should update their section, retain or deliberately move focus, and announce only
   the new result.
2. Introduce domain-owned availability, preview, and transition-change projections.
   They should be the single source for visible requirements, resource deltas,
   rewards, wounds, preparations, known facts, and faction consequences.
3. Replace `title`-only explanations and the current hover/focus reward tooltip with a
   reusable keyboard-, pointer-, and tap-capable disclosure pattern.
4. Add bounded state-change motion: meters that actually interpolate, one-shot
   result/defeat/equipment feedback, and restrained screen continuity. Keep all motion
   interaction-triggered, short, and removable through `prefers-reduced-motion`.
5. Correct immediate accessibility defects: faint normal text below 4.5:1 contrast,
   disabled-control reasons that cannot receive focus, focus loss, and small secondary
   targets.
6. Grow the Journal into the character's safe knowledge surface—objectives, known
   people and factions, evidence, preparations, and provenance—without exposing
   hidden faction knowledge, pool contents, RNG, or exact unknown consequences.

The performance report explicitly rejects removing gradients, atmosphere, art,
result cards, or dense information. It measured a quiet idle state, approximately
60 Hz targeting and scrolling, no long tasks, a roughly 2 MB retained heap, and a
75 kB transferred client
([`performance-deep-dive.md:60-85`](performance-deep-dive.md#L60)). Richer UX is
compatible with that baseline if it is bounded and locally updated.

## 2. UX principles for Necromancer

### 2.1 Diegetic legibility

The prose may remain dry and restrained; the rules must not become coy. Present
mechanics using the vocabulary the character would understand, then let tools,
institutions, wounds, and customs carry the dread. "The county has the body" is
better than `County notice +2`; "Persuasion · 30% chance · rolled 43: failure" is
better than `43 / 30`. The current Iven result uses the latter explicit construction
([`road-events.ts:217-224`](../src/game/road-events.ts#L217)).

### 2.2 A four-level information grammar

Every displayed fact should belong to one of four epistemic levels:

1. **Known and immediate:** current resources, owned items, certain costs,
   prerequisites, guaranteed self-effects, active durations, and already observed
   materiality. Show inline.
2. **Known but detailed:** term definitions, derivation, equipment comparisons,
   wound-care rules, discipline contributions, and item descriptions. Make available
   through focus/click/tap disclosure and the relevant durable screen.
3. **Estimated or uncertain:** a character's assessed chance, a governing skill, a
   visible danger, or the fact that an enemy gains time. Mark the uncertainty and
   explain the basis without promising the result.
4. **Unknown:** hidden encounter selection, exact future injury, unseen faction
   knowledge, numerical regional pressure, the result of an unrolled check, and an
   enemy action beyond its authored telegraph. Do not expose it. After it becomes
   observed, move the result into Witness, a result card, or the Journal as
   appropriate.

This is the operational balance between informative and over-informative choices.
It should be part of the content contract, not a prose-review convention.

### 2.3 Continuity before decoration

After an action, answer three questions without making the player hunt:

- What did I do?
- What changed?
- What can I do now?

The answer can be a retained result card, a new Witness entry, a compact resource
delta, an updated body region, or revised onward copy. It does not need to be a toast,
and should not be duplicated across all of them.

### 2.4 Progressive disclosure is not feature removal

Compact mobile summaries, collapsed old Witness exchanges, and Journal indexes are
navigation aids. The underlying feature and its information remain reachable.
Disclosure must not hide a prerequisite, certain cost, current wound penalty, or
other fact required to make the present decision.

### 2.5 One rule, one preview, one result

Renderers should format authoritative query results rather than recalculate rules.
The quality audit already identifies duplicate story-choice, combat-action,
transaction, and item-use conditions
([`quality-architecture-audit.md:360-372`](quality-architecture-audit.md#L360),
[`quality-architecture-audit.md:502-530`](quality-architecture-audit.md#L502)).
UX richness will accelerate that drift unless previews and change summaries belong
to the domain.

### 2.6 Motion must earn its time

Motion should communicate continuity, causality, or hierarchy:

- a meter moves because a resource changed;
- a result settles into the scene because an action resolved;
- a defeated form loses coherence;
- an equipped item moves from pack to slot;
- a new Journal fact is entered.

No ambient breathing, flickering, parallax, perpetual grain, or idle animation.

### 2.7 Equal access across input modes

Hover is an enhancement. Any explanation available to a mouse user must be
available through keyboard focus and an explicit tap/click affordance. Focus is part
of application state even if it is not persisted.

### 2.8 Replayability remains authored

The UI may expose known leads, prior relationships, witnessed evidence, and current
pressure as the character perceives them. It must not expose the eligible-event pool,
unseen branches, seed, or the "correct" response. This preserves the distinction
between authored variation and procedural mush in
[`replayability.md:11-17`](replayability.md#L11).

## 3. Current journey map

| Journey stage | Strong current behavior | Friction or missing feedback | Primary opportunity |
|---|---|---|---|
| Title and resume | Clear new/continue distinction, autosave timestamp, destructive erase confirmation, no account fiction ([`shell-render.ts:127-173`](../src/ui/shell-render.ts#L127)) | A returning player sees no character, location, Health, or current objective until loading | Add a compact save synopsis derived from normalized save state; never parse presentation facts in the shell |
| Creation | Native form, fieldsets, required use-name and sex, large selectable tradition cards, visible starting Health/Spirit ([`shell-render.ts:176-262`](../src/ui/shell-render.ts#L176)) | Tradition choice omits defining starting technique, attribute/skill tendencies, and starting equipment; the cards are very tall on mobile | Add a selected-tradition detail/comparison region driven by one `TraditionStartPreview`; keep story consequences unknown |
| Opening and story | Dynamic scene copy, tradition/skill/source tags, optional/nonexclusive actions, risk versus tradeoff, revised onward copy, persistent dismissible outcomes ([`story-render.ts:29-169`](../src/ui/story-render.ts#L29)) | Navigating choices can grant resources/items without a result; every choice focuses the page title; unavailable reasons live only in `title`; availability is partial and duplicated | Add typed availability and change receipts; distinguish navigation focus from in-scene outcome focus |
| Story result | Narrative body, mechanical result, inspectable reward references, close control ([`result-render.ts:5-61`](../src/ui/result-render.ts#L5)) | Reward disclosure has no tap-owned open state or Escape handling; dismiss destroys focus; entrance/exit is abrupt | Use a shared disclosure primitive and local result-card lifecycle |
| Battle targeting | Whole enemy cards are buttons, selected target uses `aria-pressed`, hit chance updates locally, enemy intent is concrete but non-guaranteed ([`app.ts:355-399`](../src/ui/app.ts#L355), [`battle-render.ts:45-88`](../src/ui/battle-render.ts#L45)) | None material in the targeted path; this is the model to preserve | Treat targeted selection as the reference implementation for other local interactions |
| Battle action | Detailed current costs, hit chance, discipline sources, current enemy and player state, bounded Witness tail | Full replacement drops focus and prevents meter interpolation; latest exchange is below the action grid; the live region is recreated; a quick kill immediately changes screens | Patch battle sections, append one structured Witness event, show a compact latest-exchange cue, and preserve the final-exchange ending |
| Advancement | Branch grouping, learned/available/locked states, permanent-choice warning, featured claimed result ([`advancement-render.ts:15-132`](../src/ui/advancement-render.ts#L15)) | A permanent discipline is claimed in one click; locked disabled nodes cannot be keyboard-focused; the visual "tree" does not convey prerequisite paths strongly | Add select-then-claim confirmation and an accessible prerequisite trail; keep the list form on mobile |
| Body, equipment, pack | Current Health/Spirit/load and combat stats, item art and descriptions, equipment before/after comparison, tonic healing amount, anatomy by region ([`inventory-render.ts:55-100`](../src/ui/inventory-render.ts#L55)) | Every equip/use/buy/sell action loses focus and gives little persistent confirmation; introductory rules are dense; no indexing at future inventory scale | Patch owned rows/summary, announce exact transaction deltas, restore logical focus, and add section navigation/filtering only at thresholds |
| Wounds and care | Bindable vs safe-rest care, treatment chance, wound effects, body condition, read-only death state ([`anatomy-render.ts:69-144`](../src/ui/inventory/anatomy-render.ts#L69)) | The shared aggregate says every wound "closes" and "closure may leave scars" even though individual closed injuries correctly "heal" ([`wound-presentation.ts:45-48`](../src/ui/wound-presentation.ts#L45)); treatment failure exists mainly in a four-second notice | Make recovery language care-aware in the domain presentation model; retain the last treatment result beside the wound |
| Market | Item identity, effect, price, obol balance, weight/carry checks, selling in the same surface | Disabled buy reasons are `title`-only; transactions have no stable receipt or focus restoration; future providers cannot share one undifferentiated shop | Use authoritative transaction previews/results and provider-owned sections |
| Journal | Correctly reads only player knowledge, separates preparations from facts, marks active/spent ([`journal-render.ts:9-87`](../src/ui/journal-render.ts#L9)) | No current objective, location, people, relationships, evidence provenance, acquisition source, or index; exact standing is rightly not exposed, but no qualitative counterpart exists | Evolve into a typed campaign-memory read model with known leads, relations, evidence, and provenance |
| Ending/death | Decisive final Witness exchange survives battle removal; correct encounter-specific copy in ordinary states; read-only body; replay and title actions ([`ending-render.ts:115-145`](../src/ui/ending-render.ts#L115)) | Encounter identity still relies partly on inferred battle counts; no concise testament ledger; "Begin another" offers no same-build shortcut | Consume the planned common encounter contract and offer a known-facts/choices/scars summary plus optional reuse of creation selections |
| Mobile | One-column enemies/actions/body, dossier becomes static, large primary controls, global reduced-motion rule ([`responsive.css:36-285`](../src/styles/responsive.css#L36)) | The full dossier is moved before the actual scene/battle; header tools can become crowded at 320 px; long cards dominate the viewport | Use a compact always-visible resource summary plus an explicit full-dossier disclosure; retain all information |

## 4. Contextual knowledge and disclosure model

### 4.1 Placement matrix

| Information | Inline now | Context disclosure | Journal / durable screen | Intentionally hidden |
|---|---|---|---|---|
| Health, Spirit, Ward, current condition | Exact current/max and immediate delta | Derivation and cap | Body history only when authored | Nothing |
| Action | Name, cost, target, chance, certain effect, duration, source | Damage/materiality terminology; discipline/equipment contribution | Learned technique description | Hit roll and actual wound before resolution |
| Story choice | Narrative action, guaranteed cost, requirement, governing skill, risk/tradeoff | Why a visible prerequisite applies; known item/skill definition | Resulting known fact, preparation, or relation | Exact uncertain consequence and future encounter response |
| Item/reward | Name, quantity, immediate effect/category | Full description, slots, coverage, damage profile, weight/value | Pack, acquisition source/provenance where recorded | Hidden use or later plot outcome unless learned |
| Wound | Region, label, care state, immediate penalty, recovery burden | What dressing/rest can and cannot do | Anatomy and scars | Seeded care result before treatment |
| Status | Name, potency, remaining rounds, direct consequence | Definition of timing terms | No need unless persistent outside combat | Future application |
| Skill/attribute | Name, value/rank when relevant | Plain-language definition and usual contribution | Character dossier | Hidden difficulty unless the character can assess it |
| Preparation | Acquired/spent notification | Exact owned mechanical use | Active and spent preparation record | What unrelated future content might consume it |
| World fact/evidence | "Journal updated" plus learned title | Why it matters now, if understood | Fact, source, witness/evidence, location | Facts the character does not know and faction knowledge |
| Person/faction | Visible qualitative reaction when observed | Known reason/evidence | Relationship history and last known disposition | Integer standing, unseen deliberation, hidden warrants |
| Route/objective | Current place and next known lead | Known alternatives | Objective and route history | Eligible pool, unseen nodes, seed, guaranteed future scene |

### 4.2 A maintainable knowledge-reference contract

Do not put another parallel glossary in markup. A presentation query should return a
safe reference:

```ts
interface KnowledgeReference {
  kind:
    | "attribute"
    | "skill"
    | "tradition"
    | "discipline"
    | "item"
    | "status"
    | "wound-care"
    | "preparation"
    | "world-fact"
    | "relation";
  id: string;
  label: string;
  summary: string;
  detail?: string;
  source?: string;
}
```

The owner remains the appropriate domain catalog. The UI owns only trigger,
placement, focus, and disclosure behavior. This aligns with the quality audit's
recommended preview/query models and avoids making renderers a second rules engine.

### 4.3 Interaction pattern

- Use an actual button for tap/click disclosure, with visible label text and a subtle
  information mark; do not make an otherwise static `span` the only trigger.
- A short, noninteractive definition may behave like a tooltip on hover/focus, but
  must dismiss with Escape and remain hoverable. WAI's tooltip pattern keeps focus on
  the trigger and uses `aria-describedby`
  ([WAI tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)).
- Richer content or links belong in a nonmodal popover, not `role="tooltip"`.
  Declarative Popover API invokers provide Escape/light-dismiss behavior, focus
  sequencing, focus return, and implicit relationships
  ([MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using)).
- The existing reward tooltip is keyboard-focusable, which is a good first step, but
  its tooltip has `pointer-events: none`, cannot be hovered, has no Escape behavior,
  and relies on focus/hover rather than explicit tap state
  ([`story-progression.css:118-179`](../src/styles/story-progression.css#L118)).
  WCAG 1.4.13 requires hover-triggered additional content to be dismissible,
  hoverable, and persistent under its stated conditions
  ([WAI understanding 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus)).
- For large lists, do not mount hundreds of hidden rich descriptions. Render bounded
  summaries, then materialize or retain a detail body on first explicit open.

### 4.4 Disabled and locked information

Native disabled buttons do not receive ordinary keyboard focus. Current story,
battle, tonic, treatment, and market controls therefore cannot rely on `title` for
their reason
([`story-render.ts:145-153`](../src/ui/story-render.ts#L145),
[`battle-render.ts:204-212`](../src/ui/battle-render.ts#L204),
[`market-render.ts:44-52`](../src/ui/inventory/market-render.ts#L44)).

Use one of these patterns:

- keep the action disabled and print a visible reason inside or immediately after the
  card, referenced by `aria-describedby`; or
- use `aria-disabled="true"` on a focusable control and have the delegated adapter
  reject activation without invoking a transition.

The authoritative availability query supplies the same reason to UI and execution.
Do not show a hidden-story reason merely because the domain knows it.

## 5. Motion, transition, and state-continuity system

### 5.1 Proposed tokens

```css
:root {
  --motion-fast: 120ms;
  --motion-standard: 180ms;
  --motion-emphasis: 240ms;
  --ease-settle: cubic-bezier(0.2, 0.75, 0.25, 1);
  --ease-direct: cubic-bezier(0.2, 0, 0, 1);
  --motion-distance: 0.3rem;
}
```

Ordinary transitions should remain at or below 200 ms; exceptional result entrances
at or below 300 ms. These are the budgets already established by the performance
report ([`performance-deep-dive.md:318-343`](performance-deep-dive.md#L318)).

### 5.2 Reusable patterns

| Pattern | Visual behavior | DOM/state behavior | Reduced motion |
|---|---|---|---|
| Resource meter | `transform: scaleX()` from old to new over 180–240 ms; number changes immediately; optional `+1`/`−4` delta | Preserve the meter node and update value/custom property locally | Immediate width/value; delta remains as text |
| Result card enter | Opacity plus 4–5 px settle over 180–240 ms | Insert/focus or announce according to transition kind; state remains authoritative | Immediate appearance |
| Result card dismiss | 120 ms opacity/translate exit, then remove; bounded fallback timer | Persist dismissal immediately or accept harmless card reappearance if tab closes during exit | Immediate removal and deterministic focus restoration |
| New Witness exchange | New row receives one 160–180 ms opacity/color emphasis | Append only new events; trim oldest DOM row at 10; update a separate persistent announcer once | Immediate row with non-motion emphasis |
| Enemy defeat | Retain card; one-shot opacity/desaturation/outline transition | Structured defeat event supplies cause; final battle navigates only after the decisive exchange is captured | Immediate defeated state |
| Equipment/market | Brief border/background confirmation and numeric delta | Patch slot, stack, balance, load, and affected summary; focus logical successor if trigger disappears | Immediate text delta |
| New fact/preparation | Compact "Entered in Journal" link/chip, not an unexplained counter | Link to durable entry; announce the entry title once | Immediate chip |
| Screen/scene navigation | Optional 160–220 ms crossfade/very small settle of the principal panel | Focus new page title; preserve header and stable shell where possible | Direct replacement |

Animating `padding` on choices and advancement nodes currently causes layout work
([`story-progression.css:244-262`](../src/styles/story-progression.css#L244),
[`story-progression.css:356-374`](../src/styles/story-progression.css#L356)).
Replace that effect with a pseudo-element, background/outline, or small child
`transform`. High-performance animation guidance favors `transform` and `opacity`
([web.dev animation guide](https://web.dev/articles/animations-guide)).

### 5.3 View Transition API

`document.startViewTransition()` is now broadly available in current engines, but
older devices remain relevant and document transitions create temporary old/new
snapshots ([MDN `startViewTransition`](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)).
It is a benchmark-first enhancement, not the default answer.

Prototype it only for:

- full screen changes such as creation to story, story to battle, and battle to
  ending;
- a small number of named shared elements, such as the player name or principal
  panel;
- non-reduced-motion users.

Do not apply it to targeting, every combat action, scrolling, tooltip opens, or
inventory transactions. Validate transient GPU memory and focus/reading position;
MDN explicitly notes possible focus, reading-position, and live-region confusion when
old and new content overlap during a transition
([MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)).

### 5.4 Focus and announcement contract

| Transition kind | Focus after transition | Announcement |
|---|---|---|
| New screen or navigating scene | New `h1` | Page/scene title through focus; update `document.title` |
| In-scene optional action | Result heading if the original control becomes disabled; otherwise preserve trigger | One concise outcome summary; do not also announce the whole scene |
| Dismiss result | Next available choice, or choice-list heading | None |
| Open Journal/inventory | Surface title | Surface title |
| Close Journal/inventory | Original invoker and previous scroll position | None |
| Target selection | Preserve selected card (current behavior) | Selected target and changed hit chances only if useful |
| Combat action, battle continues | Same action if still available; otherwise nearest valid action | Only new Witness exchange plus essential resource delta |
| Combat ends | Ending title | Decisive exchange remains visible, but is not announced twice |
| Equip/buy/sell/use/treat | Same keyed row/control; if removed, its section heading or next logical row | Exact transaction/treatment result |
| Critical save error | Focus remains; persistent alert with dismiss/retry | Alert once |

Keep a persistent, initially empty status container. WAI's `role="status"` technique
expects the destination container to exist before the message and notes that status
is atomic in the accessibility model
([WAI ARIA22](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22)).
The current four-second notice is suitable for minor transient feedback, but save
failure and treatment failure should remain inspectable rather than vanish
([`app.ts:401-424`](../src/ui/app.ts#L401)).

## 6. Findings by surface

### 6.1 Shell, title, and creation

**Already strong**

- `lang="en"`, viewport metadata, semantic headings, native controls, required
  fields, fieldsets, and visible focus styles form a sound base
  ([`index.html:1-18`](../index.html#L1),
  [`creation.css:74-76`](../src/styles/creation.css#L74)).
- The use-name framing is integrated into creation rather than left as an unexplained
  threat ([`shell-render.ts:186-199`](../src/ui/shell-render.ts#L186)).

**Observed friction**

- The document title remains simply "Necromancer" on every SPA screen
  ([`index.html:12`](../index.html#L12)).
- `go-home` returns to the title immediately. The autosave survives, so this is not
  destructive, but a returning player has little confirmation of what was left.
- At 560 px, the brand wordmark disappears while two navigation controls and the
  character block remain in one header row; no wrapping/overflow strategy is defined
  ([`responsive.css:116-138`](../src/styles/responsive.css#L116)).

**Recommendation**

Add `document.title` projection, a compact normalized-save synopsis, and explicit
320/360 px header tests. Creation should expose a selected tradition's defining
action, attribute/skill tendencies, and starting kit without exposing later
tradition-only scenes or advancement outcomes.

### 6.2 Story choices and results

**Already strong**

- Optional actions are tagged, remain visible as completed, and do not automatically
  remove navigation choices.
- Remaining route copy can change after helping the people in a scene, matching the
  user's nonexclusive-choice principle.
- `Uncertain risk` and `Tradeoff` are distinguished
  ([`story-render.ts:130-142`](../src/ui/story-render.ts#L130)).
- Current choice details generally state certain costs while leaving uncertain
  outcomes appropriately bounded. For example, the roadside rendering warns that
  yield is uncertain and the road is not empty rather than revealing the exact
  witness roll ([`toll-road.ts:182-188`](../src/game/content/toll-road.ts#L182)).

**Observed defects and opportunities**

- `applyResult(..., true)` for every story choice focuses the same page title even
  when the player performed an in-scene action and a result card appeared below it.
- Attuning in the opening adds one maximum and current Spirit, then immediately
  navigates; taking the tonic adds an item, also without a structured result
  ([`engine.ts:347-356`](../src/game/engine.ts#L347)). The player can miss both changes.
- The renderer knows only a partial list of unavailable conditions, so visible
  eligibility can drift from actual acceptance.
- Result dismissal is a full-root render with no focus destination.

**Recommendation**

Return a typed transition presentation containing `navigation`, `result`,
`resourceChanges`, `itemChanges`, `factsLearned`, and `preparationsChanged`. A main
route transition can display a compact "carried forward" receipt at the new scene;
an optional action keeps the featured result. Do not generate this by diffing prose
or reproducing rules in the renderer.

### 6.3 Battle, Witness, and combat continuity

**Already strong**

- Enemy intents identify action, physical tell, type, wound risk, and special effect
  without exposing a guaranteed hit or damage number.
- Materiality and body/form condition are visible.
- Status badges include consequence and unabbreviated remaining duration
  ([`statuses.ts:16-35`](../src/game/statuses.ts#L16)).
- Target updates are local and measured; the enemy grid's containment materially
  helped throughput.
- Defeated enemy cards remain in the roster, and the ending carries the final ten
  exchanges.

**Observed defects and opportunities**

- Full battle rerender prevents existing width transitions from showing the change
  and drops keyboard focus after an action.
- A long Witness line is visually remote from the action that caused it. The final
  exchange solves battle removal but not turn-by-turn causality.
- Recreating the whole `aria-live` list risks announcing old entries again.
- Source attribution is incomplete for base tradition actions. Advancement sources
  appear only when a discipline modifies the action
  ([`battle-render.ts:200-225`](../src/ui/battle-render.ts#L200)); the card's purple
  treatment is not an accessible source label.
- The action renderer reimplements several execution formulas, so added contextual
  explanations could become confidently wrong.

**Recommendation**

Introduce `PlayerActionPreview` and `ResolvedExchangePresentation`. Patch the enemy
grid, action grid, dossier resources/statuses, and Witness tail as stable sections.
After an action, briefly emphasize the newest Witness row and show a compact
one-line exchange summary near the actions when the log is below the viewport.
Attribute base techniques as "Medium technique", "Summoner technique", or
"Renderer technique"; reserve "Discipline" for learned modifiers. Keep authored
Witness prose action-specific.

### 6.4 Advancement

Locked nodes currently append the mechanical effect and lock reason, which is useful,
but a disabled button is not a reliable keyboard exploration surface. For the current
small graph:

- keep every branch visible;
- make learned and locked nodes readable and focusable as information without making
  them activatable;
- show the prerequisite trail ("Requires Deepened Well") separately from effect;
- let one click select an available discipline and a second explicit control claim
  it, because the choice is permanent;
- after claiming, keep the featured outcome and focus its heading rather than the
  page title.

At 30+ nodes, add branch filters and "available now" indexing. Do not move to a
canvas or a spatial-only skill tree; lists remain the accessible mobile form.

### 6.5 Inventory, equipment, anatomy, and market

**Already strong**

- The page solves the former tonic-without-Health problem.
- Equipment comparisons calculate attack, defense, readied damage, trauma, damage
  type, off-hand contribution, and covered-region armor before the player commits
  ([`equipment-render.ts:25-110`](../src/ui/inventory/equipment-render.ts#L25)).
- Body regions and wounds remain concrete.
- Post-death transitions are blocked in the domain and controls are omitted in the
  renderer.

**Observed defects and opportunities**

- Equip, unequip, use, sell, buy, and treatment all replace the root with
  `focusTitle=false`; the active control disappears from the focus tree.
- Buy/sell/equip return no message at all; the player must compare the new screen
  manually. Treatment returns prose, but it is a transient notice
  ([`inventory-engine.ts:394-400`](../src/game/inventory-engine.ts#L394)).
- `.item-action` is visually small—0.58 rem text with 0.32 rem vertical padding—and
  is below the project's preferred 44 px principal-action target
  ([`equipment.css:68-82`](../src/styles/inventory/equipment.css#L68)).
- Disabled purchase, tonic, and treatment explanations remain in `title`.
- The long inventory introduction front-loads several rules on every visit
  ([`inventory-render.ts:61-71`](../src/ui/inventory-render.ts#L61)).
- Aggregate recovery wording is care-insensitive even though individual cards are
  care-aware.

**Recommendation**

Patch keyed inventory sections and return an authoritative transaction result:
`itemDelta`, `currencyDelta`, `loadBefore/After`, `equipmentDelta`,
`derivedStatChanges`, or `treatmentOutcome`. Show it inline beside the affected
section and in one status announcement. Move the full armor/materiality/care primer
to an accessible "How protection and care work" disclosure while leaving decision
critical facts on each item or wound.

### 6.6 Journal and world state

The Journal's promise—"facts your character can name"—correctly protects the world
model from omniscient UI. Preserve it.

The next read model should organize:

1. **Current work:** current region/location, known objective, and unresolved leads.
2. **Preparations:** active first; spent in a collapsed/indexed history.
3. **People and factions:** only known people, qualitative last-known disposition,
   observed cause, and known aid/debt.
4. **Evidence and deeds:** fact, source, witness/evidence if known, location, and
   whether the character knows it traveled.
5. **Places and facts:** established world knowledge.
6. **Testament history:** scars and completed encounter summaries when history is
   added.

Do not turn `WorldState.standing` or pressure integers into player-visible reputation
meters. The character can know that a carrier turned south, that a reeve named the
cuts, or that a broker has become wary; the character does not know
`county notice +2`. Because `playerKnowledge` currently stores only fact IDs, source
and acquisition metadata require a typed knowledge record rather than renderer
inference ([`types.ts:347-355`](../src/game/types.ts#L347)).

### 6.7 Endings, death, and replay

The final exchange and read-only corpse record are strong. Preserve both. The planned
common encounter definition should remove the remaining battles-won fallback in the
ending renderer ([`ending-render.ts:17-30`](../src/ui/ending-render.ts#L17)).

Add an optional "Testament entered" summary containing:

- use-name, tradition, level, and ending;
- known major deeds and relationships;
- wounds/scars and defining equipment;
- known preparations used or left unused;
- no unseen route, seed, alternate outcome, or "missed content" count.

For replay convenience, offer "Another of this making" beside full new creation,
prefilling use-name/sex/tradition but still showing the form before it is signed.
Do not grant metaprogression merely for dying.

### 6.8 Responsive and accessibility

#### Confirmed contrast issue

`--ink-faint` is `#777064` and is used extensively for normal text as small as
0.54–0.68 rem ([`base.css:8`](../src/styles/base.css#L8),
[`battle.css:119-133`](../src/styles/battle.css#L119),
[`dossier.css:184-203`](../src/styles/dossier.css#L184)). Standard sRGB contrast
calculations produce approximately:

| Foreground / background | Ratio |
|---|---:|
| `#777064` / `#0c0d0c` | 3.97:1 |
| `#777064` / `#121411` | 3.78:1 |
| `#777064` / `#181a16` | 3.58:1 |

WCAG 2.2 requires 4.5:1 for normal text
([WCAG 2.2 §1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum)).
Reserve the current faint token for large/decorative/inactive text, or introduce a
legible-muted token at 4.5:1+ for meaningful metadata. Recheck composited gradient
surfaces in-browser rather than relying only on token pairs.

#### Focus and targets

- Global button/input focus rings are strong, but reward triggers remove the outline
  and substitute only a border-color change.
- Programmatic page-title focus intentionally has no visible outline. That is
  acceptable only for true navigation; it should not swallow focus after local
  actions.
- WCAG 2.2's minimum pointer target is 24×24 CSS px with stated exceptions, while the
  project appropriately prefers 44×44 for principal actions
  ([WCAG 2.2 §2.5.8](https://www.w3.org/TR/WCAG22/#target-size-minimum)).
- The fixed notice can cover a focused bottom-right control on a narrow viewport.
  Test focus-not-obscured at every breakpoint
  ([WAI focus-not-obscured guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)).

#### Mobile information hierarchy

At 800 px the full dossier is moved before story/battle content
([`responsive.css:49-74`](../src/styles/responsive.css#L49)). That preserves
information but makes every encounter begin with a long statistics wall. Render a
compact mobile resource/status strip—Health, Spirit, Ward, wounds, ally duration—and
an explicit "Full dossier" disclosure containing all attributes, skills, disciplines,
and equipment. The desktop dossier remains unchanged unless testing supports a
similar collapse.

#### Other accessibility work

- Add a skip-to-main link as the header gains controls.
- Update `document.title` for screen/encounter context.
- Verify item-art announcements. The visual's descriptive `role="img"` may be
  redundant immediately before the item's visible name and description
  ([`item-render.ts:12-23`](../src/ui/inventory/item-render.ts#L12)).
- Add browser keyboard smoke tests; current UI tests assert strings and only one test
  checks reward `tabindex`/tooltip markup
  ([`journal.render.test.ts:51-66`](../src/ui/journal.render.test.ts#L51)).

## 7. Prioritized opportunity table

| Priority | Opportunity | User impact / confidence | Effort / risk | Performance cost/risk | Evidence | Owner | Validation | Feature/spoiler constraint |
|---|---|---|---|---|---|---|---|---|
| P0 | Stable-section update, focus, and announcement contract | Very high / high | High / medium | Expected win; must preserve fallback render | Full root replacement and local focus loss in `app.ts:314-443` | `ui/app.ts`, render section contracts | Keyboard path for every delegated action; single-announcement screen-reader smoke; perf phase breakdown | No feature may disappear during partial update |
| P0 | Domain-owned choice/action/item/transaction previews and change results | Very high / high | Medium-high / medium | Low; reduces repeated calculations | Quality audit P1; duplicated formulas in `battle-render.ts`, story and market | Focused game queries + `EngineResult` structured outcome | UI acceptance equals transition acceptance; golden result deltas | Query exposes only player-safe information |
| P0 | Replace `title`-only unavailable reasons | High / high | Low-medium / low | Negligible | Story, battle, market, tonic, wound buttons | Query owner + named UI reason component | Keyboard/touch inspection, accessible-description assertions | Hidden prerequisites remain hidden |
| P0 | Correct care-aware aggregate wound language | High / high | Low / low | None | `wound-presentation.ts:45-48` conflicts with `anatomy-render.ts:91-93` | Anatomy recovery presentation | Case matrix: binding/rest × scar/no-scar × severity | Preserve genuine recovery burden |
| P0 | Raise meaningful faint text to 4.5:1+ | High / high | Low / low | None | Measured 3.58–3.97:1 token pairs | `styles/base.css` tokens, component review | Automated contrast scan plus gradient spot checks | Preserve hierarchy with size/spacing, not illegibility |
| P1 | Real resource/body/status transitions and delta chips | High / high | Medium / low | Bounded compositor work; likely less DOM churn | Existing transitions cannot interpolate across replacement | Battle/dossier sections + transition presentation | Rapid combat/inventory trace; reduced-motion screenshot; no idle work | Deltas report authoritative totals once |
| P1 | Append-only active Witness tail and latest-exchange cue | High / high | Medium / low | Expected win at longer logs | Recreated ten-entry live list | Witness section renderer + app patch | 20-turn battle, single announcement, final-exchange parity | Keep authored prose and structured events |
| P1 | Result-card focus/entry/exit lifecycle | High / high | Medium / low | Short 120–240 ms transition | Every story choice focuses title; dismiss drops focus | Result renderer + app transition kind | Rapid open/dismiss, keyboard/Escape, perf local p95 | Result remains persistent and dismissible |
| P1 | Shared tap/focus/hover knowledge disclosure | High / high | Medium / medium | Zero idle; bounded open subtree | Reward tooltip and `title` descriptions | `ui/knowledge-disclosure.ts` consuming domain refs | Mouse, keyboard, touch, Escape, zoom, viewport-edge tests | Hover never becomes required |
| P1 | Persistent inline transaction/treatment feedback | High / high | Medium / low | Section patch should reduce work | Equip/buy/sell silent; treatment toast expires | Inventory queries/transitions + inventory section renderers | Equip/sell/buy/treat keyboard sequence | Never imply a failed trade succeeded |
| P1 | Mobile compact dossier and resilient header | High / medium | Medium / medium | Lower initial mobile DOM/paint if closed; no feature loss | Full dossier ordered first; 320 px crowd risk | Combatant renderer, shell, responsive styles | 320/360/560/800 px touch + keyboard; long names | Full dossier remains one action away |
| P1 | Journal current work, people/relations, evidence, and provenance | High / high | High / medium | Bounded now; index at thresholds | Journal shows only preparations/facts | Domain journal read model + world typed knowledge records | Hidden-fact fixtures, known-source fixtures, 100-entry cohort | Never expose faction knowledge or numeric hidden pressure |
| P1 | Advancement select-then-claim and prerequisite trail | Medium-high / high | Medium / low | Negligible | One-click permanent choice, disabled locked nodes | Advancement query + renderer/app | Keyboard-only claim, cancel, persistence | No respec introduced accidentally |
| P2 | Save synopsis and testament ledger | Medium / high | Medium / low | Small projection | Title has timestamp only; ending has headline stats | Persistence-safe selectors, ending/shell renderers | old/current save matrix, defeat/flee/victory | No unseen alternatives or missed-content counter |
| P2 | Long-list indexes and progressive disclosure | High later / high | Medium-high / medium | Must benchmark; global `content-visibility` rejected | Performance blind spots and future scope | Journal/Witness/inventory presentation read models | 100/500 entries, keyboard/find/screen-reader, memory/frame trace | History remains discoverable |
| Experiment | Screen-level View Transitions | Medium / medium | Medium / medium | Snapshot GPU memory and focus risk | Current abrupt full screen changes; API now available | App navigation adapter + styles | Same-cohort transition/GPU trace; focus/read order | Progressive enhancement only; never on hot local input |

## 8. Staged work and future triggers

### 8.1 Immediate low-risk polish

1. Fix care-aware aggregate wound wording.
2. Introduce a legible metadata color and audit every `--ink-faint` use.
3. Print unavailable reasons visibly; stop relying on `title`.
4. Give result-card headings `tabindex="-1"` and distinguish in-scene result focus
   from scene-navigation focus.
5. Restore focus by stable `data-focus-key` after current full renders as an interim
   measure.
6. Update `document.title`.
7. Increase/space secondary action targets and test 320 px header layout.
8. Make current reward detail explicitly tap-toggleable and Escape-dismissible before
   generalizing it.
9. Retain treatment failure/success beside the relevant wound until another action or
   explicit dismissal.

### 8.2 Benchmark-first experiments

1. Stable battle section patches: action grid, enemy grid, dossier resources/statuses,
   and append-only Witness.
2. Transform-based meter changes and one-shot resource deltas under rapid actions.
3. Result-card enter/exit with focus restoration and reduced motion.
4. Native popover-based contextual knowledge under rapid pointer/keyboard/touch
   interaction.
5. Mobile compact dossier versus current full-first layout.
6. Screen-level View Transition API with transient GPU memory measurement.
7. Long Journal/Witness/inventory progressive disclosure at 100 and 500 entries.

### 8.3 Medium-term architecture

- Add `StoryChoiceAvailability`, `PlayerActionPreview`, `ItemUsePreview`,
  `TransactionPreview`, and corresponding structured resolution results.
- Extend `EngineResult` or its stable facade with a typed `presentation` result:
  navigation kind, resource/item/body changes, learned facts, relation observations,
  and result references.
- Add stable section identities and focus keys to render read models. Keep
  `renderApp` as the screen-change/fallback path.
- Create UI-owned knowledge-disclosure and transition primitives; they consume
  references and never calculate rules.
- Evolve player knowledge from bare fact IDs to typed records when provenance,
  witnesses, evidence, or discovery time is required.
- Separate active Witness tail from encounter archive before exposing full campaign
  transcripts.

### 8.4 Future scale triggers

| Trigger | Required UX response |
|---|---|
| Journal exceeds 50 entries | Add section counts, filters, and search; active objective and preparations remain first |
| Any Journal/transcript list exceeds 200 mounted cards or five viewport heights | Run long-list accessibility/performance experiment before virtualization or `content-visibility` |
| Pack or shop exceeds 20 distinct listings | Add category/filter and persistent balance/load summary |
| Advancement graph exceeds 30 nodes or three tiers | Add available/prerequisite views and branch navigation; retain linear semantic form |
| Witness archive exceeds three encounters | Group by encounter and keep only current exchange hot |
| More than five known factions/ten recurring people | Add relation index and last-known-change projection, not global reputation |
| Route graph exposes three or more simultaneous known leads | Add a Journal objective/lead surface; do not expose unseen graph nodes |
| Mobile dossier exceeds two viewport heights | Default to compact summary plus explicit full disclosure |
| A screen exceeds 800 elements or DOM update/presentation exceeds 12 ms | Require stable-section patching and long-list cohort, per performance report |

## 9. Explicit non-recommendations

- Do not strip atmosphere, gradients, art, result cards, detailed actions, anatomy, or
  the Journal to protect speed. Current measurements do not justify it.
- Do not add ambient particles, animated grain, candle flicker, parallax, breathing
  panels, continuous audio visualization, or idle `requestAnimationFrame`.
- Do not animate every number, border, paragraph, and card. Motion is reserved for a
  meaningful state change.
- Do not apply View Transitions to targeting, combat actions, tooltip opens, or every
  inventory transaction.
- Do not use blanket `will-change`, `translateZ(0)`, or per-card layer promotion.
- Do not make hover the only path to a reward, skill, stat, wound, or item explanation.
- Do not use `title` as the only unavailable reason.
- Do not mount a hidden encyclopedia entry behind every row of a large Journal.
- Do not virtualize the current small lists. When scale triggers it, preserve keyboard
  order, find-in-page, assistive discovery, and archived history.
- Do not auto-scroll the player to Witness after every action. Preserve their reading
  position and offer a compact new-exchange cue.
- Do not require confirmation for every combat or story action. Reserve two-step
  confirmation for permanent advancement and genuinely destructive operations.
- Do not expose precise hidden faction standing, pressure, event eligibility, seed,
  future injury, or enemy outcome in the name of clarity.
- Do not build a universal presentation diff by comparing arbitrary old/new states.
  Domain transitions should name meaningful changes and their safe presentation.
- Do not introduce React/Vue, canvas UI, a global animation library, or per-card
  listeners for these improvements.
- Do not replace the current target-selection patch; extend its local-update pattern.

## 10. Proposed UX, accessibility, and performance invariants

These are proposals for a later focused `AGENTS.md`/CI change; this audit does not
edit either.

### UX and architecture

1. A renderer consumes authoritative availability, preview, and transition result
   models; it does not recalculate cost, chance, damage, duration, care, transaction,
   or eligibility rules.
2. Every meaningful action exposes its observable result in the current context or a
   durable surface. No required understanding depends on manually comparing screens.
3. Every new fact, preparation, relation change, item, wound, status, and discipline
   has an owned contextual-knowledge reference.
4. Choice content classifies guaranteed, estimated, and hidden information. A UI
   improvement may not reveal hidden outcomes.
5. Full-screen navigation focuses the new title. Local interaction preserves focus or
   moves it to a documented logical destination.
6. Dismissing a result/disclosure returns focus to its invoker or the next meaningful
   control.
7. Battle announcements contain only the new exchange, not the retained Witness tail.
8. Mobile compaction preserves all information and functionality behind explicit
   semantic disclosure.

### Accessibility

1. No meaningful normal text is below 4.5:1 contrast; no meaningful UI boundary/focus
   indicator is below applicable non-text contrast.
2. Every pointer explanation has keyboard and explicit tap access.
3. No disabled or locked action relies on hover or `title` to explain itself.
4. Principal actions target at least 44×44 CSS px; all targets meet WCAG 2.2's
   24×24 minimum or a documented exception/spacing rule.
5. Every animated interaction has a reduced-motion equivalent that preserves the
   final state and textual delta.
6. Fixed/sticky UI may not obscure keyboard focus at 320% zoom or supported mobile
   breakpoints.
7. Page title, headings, landmarks, and live messages identify the active game
   context.

### Performance

1. Local hover/focus/selection/disclosure uses no whole-app render and retains p95
   handler below 4 ms and visual update below 20 ms on the established software
   cohort.
2. Meaningful transitions retain handler ≤16.67 ms and next-paint ≤34 ms.
3. Ordinary motion is ≤200 ms, emphasized result motion ≤300 ms, and compound
   interaction remains ≥58 Hz with no frame over 33 ms.
4. Motion introduces no continuous timer/loop and repeatably zero idle script after
   settling.
5. No per-card/row listener; root delegation remains the default.
6. No forced compositing or new large raster without a same-cohort experiment.
7. Long-list optimization requires keyboard, find-in-page, screen-reader, DOM,
   memory, and frame-pacing evidence together.

### Proposed automated scenarios

- Keyboard-only: create character, perform optional action, inspect/dismiss reward,
  enter battle, select target, act, open/close Journal, equip/use/treat, claim
  advancement, inspect post-death body, begin another testament.
- Focus assertions after every delegated action, including when the trigger is
  removed.
- Touch emulation for reward/status/wound/skill disclosures and 320/360 px header.
- Reduced-motion screenshots and computed-style assertions.
- One new-Witness-entry announcement per combat action.
- Contrast scan plus manual gradient/disabled-state review.
- Long fixtures: 80 current Witness events, 100/500 Journal entries, 100 item stacks,
  maximum wounds/scars, several factions and objectives.
- Rapid disclosure/result/targeting/equipment sequences under the established
  performance trace.

### Subjective playtest questions

These should not be converted into brittle automation:

- Can the player explain why each currently available choice exists in the scene?
- Can the player distinguish a certain cost, an estimated risk, and an unknown result?
- After acting, can the player say what changed without opening another screen?
- Can the player find an acquired item, preparation, fact, or faction consequence
  again a minute later?
- Does combat motion clarify cause and effect without slowing decision cadence?
- Does the mobile summary establish danger before requiring a long dossier read?
- Do disclosures help comprehension without flattening mystery or giving away future
  scenes?
- Across repeated runs, does the Journal describe this testament rather than expose
  the content-selection machinery?

## 11. Method, sources, and validation status

### Repository reads and scans

The audit used read-only `rg` searches across:

```text
AGENTS.md
docs/architecture.md
docs/performance-deep-dive.md
docs/quality-architecture-audit.md
docs/world.md
docs/replayability.md
index.html
src/ui/app.ts
src/ui/render.ts
src/ui/shell-render.ts
src/ui/story-render.ts
src/ui/result-render.ts
src/ui/battle-render.ts
src/ui/combatant-render.ts
src/ui/advancement-render.ts
src/ui/ending-render.ts
src/ui/inventory-render.ts
src/ui/inventory/*.ts
src/ui/journal-render.ts
src/ui/wound-presentation.ts
src/styles/*.css
src/styles/inventory/*.css
src/game/types.ts
src/game/content/*
src/game/road-events.ts
src/game/journal.ts
src/game/world.ts
src/game/statuses.ts
src/game/inventory-engine.ts
scripts/trace-performance.mjs
```

Representative commands:

```text
rg -n "^" <required report and source files>
rg -n "^#{1,3} " docs/*.md
rg -n "transition|animation|focus|hover|tooltip|disabled|sticky|overflow|@media|prefers-reduced" src/styles -g "*.css"
rg -n "aria-|role=|tabindex|title=" src/ui -g "*.ts"
rg -n "message:|return \{ state" src/game/inventory-engine.ts src/game/engine.ts src/game/engine -g "*.ts"
rg -n "detail:|signal:|mode:|skill:|tradition:|outcome:" src/game/content src/game/road-events.ts -g "*.ts"
```

Contrast ratios were calculated from the current hex tokens using the WCAG sRGB
relative-luminance formula. They are token-pair evidence; final composited surfaces
still require browser inspection.

### Primary external sources

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- [WAI content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus)
- [WAI role=status technique](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22)
- [WAI focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using)
- [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [MDN `startViewTransition`](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)
- [web.dev high-performance CSS animations](https://web.dev/articles/animations-guide)

### Validation status

- Production source changed: **none**.
- Audit deliverable created:
  [`docs/ux-experience-audit.md`](ux-experience-audit.md).
- Live browser inspection: **not completed**. The current in-app browser connection
  timed out once during bounded setup; the audit did not spend further time on it, as
  requested. Findings marked observed are grounded in current source, tests, measured
  reports, or supplied screenshots; experience proposals and scale risks are
  identified as recommendations or experiments.
- Automated project checks: **not rerun**, because the only repository change is this
  Markdown report and the required reports already record the current 181-test,
  architecture, build, and performance baseline.
