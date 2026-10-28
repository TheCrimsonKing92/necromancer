# Sol consultation: necromantic class diversity in Maldirin

Status: independent design consultation; no production-code changes.

This report treats **Dominion on the March** as the strongest provisional
cosmological foundation, not settled canon. It also treats the current Medium,
Summoner, and Thaumaturgist as prototypes: their names, mechanics, boundaries,
and continued existence are all open to revision.

## Recommendation in brief

Build toward **five necromantic practices**:

1. **Medium** — admits dead initiative into the living body.
2. **Binder** — gives dead initiative an external form and terms of service.
3. **Thaumaturgist** — renders death-altered matter into prepared effects.
4. **Grave Warden** — keeps places, bodies, and covenants continuous against
   intrusion or collapse.
5. **Ferryman** — conducts the dead across thresholds, returns what has been
   displaced, and makes or denies passage.

Their conceptual verbs are **admit, bind, render, keep, and conduct**. That
grammar is broad enough to support advancement, cultural variation, equipment,
and noncombat play without pretending to exhaust everything necromancy can be.
It also gives each practice a different relationship to embodiment, initiative,
remains, place, consent, and continuity—the metaphysical questions already
present in `docs/world.md`.

Five is preferable to four because the two proposed additions occupy genuinely
missing spaces:

- the current three have no dedicated relationship to tombs, wards, household
  continuity, or supernatural breach;
- they also have no practice centered on passage, release, exile, and return.

Those are distinct in both ordinary mortuary life and Dominion on the March.
More than five should wait. Every added starting practice multiplies authored
choice variants, social reactions, equipment support, advancement nodes, save
coverage, and encounter-balance obligations.

## “Tradition,” “class,” or something else?

**Practice** is the best player-facing term.

The present choice is mechanically a class: it sets attributes, skills, kit,
Spirit, combat actions, and advancement eligibility. Calling it a “tradition”
implies that Medium, Summoner, and Thaumaturgist are culturally transmitted,
mutually exclusive lineages. They currently read more like methods of work.
That distinction matters in a world where cultures disagree radically about
necromancy.

Recommended ontology:

- **Practice**: the character’s primary mechanical way of doing necromancy.
- **Tradition**: a cultural, institutional, familial, or master-to-student
  lineage within or across practices.
- **Background/formation**: the character’s ordinary training, initial social
  position, mundane skills, and some starting equipment.

For example, two Mediums could share a practice while belonging to a household
ancestor tradition and a court inquest tradition. A county-trained Grave
Warden and a shrine-taught Grave Warden need not begin with the same standing
or regard bodies under the same law.

If the project must choose only between the existing words, **class** is more
truthful to the current mechanic than **tradition**. It is transparent game
language, however, not good in-world prose. “Choose your necromantic practice”
is both plain and diegetic. The code can retain `TraditionId` during an orderly
save-compatible migration; vocabulary should not force a premature schema
break.

Do not implement the full practice/tradition/background matrix at once.
Establish five practices first. Later, separate background from practice so
that choosing Medium does not forever imply one fixed body, personality, and
set of mundane competencies.

## Design principles

### A practice changes the play loop, not just the damage text

Each practice needs:

- a distinct Spirit spending and recovery cadence;
- a tactical question that recurs without becoming a solved rotation;
- a meaningful relationship to bodies, wounds, equipment, or preparation;
- at least two noncombat approaches that are not “ask a corpse for the clue”;
- visible social acts whose interpretation varies by person and culture;
- advancement that changes decisions, not only coefficients.

Every practice also needs a credible answer to mundane people, corporeal
monsters, and incorporeal manifestations. A practice can be better or worse in
one matchup, but none should become dead weight whenever the opposition is
ordinary.

### The practice is not an alignment

No practice is inherently humane merely because its respectful branch exists.
A Medium may invite or violate. A Binder may covenant or compel. A
Thaumaturgist may repair or desecrate. A Grave Warden may shelter the weak or
preserve an intolerable order. A Ferryman may return the displaced or exile
them beyond recovery.

Consent, provenance, necessity, evidence, and local custom belong to individual
acts and relationships. They should not collapse into a single “good
necromancer” tree.

### The cosmology supplies pressure, not a chosen class

Dominion on the March makes all five practices relevant:

