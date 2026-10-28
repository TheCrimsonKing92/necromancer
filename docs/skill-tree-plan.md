# Full skill-tree plan

Status: design target, July 2026. This document does not make the planned
practices playable and does not replace the current advancement catalog.

## Purpose

Advancement should change what the player considers doing, not merely make the
same action larger. A good node changes at least one of:

- the verb available this turn;
- the target, timing, or failure state of an existing action;
- which resource is committed now and recovered later;
- how bodies, equipment, evidence, actors, or routes can be used;
- what the character is willing to risk or leave behind.

A coefficient is acceptable only when it supports such a rule. A node whose
whole identity is `+damage`, `+Ward`, `+Health`, `+Spirit`, or `+duration`
belongs in the legacy bridge or should be cut.

The committed practice roster is Medium, Bonebinder, Renderer, Grave Warden,
and Ferryman. Necromancy, Body, and Mundane training remain shared. Practices
own their signature verbs. Universal trees may improve observation, ordinary
survival, equipment use, occult steadiness, and failure management; they must
not host, bind, render, seal, or conduct on a practice's behalf.

## Progression and readiness

The current curve is:

`XP(level) = 5 × (level - 1)² + 20 × (level - 1)`

| Level | Total XP | Discipline points earned |
| ---: | ---: | ---: |
| 1 | 0 | 0 |
| 2 | 25 | 1 |
| 3 | 60 | 2 |
| 4 | 105 | 3 |
| 5 | 160 | 4 |
| 6 | 225 | 5 |
| 8 | 385 | 7 |
| 10 | 585 | 9 |
| 12 | 825 | 11 |

Keep one point per level after first. Use four paper tiers:

- **Tier I — Initiate, level 2:** a first loop-changing discipline.
- **Tier II — Practitioner, level 5:** deeper timing, targeting, and failure
  choices.
- **Tier III — Adept, level 8:** cross-branch synthesis and difficult
  world-facing work.
- **Tier IV — Master, level 11:** intentionally deferred until campaign-scale
  consequences exist. No Tier IV node should ship as a battle-only capstone.

The nodes below create a credible runway through Tier III. They are not a
promise to fill every cell. Empty space is preferable to arithmetic filler.

### Learned, prepared, and mutually exclusive

Every discipline is learned permanently. Learning remains available from the
character advancement surface in any living, noncombat state with a point
available. It is never withheld because the player missed a trainer scene or
failed to dismiss a result card.

Baseline practice actions are always ready. Optional active techniques and
action transforms use **readiness**:

- two practice readiness slots at level 2;
- a third at level 6;
- a fourth at level 10;
- one universal readiness slot at level 2 and a second at level 8.

Readiness changes only outside combat. A learned passive that does not alter an
action is normally always on. A transform and the active technique it replaces
both occupy one readiness slot. This keeps the action bar bounded and makes
safe preparation matter without turning every rest into inventory labor.

### Two duality models

The tree should use both models deliberately.

**Model A — doctrine fork.** The player permanently learns one of two mutually
exclusive nodes. Retraining requires a world-grounded service, mentor, or
reckoning and a real cost; it is not a free loadout toggle. Use this when the
choice changes relationships, consent, provenance, public method, or the
character's long-term failure mode.

**Model B — prepared expression.** One learned discipline unlocks two
expressions, but only one can occupy its readiness slot: an active verb or a
passive/transform expression. Use this for tactical delivery choices the
character could plausibly prepare differently at safety.

For legibility, Model B expressions receive separate rows below because each
needs a complete rules/UX/test contract. The paired rows are one purchased
discipline, not two separately purchased advancement nodes. Model A rows are
separately purchased nodes and exclude one another.

Model A prevents identity from becoming a pre-battle menu. Model B prevents a
player from regretting a permanent lock merely because the next enemy has a
different anatomy. The node tables identify each pair as `A` or `B`.

Implementation consequences:

- Model A saves the selected doctrine ID and any retraining history. Its
  confirmation must show the excluded alternative and the cost of later
  retraining.
- Model B saves the learned discipline once and the prepared expression ID
  separately. The advancement screen explains both expressions; the readiness
  screen shows which one is live.
- The battle action bar shows only ready actives. Always-on passives appear in
  the dossier and in contextual action details, not as disabled buttons.
- A transform changes the existing action card in place and names its source.
  It must not add a second near-duplicate action.
- Save normalization supplies an empty readiness list, then readies baseline
  compatibility choices deterministically. Unknown learned nodes are preserved
  rather than discarded.

Recommended Model A choices are guest-right versus occupation, compact versus
compulsion, common stock versus opportunistic rendering, custody versus
revision, and taking a return toll versus closing a passage. Recommended Model
B choices are tactical guest expression, servant command expression,
Corpsefire delivery, seal response, passage routing, and universal failure
management.

## Shared system vocabulary for the node tables

Each row includes the required implementation and communication contract.

- **Guest state:** named guest, terms, authority, agenda, strain, and dismissal.
- **Servant state:** persistent combatant, anatomy, command, tether,
  provenance, obligation, somatic memory, and repair.
- **Preparation state:** recipe, slot, quality, source, contamination,
  residue, and refill rules.
- **Seal state:** anchor/target, integrity, trigger, custody, breach, and
  consumption.
- **Passage state:** origin, destination, anchor, progress, closure, and
  stranded Spirit.
- **World contract:** capabilities, facts, evidence, provenance, claims,
  relationships, standing, pressure, and route predicates.
- **Witness contract:** structured events first; action-specific prose composed
  from source, target, body/materiality, mitigation, consequence, and state
  transition. Discipline names appear as sources only when useful, never as
  repetitive slogans.

All numbers are initial balance targets, not tuning promises. A bodily cost is
listed only for overdraw, breach, contamination, or transgression. Spirit is
the ordinary occult cost.

## Compact practice comparison

| Practice | Branches | Core combat decision | Corporeal answer | Incorporeal answer | Persistent world output | Deliberate weakness |
| --- | --- | --- | --- | --- | --- | --- |
| Medium | Hospitality, Usurpation, Chorus | who is admitted and how much authority they receive | hosted craft, weapon use, bodily burst | guest conflict, eviction, chorus control | testimony, witnessed terms, occupation evidence | personal strain and guest agendas |
| Bonebinder | Compact, Impression, Echo-work | which command receives the player's act and what the tether permits | persistent servant anatomy, equipment, labor | echoes, anchors, occult command | visible body, custody, obligations, recognition | companion damage, action exposure, social visibility |
| Renderer | Preservation, Rendering, Cold Furnace | what was prepared and whether to spend, substitute, or preserve it | mixtures, coatings, surgery, armor chemistry | grave salt, immaterial reduction, residues | materials, contamination, provenance, forensic evidence | preparation under uncertainty |
| Grave Warden | Threshold, Custody, Revision | where to commit a limited seal and whether to preserve or break continuity | grave iron, interposition, body seals | fixation, crossing punishment, containment | custody, shelter, breach findings, covenant changes | prediction and simultaneous pressure |
| Ferryman | Return, Exile, Roadwork | what route is marked and when a passage completes | tempo, transfer, retreat, ordinary weapon follow-up | escort, retrieval, exile, closed crossings | safe conduct, disturbed thresholds, obligations of return | setup and lower direct force |

## Medium

Baseline Medium play requires one named guest slot, `Admit Guest`, `Dismiss
Guest`, Spirit Lash as the unhosted reliable action, and Borrowed Might as a
deeper draw on the current guest. Guests provide a small typed technique set
and one mundane capability. Borrowed Might costs Spirit normally; bodily harm
occurs only when the player overdraws, violates a term, or accepts a guest whose
known price is strain.

