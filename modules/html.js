const CSS_CLASSES = {
    SELECTED: 'selected-box'
};

const appendChildren = (parent, ...elements) => {
    const len = elements.length;

    for (let i = 0; i < len; i++) {
        parent.appendChild(elements[i]);
    }
};

const createSkillButton = skillName => {    
    const splitName = skill.name.split(' ');

    const div = document.createElement('div');
    div.classList.add('skill-button', 'hover-pointer');

    div.append(splitName[0]);

    if (splitName.length === 1) {
        div.classList.add('skill-button-single-word');
    } else {
        for (let i = 1; i < splitName.length; i++) {
            div.append(document.createElement('br'));
            div.append(splitName[i]);
        }
        div.style.lineHeight = (50 / splitName.length) + 'px';
    }

    return div;
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

const h2 = text => {
    const newEl = document.createElement('h2');
    newEl.append(text);
    return newEl;
};

const p = text => {
    const newEl = document.createElement('p');
    newEl.append(text);
    return newEl;
};

const pStrongFirst = text => {
    const split = text.split(" ");
    const first = split.shift();
    const rest = ' ' + split.join(' ');
    const newEl = document.createElement('p');
    const strongFirst = document.createElement('strong');
    strongFirst.append(first);
    newEl.append(strongFirst);
    newEl.append(rest);
    return newEl;
};

const removeAllChildren = el => {
    while (el.firstChild) {
        el.removeChild(el.lastChild);
    }
};

const select = (el, sideEffect = null) => {
    el.classList.add(CSS_CLASSES.SELECTED);

    if (sideEffect != null) {
        sideEffect();
    }
};

const unselect = (el, sideEffect = null) => {
    el.classList.remove(CSS_CLASSES.SELECTED);

    if (sideEffect != null) {
        sideEffect();
    }
};

const unselectAll = (els, sideEffect = null) => {
    for (const el of els) {
        unselect(el, null);
    }

    if (sideEffect != null) {
        sideEffect();
    }
};

export {
    appendChildren,
    createSkillButton,
    createValueContainer,
    h2,
    p,
    pStrongFirst,
    removeAllChildren,
    select,
    unselect,
    unselectAll
}