- a Medium can admit an outside initiative and contest whether it remains a
  guest or becomes an occupier;
- a Binder creates portable relationships that the March may overturn,
  liberate, recruit, or seize;
- a Thaumaturgist can test the material truth of an incorporation and work on
  ancient Vast-derived remains;
- a Grave Warden can preserve a continuity, including one that does not
  deserve preservation;
- a Ferryman can reopen return, retrieve an exile, or cut a route by which the
  March advances.

None is uniquely necessary. River-workers, divine agents, soldiers, diplomats,
engineers, other magicians, and ordinary communities must remain capable of
acting on the same conflict by different means.

The practices must also work in campaigns with no Nymorai involvement. A
disputed inheritance, a mine collapse, a plague burial, a dynastic murder, or a
haunted caravan should still expose their differences.

### Costs should create texture without prescribing tedium

Class texture should not turn the game into five versions of a one-person small
business simulator.

- Prepared materials offer leverage and flexibility; they should not require a
  harvesting chore before every ordinary cast.
- A bound dead may become a relationship; it should not require constant pet
  inventory administration.
- A ward can establish a position; it should not reward indefinite defensive
  stalling.
- Passage can depend on a marked threshold; it should not demand a bespoke
  route puzzle in every scene.
- Bodily risk should make a Medium’s decisions sharp; it should not make their
  ordinary damage strictly worse than everyone else’s.

## Critique of the current three

### Medium: keep, then deepen

The Medium has the clearest personal fantasy. Charisma, Persuasion, bodily
hosting, forbidden testimony, and self-inflicted strain already point in one
direction. The world foundation’s guest-right and bodily answerability can make
this much stronger.

Current weaknesses:

- The battle identity is mostly “occult attack that grants Ward” plus “larger
  occult attack that injures the caster.”
- `Borrowed Might` taxes Health, torso condition, Spirit, and a rest wound at
  once. That can make the practice pay several currencies for damage other
  practices obtain more cleanly.
- The fantasy promises multiple dead presences and dangerous testimony, while
  the mechanic has no meaningful choice about whom or what is admitted.
- The current actions do not distinguish welcome, negotiated occupation, and
  forcible use.

Direction:

Give the Medium a **passenger state** or a small set of invitations, not a large
pet roster. A passenger changes two or three actions for a bounded time and
leaves a bodily or social consequence. The important choice is what authority
the dead receives:

- **Guest**: safer, reciprocal, may protect or reveal a social approach.
- **Borrowed hand**: stronger bodily action, localized condition risk.
- **Open house**: several weak voices, broader control or defense, intrusion
  risk.

Spirit Lash can remain a reliable starter tool, but it should not carry the
whole identity. Borrowed Might should concentrate its price: a known localized
strain, an escalating passenger risk, or Health—not every cost simultaneously.

Noncombat strengths:

- allow a dead witness to address a living person through the Medium;
- lend voice, sensation, handwriting, or remembered craft for a bounded task;
- establish trust by offering a use-name and terms of hospitality;
- recognize occupation, suppression, or foreign initiative in another person.

Failure should produce contaminated testimony, strained relationships,
residual impulses, or a specific injured part—not generic insanity.

### Summoner: rename and reconstruct as Binder

“Summoner” is too broad; many kinds of magician could summon. The current
practice is specifically about giving dead initiative an external shape and
making it answer to terms. **Binder** says what the practice actually does.

Current weaknesses:

- `Raise Shade` produces an anonymous roadside ghost with no provenance,
  consent, identity, or persistent relationship.
- `Soul Tithe` is a direct damage/heal spell with little connection to
  summoning.
- An ally acting after every player action risks becoming both passive and
  numerically dominant.
- “Conscripted dead” makes coercion the baseline rather than one contested
  method.

Direction:

Use a restrained **binding capacity**: usually one substantial bound presence,
or two small echoes, rather than an army. The player chooses the terms and
shape of service:

- a **named compact** is dependable but carries an obligation;
- an **impressed shade** is immediate and risky, with social and escape costs;
- a **made echo** is not a whole person, but has narrow abilities and weak
  initiative;
- a **recalled companion** has continuity across scenes and can disagree.

The Binder’s tactical decision is command allocation. The bound dead could
guard, harry, carry an effect, intercept, or finish a prepared command; it
should not merely add automatic damage.