### Medium nodes

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Kept Room** — Hospitality, Tier I, no prereq; **passive, Model A doctrine**; excludes Second Chair | The Medium can host only one guest. For its first three rounds, that guest costs no maintenance. Honorable Dismissal restores 2 Spirit and removes one guest-caused status; it cannot heal Health or condition. | A hosted guest may provide its one authored testimony/craft approach, and witnessed terms become evidence. The Medium cannot offer simultaneous hospitality to another dead actor. | Safety and reliable closure are bought with inflexibility. Second Chair remains desirable because it can change tools after combat has already declared its problem. | Guest/term/dismissal state, world evidence and guest-authored capabilities. Dossier shows the guest, term, rounds of free maintenance, and honored/breached state; Witness describes the honored departure and exact recovery. | No positive Spirit loop from repeatedly admitting/dismissing; one guest cannot satisfy incompatible scene roles; overdraw still matters after the protected consequence; save/load preserves term progress. |
| **Second Chair** — Hospitality, Tier I, no prereq; **active, Model A doctrine**; excludes Kept Room; ready action | `Invite Reserve Guest` costs an act and 2 Spirit, replaces the current guest or hosts a second for two rounds. Two guests increase each maintenance payment by 1 Spirit; either may answer a violated term. | Carry one additional contacted guest and switch which guest can speak or lend a craft. Inviting in public creates evidence of both identities and may change actor reactions. | Adaptation costs tempo, Spirit, and agenda exposure. Kept Room remains desirable for long fights, safer testimony, and clean Spirit recovery. | Two-slot guest state, guest selection UI, authored reserve-guest content. The action preview names the departing/arriving guest and known maintenance but not an undisclosed agenda; Witness records each admission separately. | Switching never creates a free action; the second guest cannot double the same passive; encounter starts remain viable at minimum Spirit; hostile/neutral/friendly guest tests. |
| **Borrowed Hand** — Usurpation, Tier II, requires any Medium Tier I node; **active, Model A doctrine**; excludes Sovereign Frame; ready action | Costs 1 Spirit and an act. The guest makes one attack through the Medium's equipped weapon using the better of the Medium's physical accuracy or the guest's authored craft rank, but uses the weapon's damage and injury profile. On a miss, the used arm loses 1 condition; no wound is created unless condition damage crosses the normal wound threshold. | A hosted craftsperson may perform one bounded physical task the Medium could not perform, leaving recognizable handwriting, technique, or tool marks. | It supplies a credible corporeal answer but exposes a specific limb and evidence of another hand. Sovereign Frame remains desirable for occult reliability and fewer tool requirements. | Guest craft profile, equipment attack pipeline, localized condition loss, evidence marks. Action card identifies weapon, guest, accuracy source, and threatened limb; Witness leads with the guest's motion rather than “uses Borrowed Hand.” | Test unarmed, two-handed/off-hand, wounded arm, incorporeal target, miss, armor, and guest without relevant craft. It must not outperform a physical specialist with every weapon. |
| **Sovereign Frame** — Usurpation, Tier II, requires any Medium Tier I node; **transform/passive, Model A doctrine**; excludes Borrowed Hand | Borrowed Might costs 3 Spirit, deals occult damage equal to occult power + 4, and never has a routine Health cost. If used below 3 Spirit, the player may decline or explicitly overdraw: pay the shortfall as torso condition and gain a serious guest-specific wound on any hit or miss. It cannot spend Ward to erase that declared transgression. | Coerced guests can force doors, resist possession, or perform dangerous bodily feats, but each use adds one occupation/breach fact visible to knowledgeable observers. | Reliable burst preserves action-bar space but has a severe, chosen overdraw and social trail. Borrowed Hand remains desirable for cheap physical attacks, material injury profiles, and cooperative craft. | Explicit overdraw confirmation, guest authority and breach history, body consequences. The transformed card shows normal cost and a separate red overdraw contract; Witness distinguishes ordinary use from violated bodily limits. | At sufficient Spirit it must be competitive, not dominant; at insufficient Spirit the player can always cancel; Ward cannot launder the wound; repeated use raises consequences without making wounds routine mana. |
| **House of Voices: Many Mouths** — Chorus, Tier II, requires any Medium Tier I node; **active expression, Model B** paired with Quiet Assembly; ready transform | While prepared, full guests are replaced by up to three impressions. `Many Mouths` costs 2 Spirit and an act: choose up to three enemies; each receives `Distracted 1` for two rounds, while incorporeal targets also lose 1 Ward. Impressions cannot use Borrowed Might. | The chorus can canvass a place for overlapping recollections or address a crowd, but produces claims with separate sources and lower confidence. | Broad control gives up named-guest burst, precise testimony, and guest craft. Quiet Assembly remains desirable when defense and reliable perception matter more than a new button. | Impression roster, multi-target status, claim provenance/confidence. UI shows three named/source-tagged impressions and the loss of full-guest actions; Witness uses several concrete fragments, not generic babble. | Cap targets at three; bosses are not stun-locked; mundane targets still have a useful effect; claims never collapse into omniscient scene solutions. |
| **House of Voices: Quiet Assembly** — Chorus, Tier II, requires any Medium Tier I node; **passive expression, Model B** paired with Many Mouths; ready transform | Full guests are replaced by impressions. Once per round when the Medium is targeted, one impression may be spent to add 10 percentage points to evasion or occult resistance against that action; spent impressions return only after combat. No new action is granted. | At a scene, spend an impression to surface one authored warning, contradiction, or actor-recognition prompt. The player must still use an ordinary skill or choice to act on it. | Passive warning avoids action cost but has only three charges and removes guest burst/craft. Many Mouths remains desirable against groups and Ward-bearing manifestations. | Targeting reaction window, impression charges, authored clue prompts. Dossier and target preview show remaining voices; Witness names what warned the Medium only when the defense changes the outcome. | Charges cannot refresh through stalling; verify attack and status targeting, mixed enemy groups, and no hidden-fact disclosure; compare damage prevented to active control turns. |
| **Reciprocal House** — Medium synthesis, Tier III, requires three Medium nodes across at least two branches; **passive, Model A mastery**; excludes Occupied Throne | Once per encounter, when a guest's authored term is fulfilled, choose either a zero-act Honorable Dismissal or let that guest take one term-specific reaction. The reaction cannot be a generic bonus attack and restores no Spirit if chosen. | Fulfilled terms may convert a guest relationship into a durable contact, testimony source, or future voluntary summons; the guest can also refuse later abuse. | Rewards preparation and reciprocity but depends on authored terms. Occupied Throne remains desirable for immediate control when no cooperative guest fits the problem. | Term-trigger catalog, relationship progression, reaction narration. UI previews both known fulfillment rewards; Witness names the completed term before the guest's final act or departure. | Every launch guest needs at least one attainable term; no reaction loops; voluntary contacts do not solve required objectives alone; hostile-term and impossible-term recovery tests. |
| **Occupied Throne** — Medium synthesis, Tier III, requires three Medium nodes across at least two branches; **active transform, Model A mastery**; excludes Reciprocal House; ready | Once per encounter, spend 3 Spirit and an act to suppress the current guest's agenda for three rounds. Guest techniques cost 1 less Spirit during suppression, minimum 1. When it ends, become Exposed 1 for two rounds and the guest immediately tests occupation; failure creates a specific residual status, never random self-harm. | Compelled testimony or craft can bypass refusal, but records a coercion fact, creates evidence in witnessed scenes, and can close cooperative guest routes. | Strong control is bounded, delayed-risk, and socially expensive. Reciprocal House remains desirable for sustainability, safe closure, and durable relationships. | Agenda/occupation check, coercion facts, authored residuals. Confirmation states known duration and Exposed consequence while withholding the exact occupation result; Witness clearly marks suppression ending before the check. | One use per encounter; cost discount cannot make actions free; occupation failure remains recoverable; test guestless use, immune guests, death during suppression, and save/load mid-duration. |

## Bonebinder

Baseline Bonebinder play is the existing persistent-servant boundary: one
corporeal, named actor with shared anatomy, wounds, equipment, provenance, and
commands. Guard, Interpose, Harry, and Withdraw consume the player's ordinary
act. The servant never adds an automatic attack after an unrelated action.
Spirit maintains the tether and pays exceptional commands; repair consumes
materials and follows body/wound rules.

### Bonebinder nodes

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Letter of Service** — Compact, Tier I, no prereq; **passive, Model A doctrine**; excludes Called Counsel | Choose one service purpose outside combat. Commands matching it cost 0 Spirit; other exceptional commands cost +1 Spirit. The servant cannot be ordered to violate the written purpose without explicitly breaking the compact. | The servant performs one matching labor/custody/watch capability and the compact becomes inspectable evidence. Fulfilled service advances obligation and standing with the seated initiative. | Cheap dependable specialization gives up flexibility. Called Counsel remains desirable because it can bring somatic memory to an unforeseen task. | Purpose/obligation state, command tags, world instrument/evidence. Dossier and command cards mark matching/refused orders; Witness describes refusal or compliance before mechanical effects. | Every starting purpose must support at least two commands and one route use; no zero-cost Spirit farm; breaking terms has authored recovery; save/load preserves purpose. |
| **Called Counsel** — Compact, Tier I, no prereq; **active, Model A doctrine**; excludes Letter of Service; ready action | Costs an act, no Spirit. The servant replaces its current command with one somatic-memory action selected from its body profile: Brace, shove, weapon technique, or guarded movement. It cannot repeat the same counsel action on consecutive rounds. | Invoke one remembered trade or recognition response. The result is bodily habit, not verbal omniscience, and may alert someone who recognizes the work. | Flexible actions consume tempo and depend on the body. Letter of Service remains desirable for predictable, efficient command chains and clearer legal terms. | Somatic-memory catalog, cooldown, body identity and recognition. UI identifies source body and available motions; Witness attributes movement to remembered work, never to recovered full personality without evidence. | No counsel action exceeds a player's dedicated action; destroyed relevant limb removes it; incorporeal and armored tests; recognition evidence does not reveal secret actor beliefs. |
| **Hard Compulsion** — Impression, Tier II, requires any Bonebinder Tier I node; **transform/passive, Model A doctrine**; excludes Loose Rein | Harry and Interpose cannot be refused or interrupted by low obligation. They gain +10 percentage points accuracy or interception chance. Each compelled command adds 1 tether strain; at 3 strain the next command ends the servant's turn and triggers a revolt check, then strain resets. | Compelled labor ignores reluctance but records abuse and may produce witnesses, damaged claims, or escape pressure. | Reliability accumulates a visible delayed failure. Loose Rein remains desirable for no strain, autonomous problem-solving, and better relationships. | Tether strain/revolt state, command probability, abuse facts. Command cards show current strain and the exact next threshold; Witness records the resisted tether before a revolt outcome. | No reset by entering/leaving inventory; revolt is recoverable and not random instant loss; command bonus cannot exceed accuracy caps; long-fight and low-Spirit tests. |
| **Loose Rein** — Impression, Tier II, requires any Bonebinder Tier I node; **active, Model A doctrine**; excludes Hard Compulsion; ready action | `Release Initiative` costs an act and 1 Spirit. Clear the current command; the servant immediately performs one authored instinct from its identity/body state. The player sees the possible intent set but not the exact choice. It cannot target the player unless the tether is already breached. | The servant may independently avoid danger, aid recognized kin, refuse desecration, or pursue remembered work, creating relationship and route consequences. | It creates uncertain but potentially efficient action without coercion. Hard Compulsion remains desirable for exact targeting, emergency interception, and hostile bodies. | Deterministic seeded intent cadence, relationship/recognition inputs. UI lists likely intents in character knowledge terms; Witness names the servant as actor and explains the visible reason after resolution. | Same seed/state gives same intent; no free repeat loop; intent cannot sabotage required-objective solvency without an alternative; test unknown/hostile/loyal bodies. |
| **Made Echo: Splinter Guard** — Echo-work, Tier II, requires any Bonebinder Tier I node; **active expression, Model B** paired with Tool Memory; ready | Spend 2 Spirit and an act to detach an echo from the servant for three rounds. Mark one incorporeal enemy: it loses materiality-based physical resistance against attacks involving the servant, and the servant cannot Interpose while the echo is detached. | The echo can hold a doorway, watch a nonphysical boundary, or carry one narrow sensory capability. It is a made function, not a whole dead person. | Provides an incorporeal answer by sacrificing the servant's best defense. Tool Memory remains desirable for physical, labor, and equipment-heavy problems. | Temporary echo state, materiality interaction, capability limits. Combatant/dossier show the missing guard and rounds; Witness describes the servant's frame losing support before the echo fixes a target. | Physical parties gain only bounded access; no universal resistance deletion; expiration and target death cleanup; servant defeat while detached; social content distinguishes echo from person. |
| **Made Echo: Tool Memory** — Echo-work, Tier II, requires any Bonebinder Tier I node; **passive expression, Model B** paired with Splinter Guard; ready | The servant may ready one body-compatible weapon or tool technique. Its Harry command uses that item's attack and injury profile, but loses Guard until the next player turn. No separate echo combatant appears. | The servant gains one remembered trade/labor capability keyed to equipped tools and provenance; replacement tools do not grant memories the body never had. | Strong corporeal/equipment integration exposes defense and lacks immaterial fixation. Splinter Guard remains desirable against manifestations and supernatural thresholds. | Servant equipment, body compatibility, memory/tool catalog. Command card previews damage profile and Guard loss; Witness orders tool follow-through before defeat narration. | Off-hand/two-handed/body-part constraints; no double equipment bonuses; quadruped/nonhumanoid bodies; weapon damage remains below a dedicated player build. |
| **Mutual Tether** — Bonebinder synthesis, Tier III, requires three Bonebinder nodes across at least two branches; **passive, Model A mastery**; excludes Composite Frame | Once per encounter, when either Binder or servant would suffer a grievous wound or defeat, transfer the triggering post-mitigation condition loss to the other if it has a valid corresponding part and enough condition. The transfer cannot reduce either below 1 Health and creates 1 tether strain. | Harm taken voluntarily can fulfill a compact obligation or change the servant relationship; observers can identify the reciprocal tether. | Preserves a specific partnership but shares catastrophe and requires anatomical compatibility. Composite Frame remains desirable for capability breadth and replaceable construction. | Cross-combatant damage transfer through ordinary resolution, anatomy mapping, obligation event. Target preview shows eligible recipient and consequence; Witness states mitigation, transfer, body part, then surviving outcome in order. | No damage duplication/deletion; armor applies only once before transfer; no loop with Interpose; manifestation mismatch, missing part, simultaneous defeat, and save/load tests. |
| **Composite Frame** — Bonebinder synthesis, Tier III, requires three Bonebinder nodes across at least two branches; **transform, Model A mastery**; excludes Mutual Tether; ready | At safe repair, install one replacement part with a typed capability. In battle it grants one additional command, but using it adds 1 conflict; at 3 conflict the servant loses its next command and one random *eligible installed* part loses 2 condition. | Composite labor opens broader route capabilities while multiplying provenance, custody, recognition, and evidence claims. No installed part imports a full personality. | Breadth and replaceability trade away a coherent partner and reliable command cadence. Mutual Tether remains desirable for stable identity and emergency survival. | Installed-part anatomy/provenance, capability and conflict state, repair UI. Dossier shows every source and claim; Witness names the conflicting motion and damaged installed part without implying insanity. | No arbitrary body-part pool; conflict cannot damage absent anatomy; capability breadth does not replace mundane specialists; seizure/removal/reinstallation and save migration tests. |

