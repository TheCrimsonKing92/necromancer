# Agent working agreement

This repository is a lean browser RPG. Preserve its authored atmosphere, deterministic rules, and responsive UI while adding breadth. Read `docs/architecture.md` before changing engine, rendering, persistence, or performance-sensitive code.

## Architectural boundaries

- `src/game/engine.ts` is the public transition facade and story coordinator. Combatant factories, battle openings, player actions, round lifecycle, shared battle state, and public battle transitions live under `src/game/engine/`. Do not add another self-contained subsystem directly to the facade; add it to the focused domain and re-export stable public operations when compatibility helps.
- Inventory, equipment, treatment, and market transitions belong in `src/game/inventory-engine.ts`. Pure attack, defense, accuracy, and evasion calculations belong in `src/game/combat-math.ts`.
- `anatomy.ts` is a compatibility facade. Body definitions, wound language, wound creation, consequences, and recovery live in focused modules under `src/game/anatomy/`.
- `enemy-actions.ts` composes intent from the typed technique and cadence catalogs under `src/game/enemy-actions/`. Add mechanics/telegraphs as technique data and cadence IDs, not enemy-ID switch branches.
- Damage rolls, mitigation, body-condition loss, wounds, and defeat causes belong in `src/game/damage-resolution.ts`. Authored Witness phrasing does not.
- Repeatable authored text belongs in typed catalogs beside the concept that owns it. Combat action hit/miss language belongs in `combat-action-narration-catalog.ts` and is composed by `combat-action-narration.ts`; do not add prose switches to the engine or Witness formatter. Use explicit aliases for techniques that intentionally share language, and add catalog tests with new actions.
- `src/ui/render.ts` is the stable screen dispatcher and re-export facade. Battle, story, advancement, ending, result-card, and combatant/dossier composition live in their named render modules under `src/ui/`. A new screen, modal-sized surface, or cohesive page section gets its own renderer. Render modules consume domain selectors; they do not reproduce rules.
- `src/ui/inventory-render.ts` is the inventory facade; equipment, pack/item cards, anatomy, and market markup live under `src/ui/inventory/`. Wound consequence wording shared by screens belongs in `src/ui/wound-presentation.ts`.
- Shared HTML helpers and presentation-only selectors belong in small UI modules such as `html.ts` and `player-presentation.ts`. They must not mutate game state.
- `src/ui/app.ts` owns browser event delegation, targeted DOM updates, and persistence wiring. Eligibility and game outcomes belong to the game layer.
- Definitions belong with their domain (`items.ts`, `encounters.ts`, `advancements.ts`, and so on). Avoid parallel lookup tables in the renderer or app.
- `content.ts` and `persistence.ts` are stable facades. Route content belongs under `src/game/content/`; save schema, validation, compatibility defaults, and version migrations belong in separate modules under `src/game/persistence/`.
- Persisted fields require normalization/migration coverage. Seeded outcomes must remain reproducible after save/load.

Prefer dependency flow:

`content/definitions -> pure domain rules -> transition modules -> render modules -> app`

Do not import UI modules from `src/game`, or `app.ts` from a renderer. Avoid cycles and “misc”, “helpers”, or “utils” dumping grounds; name a module for the concept it owns.

## Size and extraction rule

Run `npm run check:architecture`. Ordinary TypeScript implementation modules have a 650-line ceiling and component stylesheets an 800-line ceiling. Known aggregation files have explicit shrinking ceilings in `scripts/check-architecture.mjs`.

Those ceilings are guardrails, not healthy target sizes:

- Aim for roughly 150–450 lines for a domain or renderer.
- When editing `engine.ts`, `render.ts`, or `styles.css`, leave it no larger unless the change is a small coordination edit.
- If a feature needs a large switch branch, repeated markup, or several new private helpers, extract the cohesive concept during the same change.
- Do not encode bulk authored data as control flow. Prefer typed records plus small selectors/formatters; reserve a switch for a genuinely different algorithm or state transition in each branch.
- Lower a grandfathered ceiling after an extraction. Do not raise a ceiling merely to make CI pass.