Noncombat strengths:

- place an incorporeal lookout where a living scout cannot remain;
- provide dangerous labor while negotiating who bears the risk;
- bind a threat to a place, object, term, or duration;
- question the terms holding another spirit without merely extracting
  exposition;
- make an oath materially enforceable, with consequences if the Binder abuses
  it.

Weaknesses that should remain: action-economy exposure, vulnerability when a
binding is overturned, and the social visibility of commanded dead.

### Thaumaturgist: keep the role, reconsider the name

This is the strongest current bridge to economy, equipment, Medicine,
provenance, evidence, and ordinary trades. Its seeded harvesting proposal is
good. It has immediate reasons to care about the exact body, manner of death,
tools, witnesses, and lawful ownership.

“Thaumaturgist,” however, normally means a wonder-worker generally. It only
works as the class name if Maldirin uses it specifically for mortuary
transformation. **Mortuary Alchemist** is plainer and narrower; **Renderer** is
excellent in-world trade speech but insufficiently clear as the sole UI label.
A reasonable compromise is to retain Thaumaturgist provisionally and establish
why the word has this narrower meaning in Maldirin.

Current weaknesses:

- Both signature actions are self-contained ranged occult attacks.
- Materials are flavor and rewards more often than actual preparation choices.
- A harvesting/crafting identity can become tedious or economically mandatory.
- The practice risks becoming the best Medicine character, best crafter, best
  merchant of remains, and best damage-over-time combatant simultaneously.

Direction:

Make the core loop **prepare, substitute, spend, recover**:

- The Thaumaturgist has a small number of preparation slots refreshed at safe
  workspaces.
- Common preparations can be made from ordinary stock; rare reagents improve,
  alter, or safely substitute effects.
- Field rendering creates opportunities, not permission to use the class.
- Harvesting trades time, evidence, weight, and contamination for yield; it
  should never be the only viable way to refill baseline actions.

Combat should mix damage types and delivery:

- grave salt weakens incorporeal cohesion rather than cracking ribs;
- corpsefire persists and denies recovery;
- prepared tallow, bone dust, preserved sinew, or rendered iron can coat a
  physical weapon, seal a wound, foul a threshold, or expose a hidden form.

Noncombat strengths:

- diagnose death-altered material and identify contamination;
- preserve evidence or prevent a body from becoming dangerous;
- render lawful remains, surrendered grave goods, or hostile manifestations;
- repair tools and bodies with clear limits between Medicine and occult work;
- appraise provenance and recognize when a profitable relic is claimed.

Its enduring weakness should be preparation under uncertainty, not constant
poverty.

## Two missing practices

### Grave Warden — keep

**Fantasy:** A keeper of the agreements by which bodies stay buried, houses
remain houses, names remain attached to their proper dead, and hostile things
remain outside. The Warden is not a generic holy knight. Their craft is
necromantic because it works with the continued claims of the dead, the
material memory of graves, and the boundaries of mortuary custody.

**Combat engine:** Establish and exploit a limited number of **seals**.

- A seal can be set on a combatant, body part, object, or battlefield position.
- The Warden chooses whether it interposes, fixes a manifestation in matter,
  punishes a crossing, or holds a wounded part together.
- Powerful effects consume, invert, or leave a seal broken; Brace cannot become
  the whole class.
- Offense comes from fixing incorporeal targets into reach, returning force
  across a breached seal, and using grave iron or ossuary tools physically.

This creates defense and control without indefinite Ward stacking. It also
gives weapon and armor choices real importance: the Warden may be the most
credible hybrid physical/occult starting practice.

**Spirit cadence:** Gains a small return when an enemy actually breaches or
breaks a prepared seal, not every time the player passively blocks. The player
must invite a meaningful threat to recover.

**Body and equipment:** Grave iron, boundary cord, nails, tablets, shrouds, and
casket fittings. Warden advancement can stabilize a part during battle without
pretending a concussion can be bound shut. Long-term healing remains Medicine
and rest.

**Noncombat play:**

- diagnose how a tomb, household ward, burial procession, or body claim was
  breached;
- establish temporary shelter against a known supernatural pressure;
- verify custody and mortuary provenance;
- negotiate whether an obsolete covenant should be honored, repaired, or
  ended;
