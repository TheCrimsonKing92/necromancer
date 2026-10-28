# Necromancer project lineage

Analysis date: 2026-07-24

This repository was rebased as a clean implementation after reviewing the complete source and Git history of:

- [TheCrimsonKing92/necromancer](https://github.com/TheCrimsonKing92/necromancer)
- [TheCrimsonKing92/necromancer-react-legacy](https://github.com/TheCrimsonKing92/necromancer-react-legacy)
- [TheCrimsonKing92/necromancer-react](https://github.com/TheCrimsonKing92/necromancer-react)

“Rebased” here means product and architecture consolidation, not a Git rebase between unrelated histories. The original `necromancer` history remains intact underneath this rewrite.

## What each prototype established

### `necromancer`

The vanilla JavaScript prototype contains the clearest statement of the game’s identity:

- Maldirin as a decadent, dangerous setting.
- Medium, Summoner, and Thaumaturgist as starting classes.
- A scene frame with contextual details in a footer.
- Early skill vocabulary such as Banish, Bone Shield, Channel, Possession, Sap Will, and Summon Shade.
- An intended local save boundary.

Its strengths are tone, directness, and a tiny delivery footprint. Its limitations are tightly coupled DOM manipulation, mutable singleton state, partial scene transitions, stubbed persistence, no tests, and skill selection that never reaches a playable encounter.

**Carried forward:** setting language, the three traditions, context-sensitive secondary information, static-hosting simplicity, and local persistence.

### `necromancer-react-legacy`

The Create React App rewrite explored:

- Route-based top-level navigation.
- A reducer-driven application state.
- Reusable class and skill selection controls.
- A body-part-oriented health concept.
- A scene progression from class selection to skills to a future world map.

It clarified UI decomposition, but most game behavior remained placeholders. The reducer also mixed rendered React elements into state, and the project inherited a large Create React App/Bootstrap surface for a very small interface.

**Carried forward:** explicit actions, one-way state transitions, reusable selection patterns, and a six-region anatomy model that makes health more granular than a single number.

### `necromancer-react`

The newest prototype contains the largest body of domain experimentation:

- Characters, teams, stats, leveling, inventory capacity, equipment slots, and two weapon loadouts.
- Damage, healing, statuses, targeting, skills, item hydration, materials, rarity, and procedural weapon generation.
- Narrative and battle state-machine experiments.
- A small React screen flow from creation to inn to confrontation to battle.
- Automated tests around effects, skills, equipment, inventory, items, and weapons.

Its isolated mechanics are useful, but the application layer and domain layer had not yet converged:

- The rendered screen flow bypassed the XState machines.
- Combat controls did not update combatants.
- Save/load remained unimplemented.
- JSON scene loading and machine configuration disagreed about scene types and locations.
- Several APIs had shape mismatches (`skills` as object versus array, `name` versus `type` for statuses, `type` versus `weaponType` in generated weapons).
- Item generation was only implemented for weapons.
- TypeScript covered only part of the source.

The repository’s own verification was run before this rewrite:

- 58 tests passed and 2 were skipped.
- The production build failed on TypeScript errors in `App.tsx`.
- Lint failed on those errors plus JSX parsing in `.js` files.
- Installing the historical lockfile brought in 593 packages and reported 20 audit findings.

**Carried forward:** pure mechanical modules, deterministic-effect thinking, explicit target rules, Ward/status concepts, class-distinct combat, equipment-ready character boundaries, and serious automated testing.

## Consolidation decisions

| Concern | Decision | Reason |
| --- | --- | --- |
| UI | Native DOM and CSS | The current interface is a handful of state-driven screens; a runtime framework adds more surface than leverage. |
| Language | Strict TypeScript | The latest prototype’s main integration failures were data-shape disagreements that static checking can catch. |
| State | Pure serializable transitions | Combat, story, and persistence can be tested without rendering or browser globals. |
| Randomness | Seed stored with the run | Reproducible battles make tests, bug reports, and future replays possible. |
| Content | Definitions separate from engine | Narrative and action copy can grow without embedding rules in the renderer. |
| Saves | Versioned local envelope | Static hosting stays viable while future migrations have an explicit version boundary. |
| Tooling | Vite + Vitest only | Fast development and production builds with zero UI runtime dependencies. |
| Scope | One complete vertical slice | A small end-to-end game provides better architectural evidence than another broad set of disconnected systems. |

## What was intentionally not copied

- React component and router code.
- XState configuration whose runtime path was not integrated.
- The unfinished item/equipment implementation.
- Mutable prototype-based character objects.
- Existing generated logos and starter assets.
- Create React App or Bootstrap dependencies.

Those ideas remain available in Git history and the reviewed repositories. They should return only when a playable system demands them.

## Recommended next increments

The current follow-up stretch is complete. Inventory, paired equipment, a sell-and-resupply market, six core attributes, six mundane skills, Spirit, deterministic accuracy and evasion, action-specific misses, typed defeat transitions, anatomy-aware hit locations, persistent wounds, materiality, physical and occult damage, armor coverage, bleeding, Medicine-based treatment, convalescence, scars, loot, a validated Level II–III discipline tree, seeded encounter and story variation, friendly and neutral road events, and v1/v2/v3-to-v4 save migration all live in the serializable domain. The domain now also persists deeds, faction knowledge, standing, and regional pressure. A Thaumaturgist’s roadside rendering has independent yield and witness checks, and known evidence can force the reeves into the later route. The opening testament continues beyond Saint Orra through an authored road interlude and into a third battle selected from five mechanically and narratively distinct wakes.

Authored scenes now pass a runtime schema matrix across traditions and variable road scenes; effect IDs come from one runtime catalog and the engine handler is compile-time exhaustive. Enemy cadence has moved into a shared domain module that also projects the next answer without consuming the seed. Battle cards show restrained physical tells, attack type, exceptional wound risk, and special effects. Status previews state both their mechanical consequence and unabbreviated remaining duration.

1. Expand the first convalescence step into repeated camp recovery and a general crafting system so wounds, scars, and materials feed a longer campaign loop.
2. Add initiative and enemy actions that alter, delay, or lose their telegraphed intent so forecasting creates interaction rather than a solved rotation.
3. Define campaign progression and the next save migration before adding a second testament.
4. Use the scene validator as the boundary for a small region route graph and a second opening problem.
5. Add automated browser-level accessibility and full-flow coverage after the expanded interaction model settles.
