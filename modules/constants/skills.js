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
    COMBAT: {
        name: 'Combat Skills',
        isCombat: true,
        isClassSpecific: false,
        classes: null
    },
    UTILITY: {
        name: 'Utility Skills',
        isCombat: false,
        isClassSpecific: false,
        classes: null
    },
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

const skill = (name, description, skillType, cost, requirements = null) => ({
    name,
    description,
    skillType,
    cost,
    requirements
});

const genericSkill = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.UTILITY, cost, requirements);
const genericCombatSkill = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.COMBAT, cost, requirements);
const mediumSkill = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.MEDIUM_UTILITY, cost, requirements);
const mediumCombat = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.MEDIUM_COMBAT, cost, requirements);
const necromancerSkill = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.NECROMANCER_UTILITY, cost, requirements);
const necromancerCombat = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.NECROMANCER_COMBAT, cost, requirements);
const summonerSkill = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.SUMMONER_UTILITY, cost, requirements);
const summonerCombat = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.SUMMONER_COMBAT, cost, requirements);
const thaumaturgistSkill = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.THAUMATURGIST_UTILITY, cost, requirements);
const thaumaturgistCombat = (name, description, cost = 1, requirements = null) => skill(name, description, SKILL_TYPES.THAUMATURGIST_COMBAT, cost, requirements);

const BANISH = genericCombatSkill(
    'Banish',
    'Banishes lesser undead from this plane. Has no effect on the living, constructs, or greater undead.'
);

const BARTER = genericSkill('Barter', 'Allows negotiation of better deals in transactions');

const BREW_POTION = thaumaturgistSkill(
    'Brew Potion',
    'Unlocks potion-brewing, allowing the thaumaturgist to concoct various potions, useful in and out of combat.'
);

const BONE_SHIELD = necromancerCombat(
    'Bone Shield',
    'Provides a shield with limited health, effective against physical damage.',
    1,
    { SELF: SELF_REQUIREMENTS.NOT_CAST }
);

const CHANNEL = mediumSkill(
    'Channel',
    'Channel spirits of the dead to reveal hidden information'
);

const PERSUADE = genericSkill(
    'Persuade',
    'Some ability to sway others, whether in conversation or negotiation.'
);

const POSSESSION_POWER = mediumCombat(
    'Possession: Power',
    'Become possessed by a willing demon to enhance physical offensive capability.',
    1,
    { SELF: SELF_REQUIREMENTS.NOT_CAST }
);

const SAP_WILL = necromancerCombat(
    'Sap Will',
    'Drains some physical and spiritual offensive capability from the target.'
);

const SUMMON_GREATER_SHADE = summonerCombat(
    'Summon Greater Shade',
    'Reaches into the nether to recruit a long-dead soul.',
    2
);

const SUMMON_SHADE = summonerCombat(
    'Summon Shade',
    'Reaches into the nether to recruit a recently-deceased soul.'
);

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