- protect ordinary workers while they complete dangerous burial labor.

**World alignment:** The Warden directly understands durable continuities. That
does not make them automatically right against Nymorai. A Warden can protect a
refuge, enforce a dead tyrant’s claim, or discover that the continuity itself
was founded on captivity. Their best superversive outcomes preserve the
conditions under which the weak can live and act, while truthfully repairing or
ending unjust arrangements.

**Weaknesses to preserve:**

- needs preparation and prediction;
- can be flanked by several simultaneous pressures;
- defense risks stalling unless seals must be committed and broken;
- social authority depends heavily on whether local people recognize the
  mortuary covenant being invoked.

Possible player-facing name: **Grave Warden**. “Sepulchralist” and similar
coinages add no useful clarity.

### Ferryman — conduct

**Fantasy:** A worker of last roads who creates, closes, follows, and reverses
passage for dead initiative. Ferrymen do not merely “put ghosts to rest.” They
can retrieve, exile, escort, divert, or return what has crossed.

“Ferryman” can be an inherited title for the practice rather than a statement
about the practitioner’s sex. If that does not fit Maldirin’s language, **Guide
of the Dead** or **Last-Road Guide** is clearer but less compact.

**Combat engine:** Mark **passages** between targets, states, or thresholds.

- A marked enemy can be driven partly out of phase, making it vulnerable to a
  physical follow-up.
- The Ferryman can transfer a status, Ward, or position along a prepared route
  rather than creating raw value.
- A near-defeated manifestation can be conducted out cleanly; a corporeal enemy
  must still be fought as a body.
- A closed route can deny reinforcements, possession, or an enemy’s escape.

This practice should emphasize tempo, target order, and finishing transitions.
It must not become an unconditional execute class.

**Spirit cadence:** Recovers a fixed, bounded amount when a significant
hostile dead presence completes a passage. Mundane kills do not become Spirit
fuel merely because the Ferryman was present. Failed or forcibly reversed
passages can strand Spirit until the scene ends.

**Body and equipment:** Bells, keys, marked cords, road tokens, funerary poles,
and weapons built to pin something at a threshold. Equipment can widen,
redirect, or safely close a passage. Wounds affect the steadiness or movement
needed to maintain routes.

**Noncombat play:**

- escort a dangerous dead presence without binding it into service;
- recover an exile or lost shade whose return route still exists;
- close a route used by possession, haunting, or supernatural pursuit;
- make a temporary path through a mortuary boundary or contested dominion;
- negotiate departure, destination, and the cost of return.

This is action, logistics, and relationship—not a universal information
solution. The dead may know nothing useful and still need to be moved.

**World alignment:** The Marching Country’s most morally important horror is
not change but migration that cannot reliably return. Ferrymen have a strong
answer to exile without being the chosen answer to the campaign. River magic,
divine roads, engineering, diplomacy, or destroying the local incorporation
can solve related problems differently.

**Weaknesses to preserve:**

- less raw force against ordinary corporeal enemies;
- strongest effects need a marked route or threshold;
- passage mechanics can become abstract unless every effect has a visible
  material anchor;
- execution and Spirit-on-defeat loops are easy to overtune;
- forcing departure can be socially or morally catastrophic even when it wins
  a fight.

## Suggested starting-role matrix

| Practice | Recurring combat question | Reliable strength | Deliberate pressure | Noncombat identity |
| --- | --- | --- | --- | --- |
| Medium | What may enter me, and on what terms? | Burst, adaptation, personal Ward | Local body strain and residual initiative | Hosting, testimony, recognition of possession |
| Binder | Which command or compact receives my authority? | Ally utility and action shaping | Binding capacity, obligation, revolt | Supernatural labor, watch, terms, oaths |
| Thaumaturgist | What do I prepare now, and what can substitute later? | Statuses, material adaptation, tools | Limited preparations, evidence, contamination | Rendering, preservation, diagnosis, provenance |
| Grave Warden | What must be kept continuous, and where will it be tested? | Interposition, control, hybrid defense | Seals must be committed and can be broken | Breach forensics, shelter, custody, covenant repair |
| Ferryman | What route should open, close, or reverse? | Tempo, phase control, clean transitions | Setup, weaker direct force, stranded routes | Escort, retrieval, exile, threshold work |