## Renderer

Baseline Renderer play requires two preparation slots, baseline refills at a
safe workspace without harvesting, and typed quality/source/residue. Grave Salt
weakens occult cohesion and Corpsefire creates a persistent setup. Ordinary
stock always supports a viable loop. Field rendering buys flexibility, rare
properties, or economy; it is never permission to use the practice at all.

### Renderer nodes

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Counteragent** — Preservation, Tier I, no prereq; **active expression, Model B** paired with Clean Bench; ready | Prepare one Counteragent in a slot. Spend it and an act to remove one poison, Burning, contamination, or Renderer-created status from a target and prevent the same status for one round. It restores no Health, condition, or closed injury. | Neutralize one identified contamination in a body, tool, water source, or evidence sample while preserving the underlying evidence. | A new rescue verb consumes a slot and tempo. Clean Bench remains desirable for passive safety and more offensive preparation space. | Preparation/status taxonomy, consumable slot, preservation evidence. Card lists removable known statuses and empty-slot consequence; Witness names the substance neutralized, not merely the recipe. | Cannot cleanse unknown/untyped curses; no permanent immunity; self/ally/enemy targeting; removing own Corpsefire cannot generate benefit; refill solvency with baseline stock. |
| **Clean Bench** — Preservation, Tier I, no prereq; **passive expression, Model B** paired with Counteragent; ready | The first preparation used each encounter cannot contaminate the Renderer and leaves no self-Exposed consequence. If it targets an ally, that ally also gains 1 Ward; Ward is subordinate and granted once per encounter. No new action is added. | Field preparation takes half the ordinary time and preserves source evidence, but does not conceal residue or make unlawful custody lawful. | Saves a slot and failure risk but cannot answer an existing status. Counteragent remains desirable in long/status-heavy encounters and medical scenes. | Per-encounter clean-use flag, preparation failure/contamination, evidence preservation. Dossier shows the unused clean measure; Witness mentions the controlled preparation only when it prevents a consequence. | Exactly once per encounter; no reset through inventory; Ward never exceeds cap; illegal rendering still records fact/evidence; compare value to one Counteragent use. |
| **Open Crucible** — Rendering, Tier II, requires any Renderer Tier I node; **active, Model A doctrine**; excludes Common Stock; ready action | Once per encounter after a corporeal enemy is wounded or an incorporeal enemy loses Ward, spend an act and 1 Spirit to extract one typed field dose from it. The target loses no extra Health. The dose occupies a free slot and expires after combat; failure leaves visible residue and spends the act, not Spirit. | Render a body, manifestation, grave good, or site in the field using a seeded yield check. Quality, quantity, witness, contamination, claims, and evidence resolve separately. | Adaptation and rare yield require time, a valid source, a free slot, and social exposure. Common Stock remains desirable for dependable starts and freedom from body-processing pressure. | Source/yield/provenance/evidence pipeline, deterministic check, preparation slots. UI names known source and possible yield bands without exact hidden roll; outcome card distinguishes no yield from consequences. | Same seed/state reproducible; no corpse-loot guarantee; every practice route remains viable without harvesting; hostile source, claimed body, incorporeal residue, no slot, and witness tests. |
| **Common Stock** — Rendering, Tier II, requires any Renderer Tier I node; **passive, Model A doctrine**; excludes Open Crucible | At safe preparation, fill all empty baseline recipe slots without materials. Common-stock preparations have quality 1 and cannot carry rare source traits. During combat, one empty slot may be refilled once by spending an act and 2 Spirit. | Ordinary apothecaries can supply refills at predictable prices. The Renderer gains no field-yield action and cannot claim rare materials from this doctrine. | Reliability and anti-hoarding give up opportunistic adaptation, profit, and rare properties. Open Crucible remains desirable when evidence risk is acceptable and enemy composition is uncertain. | Baseline recipe/refill catalog, safe workspace/service access. Preparation UI labels common stock and lost rare traits; Witness shows the slow field refill only if used in combat. | A no-money/no-material run remains functional; field refill cannot loop Spirit; quality 1 never outperforms rare doses; shops remain useful for other goods. |
| **Cold Furnace: White Quench** — Cold Furnace, Tier II, requires any Renderer Tier I node; **transform expression, Model B** paired with Long Reduction; ready | Grave Salt hitting a target with Renderer-applied Burning consumes all remaining Burning. Add its remaining scheduled damage to the hit, capped at 6, then remove Burning. The strike retains Grave Salt's occult injury profile and cannot crack ribs merely from the bonus. | Quenched residue is obvious and easier to attribute to the Renderer; it can rapidly destroy contaminated matter when preservation is not required. | Burst sacrifices denial, future damage, and evidence preservation. Long Reduction remains desirable against high-Health, healing, or reinforcement encounters. | Existing Burning ownership/duration, damage-resolution ordering, residue evidence. Action preview shows exact known consumed damage; Witness narrates salt entering flame before damage and defeat. | Miss does not consume Burning; other actors' Burning is not stolen; cap survives duration upgrades; Ward/armor ordering; death transition follows the completed compound blow. |
| **Cold Furnace: Long Reduction** — Cold Furnace, Tier II, requires any Renderer Tier I node; **active expression, Model B** paired with White Quench; ready transform | Corpsefire deals 2 less initial damage, burns for three rounds, and prevents Health recovery while Burning. Once per target, spend 1 Spirit with no additional act when Corpsefire is applied to extend it one round; that extension adds no Exposed. Grave Salt cannot quench this fire. | Slow reduction can sterilize dangerous remains or keep a death-altered object inert, but destroys delicate evidence and raises contamination if left unattended. | Strong denial is slow and poor against short fights. White Quench remains desirable for immediate removal and action compression. | Healing-prevention status, owner/duration, evidence destruction. Card discloses reduced initial damage and recovery denial; Witness mentions extension as part of the flame event, not a discipline-name appendage. | No indefinite refresh; bosses can resist denial without ignoring it; short/long battle comparisons; corpsefire ownership; combat ending with active fire. |
| **Arrested Ruin** — Renderer synthesis, Tier III, requires three Renderer nodes across at least two branches; **active, Model A mastery**; excludes Immaterial Reduction; ready action | Prepare one Arresting Medium at safety. Spend it and an act on a living corporeal target: for two rounds, body parts cannot lose condition below 1 and wounds cannot worsen, but the target cannot recover Health or condition. It does not prevent Health defeat and cannot restore a destroyed part. | Preserve a body, scene, organ, or perishable evidence for one route interval. Delay creates weight, custody, time, and claim consequences; it is not resurrection. | Exceptional preservation consumes a dedicated slot and freezes recovery as well as decay. Immaterial Reduction remains desirable against manifestations and for direct occult flexibility. | Body-condition floor, wound progression, route-duration preservation and custody. Target card shows exactly what is and is not protected; Witness states arrested condition before subsequent Health consequences. | No immortality at 1 part condition; torso/head destruction semantics; bleed/burning still affect Health; expiry ordering; legal/medical content must offer ordinary alternatives. |
| **Immaterial Reduction** — Renderer synthesis, Tier III, requires three Renderer nodes across at least two branches; **transform, Model A mastery**; excludes Arrested Ruin; ready | One prepared recipe may be designated immaterial at safety. Against incorporeal targets it ignores materiality resistance and may create ordinary statuses; against corporeal targets its base damage is reduced by 2 and it cannot create grievous wounds. Designation lasts until the next safe preparation. | Analyze or reduce a manifestation into a stable residue, enabling occult evidence and trade; it cannot preserve living bodies or ordinary forensic tissue. | Solves the practice's worst matchup at a real corporeal cost. Arrested Ruin remains desirable for allies, evidence, and bodily emergencies. | Recipe designation, materiality resistance, injury ceiling, manifestation residue. Preparation UI compares both target classes; Witness names the form losing cohesion rather than pretending it has armor or flesh. | Mixed encounters force a real choice; no designation swap midcombat; physical target minimum damage floor; residue yield is not guaranteed loot; nonstandard manifestation anatomy. |

