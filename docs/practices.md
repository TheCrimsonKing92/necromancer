# Necromantic practice roster

## Decision status

This is the executable historical prototype roster, not a settled full-game
commitment:

1. **Medium**
2. **Bonebinder**
3. **Renderer**
4. **Grave Warden**
5. **Ferryman**

The roster remains useful as a record of current save-compatible implementations.
It is not the current conceptual recommendation. Under the corrected magic
model, **Medium, Bonebinder, Renderer, and Summoner** own the clearest distinct
loops. A practice centered on the necromancer's own vital state is a serious
fifth-seat candidate but remains unproved. Grave Warden/Cairnwright and Ferryman
remain unresolved candidates, offices, regional paths, or advanced practices. See
[the reassessment ledger](worldbuilding-reassessment.md) and
[the latest ideation pass](class-and-tradition-ideation.md).

Any eventual roster should define materially different play loops, not
differently styled spell lists, one environmental setup loop repeated under
several names, or an exhaustive taxonomy of everything necromancy can become.

**Necromancer** is the character's shared identity. A **practice** is their
primary mechanical method of necromancy. **Tradition** is reserved for cultural,
institutional, regional, familial, or master-to-student lineages that can exist
within or across practices. A later background or formation layer may own
ordinary training, social position, and some starting equipment.

The implemented Medium, Bonebinder, and Renderer remain prototype content.
Save-compatible IDs may survive during migration, but they do not override this
target model.

## Implemented practice concepts

| Practice | Owned verb | Primary locus | Recurring question |
| --- | --- | --- | --- |
| Medium | host | the living self | Whom may I admit, and under what terms? |
| Bonebinder | bind | prepared remains | What initiative does this body carry, and what do I owe it? |
| Renderer | render | death-altered matter | What should I prepare, preserve, or transform? |
| Grave Warden | keep | continuity and custody | What must remain intact, and where will it be tested? |
| Ferryman | conduct | passage and thresholds | What should cross, return, remain, or be denied passage? |

This table describes the intent behind existing implementation IDs. It does not
reserve five permanent seats.

### Medium

The Medium hosts named dead in a living body under explicit or dangerously
incomplete terms. Guests change combat actions, available knowledge, bodily
strain, relationships, and social consequences. Hosting should distinguish
invitation, reciprocity, coercion, overdraw, and occupation rather than treating
the dead as an undifferentiated damage source.

### Bonebinder

The Bonebinder seats initiative in prepared remains and maintains a persistent,
corporeal servant. The servant is a named actor with anatomy, wounds, repairs,
equipment, provenance, remembered work, obligations, and social recognition. It
is not disposable ammunition or an automatic background-damage effect.

This is an intentional engineering commitment. The implementation should reuse
the common combatant, anatomy, injury, equipment, provenance, and relationship
models. A first vertical slice must carry one servant through combat, repair,
travel, a social reaction, and recognition by someone who knew the body.

### Renderer

The Renderer separates, preserves, and applies occult properties found in
death-altered matter. Preparation slots and material qualities should create
choices without requiring harvesting chores before ordinary actions. Provenance,
legality, contamination, evidence, Medicine, and ordinary trade are central.
Rendering creates opportunities; it must not reduce every body to routine loot.

### Grave Warden

The Grave Warden works upon the agreements and continuities by which bodies stay
buried, places remain defensible, names remain attached to their proper dead,
and hostile things remain outside. Limited seals support interposition,
containment, breach response, and temporary bodily stabilization without
rewarding indefinite defensive stalling. A Warden can preserve refuge or enforce
an unjust continuity; the practice is not an alignment.

### Ferryman

The Ferryman opens, closes, follows, and reverses passage for dead initiative.
Its work concerns escort, retrieval, exile, return, refuge, and denial rather
than generic exorcism. Combat should emphasize tempo, routes, state transitions,
and clean endings instead of unconditional execution. It remains a regional or
advanced candidate while Maldirin's threshold cosmology is refined.