Every row should receive:

- one reliable low-cost action;
- one class-defining setup action;
- one expensive conversion or emergency action;
- one defensive/survival tool that cannot be spammed to profit;
- at least one advancement that changes the class loop;
- both corporeal and incorporeal encounter coverage.

The common Strike, equipment, wounds, mundane skills, and fixed mercy Spirit
recovery remain important. A practice must not replace the shared survival
game.

## Advancement runway

Current tradition trees contain only one two-node line each. Five practices
need branch identities before they need a large number of nodes.

Possible branch directions:

- **Medium:** Hospitality (safer reciprocal guests), Usurpation (forceful
  bodily power), Chorus (several small presences and control).
- **Binder:** Compact (named persistent relationship), Impression (strong
  coerced service and revolt risk), Echo-work (narrow constructed dead forms).
- **Thaumaturgist:** Preservation (defense, medicine adjacency), Rendering
  (yield and substitutions), Cold Furnace (damage, denial, contamination).
- **Grave Warden:** Threshold (crossing punishment), Custody (body and ally
  protection), Revision (repair or deliberately end obsolete covenants).
- **Ferryman:** Return (retrieval and protection), Exile (denial and finishing),
  Roadwork (transfer, mobility, and group passage).

These are not moral lanes. Each should contain hard choices and possible abuse.
Do not make every line linear. A level should sometimes offer mutually
exclusive changes to the same core action so the player creates a build rather
than collecting all arithmetic improvements.

Cross-practice universal branches remain valuable:

- body hardening and wound recovery;
- mundane training;
- Spirit capacity and recovery;
- weapon and equipment mastery;
- occult literacy that supports, but does not imitate, another practice.

Late cross-training may be desirable, but starting practices should stay
distinct for long enough to matter. A Binder who learns one ward should not
become a Grave Warden; a Medium using corpsefire from an item should not inherit
Thaumaturgist preparation mastery.

## Cultural and faction alignment

Avoid one global reaction to each class. Track deeds and visible techniques.
Suggested examples:

- A household that reveres ancestors may welcome a Medium under formal
  hospitality and despise an anonymous Binder.
- A military frontier may license Binders and Grave Wardens while treating
  Ferrymen as deserter-makers.
- A city mortuary guild may respect lawful Thaumaturgists, prosecute
  unregistered rendering, and distrust untestable Medium testimony.
- A migratory culture may honor Ferrymen and regard permanent sepulchral seals
  as imprisonment.
- A community repeatedly harmed by possession may fear Mediums while accepting
  a Grave Warden’s visible boundary work.

World state should record the observable act:

- admitted a named dead under witnessed terms;
- compelled a claimed ancestor;
- rendered remains with or without custody;
- repaired or broke a covenant;
- returned, diverted, or exiled a dead presence.

Person and faction knowledge then determine reactions. Do not assign a hidden
universal “Binder penalty.”

Practice-specific story choices should disclose their source without clunky
“Summoner only” copy. A compact label such as `BINDER PRACTICE` identifies why
the option exists. It should not reveal downstream consequences the character
could not know.

## Alternatives and cuts

### Reserve as later specializations or cultural traditions

**Bonewright / Necrosurgeon**

Excellent body, equipment, and wound hooks, but too much overlap with
Thaumaturgist plus Medicine for a sixth starting practice. It works better as a
Thaumaturgist branch, a cross-practice technical school, or a culturally
specific tradition. Revisit if constructed corporeal bodies become a full
companion system.

**Ancestor Keeper / Household Votary**

Strong social and relational flavor, especially in cultures where necromancy
is revered. At present it is better as a tradition that changes Medium, Binder,
or Grave Warden terms. It becomes a separate practice only if persistent
relationships with a small household dead become a campaign-scale mechanic.

**Name-worker / Mortuary Jurist**

Names, debts, testimony, records, and obligations are useful cross-practice
material. Making them a core class now risks promoting Saint Orra’s
proving-ground vocabulary into universal Maldirin metaphysics. Name-work could
be an occult branch, regional school, item family, or campaign-specific
discipline. It must do more than reveal information before becoming a class.

**Corpse Knight**

Good equipment fantasy; weak independent necromantic ontology. A physically
oriented Grave Warden, Binder, or Thaumaturgist build can satisfy it without
adding a sixth class.

