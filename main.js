import * as CLASSES from './modules/constants/classes.js';
import * as SKILLS from './modules/constants/skills.js';
import * as Game from './modules/game.js';
import * as Html from './modules/html.js';
import * as Storage from './modules/storage.js';

const classNotesName = document.getElementById('class-notes-name');
const classNotesDescription = document.getElementById('class-notes-description');
const contentNode = document.getElementById('scene-content');
const chosenClassInfo = document.getElementById('chosen-class-info');
const chosenClassNode = document.getElementById('chosen-class');
const confirmClassButton = document.getElementById('confirm-class-button');
const footerNode = document.getElementById('scene-footer');

const addSkillButton = (parent, skill, addSkillEventListeners) => {
    const skillButton = createSkillButton();
    const splitName = skill.name.split(' ');
    skillButton.append(splitName[0]);

    if (splitName.length === 1) {
        skillButton.classList.add('skill-button-single-word');
    } else {
        for (let i = 1; i < splitName.length; i++) {
            skillButton.append(document.createElement('br'));
            skillButton.append(splitName[i]);
        }
        skillButton.style.lineHeight = (50 / splitName.length) + 'px';
    }

    addSkillEventListeners(skillButton, skill);
    parent.appendChild(skillButton);
};

const chooseClass = (el, chosenClass) => {
    if (Game.getClass() !== null) {
        if (chosenClass === Game.getClass()) {
            el.classList.remove('selected-box');
            Game.setClass(null);
            chosenClassNode.innerText = 'None';
        } else {
            for (const el of document.getElementsByClassName('class-button')) {
                el.classList.remove('selected-box');
            }
    
            Game.setClass(chosenClass);
            chosenClassNode.innerText = chosenClass.displayName;
            el.classList.add('selected-box');
        }
    } else {
        Game.setClass(chosenClass);
        chosenClassNode.innerText = chosenClass.displayName;
        el.classList.add('selected-box');
    }
};

const confirmClass = () => {
    Game.confirmClass();
    transitionScene();
};

const createClassButton = characterClass => {
    console.log('Creating class button for: ', characterClass);
    const nodeClass = characterClass.cssName + '-class';
    const node = document.getElementById(nodeClass);
    const setNotes = () => setClassNotes(characterClass.displayName, characterClass.description);
    node.addEventListener('mouseover', setNotes);
    node.addEventListener('mouseout', resetClassNotes);
    node.addEventListener('click', () => chooseClass(node, characterClass));
};

const createSkillButton = () => {
    const div = document.createElement('div');
    div.classList.add('skill-button', 'hover-pointer');
    return div;
};

const createSkillContainers = () => {
    const [skillName, skillNameSpan] = createValueContainer('Skill: ', 'skill-name', 'None');
    const [skillDescription, skillDescriptionSpan] = createValueContainer('Description: ', 'skill-description', 'N/A');
    const [skillTree, skillTreeSpan] = createValueContainer('Skill Tree: ', 'skill-tree', 'N/A');
    const [skillCost, skillCostSpan] = createValueContainer('Skill Cost: ', 'skill-cost', 'N/A');

    return [
        skillName,
        skillNameSpan,
        skillDescription,
        skillDescriptionSpan,
        skillTree,
        skillTreeSpan,
        skillCost,
        skillCostSpan
    ];
};

const createValueContainer = (label, baseId, defaultValue) => {
    const container = document.createElement('p');
    container.setAttribute('id', baseId + '-container');

    const containerLabel = document.createElement('strong');
    containerLabel.setAttribute('id', baseId + '-label');
    containerLabel.append(label);

    const containerSpan = document.createElement('span');
    containerSpan.setAttribute('id', baseId);
    containerSpan.append(defaultValue);

    container.append(containerLabel, containerSpan);

    return [container, containerSpan];
};

const finishIntroduction = () => {
    Game.finishIntroduction();
    transitionScene();
};

const resetClassNotes = () => {
    if (Game.getClass() === null) {
        setClassNotes('None', 'N/A');
    }
};

const setClassNotes = (name, description) => {
    classNotesName.innerText = name;
    classNotesDescription.innerText = description;
};

const transitionScene = () => {
    const currentScene = Game.getScene();

    Html.removeAllChildren(contentNode);
    Html.removeAllChildren(footerNode);

    if (currentScene === "INTRODUCTION") {
        contentNode.appendChild(Html.h2('Introduction'));
        contentNode.appendChild(Html.pStrongFirst('Necromancer currently supports only limited functionality: character skill management and random battles. Click below to begin by selecting your first skill.'));

        const next = document.createElement('div');
        next.setAttribute('id', 'finish-introduction-button');
        next.classList.add('standard-button', 'hover-pointer');
        next.append('Next');
        next.addEventListener('click', finishIntroduction);
        contentNode.appendChild(next);
    } else if (currentScene === "CHARACTER") {
        contentNode.appendChild(Html.h2('Skills'));
        contentNode.appendChild(Html.pStrongFirst('Choose your first skill below.'));
        
        const [
            skillName,
            skillNameSpan,
            skillDescription,
            skillDescriptionSpan,
            skillTree,
            skillTreeSpan,
            skillCost,
            skillCostSpan
        ] = createSkillContainers();
        footerNode.appendChild(skillName);
        footerNode.appendChild(skillDescription);
        footerNode.appendChild(skillTree);
        footerNode.appendChild(skillCost);

        let skillTextLocked = false;
        let skillTextLockedBy = null;

        const lockSkillText = skill => {
            skillTextLocked = true;
            skillTextLockedBy = skill;
        };

        const unlockSkillText = () => {
            skillTextLocked = false;
            skillTextLockedBy = null;
        };

        const setSkillText = (name, description, tree, cost) => {
            skillNameSpan.innerText = name;
            skillDescriptionSpan.innerText = description;
            skillTreeSpan.innerText = tree;
            skillCostSpan.innerText = cost;
        };

        const clearSkillText = () => {
            if (skillTextLocked) {
                return;
            }

            setSkillText('None', 'N/A', 'N/A', 'N/A');        
        };

        const addSkillEventListeners = (el, skill) => {
            el.addEventListener(
                'mouseover',
                () => setSkillText(
                        skill.name,
                        skill.description,
                        skill.skillType.name,
                        skill.cost + ' skill ' + (skill.cost === 1 ? ' point' : ' points')
                    )
            );

            el.addEventListener(
                'mouseout',
                clearSkillText
            );

            el.addEventListener(
                'click',
                () => {
                    if (skillTextLocked && skill.name === skillTextLockedBy) {
                        unlockSkillText();
                        el.classList.remove('selected-box');
                        Game.setSkill(null);
                        return;
                    }
                    
                    if (skillTextLocked) {
                        for (const el of document.getElementsByClassName('selected-box')) {
                            el.classList.remove('selected-box');
                        }
                    }
                        
                    lockSkillText(skill.name);
                    el.classList.add('selected-box');
                    Game.setSkill(skill);
                }
            );
        };

        for (const skill of Game.getStartingSkills()) {
            addSkillButton(contentNode, skill, addSkillEventListeners);
        }
    }
};

Object.values(CLASSES).forEach(createClassButton);
confirmClassButton.addEventListener('click', confirmClass);