## Grave Warden

Baseline Grave Warden play uses two seals. `Set Seal` costs an act and 1 Spirit
and anchors a seal to a combatant, body part, object, or authored battlefield
position. A seal has 2 integrity, is consumed or broken by its typed response,
and cannot stack on the same anchor. The Warden regains 1 Spirit, at most twice
per encounter, only when an enemy actually breaches a committed seal and the
Warden survives the consequence.

### Grave Warden nodes

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Invitation to Breach** — Threshold, Tier I, no prereq; **passive expression, Model B** paired with Closed Gate; ready transform | A newly set threshold seal has 1 integrity instead of 2. Its first breach fixes an incorporeal attacker into corporeal reach for one round or inflicts Exposed 1 on a corporeal attacker, then restores the Warden's allowed breach Spirit. | Deliberately weak shelter can reveal a breach's method and produce strong evidence, but stakeholders may object to being used as bait. | Gains information, offense, and Spirit by accepting a real crossing. Closed Gate remains desirable when preventing harm matters more than learning or recovery. | Seal integrity/trigger/materiality, breach evidence and stakeholder consent. Preview states the weakened integrity and known response; Witness describes the crossing, consequence, then seal response. | Must not trigger on harmless self-crossing; one recovery per actual breach; simultaneous attackers; fixed target still needs an attack; no defensive stall profit. |
| **Closed Gate** — Threshold, Tier I, no prereq; **active expression, Model B** paired with Invitation to Breach; ready action | Consume a threshold seal and the Warden's act to deny one declared crossing, reinforcement, possession attempt, or escape. Against an ordinary attack it instead grants 4 Ward to the protected target before damage. A voluntarily consumed seal restores no Spirit. | Close one known supernatural route or secure a camp for one interval. It leaves a conspicuous seal and can also trap someone who expected passage. | Reliable denial spends setup, an act, and the seal with no recovery. Invitation remains desirable for tempo, evidence, and sustainable Spirit. | Declared-intent reaction, reinforcement/possession/escape hooks, route threshold facts. UI highlights eligible declared events; Witness states what failed to cross and that the seal is spent. | Cannot deny untelegraphed arbitrary plot events; Ward branch only on attacks; no refund loops; several weak enemies can exhaust it; ordinary route alternatives remain. |
| **Held in Custody** — Custody, Tier II, requires any Grave Warden Tier I node; **passive, Model A doctrine**; excludes Interposed Claim | A body-part seal prevents wound worsening and untreated-wound Health loss on that part while intact. When the part would be destroyed, consume the seal to leave it at 1 condition; this can happen once per combatant per encounter. It does not heal or prevent direct Health damage. | A sealed body, grave, or evidence item cannot be raised, moved unnoticed, or materially altered without creating a breach event. Custody and authority claims still determine whether this is lawful. | Strong continuity consumes scarce seals and preserves things that may deserve release. Interposed Claim remains desirable for immediate protection and mobile fights. | Body-part seals, wound lifecycle, custody/claim breach. Anatomy card shows protected part and limits; Witness announces seal consumption before the saved condition result. | Head/torso and defeat ordering; no repeated 1-condition immunity; untreated wounds resume after break; hostile custody and unjust-covenant content. |
| **Interposed Claim** — Custody, Tier II, requires any Grave Warden Tier I node; **active, Model A doctrine**; excludes Held in Custody; ready action | Spend an act to move one seal from the Warden's armor or held grave-iron item to an ally before an enemy answer. Until the Warden's next turn, the first hit against that ally resolves against the sealed equipment's armor and consumes 1 integrity. The seal returns only if unbroken. | Lend recognized protection or custody to a person, convoy, doorway, or burial crew. The Warden becomes answerable for what happens under that claim. | Mobile group defense risks the Warden's equipment and creates obligation. Held in Custody remains desirable for lasting wound stabilization and evidence security. | Equipment anchor, armor coverage, temporary claim/obligation. Action card names item, armor, ally, and duration; Witness puts interposition before absorption and damage. | Armor applies once; no impossible body-slot coverage; multiple allies cannot share one seal; enemy misses do not consume integrity; obligation survives combat. |
| **Read the Breach** — Revision, Tier II, requires any Grave Warden Tier I node; **passive, Model A doctrine**; excludes Void the Instrument | The first time each enemy breaches or attacks a seal, reveal one authored technique tag and add a `Breach Read` mark. The Warden's next physical or occult hit against that enemy gains +15 percentage points accuracy and consumes the mark; no damage bonus. | Diagnose who or what breached a tomb, household ward, custody, or covenant and preserve a qualified finding as evidence. It never declares whether the continuity was just. | Information and reliable follow-up require letting the target act. Void the Instrument remains desirable when the existing arrangement itself is the danger. | Technique tags, mark, breach findings/evidence. Dossier discloses only observed tags; Witness states the read when it changes the follow-up attack. | No hidden stats beyond authored disclosure; mark consumed on miss; one mark per enemy; mundane vandalism and incorporeal crossing both supported. |
| **Void the Instrument** — Revision, Tier II, requires any Grave Warden Tier I node; **active, Model A doctrine**; excludes Read the Breach; ready action | Spend 2 Spirit and an act to break one known seal, ward, or continuity effect. Its ongoing benefit ends immediately; any contained status, enemy, or damage event resolves once in a previewed release queue. The Warden gains no breach Spirit from a voluntary void. | End an obsolete covenant, release wrongly held remains, or destroy a hostile ward. The act creates a durable fact, evidence, and affected claims/relationships. | It supplies agency against unjust continuity but accepts the contained consequence and loses forensic bonuses. Read the Breach remains desirable for safer investigation and targeted offense. | Typed continuity effects, release queue, world claims and stakeholders. Confirmation lists known releases and labels unknown remainder without inventing certainty; Witness orders break, release, then consequences. | Cannot erase unmodeled plot state; cancellation is allowed before commitment; releases resolve exactly once after save/load; required routes retain non-Warden solutions. |
| **Perimeter of Three** — Grave Warden synthesis, Tier III, requires three Grave Warden nodes across at least two branches; **transform, Model A mastery**; excludes Successor Covenant; ready | Maximum seals becomes 3, but each begins with 1 integrity. Once per round a breach at one seal may spend another seal's integrity to redirect its typed response. If all three are intact at round end, the Warden pays 1 Spirit maintenance; at 0 Spirit one chosen seal breaks. | Establish a larger temporary refuge for a camp, work crew, or procession. Every entrance and stakeholder must be named; hidden gaps remain possible. | Breadth and redirection create maintenance and fragility. Successor Covenant remains desirable for durable repair and fewer moving parts. | Linked seals, maintenance, perimeter anchors, shelter routes. Battle/dossier view shows three anchors and integrity; Witness traces redirection from breached seal to spent seal. | No indefinite Brace shelter; maintenance cannot overdraw Health; multi-enemy pressure should break lines; missing anchor, movement, and encounter-end cleanup. |
| **Successor Covenant** — Grave Warden synthesis, Tier III, requires three Grave Warden nodes across at least two branches; **active, Model A mastery**; excludes Perimeter of Three; ready action | Once per encounter after a seal breaks, spend 2 Spirit and an act to replace it with a successor seal at 2 integrity. Choose one changed trigger or protected target; it cannot repeat the trigger that just failed. | After resolving a breach, propose a temporary replacement covenant to present stakeholders. Consent and authority affect durability, standing, and later route access; coercion remains possible and recorded. | Recovers from one failed prediction but costs tempo and requires revision rather than repetition. Perimeter remains desirable for immediate group coverage and linked response. | Broken-seal history, alternate trigger catalog, stakeholder agreement. UI shows why the old trigger is unavailable; Witness names the changed term, not a generic reset. | Once per encounter; no same-trigger loop; stakeholder rejection does not erase combat utility but changes world result; save/load after break/before replacement. |

## Ferryman

Baseline Ferryman play uses one marked passage between two valid anchors.
`Mark Passage` costs an act and 1 Spirit. `Conduct` advances one dead presence
or passage-tagged status one step; significant completion restores 1 Spirit at
most twice per encounter. Mundane kills never become Spirit fuel merely because
a Ferryman was present. A broken passage strands the Spirit committed to it
until encounter end.