Tests may be longer when a table of cases makes behavior clearer, but split unrelated behavior into domain-specific test files.

## Behavior-preservation contract

Existing observable behavior is a compatibility contract unless the user explicitly asks to change it. A refactor, extraction, optimization, or new feature does not authorize an incidental change in rules, authored meaning, presentation, accessibility, loading order, persistence, or input behavior.

- Before changing an existing path, identify the behavior being preserved at its real seams: domain result, save/load normalization, rendered semantics, required styles/assets, delegated interaction, keyboard/touch access, and focus/announcement behavior. Add characterization coverage first when a seam is not already protected.
- Treat lazy-loading boundaries as public APIs. Markup must never render before every style, event handler, asset, and domain capability required to make it usable. Shared or always-rendered components belong in the eager delivery graph; feature-private presentation may remain lazy only when its loader completes before rendering it.
- Test the state in which an optional bundle has *not* loaded, not only the state after visiting every surface. Cold start, continued save, first battle, post-death, combat/noncombat, and loaded/unloaded optional surfaces are distinct compatibility states when the feature touches them.
- Preserve behavior through end-to-end feature ownership. Definitions, rules, transitions, narration, rendering, styling, interaction wiring, persistence defaults/migrations, and focused tests should land together. A component split is incomplete if one of those responsibilities is stranded behind another feature's loader.
- Prefer contract assertions over implementation snapshots: deterministic rule outcomes, semantic markup, computed interaction state, accessible names, focus restoration, and intentional visual baselines. Use a narrow screenshot when appearance itself is the contract; do not rely on screenshots alone for behavior.
- Update or remove an existing assertion only when the intended contract changed. If a test fails because it encoded incidental wording or ordering, replace it with an assertion for the underlying player-facing promise rather than simply weakening it.
- For any changed journey, verify both what should now happen and what must remain unchanged. Record intentional behavior changes in the handoff; silence means compatibility was preserved.

## Rendering and performance invariants

The current interaction/performance pass is considered a baseline:

