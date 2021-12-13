const ANY = 'ANY';

const MATERIAL_ATTRIBUTES = [
    'QUALITY'
];

const QUALITY_RANK = {
    POOR: 'POOR',
    FAIR: 'FAIR',
    AVERAGE: 'AVERAGE',
    GOOD: 'GOOD',
    EXCELLENT: 'EXCELLENT'
};

const MATERIAL_TYPES = {
    MEDICAL_SUPPLIES: {
        ANY,
        BANDAGE: 'BANDAGE',
        DISINFECTANT: 'DISINFECTANT',
        SPLINT: 'SPLINT'
    }
};

const EQUIPMENT_ATTRIBUTES = [
    'EQUIPS',
    'HANDEDNESS',
    'QUALITY',
    'MAGIC' // ?
];

const EQUIPS = {
    HEAD: 'HEAD',
    NECK: 'NECK',
    TORSO: 'TORSO',
    PRIMARY: 'PRIMARY',
    SECONDARY: 'SECONDARY',
    BELT: 'BELT',
    FEET: 'FEET'
};

const HANDEDNESS = {
    BOTH: 'BOTH',
    EITHER: 'EITHER',
    PRIMARY: 'PRIMARY',
    SECONDARY: 'SECONDARY'
};

const EQUIPMENT_TYPES = {
    ARMOR: {
        ANY,
        GLOVES: {
            ANY
        },
        SHIELD: {
            ANY
        }
    },
    WEAPON: {
        ANY,
        AXE: {
            ANY
        },
        POLEARM: {
            ANY
        },
        SWORD: {
            ANY
        },
        STAVE: {
            ANY
        },
        WAND: {
            ANY
        }
    }
};

export {
    EQUIPMENT_TYPES,
    MATERIAL_TYPES
};