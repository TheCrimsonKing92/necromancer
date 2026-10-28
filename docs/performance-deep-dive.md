# Performance deep dive

Date: 2026-07-26

This audit covers the current lean browser client and the expected growth described in
[the architecture](architecture.md), [the world foundation](world.md), and
[the replayability target](replayability.md). It is deliberately aggressive about
finding further headroom. No recommendation is allowed to remove or dilute authored
content, deterministic outcomes, accessibility, atmosphere, result continuity,
persistence, replay variation, wounds and anatomy, inventory depth, world simulation,
or future campaign breadth.

## How to read the evidence

The report uses four evidence labels:

- **Measured** means a repository benchmark or build produced the number.
- **Observed** means the implementation directly establishes the behavior.
- **Source-backed principle** means browser or standards documentation establishes the
  general mechanism, but not its exact cost in Necromancer.
- **Hypothesis** means the implementation has a plausible future scaling cost that has
  not yet appeared in a representative measurement.

Geometry and theoretical decoded RGBA sizes are not GPU allocations. Windows GPU
process counters are not portable browser metrics. Hardware results are compared only
when the complete cohort ID matches.

## 1. Executive findings and current baseline

### Headline

The current opening slice is fast, quiet when untouched, and unusually economical for
an authored game UI. The architecture already avoids the common expensive mistakes:
there are no runtime dependencies, no per-card event listeners, no pointer-driven
whole-app rerender, no continuous animation loop, no web-font download, and no blanket
layer promotion.

The strongest future risks are not current frame-rate defects:

1. Authoritative transitions still perform a whole-state `structuredClone`, whole-save
   `JSON.stringify`, and synchronous `localStorage.setItem`. Stable screens already
   patch owned regions instead of replacing the whole application, but the state and
   save costs still grow with campaign breadth.
2. The title no longer parses the playable engine: explicit admission reduced cold
   title transfer to about 12.4 kB. The admitted playable runtime remains a cohesive
   85.0 kB gzip chunk, so future regions still need typed content-pack boundaries
   rather than returning every campaign catalog to that chunk.
3. World and campaign membership is represented by persisted arrays and queried with
   repeated `includes`, `find`, `some`, and prefix scans. The present arrays are tiny.
   A long campaign containing many facts, relationships, preparations, and route
   histories will make some selectors approach quadratic work.
4. The deep gate now exercises schema-valid worst-case Battle, Inventory, Journal,
   Stats, and long-lived optional-surface state. Mobile geometry, alternate browser
   engines, and a genuinely multi-region campaign remain future evidence gaps.

The correct response is staged measurement and scalable boundaries, not a framework
rewrite or a reduction in features.

### 2026-08 high-standard addendum

The local audit now goes substantially beyond the original baseline. Run
`npm run perf:trace:deep` to capture the current report; the 30- and 100-run
commands are `perf:trace:deep:repeat` and `perf:trace:nightly`.

- The explicit title bootstrap transfers 12,443 bytes in the latest deep trace,
  down 87.5% from the former 99,766-byte eager title. Start admits one 84,826-byte
  playable chunk; the full representative path is 97,269 bytes, 2,497 bytes smaller
  than the former eager path while preserving the existing 100,250-byte gate. The
  same run sustained 60.2 paint samples per second and 60 fps compound scrolling.
- Precise full-path coverage reports 100% of all three fetched JavaScript chunks as
  executed after admission. The cold-title browser contract separately proves that
  `playable-runtime` is absent until Start or Continue. Eager CSS utilization in the
  representative deep run was 67.6%.
- Exact schema-readable save phases remain within the 2 ms operation budget at
  100KB and 250KB. The 500KB phase reached 3.5 ms p95 for synchronous storage and
  the 1MB phase reached 13.7 ms total p95. The architecture trigger is therefore
  evidence-based: review async persistence before saves approach 500KB.
- Valid worst-case saves now cover 80 maximum-length retained Witness entries, six
  combatants, all current statuses, saturated wounds, every item and an open shop,
  dense world state, and a level-10 tree. The warm lifecycle soak completes 1,000
  real optional-surface interactions. Its latest cycle p95 was 100.45 ms; it released
  every node and document, retained 676,272 bytes in total, and added only 148,656
  bytes in the second half. Those are now enforced deep-gate budgets.
- The item loading experiment compared the four runtime sheets (2,592,783 encoded
  bytes; 5,767,168 theoretical decoded bytes) with 21 individually addressable
  WebPs (109,940 encoded bytes total; 5,505,024 theoretical decoded bytes if every
  item becomes resident). Only three lazy candidates loaded initially, totaling
  10,814 bytes. Production inventory art now uses those reviewed 256px WebPs with
  native lazy loading and asynchronous decoding; the sheets remain source masters.
- Bonebinder executable mechanics still enter through a typed content pack after
  practice admission, and optional surfaces remain independently cold. The title is
  now an 8.13KB raw / 3.39KB gzip controller plus 3.20KB raw / 1.47KB gzip lean
  runtime and common CSS; the 277.37KB raw / 85.02KB gzip playable runtime is loaded
  only after intent. A broad shared group remains rejected after it pulled about
  83.5KB back into eager delivery.
- A five-run Stats construction A/B rejected further production complexity. Direct
  fragments saved 8% task time while slightly increasing allocation; render-once
  keyed markup saved 20.7% task time but only 1.76% allocation and retained five
  additional nodes. Neither cleared the adoption gate.

Artifacts: [deep report](../output/playwright/performance-report.json) and
[item-art experiment](../output/item-art-resource-experiment/report.json).

### Current software-rendering baseline

The following is the second of two unchanged software-cohort runs made during this
audit. It passed every enforced check.

| Metric | Current result |
|---|---:|
| Cohort | `software-baseline:software:ffff-ffff:angle-swiftshader:5.0.0:151.0.7922.34` |
| Production JS | 218.79 kB raw / 66.91 kB gzip |
| Production CSS | 40.64 kB raw / 8.23 kB gzip |
| Measured transferred resources | 75,212 bytes |
| Largest Contentful Paint | 80 ms |
| Cumulative Layout Shift | 0 |
| Slowest measured handler | 6.8 ms |
| Slowest measured interaction-to-next-paint proxy | 19.7 ms |
| Target switching | 60.3 paints/s; 18.3 ms p95; 0 over 20 ms |
| Compound scrolling and targeting | 60 fps; 16.7 ms p95; 0 over 20/33 ms |
| Long tasks | 0 |
| Idle main-thread task time | 2.1 ms in 2 seconds; 0 ms script |
| Retained JS heap after forced GC | 2,045,884 bytes |
| Live DOM after forced GC | 1 document, 676 nodes, 15 JS listeners |
| Final rendered elements | 240 |

Artifact: [`output/playwright/performance-report.json`](../output/playwright/performance-report.json).
The build contains 77 transformed modules and two startup resources. The latest build
completed in 270 ms after type checking.

The immediately preceding unchanged run failed two gates: one next-paint sample was
34.8 ms against a 34 ms ceiling, and the two-second idle window contained 37.57 ms of
task time but 0 ms of script. The rerun returned to 19.7 ms and 2.1 ms respectively.
This is evidence of one-shot process/scheduler noise, not permission to weaken the
ceilings. It does show that CI needs repeated same-cohort diagnostics so a rare miss
can be classified without guessing.

### Current hardware/GPU evidence