- Keep delegated event handling; do not attach a listener to every rendered card.
- Prefer a targeted DOM update for hover, targeting, disclosure, and other local interaction state. Do not re-render the application for pointer movement or scrolling.
- Route authoritative transitions that retain the same screen identity through that screen's DOM patcher. A success notice is an independent update and must not force a full application render; retain full renders for navigation or a failed structural patch contract.
- Preserve the UI context contract in `focus-management.ts`: page focus for navigation, result focus for in-scene outcomes, and semantic-key restoration for local mutations. Keep active Witness history non-live and announce only new entries through the persistent app channel.
- Use explicit keyboard/touch-capable disclosure for known rules and rewards. Never make `title` the only source of an unavailable reason or important context. Motion must be bounded, purposeful, and reduced-motion-safe.
- Treat graphical and isometric scenes as semantic projections of domain state. Coordinates are presentation only; never infer range, access, eligibility, or outcomes from DOM geometry. Visual acts must invoke stable domain/story action IDs, and every persistent visual delta must project back from authoritative state.
- Give every graphical subject and action an ordered keyboard/touch equivalent with the same names, rules, and unavailable reasons. Do not introduce pixel-only discovery, drag-only control, or a second hidden action system. Keep noncanonical proof scenes and their art/styles behind lazy development admission until deliberately promoted.
- Do not read layout after writing layout in the same input/scroll loop. Batch unavoidable visual work with one `requestAnimationFrame`.
- Keep scroll/touch listeners passive when they do not cancel input.
- Do not introduce continuous timers, animation loops, or ambient effects that run while nothing changes.
- Treat 8.33 ms as the high-refresh frame budget. High-frequency selection and targeting feedback updates immediately instead of restarting a transition on every input. For infrequent motion, prefer bounded opacity or transform; do not animate width, padding, background, or shadow on a repeated input path. Never add blanket `will-change` or forced layer promotion.
- Load item art and other screen-specific assets only where displayed. Production inventory art is a per-item 256px WebP rendered through a native lazy, async-decoded `<img>`; the larger sprite sheets are source masters, not runtime presentation. Regenerate candidates with `npm run assets:experiment:items`, publish only after visual review with `npm run assets:publish:items`, and run `npm run perf:trace:gpu:experiments:repeat` after changing production art delivery.
- Treat the eager request graph as a scarce shared budget. `scripts/performance-cold-resource-budget.mjs` is the source of truth: every cold checkpoint has hard incremental limits for encoded payload, request count, and observed transfer derived from those two values. A new capability may consume its owning stage's existing headroom; increasing a stage requires a named capability owner, evidence that it must load there, before/after request-graph measurements, and proof that no optional sibling became eager. Do not replace these stage gates with a snapshot-sized aggregate limit. New practices, regions, journals, inventories, and authored catalogs do not belong in bootstrap merely because their data is static. Load a typed content pack at a stable transition before its first use, then keep gameplay synchronous while that pack is active.
- Optional surfaces are independent delivery units. Opening Stats must not fetch Inventory or Journal code or styles, and the inverse applies to those screens. Keep a cold-resource browser contract for every optional surface; a warm-cache test is not evidence of isolation.
- Treat manual chunk groups as measured delivery policy, not a generic deduplication tool. A group may collect small pure modules used together, but broad "shared" groups are forbidden unless cold-resource contracts prove they do not pull optional content back into bootstrap. Compare transfer count, bytes, and cold interaction latency after every grouping change.
- Repeated open/close or enter/leave interactions must return DOM document/node counts to baseline. Add a bounded lifecycle experiment for a new persistent overlay or optional surface, and make retained growth beyond its documented allowance fail the performance gate.
- Keep domain selectors pure and avoid repeated whole-state cloning outside a transition boundary.
- Do not replace a clear transition-boundary state clone with incremental mutation on intuition alone. Reconsider it only when representative traces show clone, serialization, or storage medians above 2 ms or meaningful retained-memory pressure; preserve deterministic transition semantics during any such change.
- A material change to rendering, scrolling, asset loading, or input handling requires `npm run perf:trace` in addition to the normal checks. Its threshold assessment is a failing gate. Also compare compound-load tail, frame pacing, long tasks, CPU, and memory with the existing report; do not trade one metric away silently.
- A material change to battle targeting, hot-path motion, or rapid scrolling also requires `npm run perf:trace:120` on an eligible active display. Keep application-work failures distinct from host/compositor delivery gaps; both remain visible, and only evidence may classify them.
- Use `npm run perf:trace:deep` for changes to content delivery, persistence shape, optional-surface lifecycle, or broad rendering architecture. It adds Long Animation Frame/Event Timing attribution, byte coverage, exact 100KB–1MB save phases, valid worst-case surfaces, and a 1,000-interaction warm lifecycle soak. The soak must release all nodes and documents, stay below 750KB total retained heap and 250KB second-half growth, and keep its cycle p95 below 150ms. A short cohort reports p95/p99 and a failure-confidence interval; do not call one clean median proof of a stable tail.
- Keep current synchronous persistence only while representative operations remain below 2ms p95. The scale cohort currently crosses that operation budget at roughly 500KB; reaching that range requires an async storage/serialization design review rather than raising the threshold.
- Dynamic JavaScript imports delay module cost but do not make admitted modules unloadable. Put large releasable authored catalogs in validated fetched data, keep executable packs small, and permit an autosaved chapter/region document reload when it is the cleanest way to bound long-session JS, style, and GPU residency.

## Validation

Player-facing prose is part of the behavior contract. When adding or editing it,
trace pronouns to their intended nouns, read conditional/interpolated variants as
complete sentences, and verify the copy in its rendered context. `check:prose`
is a high-confidence guardrail for objective defects and known referent hazards;
do not broaden it with noisy rules or treat a green result as semantic review.

For ordinary changes, run:

```text
npm run check
```

For material interaction or rendering work, also run:

```text
npm run perf:trace
```

`npm run check` includes cold-load browser contracts. Add a focused browser contract when correctness depends on computed styles, lazy delivery, hover/focus behavior, or another condition that string-render tests cannot observe.

Add focused tests when extracting a rule. Structural moves should preserve public imports through a facade where practical and must not change authored behavior incidentally.
