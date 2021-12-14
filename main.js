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
    const skillButton = Html.createSkillButton(skill.name);
    addSkillEventListeners(skillButton, skill);

    parent.appendChild(skillButton);
};

const chooseClass = (el, chosenClass) => {
    if (Game.getClass() !== null) {
        if (chosenClass === Game.getClass()) {
            Html.unselect(el, () => {
                Game.setClass(null);
                chosenClassNode.innerText = 'None';
            });
        } else {
            Html.unselectAll(document.getElementsByClassName('class-button'), () => {
                Game.setClass(chosenClass);
                chosenClassNode.innerText = chosenClass.displayName;
                Html.select(el, null);
            });
        }
    } else {
        Html.select(el, () => {
            Game.setClass(chosenClass);
            chosenClassNode.innerText = chosenClass.displayName;
        });
    }

    if (Game.getClass() === null) {
        confirmClassButton.disabled = true;
    } else {
        confirmClassButton.disabled = false;
    }
};

const confirmClass = () => {
    if (Game.getClass() != null) {
        Game.confirmClass();
        transitionScene();
    }    
};

const createClassButton = characterClass => {
    const nodeClass = characterClass.cssName + '-class';
    const node = document.getElementById(nodeClass);
    const setNotes = () => setClassNotes(characterClass.displayName, characterClass.description);
    node.addEventListener('mouseover', setNotes);
    node.addEventListener('mouseout', resetClassNotes);
    node.addEventListener('click', () => chooseClass(node, characterClass));
};

const createSkillContainers = () => {
    const [skillName, skillNameSpan] = Html.createValueContainer('Skill: ', 'skill-name', 'None');
    const [skillDescription, skillDescriptionSpan] = Html.createValueContainer('Description: ', 'skill-description', 'N/A');
    const [skillTree, skillTreeSpan] = Html.createValueContainer('Skill Tree: ', 'skill-tree', 'N/A');
    const [skillCost, skillCostSpan] = Html.createValueContainer('Skill Cost: ', 'skill-cost', 'N/A');

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
        Html.appendChildren(
            contentNode,
            Html.h2('Introduction'),
            Html.pStrongFirst('Necromancer currently supports only limited functionality: character skill management and random battles.'),
            Html.p('Choose your name to begin skill selection.')
        );

        const firstDiv = document.createElement('div');
        firstDiv.style.marginBottom = '0.5vh';
        const firstLabel = document.createElement('label');
        firstLabel.append('First Name: ');
        firstDiv.appendChild(firstLabel);

        const firstInput = document.createElement('input');
        let firstNameFilled = false;
        firstInput.setAttribute('id', 'first-name-input');
        firstDiv.appendChild(firstInput);

        contentNode.appendChild(firstDiv);

        const lastDiv = document.createElement('div');
        lastDiv.style.marginBottom = '1vh';
        const lastLabel = document.createElement('label');
        lastLabel.append('Last Name: ');
        lastDiv.appendChild(lastLabel);

        const lastInput = document.createElement('input');
        lastInput.style.marginLeft = '2px';
        let lastNameFilled = false;
        lastInput.setAttribute('id', 'last-name-input');
        lastDiv.appendChild(lastInput);

        contentNode.appendChild(lastDiv);

        const next = document.createElement('button');        
        firstInput.addEventListener('input', e => {
            const value = e.target.value;

            if (value && value.length > 0) {
                firstNameFilled = true;
                Game.setFirstName(value);
            } else {
                firstNameFilled = false;
            }

            if (firstNameFilled && lastNameFilled) {
                next.disabled = false;
            } else {
                next.disabled = true;
            }
        });
        lastInput.addEventListener('input', e => {
            const value = e.target.value;

            if (value && value.length > 0) {
                lastNameFilled = true;
                Game.setLastName(value);
            } else {
                lastNameFilled = false;
            }

            if (firstNameFilled && lastNameFilled) {
                next.disabled = false;
            } else {
                next.disabled = true;
            }
        });

        next.disabled = true;
        next.setAttribute('id', 'finish-introduction-button');
        next.classList.add('standard-button', 'hover-pointer');
        next.append('Next');
        next.addEventListener('click', () => {
            if (next.disabled) {
                return;
            }

            finishIntroduction();
        });
        contentNode.appendChild(next);
    } else if (currentScene === "CHARACTER") {
        Html.appendChildren(
            contentNode,
            Html.h2('Skills'),
            Html.pStrongFirst(`Choose the first skill for ${Game.getFullName()}, the novice ${Game.getClass().displayName}.`)
        )
        
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

        Html.appendChildren(
            footerNode,
            skillName,
            skillDescription,
            skillTree,
            skillCost
        );

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
document.addEventListener('mousedown', e => {
    if (e.detail > 1) {
        e.preventDefault();
    }
}, false);