### Ferryman nodes

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Retrieve the Stranded** — Return, Tier I, no prereq; **active expression, Model B** paired with Last Refuge; ready action | Spend an act and 2 Spirit to pull one incorporeal ally, hosted guest, possessed ally, or passage-tagged status back to its valid origin. Remove one phase/possession/displacement status; if none exists, move 2 Ward from the far anchor to the returning target. It deals no damage. | Retrieve a displaced dead actor whose return route and identity are established, or recover an occult item/evidence stranded across a known threshold. | A broad rescue verb costs tempo and setup. Last Refuge remains desirable because it acts at the instant of defeat without consuming the next turn. | Passage origins, possession/phase/status ownership, guest integration. Target UI lists valid origin and exactly what returns; Witness names the recovered initiative/status before Ward transfer. | Cannot invent an origin; hostile possession resists through ordinary accuracy/check rules; no Ward creation; mundane displacement still needs ordinary movement solutions. |
| **Last Refuge** — Return, Tier I, no prereq; **passive expression, Model B** paired with Retrieve the Stranded; ready | Once per encounter when an ally or hosted guest with a marked return route would be defeated, suspend it at the origin until the Ferryman's next turn. The target remains at 1 Health, cannot act, and returns only if the passage is still open; otherwise defeat resolves. Committed Spirit remains stranded either way. | Maintain one authored refuge for an escorted dead presence or imperiled traveler. Refuge creates duty and may be refused, violated, or politically contested. | It prevents one immediate loss but offers no cleansing, movement, or Ward and risks delayed defeat. Retrieve remains desirable for proactive control and repeatable status rescue. | Defeat interception, suspended state, passage continuity and refuge obligation. UI visibly marks the threatened return route; Witness says what was held and when the judgment resumes. | Once per encounter; no chain with other defeat prevention; Health cannot rise during suspension; passage closure ordering; persistent servant/guest/ordinary ally cases. |
| **Closed Behind** — Exile, Tier II, requires any Ferryman Tier I node; **passive, Model A doctrine**; excludes Toll Taken | When Conduct completes an incorporeal hostile passage, close that route automatically. For two rounds, enemies cannot reinforce, possess, or return through the same route. The closure consumes the normal completion Spirit recovery. Corporeal targets are displaced or Exposed, never executed. | A completed escort/exile leaves a documented closed threshold and no promise of return. This can protect a community or strand a claimant. | Security forfeits Spirit recovery and future access. Toll Taken remains desirable for resource liquidity, negotiation, and reversible endings. | Route identity/closure, reinforcement and possession hooks, world threshold facts. Preview states lost recovery; Witness records passage completion before the road closes. | No unconditional boss execute; same-route identity exact; closure does not block unrelated exits; long encounters remain Spirit-solvent through mercy recovery. |
| **Toll Taken** — Exile, Tier II, requires any Ferryman Tier I node; **active, Model A doctrine**; excludes Closed Behind; ready action | When a hostile dead passage could complete, spend no act but choose a toll: recover 2 Spirit now and leave the route open with a return token on the target. If it returns during the encounter, it gains 2 Ward and acts after the next player action. One toll per target. | Negotiate destination, payment, or right of return. The token is evidence and may create an enforceable obligation or anger people who expected permanent removal. | Immediate Spirit and reversible resolution create a concrete future threat. Closed Behind remains desirable for safety and reinforcement denial. | Return tokens, delayed re-entry, obligation/evidence. Confirmation names the known return privilege without claiming when it will be used; Witness records toll and token after passage completion. | No repeated toll farm; return cannot surprise outside authored telegraph rules; encounter ending preserves world obligation, not a hidden combatant; corporeal targets cannot be banished for fuel. |
| **Living Passage** — Roadwork, Tier II, requires any Ferryman Tier I node; **active expression, Model B** paired with Wayside Lantern; ready action | Spend an act and 1 Spirit to move the Ferryman or one living ally between two marked battlefield anchors. The traveler becomes Exposed 1 until its next turn; a serious leg wound increases cost by 1 Spirit, and a grievous leg wound makes the passage unavailable. It does not bypass declared sealed boundaries. | Carry a living person across one known route obstacle. Weight, consent, custody, and whoever controls the destination still matter. | Mobility and rescue expose the traveler and respect wounds/boundaries. Wayside Lantern remains desirable for warning, persistence, and no per-use action. | Battlefield anchors, movement, leg consequences, route predicates. Action preview names destination, Exposed, and wound cost; Witness describes departure/arrival without abstract teleport prose. | No movement outside authored anchors; enemy zones and seal interaction; injured/overburdened targets; cannot skip required objectives or smuggle unknown custody invisibly. |
| **Wayside Lantern** — Roadwork, Tier II, requires any Ferryman Tier I node; **passive expression, Model B** paired with Living Passage; ready; requires lantern equipped | Marked passages persist one extra round without maintenance. The first hostile supernatural crossing each encounter is telegraphed one action early and grants the Ferryman +15 percentage points accuracy on the next Conduct against it. No ally movement action is gained. | Read route pressure, choose safer camps, and reveal that a supernatural crossing is active without revealing the actor's exact purpose or future event. The lantern is a visible social sign. | Better planning occupies an equipment slot and cannot move anyone. Living Passage remains desirable in hazards, rescues, and corporeal battles. | Equipment-gated passage persistence, intent telegraph, route-pressure disclosure. Dossier shows lit/unlit readiness; Witness uses a concrete lantern response only when the warning occurs. | Unequip clears readiness safely; no exact hidden outcome leakage; mundane ambushes remain Perception/Survival work; performance has no ambient timer or continuous effect. |
| **Round Trip** — Ferryman synthesis, Tier III, requires three Ferryman nodes across at least two branches; **active expression, Model B mastery** paired with Three Roads Meet; ready transform | After a target completes a passage, retain its origin for three rounds. Once, spend an act and 2 Spirit to reverse that target along the same route. A hostile target receives an ordinary resistance check; a corporeal target returns position/status only, not life or lost body parts. | Recover an exile, undo a mistaken escort, or honor a promised return while the route remains historically intact. Reversal creates a clear fact and may breach later claims. | Powerful correction consumes a second act and toll. Three Roads Meet remains desirable for group tempo and redistribution before mistakes happen. | Passage history/origin retention, resistance, world return fact. UI shows three-round return window and valid subject; Witness names the original road and reversed crossing. | No resurrection or restored consumables; target death closes ordinary return unless authored otherwise; one reversal; save/load with open window; boss displacement resistance. |
| **Three Roads Meet** — Ferryman synthesis, Tier III, requires three Ferryman nodes across at least two branches; **passive expression, Model B mastery** paired with Round Trip; ready transform | Maintain up to three linked anchors. Once per round when Ward or a transferable status enters one anchor, redirect up to 2 Ward or the whole status to one other valid anchor. Maintaining three anchors costs 1 Spirit at round end; if unpaid, the newest route breaks and strands its committed Spirit. | Coordinate a group crossing or distribute supplies/messages along one established route network. Every anchor is visible and subject to control, sabotage, and custody. | Broad tempo and support add maintenance and catastrophic route break risk; it cannot undo a completed mistake. Round Trip remains desirable for precise retrieval and reversibility. | Three-anchor passage graph, transfer eligibility/ownership, maintenance. Battle view needs a compact route diagram, not three duplicate cards; Witness names source and destination for each transfer. | No status duplication; hostile beneficial-status theft disallowed unless authored; Ward cap; broken anchor cleanup; mixed corporeal/incorporeal and long low-Spirit fights. |

## Shared Necromancy

Shared Necromancy concerns reserve, composure, observation, and the ordinary
discipline of paying Spirit. It does not admit guests, command servants,
prepare matter, create seals, or establish passages. The fixed mercy recovery
after defeating an enemy remains baseline for all characters.

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Abort the Working** — Composure, Tier I, no prereq; **active reaction expression, Model B** paired with Held Measure; universal ready | Once per encounter after an occult action's accuracy result is known but before on-hit or overdraw consequences, cancel it. The act and paid Spirit remain spent; no target effect, self-overdraw, or action-specific evidence is created, though witnesses still saw an aborted working. | Safely stop a ritual, examination, or occult interaction after a known prerequisite fails. It records an attempted act, not the completed deed. | Prevents one failure consequence but wastes tempo and Spirit. Held Measure remains desirable for passive protection across a long encounter. | Pre-consequence transaction boundary, attempted-action fact/evidence. UI offers a single confirmation with known avoided consequences; Witness records a visibly broken-off working without pretending nothing happened. | Cannot cancel enemy answer after commitment; cannot probe hidden outcomes for free; once per encounter; save/reload cannot reroll; actions with paid materials specify whether material is lost. |
| **Held Measure** — Composure, Tier I, no prereq; **passive expression, Model B** paired with Abort the Working; universal ready | Reserve 1 current Spirit outside combat. It cannot pay ordinary actions. Once per encounter it automatically pays one point of a forced Spirit loss or declared overdraw shortfall, then becomes available as ordinary empty capacity. It never prevents a wound whose non-Spirit trigger already occurred. | Sustain one known occult pressure during travel or negotiation without exposing the whole pool. The reserve is visible to knowledgeable inspectors but creates no signature practice capability. | Ongoing safety reduces usable Spirit by 1 and cannot selectively cancel a bad action. Abort remains desirable for high-risk discrete techniques and hidden failure management. | Reserved-resource accounting and cost preview. Spirit meter shows held versus spendable; Witness names the reserve only when it is consumed. | Max-Spirit one characters cannot ready it; no free current-Spirit creation on unready; overdraw ordering; enemy drain; persistence and readiness swaps. |
| **Bank the Departure** — Mercy, Tier II, requires any Necromancy Tier I node; **transform expression, Model B** paired with Open Hand; universal ready | Baseline defeat recovery becomes one `Mercy` token instead of immediate Spirit, maximum 2. At the start of a player turn, redeem any tokens for equal Spirit with no act. Tokens vanish after combat and cannot exceed maximum Spirit. | At a death scene, hold one departure long enough to perform an authored burial observation; this grants no universal testimony. | Avoids overcap and lets the player time recovery, but cannot fund a reaction in the same enemy-death window. Open Hand remains desirable for immediate tempo and emergency Ward. | Defeat event tokens, turn-start redemption, burial observation capability. UI places two tokens beside Spirit; Witness records redemption only when it changes the pool. | No token from summons/objects unless they are valid defeated enemies; no end-combat hoard; multi-kill ordering; at 0 Spirit next turn remains viable. |
| **Open Hand** — Mercy, Tier II, requires any Necromancy Tier I node; **passive expression, Model B** paired with Bank the Departure; universal ready | Keep immediate baseline defeat recovery. Once per encounter, if that 1 Spirit would be entirely wasted at maximum, gain 1 Ward instead. No partial overflow conversion and no bonus per additional enemy. | Recognize the moment of death without retaining it. It creates no corpse ownership, passage, guest, material, or custody right. | Immediate liquidity and a small bounded overflow defense give up storage and timing. Bank the Departure remains desirable in multi-wave and setup-heavy fights. | Existing defeat recovery and Ward grant. Witness folds the conversion into the death recovery line and names exact before/after values. | Exactly once per encounter; Ward cap; simultaneous defeats; no reward from allied deaths; compare total resource value across short and long fights. |
| **Read the Working** — Occult literacy, Tier II, requires any Necromancy Tier I node; **active expression, Model B** paired with Practiced Eye; universal ready action | Spend an act, no Spirit, to inspect one visible occult status, Ward source, or materiality defense. Reveal one authored property and gain +10 percentage points accuracy on the next action that directly addresses it; mark expires after one round or one action. | Create a player-known finding about an occult object, trace, or ritual. It exposes evidence, not motive or complete cosmology, and may support an ordinary skill check. | Precise information and setup cost an act. Practiced Eye remains desirable for free routine disclosure and faster fights. | Authored property disclosures, knowledge claims, temporary accuracy mark. UI distinguishes observed fact from inference; Witness states the observed property only when the read occurs. | No raw hidden stat dump; accuracy consumed on miss; every launch encounter has at most useful—not required—reads; mundane targets may yield “no occult working” without penalty. |
| **Practiced Eye** — Occult literacy, Tier II, requires any Necromancy Tier I node; **passive expression, Model B** paired with Read the Working; universal ready | On the first round, automatically disclose one visible occult property from the targeted enemy or battlefield. Grants no accuracy, damage, or defense and does not repeat when targets change. | Notice the presence and broad category of an occult trace during exploration; exact cause still requires Perception, records, specialist practice, or evidence. | Free orientation lacks control, depth, and combat payoff. Read the Working remains desirable against a chosen defense or complex target. | Encounter/property disclosure selector and Journal-known facts. UI presents one concise contextual note, never a danger-framed alert when no penalty exists. | Seed/state deterministic where several properties qualify; no unknown future action leakage; ordinary scenes and false-positive absence; no render-time whole-state scans. |

