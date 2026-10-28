export interface CombatActionNarration {
  hit: string;
  miss: string;
}

/**
 * Authored combat language belongs to the action, not to the engine that
 * resolves it. Tokens are expanded by combat-action-narration.ts.
 */
export const COMBAT_ACTION_NARRATION = {
  "unremembered violence": {
    hit: "{actor} falls upon {target} with a violence its body no longer remembers",
    miss: "{actor} repeats the old violence against empty ground while {target} stands clear",
  },
  "ritual knife": {
    hit: "{actor} slips the ritual knife toward {target}",
    miss: "{actorPossessive} ritual knife finds only the space beside {target}",
  },
  "bone wand": {
    hit: "{actor} draws a grave-line from the bone wand through {target}",
    miss: "The grave-line from {actorPossessive} bone wand passes wide of {target}",
  },
  "iron sickle": {
    hit: "{actor} sweeps the iron sickle through {target}",
    miss: "{actorPossessive} iron sickle cuts through the rain behind {target}",
  },
  "hollis’s hooked knife": {
    hit: "{actor} catches {target} with Hollis’s hooked knife",
    miss: "Hollis’s hooked knife returns to {actor} without finding {target}",
  },
  "bare hands": {
    hit: "{actor} drives a bare-handed blow into {target}",
    miss: "{actor} drives a bare-handed blow through the space beside {target}",
  },
  "spirit lash": {
    hit: "{actor} lashes a borrowed soul through {target}",
    miss: "The borrowed soul returns to {actor} without passing through {target}",
  },
  "borrowed might": {
    hit: "{actor} lets a dead strength hammer through {target}",
    miss: "The dead strength in {actorPossessive} limbs drives the blow a handspan wide of {target}",
  },
  "soul tithe": {
    hit: "{actor} exacts a soul-tithe from {targetPossessive} pulse",
    miss: "{actor} reaches for {targetPossessive} pulse, but the tithe finds no crossing",
  },
  "grave salt": {
    hit: "{actor} casts grave salt across {target}",
    miss: "{actorPossessive} grave salt spends itself across the ground at {targetPossessive} feet",
  },
  corpsefire: {
    hit: "{actor} unstoppers corpsefire into {target}",
    miss: "Cold flame spills past {target} and gutters against the ground",
  },
  "follow the crossing": {
    hit: "{actor} lays occult force along {targetPossessive} path",
    miss: "{actorPossessive} force crosses the ground after {target} has left it",
  },
  "a wordless grasp": {
    hit: "{actor} reaches a wordless hand through {target}",
    miss: "{actorPossessive} wordless fingers close without finding {target}",
  },
  "a smoke-thin bite": {
    hit: "{actor} springs through {target}, smoke-thin jaws closing as it passes",
    miss: "{actor} bites through rain as {target} slips beyond its jaws",
  },
  "a severing word": {
    hit: "{actor} speaks a severing word through {target}",
    miss: "{actor} speaks the cut too late; the word passes behind {target}",
  },
  "death knell": {
    hit: "{actor} tolls a death knell inside {targetPossessive} name",
    miss: "The death knell tolls around {target} without finding a name to close",
  },
  "bone crozier": {
    hit: "{actor} swings the bone crozier into {target}",
    miss: "{actorPossessive} bone crozier sweeps through the rain below {targetPossessive} guard",
  },
  "accounting touch": {
    hit: "{actor} lays an accounting hand upon {target}",
    miss: "{actor} closes an accounting hand on an absence; {target} remains unentered",
  },
  "hooked knife": {
    hit: "{actor} drags the hooked knife toward {target}",
    miss: "{actorPossessive} hook returns empty as {target} gives it only rain",
  },
  "remembered pallbearer shove": {
    hit: "{actor} drives {target} aside with a pallbearer’s remembered shoulder",
    miss: "{target} slips the old carrying step before {actor} can set its weight",
  },
  "remembered tool-work": {
    hit: "Work remembered in {actorPossessive} hands carries the tool through {target}",
    miss: "The old tool-work moves through {actorPossessive} hands, but {target} gives it no purchase",
  },
  "knife thrust": {
    hit: "{actor} darts the knife toward {target}",
    miss: "{target} turns a shoulder and {actorPossessive} knife passes a handspan wide",
  },
  "raking bite": {
    hit: "{actor} lunges low and rakes its teeth across {target}",
    miss: "{actor} snaps on rain and empty cloth as {target} slips clear",
  },
  bite: {
    hit: "{actor} snaps at {target}",
    miss: "{actor} snaps on rain and empty cloth as {target} slips clear",
  },
  "thirteenth peal": {
    hit: "{actor} rings a thirteenth peal through {target}",
    miss: "The thirteenth peal breaks around {target} without finding purchase",
  },
  "clapper-chain": {
    hit: "{actor} whips its clapper-chain around {target}",
    miss: "{actorPossessive} clapper-chain bites sparks from the road where {target} stood",
  },
  "veiled hand": {
    hit: "{actor} reaches a rain-veiled hand through {target}",
    miss: "Rain closes through {actorPossessive} veiled fingers before they can find {target}",
  },
  "redaction hook": {
    hit: "{actor} draws a redaction hook across {targetPossessive} outline",
    miss: "{actorPossessive} redaction hook catches the margin beside {target}, leaving the body unread",
  },
  "editorial knife": {
    hit: "{actor} sets an editorial knife against {target}",
    miss: "{actorPossessive} editorial knife passes through the edge of {targetPossessive} outline",
  },
  "stolen syllable": {
    hit: "{actor} spits a stolen syllable through {target}",
    miss: "The stolen syllable dies against {actorPossessive} teeth before it can reach {target}",
  },
  "stitched antiphon": {
    hit: "{actor} draws a stitched antiphon through {target}",
    miss: "{actorPossessive} stitched antiphon slips past {targetPossessive} outline without taking a seam",
  },
  "office for the unburied": {
    hit: "{actor} recites the office for the unburied over {target}",
    miss: "The office for the unburied misnames {target}, and the recitation passes harmlessly on",
  },
  "bier-pole": {
    hit: "{actor} drives the bier-pole at {target}",
    miss: "{actorPossessive} bier-pole drives through the space beside {targetPossessive} ribs",
  },
  "borrowed grief": {
    hit: "{actor} presses borrowed grief through {target}",
    miss: "The borrowed grief will not take hold of {target}",
  },
  "grief-nail": {
    hit: "{actor} presses a grief-nail toward {target}",
    miss: "{actorPossessive} grief-nail strikes the road and pins only mud",
  },
  "billhook drag": {
    hit: "{actor} hooks {target} and hauls",
    miss: "{actorPossessive} billhook catches a root beneath {targetPossessive} boots and hauls up earth",
  },
  "billhook jab": {
    hit: "{actor} jabs the billhook at {target}",
    miss: "{actorPossessive} billhook passes beside {targetPossessive} ribs without catching",
  },
  "barbed bolt": {
    hit: "{actor} looses a barbed bolt into {target}",
    miss: "The barbed bolt vanishes into the weather beyond {target}",
  },
  "crossbow bolt": {
    hit: "{actor} looses a crossbow bolt at {target}",
    miss: "{actorPossessive} crossbow bolt spends itself in the verge behind {target}",
  },
  "arresting hook": {
    hit: "{actor} casts the arresting hook around {target}",
    miss: "The arresting hook closes empty while {target} remains beyond its law",
  },
  "ashwood baton": {
    hit: "{actor} swings an ashwood baton at {target}",
    miss: "{actorPossessive} ashwood baton cuts rain beside {targetPossessive} head",
  },
  "shield rush": {
    hit: "{actor} drives shield-first into {target}",
    miss: "{actor} drives shield-first past {target} and must wrench the charge back around",
  },
  "short spear": {
    hit: "{actor} thrusts a short spear at {target}",
    miss: "{actorPossessive} spearpoint passes within a hand of {target} and strikes nothing",
  },
} satisfies Record<string, CombatActionNarration>;

export type NarratedCombatAction =
  keyof typeof COMBAT_ACTION_NARRATION;

export const COMBAT_ACTION_NARRATION_ALIASES = {
  "a shade’s grasp": "a wordless grasp",
  "a shade’s bite": "a smoke-thin bite",
} satisfies Record<string, NarratedCombatAction>;
