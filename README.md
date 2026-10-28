# Necromancer

A turn-based, narrative-driven RPG with hardcore elements, set in the rain-black land of Maldirin.

This repository is the clean successor to three earlier prototypes. It keeps their best ideas—the prototype necromantic practices, narrative scenes, tactical effects, equipment-minded domain design, and local saves—without carrying forward their UI framework or unfinished integration code. See [the lineage analysis](docs/lineage.md) for the full comparison.

The full game is conceptually committed to five starting practices: Medium,
Bonebinder, Renderer, Grave Warden, and Ferryman. The currently playable three
remain a proving-ground implementation rather than the final taxonomy. See
[the accepted practice roster](docs/practices.md).

## What is playable

The opening testament is a compact vertical slice:

1. Name a character and choose Medium, Bonebinder, or Renderer.
2. Make a preparation choice at the Weary Traveler.
3. Choose how to open an encounter on the ossuary road.
4. Survive a deterministic, turn-based fight with accuracy and evasion, action-specific misses, tradition abilities, temporary statuses, hit locations, armor, wound trauma, and lasting wound bleeding.
5. Salvage weapons, armor, treatment supplies, and ritual materials.
6. Carry the same body and inventory through consequence-bearing aftermath scenes, including non-exclusive optional discoveries with featured outcomes and a practice-specific preparation. Renderers can risk processing Hollis beside the road for a seeded material yield; witnesses can carry evidence of the act to the county reeves.
7. Reach Level II and spend a discipline point in a three-branch skill tree, then open dependent Level III techniques as the testament continues.
8. Make a recovery-versus-surprise tradeoff. Convalescence stabilizes injuries, improves previously stabilized wounds, closes minor wounds into persistent scars, and restores body-part condition; field dressing an open injury is a seeded Medicine attempt, while closed injuries require safe rest.
9. Descend into Saint Orra’s vault for a second encounter with a distinct attack cadence and new equipment.
10. Claim a Level III discipline, sell obsolete spoils to the reliquary broker, buy treatment with black obols, and decide whether Saint Orra’s altar is worth the time it gives the escaped names.
11. Meet a seeded friendly or neutral road interlude, then face one of five wake encounters spanning incorporeal manifestations, physical dead, reliquary poachers, and a reeve patrol. Each wake has its own scene, roster, cadence, rewards, escape text, and ending.

Characters use six familiar attributes—Strength, Dexterity, Vitality, Intelligence, Willpower, and Charisma—plus ranked mundane skills such as Medicine, Survival, Perception, Persuasion, Barter, and Athletics. Health is the life counter; Vitality contributes to its maximum; Spirit is the spendable occult pool. Tradition-specific occult aptitude, physical power, defense, escape, carrying capacity, Ward from Brace, and field dressing all derive through one typed character-rules module.

Experience advances through widening level thresholds and is reflected immediately in the character dossier. Discipline points are derived from level, while node costs, prerequisites, branches, and mechanical modifiers remain data-driven and validated at startup. Advancement decisions never interrupt combat or replace a featured narrative outcome. Maximum-resource increases also fill the newly created capacity. Seeded attacks, skill checks, encounter selection, road-event selection, and uncertain material recovery remain reproducible, while persisted event history excludes repeats until a pool is exhausted.

Progress autosaves to a v4 browser save after each meaningful action. The v4 boundary adds world facts, faction knowledge, personal and faction standing, and regional pressures without collapsing them into a global morality score. V3 saves receive an empty world memory; v2 saves also migrate Focus to Spirit and receive starting attribute and mundane-skill profiles; v1 testaments retain their character, outcome, starting equipment, and earned victory loot.

## Development

