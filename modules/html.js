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

export {
    h2,
    p,
    pStrongFirst,
    removeAllChildren
}