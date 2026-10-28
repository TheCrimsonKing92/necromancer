# Prose style guide

This is a working contract for authored copy. It governs recurring catalogs,
scene prose, choice cards, result cards, combat telegraphs, and the Witness.
It does not replace regional voices or character-specific diction.

## Core voice

Write dry, dark, foreboding prose. Put the weight in observable things: wet
cloth, a counted body, a damaged gate, a tool put away, a witness who turns
back. Let work, custom, injury, weather, and authority carry dread before the
narrator explains it.

- Be concrete before being lyrical. One exact material consequence is stronger
  than three decorative metaphors.
- Keep lyricism occasional and consequential. A strange image should clarify
  what changed, not advertise the sentence that contains it.
- Do not joke at the world, wink at the player, or reward cruelty with a clever
  aside. Avoid smarm, cute reversals, punchlines, and mock-bureaucratic quips.
- Do not imitate another game's narrator, cadence, vocabulary, or sentence
  architecture.
- Do not turn the proving ground's names, debts, ledgers, and burial accounts
  into Maldirin's universal metaphysics. Use them where Saint Orra, county law,
  or a particular practice makes them material.

## Information discipline

Player-facing prose distinguishes what the character can know now from what the
rules know privately.

- State an immediate, certain cost or result clearly: coin spent, Health lost,
  an item surrendered, a known check, or time knowingly yielded.
- Describe risk at the level the character can judge. Do not reveal the exact
  enemy action, future pressure value, hidden faction response, or seeded
  outcome bought by that risk.
- A choice explains the act and its knowable stake. It does not summarize the
  result in advance.
- A result card speaks after the act. Its title and body must describe what
  actually occurred, including failure; never title a failed exchange as though
  the goods changed hands.
- Once an optional act resolves, rewrite or remove remaining copy that still
  describes the unresolved situation. Mutually exclusive conclusions must not
  appear as if all were completed.
- Mechanical result lines may be explicit. Surrounding flavor should not recite
  the same number in metaphor.

## Combat and the Witness

The Witness records a sequence, not a template with names inserted.

- Lead with the authored action: what the knife, salt, voice, hound, servant, or
  manifestation does. Reserve generic `<actor> uses <action>` for uncatalogued
  fallback copy, and treat an authored action reaching that fallback as a test
  failure.
- Put contributions before the transition they may cause. Off-hand damage,
  disciplines, statuses, and mitigation belong before wound or defeat language
  when causally earlier.
- Report mitigation before the damage that remains. If Ward absorbs everything,
  say so without claiming a wound. If only part is absorbed, name the remainder
  once.
- Do not recite a discipline name after every use. Give its learned contribution
  action-specific language, then report the mechanical change once.
- Mark major transitions. Defeat language must distinguish Health exhaustion
  from a vital region's destruction and must fit corporeal humanoids,
  quadrupeds, bound dead, and incorporeal forms.
- Anatomy is factual. A hound has jaws, paws, legs, and a flank; an incorporeal
  reach is not an arm in armor; an attack cannot claim shoulders and then land
  on a leg. When the resolved location follows, action leads should remain
  location-neutral unless the action itself fixes the location.
- Use each combatant's established pronouns and possessive determiner. Prefer
  `her left arm`, `his torso`, or `its flank` to repeated generic `the` where the
  owner is known.

## Scene and choice rhythm

- Give each paragraph one job: establish the material situation, reveal a human
  interest, or tighten the decision.
- Choices should sound like acts a person can take, not menu categories. Source
  practice-specific leverage with its practice label without adding clumsy
  `only` language.
- Optional does not mean free. Use certain tradeoffs, uncertain risks, resource
  competition, changed relationships, and lost opportunities; do not teach the
  player to click every optional choice before leaving.
- Friendly, neutral, mundane, service, labor, and exchange scenes carry the
  setting as seriously as battles do. Do not make ordinary life comic relief or
  every institution a disguised cult.
- Post-choice prose begins from the new state. Avoid repeating a scene sentence
  verbatim in its result card; use the card for the action's consequence.

## Diversity and revision checks

Repeated structures make authored prose feel procedural even when every line is
handwritten. During revision, check adjacent and recurring content for:

- repeated openings such as `The X...`, `Something...`, or an actor's full name;
- repeated signatures such as `finds nothing`, `the place ... already left`,
  `gathers`, `folds`, `comes loose`, and `into the rain`;
- three consecutive sentences with the same length or clause shape;
- the same weather image doing unrelated work in several actions;
- ornate synonyms replacing known concepts such as Strength, Dexterity, Health,
  or a recognizable body part;
- a metaphor that conflicts with the structured location, materiality, weapon,
  or resolved outcome.

Do not solve repetition with random synonym swaps. Change the observed action,
sentence shape, or point of attention. Preserve a repeated phrase when it is a
deliberate character, institution, or ritual motif.

## Grammar and referent checks

Grammatical agreement is necessary but not sufficient. A sentence can parse
cleanly while a pronoun refers to the wrong nearby noun. Before accepting new or
edited player-facing prose:

- trace every `it`, `them`, `this`, `that`, `which`, and possessive pronoun to the
  exact noun it replaces;
- when the intended referent is an abstract term such as subjecthood, custody,
  authority, consent, service, or obligation, repeat the noun if a nearer person,
  group, or object could plausibly claim the pronoun;
- do not let grammatical number choose the meaning by accident: `households did
  not empower her to surrender it` refers to subjecthood, while `surrender them`
  claims that the households themselves are being surrendered;
- read conditional and generated variants after interpolation, not only as
  fragments in source; and
- prefer a repeated concrete noun over an elegant but ambiguous pronoun.

`npm run check:prose` enforces objective text hygiene and a deliberately narrow
set of high-risk referent constructions. It is a guardrail, not a semantic
grammar oracle: authored prose still requires the antecedent pass above and a
rendered-context review.

## Catalog contract

Repeatable prose lives in typed catalogs beside the concept that owns it. Use
aliases only when actions intentionally share language. Formatters order
structured facts; they do not contain a growing switch of authored passages.
Catalog validation should protect completeness, token validity, anatomy and
materiality contracts, and known forbidden fallbacks. Tests should not police
subjective taste or freeze incidental punctuation.
