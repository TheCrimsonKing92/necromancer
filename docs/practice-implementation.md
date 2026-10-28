# Practice implementation foundation

The save-compatible implementation registry lives behind
`src/game/practices.ts`. It records executable and deferred concepts; it is not
an accepted worldbuilding roster. It remains intentionally separate from the
current `TraditionId` save contract. Medium, Bonebinder, Renderer, and Grave
Warden are current creation choices. Explicit compatibility metadata relates
prototype IDs to practice concepts without silently changing mechanics or save
data. Summoner will require a new stable ID because the legacy `summoner` ID is
the implemented Bonebinder compatibility path.

Content and generic rules should ask for a `PracticeCapabilityId`. They should
only inspect `PracticeId` when the identity of the practice is itself the
fictional fact. The registry distinguishes implemented actions from planned
actions, so a definition cannot make an unfinished practice appear playable.
Action effects still belong in action definitions and focused transition
modules; the practice catalog only grants typed references.

## Bonebinder boundary

`src/game/practices/bonebinder/` establishes the persistent-servant domain.
A servant embeds a corporeal ally-shaped `Combatant`, so body condition, wounds,
statuses, defenses, damage resolution, and standing checks can use the common
systems. Persistence should eventually store this state under a namespaced
Bonebinder block; it should not add a second companion anatomy or a
`remainingTurns` field.

Identity and body identity remain separate because a seated continuity is not
automatically the person whose remains it inhabits. The servant stores only
canonical world provenance, claim, and recognition-evidence IDs. Ownership,
authorization, current custody, and recognition are resolved from `WorldState`;
they must never be copied into a second servant-owned provenance ledger.

Body condition and wounds are authoritative repair inputs. Repair records are
history, not a second health pool. Current groundwork can reinforce a body part
or stabilize an existing shared wound. Closing wounds, restoring Health,
consuming repair materials, and tether backlash remain transition rules for the
vertical slice.

Commands are data-defined and capability-gated. Battle integration should
allocate a command through the ordinary player-action transition, then let the
round lifecycle resolve that command. It must not add an automatic servant
attack after every player action or switch on the Bonebinder practice ID in
generic combat.

## Persistent-servant vertical slice

The Ditch-Hand fixture now carries one authored servant through these connected
stages:

1. Create or acquire it with identity and mortuary provenance.
2. Add the persistent combatant to one battle and issue Guard, Interpose, Harry,
   and Withdraw through the normal action and round lifecycle.
3. Preserve its body damage and wounds after battle.
4. Consume typed repair materials through an inventory-engine transition while
   applying the repair rules here.
5. Persist and normalize the namespaced servant state with deterministic
   save/load tests.
6. Render the servant as a combatant and dossier section, with a settlement
   reaction driven by visible-servant and provenance capabilities.
7. Let a person recognize the source body through world evidence and faction
   knowledge, not a universal Bonebinder reputation penalty.

The slice uses an explicit temporary-or-persistent ally lifetime union. Legacy
shades normalize to temporary lifetimes with their exact saved duration;
persistent servants never counterfeit permanence with a large duration.
`RunState.practiceStates.bonebinder` owns the optional servant state, while
provenance, claims, custody, recognition evidence, and actor belief remain in
`WorldState`.

Guard, Interpose, Harry, and Withdraw spend the player’s ordinary act and pass
through the normal enemy answer, status, and round lifecycle. A persistent
servant does not attack after unrelated player actions. Mortuary tallow repairs
shared body condition and a bounded amount of shared Health; clean linen
stabilizes only binding-care wounds. Rest-bound trauma remains unresolved.

Bonebinder now has a playable vertical slice and character-creation path. The
Ditch-Hand fixture remains authored proving-ground content rather than the
universal servant identity. Grave Warden also has a playable vertical slice,
but its implementation does not settle its conceptual roster status; its current
continuity/breach ontology is explicitly under review. Renderer remains playable.
Ferryman remains deferred. Consult [the reassessment ledger](worldbuilding-reassessment.md)
before extending any of these concepts.
