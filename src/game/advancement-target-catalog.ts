import type {
  AdvancementDefinition,
  AdvancementId,
} from "./types";

export type TargetAdvancementId = Extract<
  AdvancementId,
  | "cold-furnace-method"
  | "working-contingency"
  | "departure-disposition"
  | "letter-of-service"
  | "called-counsel"
  | "set-the-frame"
  | "residue-disposition"
  | "threshold-discipline"
  | "field-splint"
  | "worked-around"
>;

export const TARGET_ADVANCEMENTS: Record<
  TargetAdvancementId,
  AdvancementDefinition
> = {
  "cold-furnace-method": {
    id: "cold-furnace-method",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Cold Furnace",
    tradition: "thaumaturgist",
    classification: "transform",
    description:
      "Settle how corpsefire will spend itself before the stopper is drawn: all at once under salt, or slowly where flesh cannot close.",
    resultText:
      "The vessel fixes how the flame will burn. Only one preparation may govern each casting.",
    effectText:
      "Learn White Quench and Long Reduction. Ready one expression outside combat.",
    effect: {},
    duality: {
      kind: "prepared",
      readiness: "practice",
      expressions: [
        {
          id: "cold-furnace-white-quench",
          name: "White Quench",
          classification: "transform",
          description:
            "Prepare grave salt to collapse every remaining measure of corpsefire into the cast that follows.",
          effectText:
            "Grave Salt consumes Burning on a hit and adds its remaining damage, up to 6, to the blow.",
          effect: {
            modifiers: {
              "grave-salt-quench-burning": 1,
            },
          },
        },
        {
          id: "cold-furnace-long-reduction",
          name: "Long Reduction",
          classification: "transform",
          description:
            "Bank the furnace until its first violence is diminished and its residue becomes harder to escape.",
          effectText:
            "Corpsefire deals 2 less base damage, burns for 3 rounds, and prevents Health recovery while it burns.",
          effect: {
            modifiers: {
              "corpsefire-base-damage": -2,
              "corpsefire-duration": 1,
              "corpsefire-block-recovery": 1,
            },
          },
        },
      ],
    },
  },
  "working-contingency": {
    id: "working-contingency",
    branch: "necromancy",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Working Contingency",
    classification: "reaction",
    description:
      "Leave one measured fault in every working: a place from which to break it, or a reserve against what strains back.",
    resultText:
      "One imperfection is made deliberate. What reaches for it may find a severed line or a measure held beyond reach.",
    effectText:
      "Learn Abort the Working and Held Measure. Ready one expression outside combat.",
    effect: {},
    duality: {
      kind: "prepared",
      readiness: "universal",
      expressions: [
        {
          id: "abort-the-working",
          name: "Abort the Working",
          classification: "reaction",
          description:
            "Keep the ending stroke apart from the rest, to be withheld when the working shows its true direction.",
          effectText:
            "Once per encounter, after an attack is tested but before it takes effect, abandon it. Its Spirit and turn remain spent.",
          effect: { rules: ["abort-the-working"] },
        },
        {
          id: "held-measure",
          name: "Held Measure",
          classification: "passive",
          description:
            "Set one measure of Spirit outside the common vessel and keep it against extremity.",
          effectText:
            "Reserve 1 current Spirit in battle. Once per encounter, it may complete an action whose cost reaches into that reserve.",
          effect: { rules: ["held-measure"] },
        },
      ],
    },
  },
  "departure-disposition": {
    id: "departure-disposition",
    branch: "necromancy",
    minimumLevel: 3,
    cost: 1,
    prerequisites: ["working-contingency"],
    name: "Disposition of Mercy",
    classification: "transform",
    description:
      "Decide whether to hold a departing life until your Spirit can receive it, or let it pass at once.",
    resultText:
      "The instant of departure becomes a practiced choice: kept without possession, or received without delay.",
    effectText:
      "Learn Bank the Departure and Open Hand. Ready one expression outside combat.",
    effect: {},
    duality: {
      kind: "prepared",
      readiness: "universal",
      expressions: [
        {
          id: "bank-the-departure",
          name: "Bank the Departure",
          classification: "transform",
          description:
            "Hold the last warmth at the threshold until your own Spirit has room to receive it.",
          effectText:
            "Enemy defeats grant Mercy instead of immediate Spirit, up to 2. At the start of your turn, redeem any Mercy for equal Spirit without spending the act.",
          effect: { rules: ["bank-the-departure"] },
        },
        {
          id: "open-hand",
          name: "Open Hand",
          classification: "passive",
          description:
            "Let each departure cross immediately, keeping nothing that does not enter of its own accord.",
          effectText:
            "Enemy defeats restore Spirit immediately. Once per encounter, a recovery wholly wasted at maximum Spirit grants 1 Ward instead.",
          effect: { rules: ["open-hand"] },
        },
      ],
    },
  },
  "letter-of-service": {
    id: "letter-of-service",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Letter of Service",
    practice: "bonebinder",
    classification: "passive",
    description:
      "Write one service into terms the seated initiative can obey, refuse, and invoke against you.",
    resultText:
      "The service is written narrowly. What lies within it may be asked without force; what violates it must first break the compact.",
    effectText:
      "Choose a service purpose outside combat. Matching orders require no Spirit; exceptional orders cost 1 more. Contradictory orders require an explicit breach.",
    effect: { rules: ["letter-of-service"] },
    duality: { kind: "doctrine", group: "bonebinder-first-compact" },
  },
  "called-counsel": {
    id: "called-counsel",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Called Counsel",
    practice: "bonebinder",
    classification: "active",
    description:
      "Let the servant repeat work its body once knew without pretending the dead person has returned.",
    resultText:
      "Old labor returns through joint and balance. It offers motion, not testimony.",
    effectText:
      "Before your act, give the servant one Spirit-free instruction to perform a previewed somatic-memory action. It replaces the servant’s ordinary order for that round, not your own act, and cannot repeat in consecutive rounds.",
    effect: { rules: ["called-counsel"] },
    duality: { kind: "doctrine", group: "bonebinder-first-compact" },
  },
  "set-the-frame": {
    id: "set-the-frame",
    branch: "tradition",
    minimumLevel: 3,
    cost: 1,
    prerequisites: [],
    name: "Set the Frame",
    practice: "bonebinder",
    classification: "passive",
    description:
      "Seat the servant's weight for the blow it was prepared to receive, not merely the place it was ordered to hold.",
    resultText:
      "The frame is set against impact. It will take the line with more than dead flesh between you and the stroke.",
    effectText:
      "The first time your servant Interposes each round, it raises 2 Ward immediately before the attack lands.",
    effect: { rules: ["set-the-frame"] },
  },
  "residue-disposition": {
    id: "residue-disposition",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Disposition of Residue",
    practice: "renderer",
    classification: "transform",
    description:
      "Decide what becomes of a reduction left unfinished when its vessel fails: draw it back under glass, or give it another body.",
    resultText:
      "No useful remainder is allowed to gutter where it falls. The unfinished reduction now has an appointed destination.",
    effectText:
      "Learn Decant the Remainder and Carry the Reduction. Ready one expression outside combat.",
    effect: {},
    duality: {
      kind: "prepared",
      readiness: "practice",
      expressions: [
        {
          id: "decant-the-remainder",
          name: "Decant the Remainder",
          classification: "reaction",
          description:
            "Draw unfinished corpsefire back into the vessel before the failing body can spend it.",
          effectText:
            "Once per encounter, when a Burning enemy is defeated, recover Spirit equal to its remaining Burning rounds, up to 2.",
          effect: { rules: ["decant-the-remainder"] },
        },
        {
          id: "carry-the-reduction",
          name: "Carry the Reduction",
          classification: "passive",
          description:
            "Give the unfinished reduction the nearest standing body and let no useful cold disperse between them.",
          effectText:
            "Once per encounter, when a Burning enemy is defeated, move its remaining Burning to another standing enemy.",
          effect: { rules: ["carry-the-reduction"] },
        },
      ],
    },
  },
  "threshold-discipline": {
    id: "threshold-discipline",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Terms of Crossing",
    practice: "grave-warden",
    classification: "transform",
    description:
      "Decide how a field seal will govern a crossing: leave it thin enough to expose a trespasser, or fold it inward before entry.",
    resultText:
      "The same line can now be left thin enough to mark what crosses it, or folded into shelter before the crossing occurs.",
    effectText:
      "Learn Invitation to Breach and Closed Gate. Ready one expression outside combat.",
    effect: {},
    duality: {
      kind: "prepared",
      readiness: "practice",
      expressions: [
        {
          id: "invitation-to-breach",
          name: "Invitation to Breach",
          classification: "transform",
          description:
            "Leave the seal deliberately thin so the trespass must disclose its footing as it crosses.",
          effectText:
            "New threshold seals have 1 integrity and grant no Ward. An enemy that crosses one becomes Exposed 1 for 2 rounds; completing the seal still restores its 1 invested Spirit.",
          effect: { rules: ["invitation-to-breach"] },
        },
        {
          id: "closed-gate",
          name: "Closed Gate",
          classification: "active",
          description:
            "Fold an untested seal inward and wear its remaining structure as shelter.",
          effectText:
            "Gain Close the Gate in battle: spend an unbroken seal and your act to raise 4 Ward. It restores no Spirit.",
          effect: { rules: ["closed-gate"] },
        },
      ],
    },
  },
  "field-splint": {
    id: "field-splint",
    branch: "body",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Field Splint",
    classification: "active",
    description:
      "Brace an injured limb for the immediate work, accepting a slower reckoning afterward.",
    resultText:
      "The binding is cut for use, not comfort. The limb will move now and complain later.",
    effectText:
      "Once per encounter, spend a clean binding and an action to reduce one arm or leg wound penalty for 2 rounds. Its recovery takes one additional interval.",
    effect: { rules: ["field-splint"] },
    duality: { kind: "doctrine", group: "body-wound-response" },
  },
  "worked-around": {
    id: "worked-around",
    branch: "body",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Worked Around",
    classification: "passive",
    description:
      "Avoid the ruined motion and force the work through muscles and joints that still hold.",
    resultText:
      "The old motion is no longer attempted. Another bears its weight until the danger passes.",
    effectText:
      "At the start of an encounter, choose one wound to reduce by one penalty step for that fight. Using the affected part lengthens its recovery.",
    effect: { rules: ["worked-around"] },
    duality: { kind: "doctrine", group: "body-wound-response" },
  },
};