The item-art hardware cohort was
`hardware-gpu:hardware:10de-2216:angle-d3d11:32.0.15.9186:151.0.7922.34`,
an NVIDIA GeForce RTX 3080 through ANGLE D3D11. The repeated summaries correctly
refuse to aggregate mismatched cohort IDs.

The item-art pass is the clearest measured optimization:

| Inventory-idle median | Before 256 px cells | After 256 px cells | Change |
|---|---:|---:|---:|
| Dedicated GPU-process memory | 223,158,272 B | 179,499,008 B | -43,659,264 B |
| Shared GPU-process memory | 53,063,680 B | 16,416,768 B | -36,646,912 B |
| Encoded sprite files | 6.90 MB | 2.19 MB | about -68% |
| Theoretical decoded RGBA upper bound | 18.87 MB | 4.72 MB | -75% |

Artifacts:

- [pre-change repeated summary](../output/playwright-gpu/repeated/2026-07-26T23-02-36-002Z/performance-summary.json)
- [post-change repeated summary](../output/playwright-gpu/repeated/2026-07-26T23-18-35-673Z/performance-summary.json)

The paired experiments did **not** justify shipping the other candidates:

- Removing enemy-grid containment reduced measured target-update throughput from
  about 59.4 to 48.5 paints/s.
- `content-visibility` produced noisy memory outcomes, including regressions.
- Static dossier positioning, removal of the defeated-card grayscale filter, and
  removal of action-grid containment did not show a stable material win.
- Folding the fixed viewport texture into the document background increased median
  battle-idle dedicated memory from about 151 MB to 178 MB and was reverted.

These negative results are valuable. They prevent generic CSS advice from replacing
same-cohort evidence.

The later battle-atmosphere attribution used the same RTX 3080, driver, ANGLE D3D11,
and Chrome 151.0.7922.72 cohort for four five-run captures. It isolated the page
background from the dossier and then tested the authored gradients on a capped
pseudo-element:

| Paired battle experiment | Median dedicated-memory change | Interpretation |
|---|---:|---|
| Flat body and dossier | -37,896,192 B (-36.14 MiB) | The combined gradient candidate was material. |
| Flat body only | -32,239,616 B (-30.75 MiB) | The full-page body gradients owned most of the cost. |
| Flat dossier only | -3,665,920 B (-3.50 MiB) | Small and noisy; its p90 crossed above zero. |
| Bounded body atmosphere | -32,043,008 B (-30.56 MiB) | Retained both authored radial gradients while recovering the body-side memory. |

The bounded candidate's five paired values were all lower than its unbounded
baseline; even its p90 was -24,558,251 B. The 1024x711 and 1920x1333 experiments
also moved median dedicated memory by -48,701,440 B and +32,882,688 B relative to
1440x1000, while DPR 2 was within noise. That pattern supports a large CSS-viewport
surface allocation, not a general ban on gradients. Production therefore keeps the
fixed texture, uses a flat body fill, and places the two atmospheric radials on a
fixed layer capped at `min(34rem, 65vh)`.

The final production repeat reported 117,882,880 bytes (112.4 MiB) of Windows
dedicated GPU-process memory at battle idle, with GPU-process CPU at 0.27 ms/s. The
inventory cohort reported 159,457,280 bytes (152.1 MiB) median on a 2,202px document.
Hiding item art changed that counter by only -73,728 bytes median, and the
offscreen-containment candidate saved about 1.9 MiB with a noisy positive upper
tail. Those paired results still show a surface-sensitive cost and rule out the
per-item WebPs as its owner. They do **not** prove that the full 152.1 MiB is an
application texture allocation or that every reported byte is simultaneously
resident.

The later ownership probe supplied the missing absolute context. On the same Chrome
151 / ANGLE D3D11 / RTX 3080 path, a controlled 1440×1000 page with a 2,202px
document reported:

| Evidence source | Bytes | Meaning |
|---|---:|---|
| Chromium MemoryInfra `gpu` owner | 24,091,300 | Chrome's GPU-process allocator ownership |
| Chromium MemoryInfra Skia GPU resources | 9,364,228 | The Skia GPU-resource subtree; already contained within broader ownership |
| DxgKrnl/VidMm peak live allocations | 49,451,008 | Unique live global allocations during the probe, not guaranteed residency |
| VidMm dedicated portion at that peak | 20,103,168 | Allocations assigned to the local-memory segment group |
| VidMm shared portion at that peak | 29,347,840 | Allocations assigned to the non-local/shared segment group |

The standard real-application Chrome run then populated MemoryInfra for every
isolated phase: 9,149,092 bytes at browser idle, 21,372,684 at title/app idle,
25,371,024 at battle idle, 41,282,100 during sustained targeting, and 39,518,148
during compound scrolling and targeting. In the same run, the Windows process
counter ranged from 118,935,552 to 122,408,960 dedicated bytes plus 11,988,992
shared bytes. That direct side-by-side result confirms the counters are observing
different accounting boundaries rather than exposing a hidden 122 MB page-owned
texture set.

The follow-up ownership/decay run explains the active-phase peaks. Sustained
targeting ended at 41,296,272 GPU-owner bytes, fell to 34,414,992 after 2 seconds,
and returned to 25,371,024 after 10 seconds. Its largest changing subtree was
`gpu/shared_images/client_0x5`, not `skia/gpu_resources`. Compound scrolling
ended at 39,532,320 GPU-owner bytes with 23,687,283 bytes under
`skia/gpu_resources`; after 2 seconds Skia had fallen to 51,200 bytes and total
GPU ownership to 35,272,480, then ownership reached 26,883,872 after 10 seconds.
This distinguishes a quickly purged paint-resource spike from a more slowly
released shared-image working set. The allocator nodes are nested and sometimes
aliased, so the report deliberately lists parentage and never sums them.

Cold-request checkpoints exposed a separate startup problem: the software
cohort transferred all 99,766 representative resource bytes by the title screen.
Creation, opening, battle, and post-combat added zero. The eager set included
29,506 bytes of `combat-state`, 9,185 bytes of journal definitions, 5,886 bytes
of item definitions, and 4,795 bytes of encounter definitions. Installed Chrome
reported the same graph plus the 573-byte favicon. The stable app facade imports
engine, persistence validation, and render coordination synchronously, so the
title currently inherits the playable runtime. A 60,000-byte title-stage budget
now reports this as an advisory; it does not replace the existing enforced
whole-path threshold. The appropriate optimization seam is a lean title/save-
metadata bootstrap followed by an explicit playable-runtime admission, not
arbitrary chunk regrouping.

