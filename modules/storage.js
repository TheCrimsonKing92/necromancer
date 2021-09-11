const GAME_DATA_KEY = "NECROMANCER_DATA";
const GAME_VERSION_KEY = "NECROMANCER_VERSION";

const getSave = () => localStorage.getItem(GAME_DATA_KEY);

const getSavedVersion = () => localStorage.getItem(GAME_VERSION_KEY);

const hasSave = () => {
    return getSave() != null;
};

const reset = () => {
    localStorage.removeItem(GAME_VERSION_KEY);
    localStorage.removeItem(GAME_DATA_KEY);
};

const save = (data, version) => {
    localStorage.setItem(GAME_VERSION_KEY, version);
    localStorage.setItem(GAME_DATA_KEY, JSON.stringify(data));
};

export { getSave, getSavedVersion, hasSave, reset, save };