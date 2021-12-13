import * as CLASSES from './classes.js';
import { EQUIPMENT_TYPES, MATERIAL_TYPES } from './materials.js';

const _ = {};
_.isArray = Array.isArray || (obj => Object.prototype.toString.call(obj) == '[object Array]');

const REQUIREMENT_TYPES = [
    'CHARACTER',
    'EQUIPMENT',
    'MATERIAL',
    'SCENE',
    'SELF'
];

const SELF_REQUIREMENTS = {
    NOT_CAST: 'NOT_CAST'
};

const SCENE_REQUIREMENTS = {
    TIME: 'TIME'
};

const skillType = (name, isCombat = false, isClassSpecific = false, classes = null) => ({
    name,
    isCombat,
    isClassSpecific,
    classes: _.isArray(classes) ? classes : [classes]
});

const SKILL_TYPES = {
    COMBAT: skillType('Combat', true),
    UTILIY: skillType('Utility'),
    NECROMANCER_COMBAT: skillType('Necromancer Combat', true),
    NECROMANCER_UTILITY: skillType('Necromancer Utility'),
    MEDIUM_COMBAT: skillType('Medium Combat', true, true, CLASSES.MEDIUM),
    MEDIUM_UTILITY: skillType('Medium Utility', false, true, CLASSES.MEDIUM),
    SUMMONER_COMBAT: skillType('Summoner Combat', true, true, CLASSES.SUMMONER),
    SUMMONER_UTILITY: skillType('Summoner Utility Skills', false, true, CLASSES.SUMMONER),
    THAUMATURGIST_COMBAT: skillType('Thaumaturgist Combat Skills', true, true, CLASSES.THAUMATURGIST),
    THAUMATURGIST_UTILITY: skillType('Thaumaturgist Utility Skills', false, true, CLASSES.THAUMATURGIST)
};

const skill = (name, description, skillType, cost, isPassive = false, requirements = null) => ({
    name,
    description,
    isPassive,
    skillType,
    cost,
    requirements
});

const getSkillGroups = skillType => {
    return [
        (name, description, cost = 1, requirements = null) => skill(name, description, skillType, cost, false, requirements),
        (name, description, cost = 0, requirements = null) => skill(name, description, skillType, cost, true, requirements)
    ];
};

const [genericUtility, genericUtilityPassive] = getSkillGroups(SKILL_TYPES.UTILITY);
const [genericCombat, genericCombatPassive] = getSkillGroups(SKILL_TYPES.COMBAT);

const [necromancerUtility, necromancerUtilityPassive] = getSkillGroups(SKILL_TYPES.NECROMANCER_UTILITY);
const [necomancerCombat, necromancerCombatPassive] = getSkillGroups(SKILL_TYPES.NECROMANCER_COMBAT);

const [mediumUtility, mediumUtilityPassive] = getSkillGroups(SKILL_TYPES.MEDIUM);
const [mediumCombat, mediumCombatPassive] = getSkillGroups(SKILL_TYPES.MEDIUM_COMBAT);

const [summonerUtility, summonerUtilityPassive] = getSkillGroups(SKILL_TYPES.SUMMONER_UTILITY);
const [summonerCombat, summonerCombatPassive] = getSkillGroups(SKILL_TYPES.SUMMONER_COMBAT);

const [thaumaturgistUtility, thaumaturgistUtilityPassive] = getSkillGroups(SKILL_TYPES.THAUMATURGIST_UTILITY);
const [thaumaturgistCombat, thaumaturgistCombatPassive] = getSkillGroups(SKILL_TYPES.THAUMATURGIST_COMBAT);

const COMBAT_SKILLS = {
    // TODO: Reqire polearm equipped to cast
    IMPALE: genericCombat(
        'Impale',
        'A focused blow designed to maim the enemy.'
    ),
    // TODO: Require shield equipped to cast
    SHIELD_BASH: genericCombat(
        'Shield Bash',
        'Strike an opponent with your equipped shield.'
    )
};

const UTILITY_SKILLS = {
    BARTER: genericUtility(
        'Barter',
        'Allows negotiation of better deals in transactions'
    ),
    FIRST_AID: genericUtility(
        'First Aid',
        'Basic medical attention to wounds and disease.',
        0,
        { MATERIAL: MATERIAL_TYPES.MEDICAL_SUPPLIES.ANY }
    ),
    PERSUADE: genericUtility(
        'Persuade',
        'Some ability to sway others, whether in conversation or negotiation.'
    )
};

const NECROMANCER_COMBAT_SKILLS = {    
    BANISH: necromancerCombat(
        'Banish',
        'Banishes lesser undead from this plane. Has no effect on the living, constructs, or greater undead.'
    ),
    BONE_SHIELD: necromancerCombat(
        'Bone Shield',
        'Provides a shield with limited health, effective against physical damage.',
        1,
        { SELF: SELF_REQUIREMENTS.NOT_CAST }
    ),
    SAP_WILL: necromancerCombat(
        'Sap Will',
        'Drains some physical and spiritual offensive capability from the target.'
    )
};

const NECROMANCER_UTILITY_SKILLS = {
    DETECT_DEAD: necromancerUtility(
        'Detect Dead',
        'Detects unanimated corpses in the area.'
    ),

    DETECT_UNDEAD: necromancerUtility(
        'Detect Undead',
        'Detects any of various undead creatures in the area.'
    )
};

const MEDIUM_COMBAT_SKILLS = {
    POSSESSION_POWER: mediumCombat(
        'Possession: Power',
        'Become possessed by a willing demon to enhance physical offensive capability.',
        1,
        { SELF: SELF_REQUIREMENTS.NOT_CAST }
    )   
};

const MEDIUM_UTILITY_SKILLS = {
    CHANNEL: mediumUtility(
        'Channel',
        'Channel spirits of the dead to reveal hidden information'
    )   
};

const SUMMONER_UTILITY_SKILLS = {
    
};

const SUMMONER_COMBAT_SKILLS = {
    SUMMON_SHADE: summonerCombat(
        'Summon Shade',
        'Reaches into the nether to recruit a recently-deceased soul.'
    ),
    SUMMON_GREATER_SHADE: summonerCombat(
        'Summon Greater Shade',
        'Reaches into the nether to recruit a long-dead soul.',
        2
    )
};

const THAUMATURGIST_COMBAT_SKILLS = {
};

const THAUMATURGIST_UTILITY_SKILLS = {
    BREW_POTION: thaumaturgistUtility(
        'Brew Potion',
        'Unlocks potion-brewing, allowing the thaumaturgist to concoct various potions, useful in and out of combat.'
    )
};

export {
    COMBAT_SKILLS,
    UTILITY_SKILLS,
    NECROMANCER_COMBAT_SKILLS,
    NECROMANCER_UTILITY_SKILLS,
    MEDIUM_COMBAT_SKILLS,
    MEDIUM_UTILITY_SKILLS,
    SUMMONER_COMBAT_SKILLS,
    SUMMONER_UTILITY_SKILLS,
    THAUMATURGIST_COMBAT_SKILLS,
    THAUMATURGIST_UTILITY_SKILLS
};