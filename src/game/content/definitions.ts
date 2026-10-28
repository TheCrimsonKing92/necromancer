import type {
  ActionDefinition,
  ActionId,
  TraditionDefinition,
  TraditionId,
} from "../types";

export const TRADITIONS: Record<TraditionId, TraditionDefinition> = {
  medium: {
    id: "medium",
    name: "Medium",
    epithet: "The Borrowed Flesh",
    description:
      "A channeler who invites the dead across the threshold, trading certainty for impossible strength and forbidden testimony.",
    doctrine:
      "Endure what should not fit inside you. Ask the dead what the living refuse to say.",
    occultAttribute: "charisma",
    startingAttributes: {
      strength: 3,
      dexterity: 2,
      vitality: 4,
      intelligence: 2,
      willpower: 3,
      charisma: 4,
    },
    startingSkills: {
      athletics: 0,
      medicine: 0,
      survival: 1,
      perception: 2,
      persuasion: 2,
      barter: 0,
    },
    startingSpirit: 5,
    actions: ["spirit-lash", "borrowed-might"],
  },
  summoner: {
    id: "summoner",
    name: "Bonebinder",
    epithet: "The Seated Hand",
    description:
      "A keeper who recalls dead flesh to its old obediences, setting bone, sinew, and remembered labor beneath a single will. One such servant waits where you last ordered it to stand.",
    doctrine:
      "The body remembers work. Give that memory terms, maintain what bears it, and do not mistake service for ownership.",
    occultAttribute: "willpower",
    startingAttributes: {
      strength: 4,
      dexterity: 2,
      vitality: 5,
      intelligence: 2,
      willpower: 4,
      charisma: 1,
    },
    startingSkills: {
      athletics: 1,
      medicine: 0,
      survival: 2,
      perception: 1,
      persuasion: 0,
      barter: 1,
    },
    startingSpirit: 4,
    actions: ["raise-shade", "soul-tithe"],
  },
  thaumaturgist: {
    id: "thaumaturgist",
    name: "Renderer",
    epithet: "The Morbid Artificer",
    description:
      "An occult chemist who isolates useful forces from grave salts, rendered tissue, and the residues left by violent death.",
    doctrine:
      "Nothing in a corpse is inert. Measure first. Waste nothing that can still carry force.",
    occultAttribute: "intelligence",
    startingAttributes: {
      strength: 3,
      dexterity: 1,
      vitality: 2,
      intelligence: 5,
      willpower: 4,
      charisma: 3,
    },
    startingSkills: {
      athletics: 0,
      medicine: 2,
      survival: 1,
      perception: 1,
      persuasion: 0,
      barter: 1,
    },
    startingSpirit: 6,
    actions: ["grave-salt", "corpsefire"],
  },
  "grave-warden": {
    id: "grave-warden",
    name: "Grave Warden",
    epithet: "The Kept Threshold",
    description:
      "A custodian of broken continuities who sets finite seals across bodies, graves, and crossings, then waits to learn what tests them.",
    doctrine:
      "Choose the line. Record what crosses it. Follow that crossing before the seal fails twice.",
    occultAttribute: "willpower",
    startingAttributes: {
      strength: 4,
      dexterity: 2,
      vitality: 4,
      intelligence: 3,
      willpower: 4,
      charisma: 1,
    },
    startingSkills: {
      athletics: 1,
      medicine: 1,
      survival: 1,
      perception: 2,
      persuasion: 0,
      barter: 1,
    },
    startingSpirit: 5,
    actions: ["set-threshold-seal", "answer-the-breach"],
  },
};