## Shared Body

Body training works with anatomy, wounds, armor, movement, and recovery. It
cannot substitute for Medicine, negate a destroyed part, or turn Health into
routine occult fuel.

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Set Against One** — Guard, Tier I, no prereq; **active expression, Model B** paired with Yielding Guard; universal ready transform | Brace targets one visible enemy. Gain 3 Ward usable only against that enemy's next damaging action; it expires at the start of the player's next turn. Brace restores no Spirit while transformed. If the enemy misses or chooses another target, the Ward is lost. | Hold a doorway or protect work against one declared mundane threat; it offers no universal supernatural boundary. | Strong prediction cannot be spammed for profit and fails against groups. Yielding Guard remains desirable when threat identity is uncertain or statuses matter. | Source-restricted Ward and target intent. Action card names target/expiry/no recovery; Witness says whose blow the guard turned before damage. | No carryover/stack; enemy target changes; area attacks; missed attack; low-damage enemies; compare Brace-spam turns and Spirit state to baseline. |
| **Yielding Guard** — Guard, Tier I, no prereq; **passive expression, Model B** paired with Set Against One; universal ready transform | Brace grants only 2 Ward and restores no Spirit. Until the next turn, the first forced-movement, Exposed, or accuracy-reduction status applied to the player is prevented; direct damage resolves normally through Ward. | Maintain footing during a hazardous crossing or physical task, trading progress/time according to the scene. It does not establish shelter or a seal. | Broad status protection is weaker against raw damage. Set Against One remains desirable for predictable heavy hitters. | Brace status-intercept window and ordinary hazard capability. UI lists the three prevented categories; Witness names the resisted effect only when triggered. | Once per Brace; no indefinite immunity through repeated low-risk enemies; status-before-damage ordering; flee and leg-wound interactions. |
| **Field Splint** — Wound discipline, Tier II, requires any Body Tier I node; **active, Model A doctrine**; excludes Worked Around; universal ready action | Once per encounter, spend an act and one clean linen to splint one wounded arm or leg. Suppress up to 1 point of that wound's combat penalty for two rounds. Add one required recovery before closure; no Health or condition is restored, and head/torso/rest-only injuries are ineligible. | Stabilize one bindable limb for travel or labor long enough to reach care. The extra recovery and consumed supply remain. | Emergency functionality costs inventory, tempo, and slower healing. Worked Around remains desirable for supply-poor runs and repeated minor impairment. | Wound-care eligibility, temporary penalty suppression, item consumption. Anatomy and action card show eligible wounds, duration, and added recovery; Witness names the splinted limb, not “healed.” | No concussion/rib binding; one use; expiry; stacking with treatment; death/post-death guard; action accuracy recalculates from authoritative wound rules. |
| **Worked Around** — Wound discipline, Tier II, requires any Body Tier I node; **passive, Model A doctrine**; excludes Field Splint | At combat start choose one existing wound. Reduce one numeric combat penalty from it by 1 for the encounter, minimum 0. The chosen wound cannot be treated during combat and gains one required recovery if the character takes an action relying on that part. | Continue one journey task despite a known wound, but worsen its recovery burden when the relevant body part is used. | Supply-free adaptation risks long-term recovery and cannot switch midfight. Field Splint remains desirable for greater temporary relief and safe treatment access. | Wound-to-action/body-part dependency, recovery burden. Precombat/dossier choice explains affected actions and cost; Witness mentions aggravated use only when recovery burden is added. | No penalty means no selectable benefit; head/torso rules; equipment-hand dependencies; never reduces flee penalty from an arm; save/load selected wound. |
| **Steady Breathing** — Recovery, Tier II, requires any Body Tier I node; **active expression, Model B** paired with Deliberate Convalescence; universal ready action | Once per encounter spend an act to remove Exposed 1 or one fear/stagger-equivalent status and restore 1 condition to an injured arm or leg. It restores no Health, cannot affect head/torso, and provokes the ordinary enemy answer. | Pause during a route hazard to prevent one exhaustion escalation at the price of time/opportunity pressure. | Immediate composure costs a turn and has narrow anatomy. Deliberate Convalescence remains desirable for lasting multi-wound recovery. | Status removal, bounded condition restore, route time consequence. Card lists exact eligible effect/part; Witness names breath/posture and the restored part without suggesting wound closure. | Once per encounter; no stalling loop; condition cap; zero eligible targets disables action; Burning/bleeding unaffected; low-damage enemy comparison. |
| **Deliberate Convalescence** — Recovery, Tier II, requires any Body Tier I node; **passive expression, Model B** paired with Steady Breathing; universal ready | At safe rest choose one: recover 4 additional Health, improve one additional eligible wound by one recovery, or restore 2 additional condition divided across injured parts. No option closes a rest-only wound early or restores destroyed anatomy. No combat effect beyond the resulting authoritative body state. | Rest consumes its authored time, safety, lodging, and pressure costs. The character can explain what care is needed but does not gain Medicine authority. | Strong lasting recovery requires reaching safety and choosing one need. Steady Breathing remains desirable during the encounter that might otherwise prevent that rest. | Safe-rest recovery chooser, wound progression and route pressure. UI previews post-rest body state and time cost; result card uses recovery-specific language, not universal “closure may scar.” | No double application on repeated render/load; every option bounded; scarce-rest campaign solvency; Medicine benefits remain separately valuable. |

## Mundane training

Ordinary competence is not a consolation branch. Every character begins with
world-appropriate basic values rather than universal zeroes, while background
and player allocation create strengths. Skill ranks remain permanent and
always on; qualitative techniques create additional choices.

### Rank nodes

Each rank node costs one point, requires level 2, may be learned repeatedly to
rank 5, and is never prepared. These are the one accepted arithmetic family
because the rank is consumed by many existing checks and transition rules.

| Node | Classification and exact effects | World/economy, risks, systems, UX, and tests |
| --- | --- | --- |
| **Athletics Training** | Tier I, level 2, no prereq/exclusivity; repeatable passive; +1 Athletics. In combat this changes authored shove, restraint, forced-movement, and physical escape checks only; it is not +Attack or +damage. | Opens load, climb, labor, and obstruction approaches. It costs one point that cannot train another skill, so Medicine, social, and investigative ranks remain desirable. Requires typed skill checks and route capabilities. Rank hover lists affected authored checks; it adds no Witness slogan. Test caps, body wounds, equipment weight, and alternate non-Athletics routes. |
| **Medicine Training** | Tier I, level 2, no prereq/exclusivity; repeatable passive; +1 Medicine. It changes treatment and diagnosis checks, not direct combat healing. | Improves wound dressing, prognosis, cause-of-injury findings, and care services. Its one-point opportunity cost preserves every other skill's routes. Existing treatment transition is authoritative. Hover lists care/check bands; Witness reports the treatment, not the rank. Test every care category, consumed supplies, impossible treatment, and no post-death use. |
| **Survival Training** | Tier I, level 2, no prereq/exclusivity; repeatable passive; +1 Survival. It changes flee, hazard, tracking, camp, and field-yield support checks where authored. | Opens safer/slower routes and better material opportunity without granting Renderer yield by itself. The one-point cost leaves Athletics' speed and Perception's findings distinct. UI lists affected route/check families without hidden odds. Test deterministic checks, route reachability, pressure cost, and overlap with Athletics. |
| **Perception Training** | Tier I, level 2, no prereq/exclusivity; repeatable passive; +1 Perception. It changes ambush, examination, contradiction, and evidence-discovery checks, not omniscient disclosure. | Adds findings only when authored evidence exists. The point competes with skills that act on the finding, preserving Persuasion, Medicine, and Survival. UI distinguishes observation from inference; Witness does not announce passive scans. Test hidden-info boundary, repeat examinations, false certainty, and Journal disclosures. |
| **Persuasion Training** | Tier I, level 2, no prereq/exclusivity; repeatable passive; +1 Persuasion. It changes social checks and offered terms, not actor disposition directly. | Supports requests, reassurance, testimony, and de-escalation. Its point cost leaves Barter's exchange and Perception's evidence independently useful. UI shows the authored approach/check band, not private attitude; Witness records actual terms. Test beliefs/standing separately, failed checks, coercion distinction, and non-social alternatives. |
| **Barter Training** | Tier I, level 2, no prereq/exclusivity; repeatable passive; +1 Barter. It changes authored exchange bands, not universal prices or faction standing. | Improves buying, selling, appraisal negotiations, and in-kind terms. The point competes with Persuasion's relationship work and field survival. Price tooltips show known terms, not hidden standing; Witness records completed exchange only. Test no profitable buyback loop, scarce currency, refused trade, and provenance/legal restrictions. |