The MemoryInfra and VidMm figures are different accounting layers and must not be
summed. Their scale establishes that the earlier 152.1 MiB process-counter reading
was reasonable as a same-machine trend signal but was not an owned-texture total.
[Microsoft documents](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/gpu-process-memory-counters-report-wrong-value)
that per-process dedicated/shared GPU counters can be incorrect in some Windows
configurations, while its
[VidMm explanation](https://devblogs.microsoft.com/directx/gpus-in-the-task-manager/)
describes why globally shared allocations require system-wide accounting to avoid
double counting. Further long-surface redesign therefore needs a product and
accessibility case plus MemoryInfra/VidMm validation; the process counter alone is
not grounds for pagination or virtualization.

This difference follows Chromium's process architecture. Renderer processes submit
paint and compositing work through Viz and the GPU service rather than owning an
isolated page-sized graphics heap; Chromium's
[process overview](https://chromium.googlesource.com/graphics-book/+/refs/heads/main/src/chrome-architecture--processes-threads.md)
and [Shared Image service](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/gpu/command_buffer/service/shared_image/)
describe the cross-process resource path. The Chrome GPU process is consequently a
shared service/accounting boundary. A Windows counter charged to that process is not
automatically equivalent to this document's authored textures or compositor tiles.

Artifacts:

- [broad battle attribution](../output/playwright-gpu/repeated/2026-08-04T03-54-01-016Z/performance-summary.json)
- [flat-body isolation](../output/playwright-gpu/repeated/2026-08-04T04-05-28-860Z/performance-summary.json)
- [flat-dossier isolation](../output/playwright-gpu/repeated/2026-08-04T04-08-09-743Z/performance-summary.json)
- [bounded-atmosphere validation](../output/playwright-gpu/repeated/2026-08-04T04-11-29-240Z/performance-summary.json)
- [final production GPU repeat](../output/playwright-gpu/repeated/2026-08-04T13-05-14-565Z/performance-summary.json)
- [final inventory GPU repeat](../output/playwright-gpu/repeated/2026-08-04T13-10-55-555Z/performance-summary.json)

## 2. Evidence inventory and blind spots

### What the tooling measures well

[`scripts/trace-performance.mjs`](../scripts/trace-performance.mjs) currently:

- builds and serves the production client;
- verifies graphics metadata and records a cohort identity;
- times individual synthetic clicks through handler completion and a following
  animation-frame/task boundary;
- drives 60 sustained target updates;
- combines wheel input with target changes;
- observes LCP, CLS, and long tasks;
- reads Chromium task, script, style, layout, heap, node, and document counters;
- samples a quiet two-second window;
- forces GC and records retained heap/DOM/listener counts;
- provides an enforced software-rendering gate;
- can isolate browser, application, battle, targeting, scrolling, and paired GPU
  experiment processes.

[`scripts/windows-gpu-diagnostics.mjs`](../scripts/windows-gpu-diagnostics.mjs) and
[`scripts/sample-windows-gpu.ps1`](../scripts/sample-windows-gpu.ps1) add same-process
Windows engine utilization and dedicated/shared memory. The code reports unsupported,
unavailable, process-restarted, or unreliable states rather than manufacturing a
number.

GPU memory now has a three-level evidence hierarchy:

1. [`scripts/performance-memory-infra.mjs`](../scripts/performance-memory-infra.mjs)
   requests one browser-wide explicit dump and reports Chrome-owned `gpu`, Skia, and
   GPU-memory-buffer allocator roots without summing nested aliases. Active phases
   additionally report immediate/2-second/10-second decay and a bounded ownership
   tree with explicit parentage.
2. [`scripts/necromancer-gpu-memory.wprp`](../scripts/necromancer-gpu-memory.wprp),
   [`scripts/capture-wpr-gpu.ps1`](../scripts/capture-wpr-gpu.ps1), and
   [`scripts/wpr-gpu-memory.mjs`](../scripts/wpr-gpu-memory.mjs) record DxgKrnl
   allocation lifetimes, deduplicate VidMm global handles, and classify local versus
   shared segments. This is committed-allocation evidence, not residency.
3. Windows `GPU Process Memory` and engine counters remain inexpensive longitudinal
   diagnostics. They are useful within a matching cohort but are not ownership
   accounting.

The WPR profile is intentionally narrow: the validated probe ETL was 8,257,536 bytes
instead of 521,142,272 bytes from the built-in `GPU.Verbose` profile. WPR kernel GPU
capture requires **Profile system performance** privilege. Normal npm commands never
elevate implicitly; run them from an already elevated terminal or use the explicitly
named `:admin` command for one UAC-gated capture transaction. Do not create a
persistent elevated scheduled task or weaken UAC for this benchmark.

[`scripts/performance-surface-audit.mjs`](../scripts/performance-surface-audit.mjs)
records fixed, sticky, gradient, filtered, shadowed, paint-contained, and raster
surfaces. Its CSS-pixel and RGBA figures are explicitly proxies or theoretical upper
bounds. [`scripts/run-performance-suite.mjs`](../scripts/run-performance-suite.mjs)
provides medians, p90, maxima, and median absolute deviation across isolated runs.
[`scripts/performance-resource-graph.mjs`](../scripts/performance-resource-graph.mjs)
attributes every cold request to its first observed UI checkpoint and keeps transfer,
encoded-body, and decoded-body bytes distinct. Its stage budgets are advisories; the
existing whole-path transfer gate remains authoritative.

This is a strong foundation. Chrome's own Performance Monitor treats CPU, heap, DOM
nodes, listeners, layouts, and style recalculations as useful runtime diagnostics
([Chrome Performance Monitor](https://developer.chrome.com/docs/devtools/performance-monitor)).
Custom `performance.mark`/`measure` spans can also appear in DevTools traces
([Chrome Performance reference](https://developer.chrome.com/docs/devtools/performance/reference/)).

### Important blind spots

1. **One route and tradition.** The enforced path creates a Medium and enters the
   earliest combat. It does not measure tradition-specific UI/action density or later
   encounters.
2. **Short-lived state.** It never reaches the 80-entry Witness cap, a large facts
   ledger, many preparations, many scars, a full pack, or a long route history.
3. **No phase decomposition inside an interaction.** Handler time combines domain
   transition, clone, Witness construction, save serialization/write, string render,
   DOM parsing, and some browser work. It cannot yet say which portion grew.
4. **Synthetic click timing is not INP.** `element.click()` plus
   `requestAnimationFrame`/`setTimeout` is a stable lab proxy, not Event Timing or an
   actual presented-frame timestamp. INP is assessed across real qualifying
   interactions; the public “good” threshold is 200 ms at the 75th percentile
   ([web.dev INP guidance](https://web.dev/articles/optimize-inp)). Necromancer's
   tighter 34 ms lab target is appropriate, but it should not be mislabeled as INP.
5. **The scrolling page is only 441 px scrollable.** Long Witness, Journal, anatomy,
   inventory, market, and route-history pages can have different invalidation and
   sticky behavior.
6. **No mobile or low-end CPU cohort.** The 1440×1000 desktop viewport and RTX 3080
   hardware cohort do not establish behavior on integrated GPUs, memory-constrained
   devices, high-DPR phones, or touch input.
7. **One browser engine.** Chromium data does not prove Firefox or Safari behavior.
8. **GPU layers remain unavailable.** The headless channel does not expose a usable
   layer-tree snapshot. MemoryInfra and VidMm now establish ownership/allocation
   scale, but neither attributes bytes to a particular composited layer. Surface
   geometry is still not a substitute for that attribution.
9. **No disk-write breakdown.** A custom state-size fixture should separately measure
   clone, stringify, storage write, normalization, and render. `localStorage` is
   synchronous and can block the application
   ([MDN Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)).
10. **No reload/soak loop.** The forced-GC result is healthy after one path, but it
    does not exercise tens of screen replacements, save/load cycles, failed runs, or
    repeated new testaments in one tab.
11. **No build-time content attribution.** The build reports one JS chunk but not how
    many bytes are rules, renderers, content prose, or legacy migrations.
12. **No accessibility-tree cost or automated keyboard path.** Performance changes
    such as virtualization and disclosure can affect focus order, find-in-page, live
    regions, and screen-reader output even when frame metrics improve.

## 3. Findings by domain

### UI architecture and DOM lifecycle

#### Strengths

- **Observed:** [`src/ui/app.ts:93`](../src/ui/app.ts) installs one delegated `click`
  and one delegated `submit` listener on the root. Dynamic cards inherit behavior
  without listener growth.
- **Observed:** target switching updates card classes, `aria-pressed`, labels, and hit
  chance text directly at [`src/ui/app.ts:355`](../src/ui/app.ts). It falls back to an
  action-grid render only when expected nodes are absent.
- **Measured:** this targeted path sustains 60.3 updates/s at 18.3 ms p95 in the
  software cohort, and removing enemy-grid containment made it slower.
- **Observed:** the only application timer is the bounded four-second notice timer at
  [`src/ui/app.ts:412`](../src/ui/app.ts). There is no ambient interval or animation
  loop.
- **Observed:** renderers are pure string projections and game code does not import
  UI code, preserving the option to change rendering strategy without changing rules.

#### Complete replacement is the main future UI inflection point

Every non-local transition eventually calls `this.root.innerHTML = renderApp(...)` at
[`src/ui/app.ts:427`](../src/ui/app.ts). At present this is cheap: screens are small,
handler time is low, and detached documents/nodes fall from 4/4,661 before GC to
1/676 after GC.

**Hypothesis:** larger journals, inventories, route maps, relationship ledgers, and
multi-combat transcripts will make complete HTML construction, parsing, style
matching, layout, focus restoration, and garbage creation the dominant presentation
cost. The browser guidance is directionally clear: larger DOMs require more rendering
work, especially after interaction
([web.dev INP optimization](https://web.dev/articles/optimize-inp)).

Do not replace the string renderer pre-emptively. First add stable screen/section
boundaries and measure:

- header/navigation;
- principal scene or battle area;
- player dossier;
- result card;
- Witness tail;
- inventory equipment, pack, market, and anatomy sections;
- Journal preparation and known-fact sections.

When a transition changes only one boundary, patch that boundary and preserve the
others. The same delegated event system continues to work. Full replacement remains
the fallback for screen changes or structural uncertainty. This is incremental
rendering, not a required React/Vue migration.

#### Derived presentation work

- [`src/ui/battle-render.ts:306`](../src/ui/battle-render.ts) derives living enemies,
  intents, ally notes, player actions, action descriptions, hit chances, statuses,
  wounds, body percentages, and a ten-entry Witness tail for each battle render.
- [`src/ui/inventory-render.ts:34`](../src/ui/inventory-render.ts) sorts carried items
  and derives wounds, bleeding, consequence text, carrying weight, combat statistics,
  and treatment values.
- [`src/ui/journal-render.ts:9`](../src/ui/journal-render.ts) derives all preparation
  and known-fact cards and maps them into one string.

All are bounded today. Avoid generic global memoization: invalidation errors would
display stale hit chances, wounds, or eligibility. A better future shape is one
transition-scoped or render-scoped read model that computes repeated facts once and
passes them to section renderers. A cache keyed only by object identity is safe only
after the project formally guarantees that published state is never mutated.

#### Witness growth

The battle UI renders only `log.slice(-10)` at
[`src/ui/battle-render.ts:259`](../src/ui/battle-render.ts), while
[`src/game/witness.ts:34`](../src/game/witness.ts) caps the persisted log at 80.
`appendWitness` removes excess entries immediately. This makes the active battle DOM
bounded.

Future full transcripts should not raise the active DOM or active battle-state cap
without a design:

- keep the last exchanges hot;
- archive prior encounters by encounter ID;
- render older entries on explicit disclosure;
- virtualize or apply `content-visibility: auto` only after the archive becomes long;
- preserve the formatted snapshot and structured event because compatibility and
  authored continuity require both.

`content-visibility: auto` can skip offscreen layout and paint while retaining content
in the DOM and accessibility tree, but requires careful intrinsic sizing and testing
([MDN `content-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility)).
The current paired experiment was noisy, so it is a future long-list tool, not a
blanket stylesheet rule.

### UX constraint envelope

This section constrains later UX work; it is not a UX design prescription.

#### Safe additions

- Contextual descriptions, reward explanations, tooltips, disclosures, result cards,
  and Journal cross-references are safe when their work starts on focus/click/hover
  and stops when closed.
- Prefer native semantic controls (`button`, `details`/`summary`, appropriately
  labelled dialog/popover patterns) and the existing delegated event path.
- Keep closed disclosure content absent from the rendered subtree when it is large,
  or render it once on first open and retain it only when bounded.
- Update a result card, tooltip, selected target, expanded fact, or counter locally;
  do not render the whole application for pointer movement.
- Preserve result continuity in `GameState` as it is now. A featured outcome can
  remain visible until dismissed without an idle timer or loop.
- Dense knowledge support belongs in indexed sections with progressive disclosure,
  search, or filters whose derived set is computed once per input event. A Journal
  containing hundreds of entries should not mount every detail body.
- One-shot audio/visual feedback may load on demand and may animate for a bounded
  interval. No atmospheric feature should consume CPU/GPU while visually unchanged.

#### Project budgets for UX work

These are aggressive project budgets, not web-standard thresholds:

- Local hover, focus, selection, and disclosure updates: target no whole-app render;
  keep p95 handler time under 4 ms and next visual update under 20 ms in the existing
  software cohort.
- Meaningful state transitions: retain the existing 16.67 ms handler and 34 ms
  next-paint gates; also record the transition/serialize/render breakdown.
- Animation: prefer `transform` and `opacity`; keep ordinary transitions at or below
  200 ms and exceptional result entrances at or below 300 ms; maintain 60 fps with
  no frames over 33 ms in the compound workload. Properties that cause layout or
  paint need evidence
  ([web.dev animation guidance](https://web.dev/articles/animations-guide)).
- Motion must honor `prefers-reduced-motion`; nonessential interaction animation
  should be disableable
  ([WCAG 2.2 animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)).
- No continuous `requestAnimationFrame` loop. `requestAnimationFrame` is one-shot and
  generally tracks display refresh; schedule only while a visual state is changing
  ([MDN `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame.)).
- Interactive targets must preserve the WCAG 2.2 minimum of 24×24 CSS px or its
  spacing exceptions; prefer 44×44 for principal actions
  ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
- Tooltip/disclosure content must be reachable by keyboard and focus, must not depend
  on hover alone, and must not flood `aria-live`. Battle-log additions should remain
  meaningful atomic updates rather than re-announcing the entire log.

#### Idle-cost hazards

Reject polling for tooltip position, continuously animated texture/noise, parallax
scrolling, every-card observers/listeners, always-mounted hidden encyclopedic content,
and periodic state persistence. A bounded 200 ms transition can spend GPU work while
it is visible; an imperceptible 1% idle cost runs for the entire session and is the
more serious regression.

### Layout, style, paint, compositing, and assets

#### Current surfaces

- [`src/styles/base.css:39`](../src/styles/base.css) uses a flat body fill;
  [`src/styles/base.css:70`](../src/styles/base.css) retains two atmospheric radial
  gradients on a fixed layer capped at `min(34rem, 65vh)`.
- [`src/styles/base.css:48`](../src/styles/base.css) retains the fixed viewport texture.
- [`src/styles/dossier.css:2`](../src/styles/dossier.css) makes the player dossier
  sticky on the desktop battle layout.
- [`src/styles/battle.css:64`](../src/styles/battle.css) and
  [`src/styles/battle.css:199`](../src/styles/battle.css) contain the enemy and action
  grids.
- [`src/styles/battle.css:100`](../src/styles/battle.css) grays defeated enemies.
- Target commitment is immediate so rapid selection cannot accumulate or reverse
  unfinished animations. Resource fills animate `transform: scaleX()` on fixed
  tracks; other transitions are bounded and interaction-specific. There are no
  keyframe animations, `backdrop-filter`, blanket `will-change`, `translateZ(0)`,
  or 3D promotion tricks.

Chromium turns display lists and decoded images into GPU texture tiles and chooses
composited layers for independent rasterization
([RenderingNG architecture](https://developer.chrome.com/docs/chromium/renderingng-architecture)).
That makes large persistent surfaces and unnecessary layers plausible costs, but the
paired measurements outrank the generic rule. Keep the measured bounded atmosphere,
fixed texture, and grid containment until a same-cohort experiment proves otherwise.

Do not introduce blanket `will-change`. Browsers warn that excessive use consumes
resources and can make rendering more complex
([MDN `will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change)).

#### Images

The optimized item sheets in [`public/assets/items`](../public/assets/items) use
256 px cells, matching the largest current 7 rem display at 2× density. The inventory
renderer references art only on screens that display it through
[`src/game/item-visuals.ts`](../src/game/item-visuals.ts) and
[`src/ui/inventory/item-render.ts`](../src/ui/inventory/item-render.ts).

Keep these invariants:

- source dimensions follow maximum rendered size and supported DPR, not illustration
  master size;
- screen-specific art is not eagerly instantiated;
- the raster audit records intrinsic dimensions and theoretical decoded bytes;
- the repeated inventory GPU cohort runs after sheet changes;
- encoding improvements are not claimed as decoded-memory savings when dimensions
  are unchanged.

The next asset scale step is generated 1×/2× variants or smaller thematic sheets if a
new screen would otherwise decode art far above its display dimensions. Validate
request overhead and memory together; splitting every icon into a file is not
automatically better.

#### Fonts and CSS

The client uses system Georgia/Times, sans-serif, and monospace stacks
([`src/styles/base.css:1`](../src/styles/base.css)). There is no font download,
font-display delay, subset, or decoded font-memory issue. Preserve that property
unless custom typography has enough authored value to justify an explicit font
budget.

All CSS is currently eager but only 8.23 kB gzip. Splitting it now would add complexity
without a measured gain. Reconsider when region- or screen-specific CSS becomes a
material fraction of startup transfer.

### Game logic and data

#### State cloning

The public transition contract clones before mutation:

- [`src/game/engine.ts:81`](../src/game/engine.ts)
- [`src/game/engine/battle-transitions.ts:107`](../src/game/engine/battle-transitions.ts)
- [`src/game/inventory-engine.ts:27`](../src/game/inventory-engine.ts)

This is easy to reason about and protects deterministic tests. **Observed:** it clones
the complete player body, inventory, scars, advancements, world memory, flags, active
battle, allies, enemies, statuses, and up to 80 Witness entries even when a transition
changes one equipment slot or screen ID.

**Hypothesis:** this will become the primary logic/allocation cost as campaign state
grows. Do not replace it with incidental in-place mutation. First instrument clone
time and serialized state bytes on maximum-state fixtures. If it crosses the trigger
in section 5, introduce explicit copy-on-write transition helpers:

- shallow-copy `GameState` and `RunState`;
- clone only the owned mutable domain (`player`, `battle`, `world`, or navigation);
- clone a body part, inventory record, status array, log, or fact array only before
  writing it;
- freeze test fixtures or add mutation tests proving the input state is untouched;
- keep one public transition result and deterministic seed advance.

A general proxy/Immer-style dependency would add runtime code and obscure ownership.
Focused domain drafts fit this codebase better.

#### Repeated derived calculations and allocations

[`src/game/anatomy/wound-effects.ts:14`](../src/game/anatomy/wound-effects.ts) creates
an `allWounds` array with `flatMap`, then `combinedWoundEffects` reduces it.
`effectiveAttack`, `effectiveDefense`, evasion, accuracy, bleeding, fleeing, and
presentation can invoke that aggregation repeatedly during one action/render.
Statuses are similarly found with small linear scans in
[`src/game/combat-math.ts:24`](../src/game/combat-math.ts).

Current anatomy is five parts with at most a handful of wounds, so this is not a
current defect. A low-risk future improvement is an allocation-free accumulator and
one action-scoped `CombatantDerivedStats` snapshot reused by hit chance, damage, and
Witness construction. It must be discarded whenever damage, equipment, status, or a
wound changes. Persistent memoization is not justified.

#### Battle complexity

- Seed evolution in [`src/game/random.ts`](../src/game/random.ts) is constant-time,
  allocation-light, explicit, and reproducible.
- Damage resolution in [`src/game/damage-resolution.ts`](../src/game/damage-resolution.ts)
  is bounded by fixed anatomy plus short status/wound/equipment lookups.
- Enemy resolution in
  [`src/game/engine/battle-lifecycle.ts`](../src/game/engine/battle-lifecycle.ts)
  filters living enemies, sometimes sorts them, resolves each action, then settles
  statuses. Current rosters are tiny.
- Witness append is bounded at 80 but uses an array-front `splice`; that is harmless
  at 80 and would matter only if the cap were raised substantially.

Do not build entity-component storage or worker-based combat for current turn counts.
Profile a representative “large battle” fixture before adding indexes. If future
summoning allows dozens of allies/enemies, key combatants by ID for target lookup
while preserving a stable ordered ID array for deterministic turn order.

#### Flags, facts, advancements, and pools

Persisted arrays are correct for readable JSON and stable ordering, but membership
work is accumulating:

- Story copy and openings repeatedly call `run.flags.includes` in
  [`src/game/content`](../src/game/content) and
  [`src/game/engine/battle-openings.ts`](../src/game/engine/battle-openings.ts).
- Journal preparation projection is
  `definitions × flags.includes` at [`src/game/journal.ts:88`](../src/game/journal.ts).
- Advancement eligibility repeatedly searches chosen IDs and flags in
  [`src/game/advancements.ts`](../src/game/advancements.ts).
- Road selection computes `ROAD_EVENT_IDS.filter(id => !seen.includes(id))` at
  [`src/game/road-events.ts:315`](../src/game/road-events.ts), which is
  `O(pool × history)`.
- Current-save scar deduplication uses `filter` plus `findIndex` at
  [`src/game/persistence/current-save.ts:73`](../src/game/persistence/current-save.ts),
  an `O(scars²)` load path.

The scalable pattern is persisted ordered arrays plus a short-lived lookup context:
`Set` instances for flags, advancements, seen IDs, facts, and scars built once per
transition/render/load operation and passed to selectors. Do not persist `Set` and do
not reconstruct one inside every small selector.

As route pools grow, pre-index static definitions by region, disposition, situation
type, and other coarse tags. Select a small deterministic candidate list, then run
state predicates. The canonical order must come from authored IDs, never object
insertion timing, async chunk arrival, locale sort, or Set iteration created from an
unstable source.

#### Authored-content validation

Advancement, encounter, enemy-action, item economy, road-event, and world validators
execute at module import:

- [`src/game/advancements.ts:566`](../src/game/advancements.ts)
- [`src/game/encounters.ts:589`](../src/game/encounters.ts)
- [`src/game/enemy-actions.ts:19`](../src/game/enemy-actions.ts)
- [`src/game/items.ts:378`](../src/game/items.ts)
- [`src/game/road-events.ts:393`](../src/game/road-events.ts)
- [`src/game/world.ts:415`](../src/game/world.ts)

This is excellent integrity protection and currently cheap. At hundreds or thousands
of definitions, run exhaustive validation in `npm run check` and emit a prevalidated
manifest/hash. Dynamically loaded region chunks should still perform a small schema
and manifest-version assertion once. Do not merely delete production validation.

### Persistence, reload, and multi-playthrough behavior

[`src/ui/app.ts:314`](../src/ui/app.ts) saves every successful meaningful action before
rendering. [`src/game/persistence.ts:31`](../src/game/persistence.ts) serializes the
whole envelope and synchronously writes `localStorage`. This gives simple, strong
autosave behavior. It is also on the input task.

MDN explicitly notes that Web Storage is synchronous and that IndexedDB is the
asynchronous choice for larger structured data
([Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API),
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)).

Keep localStorage now. Before any migration:

1. add save byte size, stringify duration, and storage-call duration to a
   benchmark-only adapter;
2. test a maximum current save and projected one-region/three-region saves;
3. include save failure, quota, corrupted data, old-version migration, tab close, and
   reload in the contract;
4. preserve the guarantee that a confirmed game action is not silently lost.

If the trigger is crossed, introduce a persistence adapter whose IndexedDB
implementation writes asynchronously and serializes writes in action order. A small
localStorage pointer/last-known metadata record can keep title-screen discovery fast.
Coalescing may skip intermediate autosaves only if the latest state is durably
committed and failure/retry behavior is explicit. “Render first and eventually save”
without a durability contract is not acceptable.

Current save normalization limits battle logs to 80 and supplies migration defaults.
Validation walks all nested combatants, statuses, body parts, wounds, world arrays,
and logs. This is appropriate on load, not per render. When migration history grows,
legacy migration modules are a good dynamic-import candidate: parse the current
schema synchronously; load a version-specific migration chunk only when an old key is
actually present.

The after-GC one-document result shows no current navigation leak. Add a soak test
that repeatedly starts, fails, reloads, opens/closes Journal and inventory, and
creates a new testament. Gate retained heap, documents, nodes, and listeners by
trend, not only an absolute final snapshot.

### Startup, build, and future content loading

The title-to-playable boundary and the first content-pack boundary are now live. The
cold document loads only title presentation and bounded save-envelope metadata. Start
or Continue dynamically admits the playable controller, full save validation and
migration, creation/opening coordination, shared rules, and common authored content.
Bonebinder executable mechanics, ending content, and optional surfaces remain separate
delivery units. Browser contracts assert both sides: a cold title cannot fetch the
playable runtime, Start must fetch it, Medium and Renderer paths cannot fetch the
Bonebinder pack, and opening one optional surface cannot fetch its siblings.

Explicit Rolldown grouping is intentionally narrow. `title-bootstrap` has higher
priority than `playable-runtime` so dependencies shared with the title do not make the
playable chunk preload. `lean-runtime` collects three small pure modules consumed
together. A broad shared-group experiment was reverted because it created an 83.5KB
eager chunk and defeated cold content isolation. Dynamic imports are boundaries, not
an invitation to maximize chunk count or deduplicate at the cost of residency.

The next content loader should:

- keep only the title shell and bounded save-envelope metadata pre-admission;
- load the active region's authored definitions, renderer-specific CSS/art, and
  optional legacy migration on demand;
- preload the next likely route chunk after the current screen is interactive;
- represent seeded choices by stable content IDs in the persisted state;
- never let network completion order determine candidate order or RNG consumption;
- make a selected content ID survive save/load even if its chunk is loaded later;
- show an accessible bounded loading state without changing the chosen outcome.

Do not split every module. Network/chunk overhead and delayed interaction can exceed
the parse saving. Region-, campaign-, large-screen-, art-, and legacy-version
boundaries are cohesive.

## 4. Prioritized opportunity table

| Priority | Opportunity | Impact / confidence | Cost / risk | Evidence | Validation experiment | Feature-preservation constraint |
|---|---|---|---|---|---|---|
| P0 | Add maximum-state benchmark fixtures and phase timing | High / high | Low | Current gate covers only early state; clone/save/render are combined | Measure transition, clone, rules, Witness, stringify, storage, HTML construction, DOM update, style/layout separately at current max and projected region scale | Fixtures must be valid deterministic states, not simplified mock rules |
| P0 | Stabilize performance-gate diagnostics without loosening thresholds | Medium / high | Low–medium | Two unchanged runs: one failed 34.8 ms next-paint and idle noise; next passed 19.7 ms and 2.1 ms idle | Three isolated same-cohort runs in scheduled calibration; record median, p90, max, MAD; retain the single-run failure artifact | Never compare cohort IDs or silently convert a failure into a pass |
| P0 | Enforce item raster source and decoded-size budgets | High / high | Low | 43.7 MB dedicated and 36.6 MB shared median reduction already measured | Raster audit plus five-run inventory cohort on any sheet change | Art remains sharp at largest supported size/DPR; no illustration-quality reduction at display size |
| P1 | Create transition/render-scoped membership indexes | Medium now, high later / high | Low–medium | Repeated `includes`; road pool is `O(pool × history)`; Journal is definitions × flags | Fixtures at 10/100/1,000 flags, facts, events; compare arrays vs one scoped Set including construction cost | Persist stable ordered arrays; no RNG/order change |
| P1 | Remove repeated wound/status aggregation within one action/render | Medium / medium | Low–medium | `flatMap` plus repeated reductions feed multiple combat/stat/presentation selectors | CPU/allocation profile on heavily wounded multi-combatant fixture | No cached value may outlive damage, status, equipment, or treatment mutation |
| P1 | Instrument and then narrow state cloning | High at campaign scale / high | Medium–high | Every transition clones complete state | Clone-time and allocation profile for full Witness/world/inventory fixtures; mutation-equivalence tests | Input state remains unchanged; deterministic seeds and public results remain identical |
| P1 | Incrementally patch stable screen sections | High at large-screen scale / medium | Medium–high | All meaningful actions replace root HTML; current local target patch is successful | Compare whole render vs keyed section patch on large Journal/inventory/battle; measure next paint, style/layout, heap churn, focus/scroll | Semantic HTML, focus, live regions, result continuity, and all visible information remain |
| P1 | Add long-page Journal/inventory/Witness cohorts | High / high | Medium | Current scroll distance is 441 px; current GPU experiments do not exercise real long lists | 100/500 entry fixtures, keyboard traversal, find-in-page, screen reader smoke, content-visibility/virtualization A/B | Offscreen content remains discoverable and accessible; no lost history |
| P2 | Move large saves to an ordered async persistence adapter when triggered | High later / high | High | Synchronous stringify + localStorage on every action | Save-size sweep, real browser write p95, reload/crash/quota/migration tests, IndexedDB prototype | Autosave durability and compatible old saves are non-negotiable |
| P2 | Split content by region/campaign and legacy migration | High later / high | Medium–high | One 66.91 kB gzip eager JS chunk already contains all current content/migrations | Bundle attribution; cold title, continue-current, continue-old-save, next-region preload measurements | Selected IDs and deterministic ordering cannot depend on load timing |
| P2 | Pre-index large event pools by stable coarse tags | High later / medium | Medium | Replay plan adds regions, dispositions, pressures, and predicates | Generate 1,000+ authored-definition fixture; compare full predicate scan with tagged shortlist | All eligible entries remain reachable; same seed/state selects same ID |
| P2 | Archive encounter transcripts separately from active battle | Medium later / medium | Medium | Active UI needs 10; state keeps 80 duplicated structured/text entries | Multi-encounter save-size and Journal-history fixture | Never delete player-visible history merely to meet a budget |
| P2 | Add mobile, integrated-GPU, alternate-browser, and soak cohorts | High confidence coverage / high | Medium infrastructure | Current desktop Chromium/RTX cohort leaves major environments untested | Scheduled Chromium mobile emulation plus available Firefox/WebKit; physical low-end capture; 50-cycle reload/navigation soak | Existing desktop gate remains; environment-specific thresholds use distinct cohorts |
| P3 | Move exhaustive catalog validation to build-generated manifests when triggered | Medium later / medium | Medium | Six validators run at module import | Attribution of startup module evaluation with hundreds/thousands of definitions | CI remains exhaustive; loaded chunk still checks schema/hash |

## 5. Staged plan and scale triggers

### Immediate low-risk work

1. Preserve all existing rendering and GPU invariants.
2. Add benchmark-only `performance.mark` spans around domain transition, clone,
   serialization, storage, string render, DOM replacement, and focus scheduling.
3. Add valid maximum-state fixtures: 80 Witness entries, every current item, wounds
   and scars on every body region, every advancement, all world knowledge, and every
   road event seen.
4. Add projected one-region fixtures without changing production rules: 250 facts,
   250 flags/preparations, 100 inventory stacks, 100 route-history IDs, and 200
   archived Witness entries.
5. Record raw/gzip startup JS/CSS and raster intrinsic dimensions in CI artifacts.
   Keep the existing 100 kB transfer gate.
6. Preserve the first failed performance report when a rerun is used for diagnosis.
   Do not overwrite the only evidence.
7. Add interaction paths for inventory, Journal, anatomy treatment, market exchange,
   result dismissal, advancement, victory, defeat, and continue-from-save.

### Benchmark-first experiments

1. Scoped Set/index context versus current repeated array membership.
2. Allocation-free wound aggregation and one-action derived-stat snapshot.
3. Whole-state clone versus explicit domain copy-on-write, with mutation tests.
4. Whole-root render versus stable-section patches on large fixtures.
5. Long-list `content-visibility`, progressive disclosure, and virtualization with
   keyboard/find/accessibility checks.
6. Current synchronous save versus an ordered IndexedDB prototype.
7. Region and legacy-migration chunk boundaries, including preload timing.
8. Sticky dossier behavior at short/tall content, mobile breakpoints, and high DPR.
9. Real tooltip/result-card/disclosure prototypes under rapid keyboard and pointer
   interaction; measure only while active and verify zero idle work afterward.

### Medium-term architecture

- Introduce a typed, scoped `RunLookup`/`WorldLookup` consumed by content eligibility,
  Journal projection, advancement eligibility, and route selection.
- Introduce explicit domain-owned copy-on-write transition builders if clone timing
  crosses its trigger.
- Give renderers stable section boundaries and presentation read models; keep
  `renderApp` as the screen-change/fallback facade.
- Add a persistence adapter interface before storage technology changes.
- Add a region manifest/content loader whose deterministic ID order is build-generated.
- Separate active battle Witness state from optional archived campaign transcripts.
- Generate validation manifests during `npm run check` when content size makes runtime
  validation measurable.

### Concrete future triggers

These are engineering review triggers, not permission to degrade behavior:

| Condition | Required response |
|---|---|
| Serialized save reaches 256 kB, or stringify + storage p95 exceeds 4 ms on the software cohort | Prototype ordered async persistence and report crash/reload semantics |
| `structuredClone` p95 exceeds 4 ms or accounts for more than 25% of a transition handler | Prototype domain copy-on-write and prove input immutability |
| Startup transfer exceeds the existing 100 kB gate, JS exceeds 100 kB gzip, or authored content exceeds 25% of startup JS | Attribute bundle and split by cohesive region/campaign/migration boundary |
| A rendered screen exceeds 800 elements, render-string construction p95 exceeds 4 ms, or DOM replacement plus presentation exceeds 12 ms | Measure section patching and long-list containment/virtualization |
| A Journal/transcript list exceeds 200 mounted cards or five viewport heights | Require long-list benchmark plus keyboard/find/accessibility validation |
| Flags/facts/seen IDs exceed 250, or eligibility/projection p95 exceeds 2 ms | Build one scoped membership index per operation |
| An event candidate pool exceeds 100 definitions or a route selection scan exceeds 2 ms | Add stable coarse-tag indexes before predicates |
| One screen's theoretical decoded raster upper bound exceeds 16 MB or any art is more than 2× the required DPR-adjusted dimensions | Generate right-sized variants and rerun the repeated GPU cohort |
| Summons/opposition can exceed 12 active combatants or 100 combined statuses/wounds | Add a large-battle CPU/allocation fixture before indexing entities |
| Any idle script time is repeatably nonzero across a five-run same-cohort sample | Treat as a regression and identify timer/observer/loop ownership |
| New animation affects more than one major section, exceeds 300 ms, or runs continuously | Require an explicit UX reason, reduced-motion behavior, and compound frame trace |

## 6. Rejected and non-recommended optimizations

- **A framework migration for performance alone.** Current handlers and renders are
  fast. React/Vue could improve update ergonomics but would add runtime/bundle work
  and does not automatically solve state cloning or persistence.
- **Canvas for the authored UI.** It would sacrifice semantic HTML, accessibility,
  selection, responsive text, and ordinary controls for no demonstrated need.
- **Blanket memoization.** Wounds, statuses, inventory, advancement eligibility, and
  route copy change frequently and have subtle invalidation. Use scoped reuse first.
- **Persisting Sets, Maps, or opaque caches.** Saves need stable JSON,
  normalization, migration, and deterministic ordering.
- **A Web Worker for turn resolution.** Current turn handlers are single-digit
  milliseconds; transfer/clone complexity would rise and determinism/debugging would
  become harder. Revisit only after a measured large-world simulation exceeds the
  main-thread budget.
- **Removing structured Witness segments or formatted snapshots.** Both serve
  compatibility, presentation, tests, and future history. Archive instead of erasing.
- **Raising truncation pressure merely to shrink saves.** Preserve player-visible
  history through an archive design.
- **Delaying or dropping autosaves without a durability contract.** Performance is
  not a reason to lose a confirmed action.
- **Global `content-visibility`.** The paired result was noisy and accessibility/layout
  behavior is screen-specific.
- **Removing enemy-grid containment.** It measurably reduced target-update throughput.
- **Merging the fixed texture into the document background.** It increased measured
  battle-idle GPU memory.
- **Blanket `will-change`, `translateZ(0)`, or forced compositing.** Layers consume
  resources and browser layerization should be trusted until a trace proves a defect.
- **Wholesale removal of gradients, atmosphere, art, result cards, or dense
  information.** Bound costly atmosphere to a measured surface, as the body-gradient
  experiment does, rather than trading away authored quality.
- **Compressing PNGs and claiming equivalent VRAM savings.** Encoded bytes and decoded
  pixels are different; source dimensions drove the measured sprite win.
- **Locale-dependent or async-arrival-dependent sorting of eligible content.** It
  would undermine seeded reproducibility.
- **Micro-optimizing constant-time RNG arithmetic.** It is not a relevant cost.
- **Switching all arrays to Sets at current scale.** Construction and serialization
  can cost more than a handful of `includes` calls. Build a scoped index when the
  trigger or measurement supports it.
- **Yielding inside atomic game rules.** Breaking an atomic transition across tasks
  complicates consistency. Yield only between independent non-visible jobs if a
  future task becomes long. Browser guidance supports yielding long work but also
  notes its overhead
  ([web.dev long-task guidance](https://web.dev/articles/optimize-long-tasks)).

## 7. Recommended invariants and CI gates

The existing `AGENTS.md` requirements remain valid and should not be weakened. Add
the following in a later focused tooling change:

### Architectural invariants

- A successful public transition may not mutate its input state.
- Persisted ordered IDs remain the source of deterministic order; transient indexes
  are rebuilt from them.
- A renderer may consume a presentation read model but may not reproduce game rules.
- A content chunk may not advance RNG or change selection order merely by loading.
- A newly selected content ID and advanced seed must be persisted before onward play.
- A storage optimization must retain autosave failure reporting, migration coverage,
  and old-save readability.
- No new per-card/per-row listener where root delegation can express the interaction.
- No continuous timer, observer callback, or animation loop without explicit lifecycle
  ownership and an idle-cost test.
- No `will-change` or forced layer promotion without a paired same-cohort experiment.
- No screen-specific full-resolution art in startup or on screens where it is absent.

### CI and benchmark gates

- Keep `npm run check`, the current enforced `npm run perf:trace`, and the
  active-display `npm run perf:trace:120` application-work gate. Use
  `perf:trace:120:repeat` for same-cohort confidence and the stricter
  `perf:trace:120:delivery` only on a quiet foreground high-refresh host.
- Add build artifact budgets: startup transfer ≤100 kB, report JS/CSS raw+gzip deltas,
  and fail on unreviewed raster cells above the current 256 px target.
- Add valid max-current and projected-region fixtures. Record clone, rules, Witness,
  stringify, storage, HTML construction, DOM update, style, and layout separately.
- Preserve current handler ≤16.67 ms, next-paint ≤34 ms, target/scroll p95 ≤20 ms,
  target/scroll ≥58 Hz, no scroll frames over 33 ms, retained heap ≤5 MB, JS heap
  ≤10 MB, and idle task ≤5 ms/s gates.
- Add stricter local-interaction reporting: target/disclosure/tooltip p95 handler
  ≤4 ms and next visual update ≤20 ms.
- Add DOM/listener trend gates for a 50-cycle navigation/reload soak. The root should
  still own two application listeners; retained listener and document counts may not
  grow by cycle.
- Add a long-page scroll/keyboard cohort before merging Journal, transcript, anatomy,
  inventory, or route-map expansion.
- Add `prefers-reduced-motion` and keyboard/focus checks to every animated or
  progressive-disclosure fixture.
- Keep GPU results advisory until repeated same-cohort calibration exists. Report
  median, p90, max, and MAD; never gate or compare incompatible IDs.
- When a software gate fails, preserve the failed artifact and run bounded repeated
  diagnostics. Do not silently pass, overwrite evidence, or relax the threshold.
- Run scheduled mobile/integrated-GPU and Firefox/WebKit coverage separately from the
  established software cohort.

## 8. Source and repository reference index

### Primary browser and standards references

- [Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
- [Optimize long tasks](https://web.dev/articles/optimize-long-tasks)
- [High-performance CSS animations](https://web.dev/articles/animations-guide)
- [MDN `content-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility)
- [MDN `will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change)
- [MDN Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Chromium RenderingNG architecture](https://developer.chrome.com/docs/chromium/renderingng-architecture)
- [Chrome DevTools Performance reference](https://developer.chrome.com/docs/devtools/performance/reference/)
- [Chrome Performance Monitor](https://developer.chrome.com/docs/devtools/performance-monitor)
- [Vite dynamic import and glob import](https://vite.dev/guide/features.html)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)

### Core local references

- Performance contract and commands:
  [`README.md:57`](../README.md), [`AGENTS.md:41`](../AGENTS.md)
- Performance driver:
  [`scripts/trace-performance.mjs`](../scripts/trace-performance.mjs)
- Active-display high-refresh driver and repeated cohort:
  [`scripts/trace-high-refresh.mjs`](../scripts/trace-high-refresh.mjs),
  [`scripts/performance-high-refresh.mjs`](../scripts/performance-high-refresh.mjs),
  [`scripts/run-high-refresh-suite.mjs`](../scripts/run-high-refresh-suite.mjs)
- GPU sampling and cohort identity:
  [`scripts/performance-gpu.mjs`](../scripts/performance-gpu.mjs),
  [`scripts/windows-gpu-diagnostics.mjs`](../scripts/windows-gpu-diagnostics.mjs),
  [`scripts/performance-memory-infra.mjs`](../scripts/performance-memory-infra.mjs)
- WPR/VidMm allocation capture and analysis:
  [`scripts/necromancer-gpu-memory.wprp`](../scripts/necromancer-gpu-memory.wprp),
  [`scripts/capture-wpr-gpu.ps1`](../scripts/capture-wpr-gpu.ps1),
  [`scripts/wpr-gpu-memory.mjs`](../scripts/wpr-gpu-memory.mjs)
- Repeated summaries:
  [`scripts/run-performance-suite.mjs`](../scripts/run-performance-suite.mjs),
  [`scripts/performance-benchmark-summary.mjs`](../scripts/performance-benchmark-summary.mjs)
- GPU experiments and surface/raster audit:
  [`scripts/performance-gpu-experiments.mjs`](../scripts/performance-gpu-experiments.mjs),
  [`scripts/performance-surface-audit.mjs`](../scripts/performance-surface-audit.mjs)
- Browser lifecycle and targeted updates:
  [`src/ui/app.ts`](../src/ui/app.ts)
- Rendering dispatcher and battle/inventory/journal sections:
  [`src/ui/render.ts`](../src/ui/render.ts),
  [`src/ui/battle-render.ts`](../src/ui/battle-render.ts),
  [`src/ui/inventory-render.ts`](../src/ui/inventory-render.ts),
  [`src/ui/journal-render.ts`](../src/ui/journal-render.ts)
- State, transitions, combat, and cloning:
  [`src/game/types.ts`](../src/game/types.ts),
  [`src/game/engine.ts`](../src/game/engine.ts),
  [`src/game/engine/battle-transitions.ts`](../src/game/engine/battle-transitions.ts),
  [`src/game/inventory-engine.ts`](../src/game/inventory-engine.ts)
- Derived combat/anatomy work:
  [`src/game/combat-math.ts`](../src/game/combat-math.ts),
  [`src/game/damage-resolution.ts`](../src/game/damage-resolution.ts),
  [`src/game/anatomy/wound-effects.ts`](../src/game/anatomy/wound-effects.ts)
- World, route, advancement, and Journal lookup paths:
  [`src/game/world.ts`](../src/game/world.ts),
  [`src/game/road-events.ts`](../src/game/road-events.ts),
  [`src/game/advancements.ts`](../src/game/advancements.ts),
  [`src/game/journal.ts`](../src/game/journal.ts)
- Persistence and Witness bounds:
  [`src/game/persistence.ts`](../src/game/persistence.ts),
  [`src/game/persistence/current-save.ts`](../src/game/persistence/current-save.ts),
  [`src/game/witness.ts`](../src/game/witness.ts)
- Eager content and startup:
  [`src/main.ts`](../src/main.ts),
  [`src/game/content.ts`](../src/game/content.ts),
  [`vite.config.ts`](../vite.config.ts)

The immediate conclusion is intentionally conservative in architecture and aggressive
in measurement: preserve today's lean runtime, establish mature-state fixtures now,
and require evidence before the campaign's growth turns whole-state/whole-screen work
into a player-visible cost.