export const ACTIONS: Record<ActionId, ActionDefinition> = {
  strike: {
    id: "strike",
    label: "Strike",
    shortLabel: "Strike",
    description:
      "Put the readied edge where the enemy is least prepared. Accuracy decides whether it lands; the act is free.",
    spiritCost: 0,
    requiresTarget: true,
  },
  guard: {
    id: "guard",
    label: "Brace",
    shortLabel: "Brace",
    description:
      "Set your breath and stance against the next blow. Raise low Ward to your Brace threshold before the enemy acts; repeated uses do not stack it.",
    spiritCost: 0,
    requiresTarget: false,
  },
  "field-splint": {
    id: "field-splint",
    label: "Field Splint",
    shortLabel: "Field Splint",
    description:
      "Spend a clean linen binding to brace an injured arm or leg for two rounds. The relief is temporary; recovery takes longer.",
    spiritCost: 0,
    requiresTarget: false,
  },
  "black-tonic": {
    id: "black-tonic",
    label: "Drink black tonic",
    shortLabel: "Black tonic",
    description:
      "Drink bitter spirits, iron, and poppy to restore 10 Health. Wounds remain.",
    spiritCost: 0,
    requiresTarget: false,
  },
  flee: {
    id: "flee",
    label: "Abandon the field",
    shortLabel: "Flee",
    description:
      "Trust survival over victory. Leg wounds reduce the odds; failure surrenders the turn.",
    spiritCost: 0,
    requiresTarget: false,
  },
  "spirit-lash": {
    id: "spirit-lash",
    label: "Spirit lash",
    shortLabel: "Spirit lash",
    description:
      "Drive a borrowed soul through one enemy and, on a hit, draw 1 Ward from the crossing.",
    spiritCost: 1,
    requiresTarget: true,
    tradition: "medium",
    attack: {
      baseDamage: 3,
      damageType: "occult",
      injuryProfile: "spectral",
      traumaBonus: 0,
    },
  },
  "borrowed-might": {
    id: "borrowed-might",
    label: "Borrowed might",
    shortLabel: "Borrowed might",
    description:
      "Invite a dead strength the body can barely hold. Deal severe occult damage and lose up to 2 Health and torso condition. The first use also leaves spirit-bruised ribs that require safe rest.",
    spiritCost: 2,
    requiresTarget: true,
    tradition: "medium",
    attack: {
      baseDamage: 10,
      damageType: "occult",
      injuryProfile: "impact",
      traumaBonus: 0,
    },
  },
  "raise-shade": {
    id: "raise-shade",
    label: "Raise shade",
    shortLabel: "Raise shade",
    description:
      "Give a roadside dead enough shape for 3 rounds. It attacks the weakest enemy after you act.",
    spiritCost: 2,
    requiresTarget: false,
    tradition: "summoner",
  },
  "soul-tithe": {
    id: "soul-tithe",
    label: "Soul tithe",
    shortLabel: "Soul tithe",
    description:
      "Draw one enemy’s pulse into step with yours; on a hit, deal occult damage and restore up to 3 Health.",
    spiritCost: 2,
    requiresTarget: true,
    tradition: "summoner",
    attack: {
      baseDamage: 5,
      damageType: "occult",
      injuryProfile: "spectral",
      traumaBonus: 0,
    },
  },
  "grave-salt": {
    id: "grave-salt",
    label: "Cast grave salt",
    shortLabel: "Grave salt",
    description:
      "Salt certainty out of one enemy; on a hit, reduce its Defense and Evasion for 3 rounds.",
    spiritCost: 1,
    requiresTarget: true,
    tradition: "thaumaturgist",
    attack: {
      baseDamage: 3,
      damageType: "occult",
      injuryProfile: "grave-salt",
      traumaBonus: 0,
    },
  },
  corpsefire: {
    id: "corpsefire",
    label: "Unstopper corpsefire",
    shortLabel: "Corpsefire",
    description:
      "Unstopper cold grave-light; on a hit, deal heavy occult damage and burn the target for 2 rounds.",
    spiritCost: 3,
    requiresTarget: true,
    tradition: "thaumaturgist",
    attack: {
      baseDamage: 8,
      damageType: "occult",
      injuryProfile: "cold-fire",
      traumaBonus: 0,
    },
  },
  "set-threshold-seal": {
    id: "set-threshold-seal",
    label: "Set threshold seal",
    shortLabel: "Set seal",
    description:
      "Spend an act and 1 Spirit to set a two-fold seal against one enemy. Each of its next two attacks closes one fold as 1 Ward. If the second closes, recover 1 Spirit from the completed seal.",
    spiritCost: 1,
    requiresTarget: true,
    tradition: "grave-warden",
  },
  "answer-the-breach": {
    id: "answer-the-breach",
    label: "Follow the crossing",
    shortLabel: "Follow the crossing",
    description:
      "Lay occult force along one enemy’s passage through the field. A threshold seal can preserve that route; committing the record adds 3 damage.",
    spiritCost: 1,
    requiresTarget: true,
    tradition: "grave-warden",
    attack: {
      baseDamage: 4,
      damageType: "occult",
      injuryProfile: "spectral",
      traumaBonus: 0,
    },
  },
  "close-the-gate": {
    id: "close-the-gate",
    label: "Close the gate",
    shortLabel: "Close gate",
    description:
      "Spend one unbroken seal to raise 4 Ward. The seal closes without being tested and returns no Spirit.",
    spiritCost: 0,
    requiresTarget: true,
    tradition: "grave-warden",
  },
};

export const getPlayerActionIds = (
  tradition: TraditionId,
): ActionId[] => [
  "strike",
  "guard",
  ...TRADITIONS[tradition].actions,
  "black-tonic",
  "flee",
];