### Qualitative mundane nodes

| Node and structure | Precise combat effect | Noncombat/world effect | Cost, risk, and why the alternative remains desirable | Required systems and Witness/UX | Balance and solvency tests |
| --- | --- | --- | --- | --- | --- |
| **Dresser's Hand** — Care, Tier II, Medicine 2; **active, Model A doctrine**; excludes Triage Before Touch; universal ready action | Once per encounter spend an act and clean linen to make an ordinary Medicine attempt on one bindable open wound. Success stabilizes it and suppresses its untreated Health loss; failure consumes linen but creates no new wound. It does not restore Health or treat closed/head injuries. | Perform field care in scenes without a surgeon; time, consent, and cleanliness affect the authored check. | A real treatment verb consumes supplies and an enemy answer. Triage remains desirable for avoiding waste and handling cases that cannot be dressed. | Existing treatment transition callable from combat with strict eligibility. UI shows chance band and eligible wound, not hidden roll; Witness describes actual care result. | Brace-stall comparison; no post-death treatment; contamination, no linen, rest-only wound, repeated attempt, and Medicine-rank bands. |
| **Triage Before Touch** — Care, Tier II, Medicine 2 or Perception 2; **passive, Model A doctrine**; excludes Dresser's Hand | At battle start, reveal which visible wounds are bindable, rest-bound, worsening, or immediately life-threatening. Once per encounter, the first failed item-based treatment does not consume the item, but still spends the act. Grants no treatment action by itself. | Examine an injured actor/body to disclose treatment category, time sensitivity, and known risk without solving the condition. | Information and supply protection cannot stabilize anyone. Dresser remains desirable when no other caregiver exists. | Wound presentation taxonomy and item transaction rollback. UI uses neutral/informational framing; no generic “may scar” on injuries that do not scar. | No diagnosis beyond skill/knowledge; item saved once; failures cannot be farmed for hidden outcomes; ordinary Medicine services remain useful. |
| **Force a Way** — Road work, Tier II, Athletics 2; **active, Model A doctrine**; excludes Patient Route | In combat or hazard resolution, attempt one authored shove, lift, break, or forced movement using Athletics. In battle it costs an act and moves one corporeal target/obstacle one anchor on success; incorporeal targets are invalid unless already fixed in matter. Failure may worsen a relevant existing limb wound but never creates routine Health cost. | Open a blocked route quickly, move debris, haul a body, or protect labor at the price of noise, evidence, or hazard escalation. | Speed and a new physical verb create bodily and social exposure. Patient Route remains desirable for injured characters and concealed travel. | Typed obstacle/anchor actions, body-part dependency and route consequences. UI lists known failure category and invalid materiality; Witness names leverage and movement. | Size/armor caps; no boss displacement without setup; wounded arms/legs; no supernatural bypass; every required route has another approach. |
| **Patient Route** — Road work, Tier II, Survival 2 or Perception 2; **passive, Model A doctrine**; excludes Force a Way | No direct combat action. Once per route interval, replace one hazardous edge with an authored slower edge that adds 1 pressure/time but avoids its opening damage or ambush. If combat still occurs, the party begins Forewarned rather than gaining raw stats. | Reveals a safer, slower route summary after observing terrain; never reveals the unseen event waiting beyond it. | Safety spends time/opportunity and cannot remove mandatory conflict. Force a Way remains desirable under clocks, pursuit, and physical obstruction. | Route graph alternate edges, pressure and Forewarned. Route UI states known time cost and immediate hazard avoided, not enemy actions; result records chosen path. | No rails/softlocks; repeated visits; pressure can close later opportunity; hidden-info-safe summaries; seed preservation. |
| **Put Terms Plainly** — Dealings, Tier II, Persuasion 2; **active, Model A doctrine**; excludes Read the Price | No generic combat effect; in an authored surrender/parley window spend the act to make one explicit offer backed by a relationship, item, custody, or obligation. Acceptance ends or changes combat according to actor motives; failure yields the enemy answer and records the offer. | Create negotiated routes, aid, testimony, surrender, or obligation without altering beliefs invisibly. | A powerful social verb depends on leverage and risks rejection/evidence. Read the Price remains desirable for ordinary commerce and avoiding bad terms. | Actor motive/leverage predicates, obligations and combat parley windows. UI lists offered asset and known recipient concern, never exact hidden acceptance score; Witness records spoken terms and response. | Not every enemy negotiable; no Charisma-only required route; offered asset transfers once; hostile attitude, language, witness, and save/reload tests. |
| **Read the Price** — Dealings, Tier II, Barter 2 or Perception 2; **passive, Model A doctrine**; excludes Put Terms Plainly | No direct combat effect. In a combat parley window, disclose one known material or survival concern that could support a later ordinary choice; it grants no free offer or accuracy bonus. | Shops and exchanges reveal the basis of a price band—scarcity, legality, standing, provenance, fear—without exposing hidden numeric standing or guaranteed future consequence. Once per merchant, prevent the worst markup band caused solely by unfamiliarity, not hostility or law. | Reliable context and bounded commerce lack de-escalation power. Put Terms Plainly remains desirable when the player must create a new agreement. | Price-reason selector, merchant memory, actor knowledge boundary. Tooltip explains item/reward terms in place; UI uses qualitative reasons rather than “county notice +2.” | No buyback arbitrage; standing/law still apply; unknown provenance; repeated merchant visits; no leakage of actor beliefs the character cannot infer. |

## Threat coverage without sameness

No practice may require the campaign to quietly replace its bad matchup. Each
has a functional line against three threat families and keeps a reason to use
equipment, mundane skills, allies, or retreat.

| Practice | Mundane people | Corporeal supernatural | Incorporeal | Weakness deliberately preserved |
| --- | --- | --- | --- | --- |
| Medium | equipped Strike, Borrowed Hand, hosted craft, explicit social terms | guest-specific burst and bodily adaptation | eviction, Spirit Lash, chorus | personal body remains the single point of failure; cooperative guests may not fit the fight |
| Bonebinder | servant equipment, interception, labor, parley complicated by visible body | full anatomy and commands excel here | Splinter Guard fixes one target; occult commands remain limited | action economy and damaged servant can collapse together; echo work sacrifices defense |
| Renderer | physical weapon, coatings, statuses, medical support | mixed recipes, armor chemistry, Cold Furnace | Grave Salt and Immaterial Reduction | wrong preparation remains costly; no preparation makes the Renderer a universal mage |
| Grave Warden | grave iron, targeted Brace replacement, custody/interposition | body seals and equipment armor | threshold fixation, breach response, voiding | committed seals can be bypassed or exhausted by simultaneous pressures |
| Ferryman | movement, status transfer, retreat, ordinary weapon follow-up | tempo and route manipulation, not execution | strongest escort/exile/closure tools | low sustained force and setup dependency remain; broken routes strand Spirit |

Acceptance must include an armed human, several weak humans, armored corporeal
opposition, an incorporeal manifestation, a nonstandard body, a long
Spirit-scarce battle, and an injured start. Measure action diversity, rounds
spent stalling, resources after victory, wounds, and use of ordinary Strike—not
only win rate.

## Advancement availability and presentation

Leveling grants points immediately, regardless of the current story scene. The
character surface exposes:

- learned disciplines and available points;
- the whole safely disclosed tree, including prerequisites and excluded forks;
- ready optional techniques/transforms;
- always-on passives;
- unavailable action reasons caused by present state, such as no servant,
  guest, preparation, seal, lantern, valid target, or material.

Learning and readiness are separate operations. A player may learn a node while
its current fictional substrate is absent; the learned discipline waits rather
than disappearing. The campaign must provide a way to recover a lost baseline
substrate—a new servant, workspace, seal tools, or passage anchor—without
requiring the same missed scene that first supplied it.

The tree UI should compare each duality side by side. Model A confirmation
states `Choosing this excludes X until retrained` and names the known retraining
category, not an exact future trainer location. Model B confirmation states
`Both expressions are learned; one may be readied at a time.` Hover/focus
disclosure explains referenced statuses, items, skills, and capabilities in
place. Result cards remain dismissible and use post-learning copy, not
prospective “you will learn” language.

Action details must answer cost, target, timing, known consequence, source, and
why unavailable. They must not reveal which enemy will act in hidden time, a
guest's undisclosed agenda, an actor's private belief, or the exact result of a
seeded risk. Passive effects belong in the dossier and appear in Witness only
when they change an outcome.

## Prototype and save migration

### Schema boundary

Replace advancement's eventual `tradition?: TraditionId` eligibility with
practice/capability requirements while retaining a compatibility reader.
Advancement definitions need:

- stable ID and schema version;
- tier, cost, prerequisites, and capability requirements;
- exclusivity group and duality model;
- classification: active, passive, transform, reaction, or rank;
- learned effect reference and optional expression IDs;
- readiness type and slot cost;
- practice, universal, or mundane branch;
- structured combat/world effect references rather than executable prose.

Persist learned node IDs, selected Model A doctrines, prepared expression IDs,
retraining history needed by authored consequences, and unspent points.
Normalization removes invalid readiness without deleting unknown learned IDs.

### Medium

`medium` is already the target practice ID. Do not change old testaments'
combat rules when guest state lands.

- Existing Two-way Passage, Echoing Passage, and Tempered Passage remain
  **legacy learned effects** and stop appearing in new offers.
- They continue to count as spent points until the player uses a world-grounded
  retraining service to exchange each one-for-one for an available new node.
  This avoids both silently weakening the save and gifting duplicate power.
- A migrated Medium receives one safe baseline guest only when guest state and
  its authored terms exist. Until then, the compatibility actions remain.