The Grave Warden establishes or repairs continuity. The Ferryman changes
location, state, or passage. Their occasional use of thresholds must not collapse
them into the same practice.

## Strong unimplemented concepts

### Summoner

The Summoner coordinates a bounded formation of external dead actors. Its
repeated object is the formation: composition, cohesion, duration, standing
orders, and collective intent. It is distinct from the Bonebinder's investment
in one durable corporeal body and from the Medium's admission of dead initiative
into the living self.

A Summoner carries a viable floor—a small retinue, prepared calls, or another
portable formation basis. Corpses, death-altered places, violent history, and
local manifestations can change what may be called; they are not universal
permission gates. The player issues an order and then a target or area. Units
act in a readable sequence under persistent orders rather than requiring
clerical commands or moving all at once.

### Mortality practice (working concept)

This candidate owns the practitioner's own vital state. It deliberately
suspends and recalls living functions, then commits those altered states through
weapons, movement, perception, wounds, and treatment. Its working traditions
oppose brief crossing with complete return (**the Last Vigil**) to increasingly
durable suspension and bodily change (**the Pale Discipline**).

Martial training remains a separate formation or background available to other
practices. Revenancy remains a rare earned transformation that preserves and
changes a character's original practice, not this class's inevitable capstone
and not a normal character-creation option. See
[Martial necromancy and Revenancy](martial-necromancy-and-revenancy.md).

## Shared doctrine

- Spirit normally pays for occult action.
- Health loss, body deterioration, and wounds mark overdraw, broken terms,
  exposure, or another consequential failure; they are not routine secondary
  mana costs.
- Every practice must remain useful against mundane people, corporeal threats,
  and incorporeal manifestations without being equally strong in every matchup.
- Every practice must change noncombat routes, evidence, relationships,
  equipment, and failure consequences as well as combat.
- Every practice declares its own source, method, consequences, costs,
  affinities, limits, and counters. No roster-wide setup grammar is implied.
- A starting practice normally carries enough agency to remain itself on an
  ordinary road. Specific traditions may accept hard dependencies when those
  dependencies create their identity rather than excuse a missing baseline.
- A practice is not a moral alignment. Consent, coercion, provenance, necessity,
  custom, and harm belong to acts and relationships.
- Social responses vary by culture, institution, person, and circumstance.
- A practice, formation, and bodily transformation are separate design layers.
  Do not turn warrior training into a class monopoly or Revenancy into a starter
  archetype.

## Names, debts, and ledgers

Names, vows, debts, witnessed terms, registers, and grave law remain important
parts of Maldirin, but they are not elevated from the current proving ground
into a universal starting practice. They may support shared occult techniques,
regional traditions, institutional specialists, faction systems, advancement
branches, or later practices if broader worldbuilding earns that scope.

## Architectural consequence

Practice definitions should grant typed action, capability, starting-kit, and
advancement references. Generic resolution and story content should query
capabilities rather than accumulate five-way practice switches. Practice state
must remain namespaced, while knowledge claims and provenance should share
domain vocabulary across people, bodies, goods, records, and evidence.

The earlier implementation order was:

1. Establish the practice registry and migrate Medium without breaking saves.
2. Use Renderer to prove preparation, provenance, evidence, and services.
3. Build the Bonebinder vertical slice and persistent-actor foundation.
4. Prototype Grave Warden seals against mixed combat and noncombat encounters.
5. Implement Ferryman after its threshold rules work beyond one region or plot.

That order is historical. New implementation should first prove Summoner's
formation loop, Bonebinder's Conservator/Compositor split, the mortality
practice's suspend/commit/return loop, and the direct-play identity of the stable
concepts. Revenancy should receive a continuity paper proof before runtime work.
Do not expand Grave Warden or implement Ferryman merely to complete the old
roster.
