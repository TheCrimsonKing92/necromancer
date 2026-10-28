# Campaign and testament continuity

This is a normative design contract. A **campaign** is the persistent world; a
**testament** is one character's passage through it. Starting a successor in the
same campaign is the default future flow. Resetting or deleting that campaign is
a separate, explicit, acknowledged action.

## Locked contract

### Persistence layers

The game distinguishes four layers:

1. **Authored world:** major geography, cultures, important centers, cosmology,
   and central conflicts. This is stable content, not shuffled per save.
2. **Campaign instance and history:** seeded local facts, identities, initial
   conditions, physical changes, relationships, claims, bodies, servants,
   holdings, evidence, and advancing fronts. Generation creates a fact once;
   revisiting or loading never rerolls it.
3. **Active testament:** the current character's body, capabilities, wounds,
   possessions, private relationships, and character knowledge.
4. **Player record:** settings and the read-only Chronicle. It may preserve what
   the player has seen, but it grants no unexplained capabilities or bonuses to
   a character.

World history remains until an action or deterministic world-advancement rule
changes it. A character ending does not erase physical or social consequences.
It also does not silently hand carried inventory, relationships, servants, or
property to a successor.

### Successor relationships

Successor relationship is a game-facing pattern, not one culture's inheritance
law:

- **Familiar successor:** kin, apprentice, household member, companion, or
  known associate of the predecessor.
- **Spiritual successor:** continues selected work, purpose, cause, or practice
  without necessarily knowing the predecessor. It may occasionally be a
  literally supernatural succession, but is not assumed to be one.
- **Independent successor:** enters the continuing world without a presumptive
  personal connection.

No mode grants levels, coefficient improvements, or inherited character stats.
Their eventual tradeoffs concern credible knowledge, evidence, access,
preparation, arrival time, obligations, reputation, and starting position. A
region's social constitution determines the legal and cultural meaning of the
relationship; the engine must not hard-code one universal inheritance rule.

### Knowledge and the Chronicle

The **Chronicle** is a main-menu, player-level record of closed testaments. It
is read-only and never participates in in-world eligibility. The active
character's **Journal** exposes only knowledge they possess.

Accounts, maps, testimony, correspondence, remains, and other evidence may
later transfer specific facts into a successor's knowledge. There is no generic
item or action that imports the whole Chronicle. The rules cannot prevent the
human player remembering; they prevent NPCs, routes, and character actions from
treating unsupported player knowledge as established in the world.

### Other ways a testament can end

End reasons are extensible beyond death and completion. Retirement, yielding,
and disappearance are approved concepts, but retirement is never free character
swapping. It must be an irreversible authored transition: the old character
becomes an autonomous world actor, time advances, and the player cannot switch
back when the successor is inconvenient. No retirement content is committed by
the first implementation slice.

### Persistent holdings

Persistent property and organizations are approved. A room, cache, workshop,
licensed practice, defended house, archive, household, shrine compact, or local
office is a world entity with claims, custodians, condition, access rules, and
risks. Holdings are difficult to establish, can be damaged or seized, and are
not an invulnerable account stash. Maintenance should appear as occasional
consequential decisions rather than repetitive rent clicks.

## First implementation slice

`GameState.campaign` now records a stable campaign identity and seed, a world
revision boundary, one active testament identity, the next ordinal, and
idempotent summaries of closed testaments. Death, withdrawal from the current
opening, and final opening-testament completion close the active testament.
Intermediate encounter-victory screens do not.

Current v4 saves without this additive record are normalized deterministically.
Loading never discards the run, world memory, Journal knowledge, route flags, or
character state, and synchronizing the same ending repeatedly cannot duplicate
a Chronicle entry.

The title exposes the Chronicle through its own lazy renderer and stylesheet.
That read model consumes only closed-testament summaries; it cannot traverse
`RunState.world` or the active character's Journal knowledge. When a campaign is
saved, title and ending actions no longer describe character creation as a
harmless new testament. Resetting the campaign is explicit and deletes its
world and Chronicle together.

The proving-ground implementation still stores `world` and `economy` beneath
`RunState` for compatibility with the current engine. They are campaign-owned
in the normative model. They should move behind a focused campaign-state facade
before genuine successor creation, rather than being copied from one character
run to another.

## Deliberately deferred

A genuine successor transition remains blocked on authored decisions that
materially affect its result:

- the elapsed time and deterministic world advancement before arrival;
- how an origin and successor relationship determine starting position;
- which account, evidence, access, preparation, or obligation can be chosen;
- who has custody of the predecessor's body, possessions, servants, and
  holdings under the applicable social constitution;
- how the opening route changes when its original people and conflicts are
  already resolved;
- the authored circumstances that permit retirement, yielding, or
  disappearance.

Until those rules exist, do not offer a continuation button that merely reruns
the first scene, clones inventory, or clears established world facts.