### Cut as core concepts

**Death mage / Reaper**

These reduce necromancy to damage color and visual style. Their useful mechanics
belong inside the five practices.

**Generic Exorcist**

Opposing spirits is not enough to define a necromancer. Its useful functions
split naturally between Grave Warden containment and Ferryman passage. A
religious exorcist is also an important non-necromancer peer or rival.

**Dedicated oracle**

“Ask the dead for the answer” is too narrow, too strong in investigations, and
too repetitive. Mediums can sometimes obtain testimony, but the game should
continue to demand Perception, Medicine, Survival, Persuasion, records,
relationships, and material evidence.

## Implementation implications

### Model the practice, do not branch on it everywhere

The eventual domain should use a typed practice catalog and focused mechanic
modules. Avoid adding five-way practice switches to the story engine, battle
facade, renderer, inventory engine, and Witness formatter.

A practice definition will likely need references to:

- starting action IDs;
- starting-kit ID;
- attribute and skill adjustments;
- occult attribute;
- Spirit profile or recovery-rule ID;
- advancement branch IDs;
- player-facing capability tags used by content selectors.

Unique action behavior belongs in action/technique definitions and focused
resolvers. Authored narration belongs in the existing catalogs. Story content
should check explicit capabilities or practice IDs only when the fictional
approach genuinely depends on them.

### Separate practice from starting body and mundane competence

The current definition binds fixed attributes and skills to each practice.
That is acceptable for the proving ground but will make every practitioner of a
practice feel culturally identical.

A staged character build could become:

1. base human attributes and shared ordinary competence;
2. practice adjustments and starting actions;
3. formation/background adjustments, kit, standing, and one mundane specialty;
4. limited player allocation.

Keep common experience meaningful. Zero remains untrained, not incapable of
ordinary life.

### Preserve one Spirit resource, diversify the cadence

One shared Spirit pool is currently valuable UI and balance language. Do not
give every class a new colored meter merely to prove distinctness.

Differentiate how each practice converts circumstances into Spirit:

- Medium: completes a bounded passage or dismisses a passenger on honored
  terms;
- Binder: fulfills or releases a binding rather than farming every ally attack;
- Thaumaturgist: consumes a preparation or uses safe work, with limited field
  substitution;
- Grave Warden: survives an actual breach of a committed seal;
- Ferryman: completes a significant dead passage, with a per-encounter cap.

All retain the fixed mercy recovery after defeating enemies. Equipment and
advancement can improve the class-specific cadence.

### Build a practice acceptance matrix

Before calling any roster balanced, test each practice against:

- one mundane armed opponent;
- several weak opponents;
- an armored corporeal opponent;
- an incorporeal manifestation;
- a body with nonstandard vital regions;
- a long encounter with scarce Spirit;
- an injured start;
- a noncombat medical problem;
- a negotiation with hostile local attitudes;
- a route problem where mundane skill is the best answer.

Measure not only win rate but action diversity, turns spent stalling, resource
state after victory, wounds incurred, and whether a practice-specific choice
crowds out ordinary approaches.

### Migration and authored-content cost

Renaming `summoner` to `binder` requires an explicit save migration or a stable
legacy ID with a new display name. The same is true if `thaumaturgist` changes.
Adding practices expands:

- `TraditionId` or its successor;
- creation validation and UI;
- starting kits and item support;
- action IDs and action resolution;
- advancement modifier IDs and offers;
- content schema matrices;
- persistence normalization;
- practice-specific choices and outcome text;
- full-flow fixtures and performance cohorts.

This is a reason to settle the conceptual five before writing a large volume of
new class-gated content.

## Recommended decision

Approve the five-practice model for a paper balance pass:

- Medium
- Binder
- Thaumaturgist (name under review)
- Grave Warden
- Ferryman

Rename the player-facing ontology to **practice** before canon text grows around
the wrong distinction. Preserve the three existing IDs during the first
implementation stage. Prototype Grave Warden and Ferryman with definitions,
two actions each, one starting kit each, and two advancement branches on paper
before production work.

The first test is not whether the new actions look evocative in isolation. It
is whether all five solve the same mixed encounter set in recognizably
different ways, pay different but fair costs, and create different later
relationships with the living world.