Requirements: Node.js 20.19 or newer.

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm test
npm run build
npm run check
npm run preview
npm run perf:trace
npm run perf:trace:gpu
npm run perf:trace:gpu:chrome
npm run perf:trace:gpu:wpr:probe
npm run perf:trace:gpu:wpr:probe:admin
npm run perf:trace:gpu:chrome:experiments
npm run perf:trace:gpu:repeat
npm run perf:trace:local:repeat
npm run perf:trace:gpu:chrome:repeat
npm run perf:trace:gpu:chrome:stats:repeat
npm run perf:trace:gpu:deep
npm run perf:trace:gpu:experiments
npm run perf:trace:gpu:experiments:repeat
npm run perf:trace:gpu:inventory:repeat
npm run perf:trace:120:probe
npm run perf:trace:120
npm run perf:trace:120:repeat
npm run perf:trace:120:diagnostic
npm run perf:trace:120:delivery
npm run assets:optimize:items
```

The production build is emitted to `dist/` with relative asset paths, so it can be hosted at a domain root, a subdirectory, or GitHub Pages.

`npm run perf:trace` builds the production client, starts an isolated
preview server, and drives a representative opening-to-combat path in
headless Chromium. It writes a compact metrics report, a full Playwright
trace, and a final screenshot to `output/playwright/`. The report includes
navigation and paint timing, layout shift, long tasks, transfer size, DOM
and heap size, Chromium script/style/layout time, and next-paint timing for
individual interactions. It also alternates battle targets through sixty
painted updates to report sustained paint cadence, p95 frame interval, and
slow paints. A combined stress pass sends rapid wheel input in both
directions while changing battle targets, recording scroll range, effective
frame rate, p95 frame time, and frames over 20/33 milliseconds. Finally, a
quiet two-second window records idle main-thread work before forced garbage
collection reports retained heap, documents, DOM nodes, and event listeners.
This default run deliberately preserves the established Playwright headless
software-rendering cohort.

`npm run perf:trace:120` opens installed Chrome on the active display and
requires hardware rendering plus an observed cadence of at least 114 Hz. It
drives 720 target changes and 720 combined target/scroll frames, enforcing the
application-owned 8.33 ms budget through handler tails, average Chrome task,
script, style/layout work per frame, and app-attributed Long Tasks/Long
Animation Frames. Physical delivery remains visible as p95/p99 cadence, missed
opportunities, and bounded stall attribution. It is reported separately because
Windows scheduling, DWM, focus/occlusion, driver work, and other applications can
pause presentation without running game script.

`perf:trace:120:repeat` performs five isolated active-display runs and requires
every run to satisfy the application-work gate. `perf:trace:120:delivery` adds a
strict 99.5% aggregate physical-delivery requirement for a controlled, quiet,
foreground machine. `:probe` does not require a high-refresh display, and
`:diagnostic` captures an advisory narrow Chrome frame trace; traced and clean
results must not be aggregated. Energy saver, backgrounding, remote display
bridges, or a 60 Hz desktop can make the environment ineligible without making
the application fail.

`npm run perf:trace:gpu` runs the same path through Chromium's hardware-capable
headless channel and writes separate artifacts to `output/playwright-gpu/`.
Both reports record the observed graphics device, driver, ANGLE/backend
metadata, feature status, and diagnostic GPU-process CPU deltas for the active
workload and quiet window. On Windows, that command also keys the built-in
`GPU Engine` and `GPU Process Memory` performance counters to Chromium's GPU
process. It reports aggregate and busiest-engine utilization plus dedicated
and shared process memory. Aggregate engine utilization can exceed 100 because
independent engines are summed; it is not the same measurement as GPU-process
CPU. Missing or localized counters, insufficient permissions, process
replacement, and unsupported operating systems produce an explicit
unavailable, unsupported, or unreliable diagnostic instead of failing the
benchmark.

On Windows with the Windows Performance Toolkit installed,
`npm run perf:trace:gpu:wpr:probe` captures a narrow DxgKrnl allocation trace and
correlates it with Chromium MemoryInfra. Kernel GPU tracing requires the Windows
**Profile system performance** privilege. The ordinary command never requests
elevation: it runs from an already elevated terminal or fails immediately with
guidance. Only the explicitly named `:admin` variant opens UAC, once, and its
elevated child performs capture, probe, ETL save, and analysis before returning.
The profile records allocation lifetimes and a one-time segment map, not broad GPU,
CPU, disk, or stack events. Its `vidmm-summary.json` reports unique live committed
VidMm allocations; these are not asserted to be simultaneously resident bytes.

`npm run perf:trace:gpu:chrome` selects the installed Google Chrome channel;
its repeat variant runs the same browser five times. The harness also accepts
`--browser-channel=<playwright-channel>` or
`--browser-executable=<absolute-path>`. Every report records the observed
browser product and version plus the selected channel or executable path, and
the browser source is part of `cohort.id`, so installed Chrome measurements
cannot be aggregated with bundled Chromium or SwiftShader results.

`npm run perf:trace:gpu:chrome:experiments` runs the paired GPU experiments in
installed Chrome. `npm run perf:trace:gpu:chrome:stats:repeat` limits a
five-run cohort to the Stats idle, entrance-motion, shadow, and offscreen
containment phases.

The hardware run also records controlled phase diagnostics. It measures a
blank-page idle control, title-screen idle, battle idle, sustained target
switching, and compound scrolling plus targeting. Every phase receives a fresh
browser process so earlier pages and GPU caches cannot contaminate later memory
samples. Each phase reports its absolute values and deltas from both browser
idle and application idle. Targeting and compound scrolling also receive
MemoryInfra dumps immediately after the measured window, after 2 seconds, and
after 10 seconds. The report keeps a bounded, explicitly non-additive list of
the largest GPU-process allocator nodes so transient Skia work can be separated
from longer-lived shared images without manufacturing a total.
The report attempts experimental Chromium layer-tree snapshots and records an
explicit unavailable state when the active headless channel does not expose
them. Independent surface auditing still records document geometry and the
count and CSS-pixel area of fixed, sticky, gradient, filtered, shadowed, and
paint-contained elements. Any derived RGBA byte figure is only an area proxy:
it is not claimed as an allocation count or exact GPU memory use.

The representative path records a cold request graph at title, creation,
opening, battle, and post-combat checkpoints. Each resource belongs to the
first checkpoint that observed it. Stage budgets are advisory while the
existing whole-path transfer threshold remains the enforced gate; this makes
bootstrap leakage visible before a content pack or optional screen silently
consumes the shared startup budget.

The title is an explicit admission boundary. It reads only bounded save-envelope
metadata and does not fetch the playable runtime until the player chooses Start or
Continue. `check:ui-contracts` verifies both the cold absence and post-intent arrival
of that runtime, while the performance trace charges its transfer and interaction
latency to character creation rather than navigation.

`npm run perf:trace:gpu:repeat` performs five isolated hardware runs without
the redundant Playwright trace pass and writes a median, p90, maximum, and
median-absolute-deviation summary beneath
`output/playwright-gpu/repeated/`. `npm run perf:trace:gpu:deep` performs
fifteen runs for threshold calibration. A summary refuses to aggregate reports
whose cohort IDs differ.

`npm run perf:trace:local:repeat` performs the same five-run distribution
analysis for Character Stats, discipline-tree construction, story, inventory,
and servant-direction mutations. It also attributes clone, serialization, and
storage time directly and runs repeated Stats open/close GC cycles. It
requires every one of the 24 collected cycles to return node and document
counts exactly to baseline. Retained heap above 200 KB is reported as an
advisory and above 300 KB fails the established software-rendering gate; the
current calibrated peak is roughly 121 KB. The repeated summary exposes final
and peak retained heap, maximum node/document deltas, and warning/failure
counts so stability is visible across the cohort. It
retains completed reports that exceed an individual gate so host-contention
outliers remain visible instead of discarding the cohort; the ordinary
`npm run perf:trace` command remains the strict failing gate.

`npm run perf:trace:gpu:experiments` adds paired inventory-art,
offscreen-containment, sticky-dossier, grid-containment, and defeated-card
filter experiments. The repeat command runs the same set five times;
`perf:trace:gpu:inventory:repeat` limits repetition to the inventory phases
when validating item-art changes. Surface reports include each raster asset's
intrinsic dimensions and theoretical decoded RGBA size, clearly labeled as an
upper-bound rather than a measured allocation. `assets:optimize:items`
deterministically resizes the item sheets to 256-pixel cells, sufficient for
the largest current presentation at 2x display density.

Windows `GPU Process Memory` values remain trend diagnostics rather than exact
per-application ownership totals. Chromium MemoryInfra supplies browser-owned GPU
allocator bytes; the WPR/VidMm trace supplies OS allocation-lifetime evidence.
Neither should be substituted for the other or summed. The GPU values are not
regression gates: compare them only between reports
with the same `cohort.id`. A requested hardware run that observes SwiftShader,
another software renderer, or an unknown rendering class writes
`performance-cohort-rejection.json` and fails before collecting measurements.
The accepted hardware report keeps
frame pacing, next-paint latency, long tasks, CPU, and memory visible as its
primary portable assessment, but initially treats failed checks as advisory
until repeated runs establish same-cohort thresholds. The established default
software-rendering cohort remains the enforced performance gate.

Open the trace with:

```sh
npx playwright show-trace output/playwright/performance-trace.zip
```

The hardware-cohort trace, report, and screenshot use the corresponding
`output/playwright-gpu/` directory.

To trace an already-running production build instead, pass its URL:

```sh
npm run perf:trace -- --url=http://127.0.0.1:4173
npm run perf:trace:gpu -- --url=http://127.0.0.1:4173
```

## Architecture

There are no runtime dependencies and no component framework.

- `src/game/` is the pure TypeScript game domain: content, character attributes and mundane skills, encounter and road-event definitions, the world and faction model, anatomy and materiality, items, progression, advancements, structured Witness events, state transitions, seeded randomness, combat, and persistence.
- `src/ui/` renders semantic HTML and translates delegated browser events into game actions.
- `src/styles.css` owns the responsive visual system.
- `src/game/*.test.ts` verifies the engine without a browser or DOM emulator.

The UI is deliberately replaceable. If the game eventually needs a richer component model, the domain layer can move under React, Vue, Lit, or another renderer without a rewrite. See [the extension architecture](docs/architecture.md) for the boundaries new features should preserve, [the accepted practice roster](docs/practices.md) for the target necromancer identities, [the world foundation](docs/world.md) for the setting and consequence model, and [the replayability target](docs/replayability.md) for the route-and-event direction.

## Current boundary

The current systems slice includes eight narrative scene nodes, three encounter stages, five seeded final-encounter variants, a three-entry friendly/neutral road-event deck, three tradition-specific aftermath interactions, non-exclusive scene actions with distinct risk and tradeoff signals, featured action outcomes, a persisted world model that separates deeds from who knows them, seeded body-material recovery with witness risk, six core attributes, six mundane skills, Spirit, accuracy and evasion, action-specific misses, structured defeat transitions, structured and preserved combat transcripts, anatomy profiles for people, quadrupeds, and manifestations, materiality-aware physical and occult damage, persistent wounds with explicit combat and recovery consequences, Medicine-based field dressing, safe-rest care, convalescence, scars, location-specific armor, weapon trauma, meaningful paired off-hand attacks, equipment replacement comparisons, seven equipment slots, eighteen item definitions, offensive-versus-defensive charm sidegrades, a sell-and-resupply reliquary market, treatment supplies, three loot tiers, attribute-derived encumbrance and resource visibility, widening level thresholds, a validated Level II–III discipline tree, an opt-in two-cue ambient music cycle, and compatible v1/v2/v3-to-v4 save loading. Alternate opening problems, a full region route graph, a repeated camp loop, general crafting, a longer campaign, adaptive scene scoring, and expanded browser-level accessibility testing remain beyond this slice.
