import * as CLASSES from './classes.js';

const REQUIREMENT_TYPES = [
    'CHARACTER',
    'MATERIAL',
    'SCENE',
    'SELF'
];

const SELF_REQUIREMENTS = {
    NOT_CAST: 'NOT_CAST'
};

const SKILL_TYPES = {
    NECROMANCER_COMBAT: {
        name: 'Necromancer Combat Skills',
        isCombat: true,
        isClassSpecific: false,
        classes: null
    },
    NECROMANCER_UTILITY: {
        name: 'Necromancer Utility Skills',
        isCombat: false,
        isClassSpecific: false,
        classes: null
    },
    MEDIUM_COMBAT: {
        name: 'Medium Combat Skills',
        isCombat: true,
        isClassSpecific: true,
        classes: [CLASSES.MEDIUM]
    },
    MEDIUM_UTILITY: {
        name: 'Medium Utility Skills',
        isCombat: false,
        isClassSpecific: true,
        classes: [CLASSES.MEDIUM]
    },
    SUMMONER_COMBAT: {
        name: 'Summoner Combat Skills',
        isCombat: true,
        isClassSpecific: true,
        classes: [CLASSES.SUMMONER]
    },
    SUMMONER_UTILITY: {
        name: 'Summoner Utility Skills',
        isCombat: false,
        isClassSpecific: true,
        classes: [CLASSES.SUMMONER]
    },
    THAUMATURGIST_COMBAT: {
        name: 'Thaumaturgist Combat Skills',
        isCombat: true,
        isClassSpecific: true,
        classes: [CLASSES.THAUMATURGIST]
    },
    THAUMATURGIST_UTILITY: {
        name: 'Thaumaturgist Utility Skills',
        isCombat: false,
        isClassSpecific: true,
        classes: [CLASSES.THAUMATURGIST]
    }
};

const BANISH = {
    name: 'Banish',
    description: 'Banishes lesser undead from this plane. Has no effect on the living, constructs, or greater undead.',
    skillType: SKILL_TYPES.NECROMANCER_COMBAT,
    cost: 1,
    requirements: null
};

const BREW_POTION = {
    name: 'Brew Potion',
    description: 'Unlocks potion-brewing, allowing the thaumaturgist to concoct various potions, useful in and out of combat.',
    skillType: SKILL_TYPES.THAUMATURGIST_UTILITY,
    cost: 1,
    requirements: null
};

const BONE_SHIELD = {
    name: 'Bone Shield',
    description: 'Provides a shield with limited health, effective against physical damage.',
    skillType: SKILL_TYPES.NECROMANCER_COMBAT,
    cost: 1,
    requirements: {
        SELF: SELF_REQUIREMENTS.NOT_CAST
    }
};

const CHANNEL = {
    name: 'Channel',
    description: 'Channel spirits of the dead to reveal hidden information',
    skillType: SKILL_TYPES.MEDIUM_UTILITY,
    cost: 1,
    requirements: null
};

const PERSUADE = {
    name: 'Persuade',
    description: 'Some ability to sway others, whether in conversation or negotiation.',
    skillType: SKILL_TYPES.NECROMANCER_UTILITY,
    cost: 1,
    requirements: null
};

const POSSESSION_POWER = {
    name: 'Possession: Power',
    description: 'Become possessed by a willing demon to enhance physical offensive capability.',
    skillType: SKILL_TYPES.MEDIUM_COMBAT,
    cost: 1,
    requirements: {
        SELF: SELF_REQUIREMENTS.NOT_CAST
    }
};

const SAP_WILL = {
    name: 'Sap Will',
    description: 'Drains some physical and spiritual offensive capability from the target.',
    skillType: SKILL_TYPES.NECROMANCER_COMBAT,
    cost: 1,
    requirements: null
};

const SUMMON_GREATER_SHADE = {
    name: 'Summon Greater Shade',
    description: 'Reaches into the nether to recruit a long-dead soul.',
    skillType: SKILL_TYPES.SUMMONER_COMBAT,
    cost: 2,
    requirements: null
};

const SUMMON_SHADE = {
    name: 'Summon Shade',
    description: 'Reaches into the nether to recruit a recently-deceased soul.',
    skillType: SKILL_TYPES.SUMMONER_COMBAT,
    cost: 1,
    requirements: null
};

export {
    BANISH,
    BONE_SHIELD,
    BREW_POTION,
    CHANNEL,
    PERSUADE,
    POSSESSION_POWER,
    SAP_WILL,
    SUMMON_GREATER_SHADE,
    SUMMON_SHADE
};