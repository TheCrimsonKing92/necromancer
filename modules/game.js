import * as SKILLS from './constants/skills.js';

const SCENES = [
    "CLASS SELECTION", "INTRODUCTION", "CHARACTER", "BATTLE", "NARRATIVE"
];

const GAME_STATE_STRUCTURE = {
    classChosen: false,
    characterFirstName: null,
    characterLastName: null,
    chosenClass: null,
    chosenSkills: [],
    currentScene: SCENES[0],
    introductionShown: false,
    skillPoints: 0
};

const CURRENT_GAME = { ...GAME_STATE_STRUCTURE };

const addSkillPoints = points => {
    CURRENT_GAME.skillPoints = CURRENT_GAME.skillPoints + points;
};

const confirmClass = () => {
    CURRENT_GAME.classChosen = true;
    CURRENT_GAME.currentScene = SCENES[1];
};

const finishIntroduction = () => {
    CURRENT_GAME.introductionShown = true;
    CURRENT_GAME.currentScene = SCENES[2];
};

const getClass = () => CURRENT_GAME.chosenClass;

const getClassSkills = () => {
    const index = getClass();
    return Object.values(SKILLS)
                 .filter(
                     s => !s.skillType.isClassSpecific ||
                     s.skillType.classes.includes(index)
                 );
};

const getData = () => {

};

const getFirstName = () => CURRENT_GAME.characterFirstName;

const getGame = () => CURRENT_GAME;

const getLastName = () => CURRENT_GAME.characterLastName;

const getScene = () => CURRENT_GAME.currentScene;

const getSkillPoints = () => CURRENT_GAME.skillPoints;

const getSkills = () => CURRENT_GAME.chosenSkills;

const getStartingSkills = () => getClassSkills().filter(s => s.cost === 1);

const loadSave = data => {

};

const removeSkillPoints = points => {
    CURRENT_GAME.skillPoints = CURRENT_GAME.skillPoints - points;
};

const setClass = chosenClass => {
    CURRENT_GAME.chosenClass = chosenClass;
};

const setFirstName = firstName => CURRENT_GAME.characterFirstName = firstName;

const setLastName = lastName => CURRENT_GAME.characterLastName = lastName;

const setSkill = skill => {
    const index = CURRENT_GAME.chosenSkills.findIndex(s => s.name === skill.name);

    if (index !== -1) {
        CURRENT_GAME.chosenSkills.splice(index, 1, skill);
    } else {
        CURRENT_GAME.chosenSkills.push(skill);
    }
};

export {
    addSkillPoints,
    confirmClass,
    finishIntroduction,
    getClass,
    getClassSkills,
    getData,
    getFirstName,
    getGame,
    getLastName,
    getScene,
    getSkillPoints,
    getSkills,
    getStartingSkills,
    loadSave,
    removeSkillPoints,
    setClass,
    setFirstName,
    setLastName,
    setSkill
};