- Borrowed Might keeps its current behavior for legacy saves; target-practice
  Borrowed Might follows the Spirit/overdraw doctrine in this plan.

### Summoner and Bonebinder

The compatibility map from `summoner` to `bonebinder` is conceptual, not
permission to convert a temporary shade into a persistent corpse.

- Existing Summoner testaments retain the legacy Summoner identity, Raise
  Shade, Soul Tithe, temporary ally lifetime, and Longer Leash/Shared
  Hunger/Last Command effects.
- New creation eventually offers `bonebinder`, not `summoner`.
- An optional conversion may be offered only after the character acquires a
  valid servant body and the player sees what identity, equipment, provenance,
  and commands replace the shade loop. Conversion exchanges legacy Summoner
  nodes for unspent points; it does not guess new Bonebinder doctrines.
- Legacy temporary shades normalize with their exact duration. Persistent
  servants use the existing lifetime union and never counterfeit permanence
  with a large `remainingTurns`.

The Ditch-Hand vertical slice already proves persistent combatant anatomy,
commands, wounds, repairs, persistence, social reaction, and recognition. The
tree builds on that namespaced state; it does not add a second servant ledger.
Bonebinder nodes are learnable even while the servant is withdrawn, destroyed,
or unavailable, but their action cards explain the missing substrate.
Character creation must supply a complete starting servant path rather than
quietly deploying the test fixture.

### Thaumaturgist and Renderer

`thaumaturgist` remains a stable compatibility ID while the player-facing
practice becomes Renderer.

- Grave Salt and Corpsefire become baseline Renderer recipes/actions when
  preparation slots exist.
- White Quench maps directly to the target Cold Furnace: White Quench
  expression.
- Colder Furnace and White Ash remain legacy effects until exchanged
  one-for-one; their flat duration/Exposed chain is not the target tree.
- A migrated save receives two deterministic baseline slots and common-stock
  refills. Inventory materials and existing provenance are preserved.
- Do not activate Open Crucible, rare yield, or field evidence until seeded
  yield, source quality, contamination, witness, and claims exist end to end.

### Grave Warden and Ferryman

Neither has a legacy playable state. Do not create placeholder saves with empty
signature blocks. Add each to character creation only when its baseline state,
two actions, starting kit, mixed encounter acceptance tests, persistence, and
at least one noncombat capability all work. Ferryman remains last because
passage must work across several regions and ordinary route problems, not only
one cosmological set piece.

## Required implementation systems

Build in dependency order:

1. **Advancement graph v2:** typed tiers, exclusivity, duality model,
   capability requirements, readiness, repeatable mundane ranks, validation,
   and migration.
2. **Stable availability:** points and tree access independent of scenes;
   state-dependent action usability remains in domain selectors.
3. **Signature state:** guest/term, preparation, seal, and passage domains;
   extend—not duplicate—the existing servant state.
4. **Shared resolution primitives:** pre-consequence cancellation, reactions,
   source-restricted Ward, temporary wound-penalty suppression, declared
   intent, status ownership, materiality fixation, and movement anchors.
5. **World/route capabilities:** facts, evidence, provenance, claims,
   relationships, pressure, and safe route predicates for every world-facing
   node.
6. **Narration catalogs and structured events:** no advancement prose switch
   in the engine or Witness formatter.
7. **UI:** tree comparison, readiness, compact action bar, contextual
   disclosures, and dossier passives using delegated events and targeted DOM
   updates.

Practice definitions reference advancement branch IDs and capability IDs.
Effects live in focused practice or shared-rule modules. Do not grow one
`AdvancementModifierId` union and scatter a matching conditional across the
engine, action renderer, Witness, inventory, and story content for every node.
Numeric modifiers remain appropriate for a small subordinate coefficient;
stateful disciplines need typed effect handlers/selectors.

## Recommended first implementation subset

The first slice should prove the advancement architecture without pretending
the full practices already exist.

### Slice A — tree and readiness contract

1. Add advancement graph v2, Model A exclusivity, Model B expression readiness,
   stable non-scene availability, persistence, and migration.
2. Move current arithmetic chains to legacy offers without changing learned
   saves.
3. Implement **Abort the Working / Held Measure** as a Model B universal pair.
   This proves reaction timing, reserved Spirit, readiness, action detail, and
   save behavior without signature-practice overlap.
4. Implement **Field Splint / Worked Around** as a Model A Body fork. This
   proves world-grounded retraining, anatomy/action dependencies, inventory,
   wounds, and recovery disclosure.
5. Implement **Cold Furnace: White Quench / Long Reduction** as a Model B
   action transform for Thaumaturgist compatibility. This proves that a
   transform replaces card behavior and Witness composition rather than adding
   duplicate buttons.

Do not ship Slice A until action-bar count stays bounded, no readiness change
is possible in combat, and old saves reproduce their old battles.

### Slice B — first target-practice loops

1. Medium guest state plus **Kept Room / Second Chair**.
2. Renderer preparation slots plus **Counteragent / Clean Bench** and **Open
   Crucible / Common Stock**, including one lawful and one risky field-render
   scene.
3. Bonebinder creation substrate plus **Letter of Service / Called Counsel**,
   using Ditch-Hand only as the test fixture.

This order follows the accepted registry/migration boundary while using the
existing Bonebinder engineering rather than rebuilding it.

### Slice C — new practice proofs

1. Grave Warden baseline seals plus **Invitation to Breach / Closed Gate** in a
   mixed mundane/incorporeal encounter and a custody scene.
2. Ferryman baseline passage plus **Retrieve the Stranded / Last Refuge** only
   after route anchors and return work in more than one region.

Tier III synthesis nodes wait until their world consequences have at least two
authored uses. A combat implementation alone is insufficient.

## Validation and acceptance gates

### Graph and persistence

- Every ID, prerequisite, exclusion, expression, capability, and effect handler
  resolves.
- No prerequisite/exclusivity combination makes a learned node impossible to
  ready.
- Earned minus spent points is stable through migration, retraining, and
  multi-level awards.
- Same save plus readiness produces the same actions, seed, Witness, and world
  consequences.
- Unknown future node IDs survive older readers where the save policy permits.
- Legacy Medium, Summoner, and Thaumaturgist battles reproduce exactly until
  the player explicitly migrates or retrains.

### Economy and failure solvency

- Simulate short, long, multi-wave, Spirit-starved, and wounded-start
  encounters for every practice and major readiness configuration.
- No Brace, seal, passage, servant, defeat, dismissal, preparation, or token
  loop can create net resources while indefinitely avoiding progress.
- Each practice can act meaningfully at 0 Spirit through Strike, equipment,
  mundane skill, or a bounded recovery line.
- Overdraw is always explicit and cancellable before commitment; it creates
  body/transgression consequences, not routine efficiency.
- Consumable/preparation builds remain usable after a poor-yield run.
- Persistent companion defeat is recoverable without making the next required
  objective impossible.

### World and route

- Every required objective remains reachable by all five launch practices even
  though their optional routes differ.
- Capability content offers at least one alternative mundane approach unless
  the scene itself is explicitly practice training.
- Facts, player knowledge, actor beliefs, evidence, claims, relationships,
  standing, and pressure remain separate.
- Public actions create witnesses/evidence according to scene state; they do
  not apply one global necromancer reputation.
- Failed checks and declined optional actions rewrite remaining scene copy and
  preserve navigation choices correctly.

### Witness and UX

- Every active and transform has action-specific hit, miss, mitigation, wound,
  defeat, and signature-transition coverage where applicable.
- Ward absorption is narrated before remaining damage; compound attacks finish
  all committed components before death narration.
- Incorporeal targets do not wear armor or receive flesh injuries; quadrupeds
  do not have hands.
- Passive sources appear only when they change the result.
- The final exchange remains available after victory, while post-death
  inventory, treatment, readiness, and advancement mutation are disabled.
- Keyboard, focus, hover, and touch expose the same contextual information.
- Tree/readiness interactions use delegated listeners and targeted updates; no
  pointer movement or disclosure causes a full application render.

## Reject or defer

Reject as target nodes:

- pure `+damage`, `+Ward`, `+Health`, `+Spirit`, or `+duration` ladders;
- routine Health, condition, or wounds as an occult payment;
- unconditional execute, resurrection, destroyed-part restoration, or
  consequence-free exile;
- automatic servant attacks after unrelated player actions;
- companion “loyalty” represented by one generic good/evil meter;
- unlimited summons, seals, preparations, guests, passages, or action buttons;
- passive Brace/seal/defeat loops that reward indefinite stalling;
- field harvesting required before baseline Renderer actions;
- universal nodes that counterfeit hosting, binding, rendering, keeping, or
  conducting;
- free doctrine swapping at every rest;
- advancement points or essential nodes available only from one scene;
- global necromancer reputation, omniscient dead clues, or exact hidden outcome
  disclosure;
- random “madness,” random body injury unrelated to the action, or wounds
  applied after zero damage without a specific rule;
- procedural flavor assembled from interchangeable fragments.

Keep as legacy but stop extending:

- Two-way Passage and Echoing Passage as a flat Spirit Lash ladder;
- Longer Leash and Shared Hunger as anonymous shade arithmetic/Health economy;
- Colder Furnace and White Ash as a duration/Exposed ladder;
- Hardened Vessel and Deepened Well as isolated maximum-pool purchases;
- Second Breath and Death Dividend beyond their current bounded prototype;
- Last Stance as another reason to profit from Brace.

Defer until supporting systems/content exist:

- more than one persistent Bonebinder servant;
- full-person memories imported from body parts;
- rare Renderer yields without provenance, custody, evidence, and baseline
  refill;
- permanent Grave Warden covenants without stakeholders and revision content;
- Ferryman travel on an abstract “far side” unsupported by grounded regions;
- permanent cross-practice study or multiclassing;
- Tier IV mastery nodes with no campaign-scale world consequence;
- respec as a menu transaction. Retraining needs an authored but nonessential
  service and must never be required to complete the campaign.

The standard for adding a later node is simple: after removing its name and
flavor, it must still create a decision that a different build reasonably
answers another way.
