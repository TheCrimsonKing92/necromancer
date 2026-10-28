import type {
  AttributeId,
  CharacterAttributes,
  DamageTypeId,
  MundaneSkillId,
  MundaneSkills,
  WoundSeverity,
} from "./types";

export interface AttributeDefinition {
  id: AttributeId;
  label: string;
  description: string;
}

export interface MundaneSkillDefinition {
  id: MundaneSkillId;
  label: string;
  usualAttribute: AttributeId;
  description: string;
}

export const ATTRIBUTE_IDS: AttributeId[] = [
  "strength",
  "dexterity",
  "vitality",
  "intelligence",
  "willpower",
  "charisma",
];

export const ATTRIBUTES: Record<AttributeId, AttributeDefinition> = {
  strength: {
    id: "strength",
    label: "Strength",
    description:
      "Physical force. Governs bodily damage and how much can be carried.",
  },
  dexterity: {
    id: "dexterity",
    label: "Dexterity",
    description:
      "Speed and precision. Governs physical accuracy, evasion, and escape.",
  },
  vitality: {
    id: "vitality",
    label: "Vitality",
    description:
      "Constitution and recovery. Contributes directly to maximum Health.",
  },
  intelligence: {
    id: "intelligence",
    label: "Intelligence",
    description:
      "Reasoned knowledge. Supports diagnosis, investigation, and thaumaturgy.",
  },
  willpower: {
    id: "willpower",
    label: "Willpower",
    description:
      "Mental endurance. Helps force occult work to hold and resists intrusion.",
  },
  charisma: {
    id: "charisma",
    label: "Charisma",
    description:
      "Personal force. Governs negotiation and a medium’s authority among the dead.",
  },
};

export const MUNDANE_SKILL_IDS: MundaneSkillId[] = [
  "athletics",
  "medicine",
  "survival",
  "perception",
  "persuasion",
  "barter",
];

export const MUNDANE_SKILLS: Record<
  MundaneSkillId,
  MundaneSkillDefinition
> = {
  athletics: {
    id: "athletics",
    label: "Athletics",
    usualAttribute: "strength",
    description:
      "Climbing, hauling, forcing obstacles, and sustained physical work.",
  },
  medicine: {
    id: "medicine",
    label: "Medicine",
    usualAttribute: "intelligence",
    description:
      "Diagnosing injury, dressing open wounds, and keeping recovery from going wrong.",
  },
  survival: {
    id: "survival",
    label: "Survival",
    usualAttribute: "vitality",
    description:
      "Travel, campcraft, exposure, and finding what the road can spare.",
  },
  perception: {
    id: "perception",
    label: "Perception",
    usualAttribute: "intelligence",
    description:
      "Noticing danger, discrepancies, tracks, and deliberately hidden details.",
  },
  persuasion: {
    id: "persuasion",
    label: "Persuasion",
    usualAttribute: "charisma",
    description:
      "Winning cooperation without purchase or immediate violence.",
  },
  barter: {
    id: "barter",
    label: "Barter",
    usualAttribute: "charisma",
    description:
      "Judging an exchange and pressing for terms the other party will still accept.",
  },
};

export const skillRankLabel = (rank: number): string => {
  if (rank <= 0) return "Untrained";
  if (rank === 1) return "Familiar";
  if (rank === 2) return "Practiced";
  if (rank === 3) return "Expert";
  return "Master";
};

export const normalizeAttributes = (
  attributes: Partial<CharacterAttributes>,
  fallback: CharacterAttributes,
): CharacterAttributes =>
  Object.fromEntries(
    ATTRIBUTE_IDS.map((id) => [
      id,
      Math.max(
        1,
        Math.min(
          10,
          Math.trunc(
            Number.isFinite(attributes[id])
              ? attributes[id]!
              : fallback[id],
          ),
        ),
      ),
    ]),
  ) as CharacterAttributes;

export const normalizeSkills = (
  skills: Partial<MundaneSkills>,
  fallback: MundaneSkills,
): MundaneSkills =>
  Object.fromEntries(
    MUNDANE_SKILL_IDS.map((id) => [
      id,
      Math.max(
        0,
        Math.min(
          5,
          Math.trunc(
            Number.isFinite(skills[id]) ? skills[id]! : fallback[id],
          ),
        ),
      ),
    ]),
  ) as MundaneSkills;

export const maximumHealthFromAttributes = (
  attributes: CharacterAttributes,
): number => 20 + attributes.vitality * 2;

export const physicalPowerFromAttributes = (
  attributes: CharacterAttributes,
): number => attributes.strength;

export const defenseFromAttributes = (
  attributes: CharacterAttributes,
): number => attributes.dexterity;

export const occultPowerFromAttributes = (
  attributes: CharacterAttributes,
  occultAttribute: AttributeId,
): number =>
  Math.max(
    0,
    Math.floor(
      (attributes.willpower + attributes[occultAttribute]) / 2,
    ),
  );

export const accuracyFromAttributes = (
  attributes: CharacterAttributes,
  damageType: DamageTypeId,
  occultAttribute: AttributeId,
): number =>
  damageType === "occult"
    ? occultPowerFromAttributes(attributes, occultAttribute)
    : attributes.dexterity;

export const evasionFromAttributes = (
  attributes: CharacterAttributes,
): number => attributes.dexterity;

export const fleeChanceFromAttributes = (
  attributes: CharacterAttributes,
): number => Math.min(75, 35 + attributes.dexterity * 5);

export const carryCapacityFromAttributes = (
  attributes: CharacterAttributes,
): number =>
  20 +
  attributes.strength * 2 +
  Math.floor(attributes.vitality / 2);

export const braceWardFromAttributes = (
  attributes: CharacterAttributes,
): number => 2 + Math.floor(attributes.willpower / 3);

export const skillCheckScore = (
  attributes: CharacterAttributes,
  skills: MundaneSkills,
  skill: MundaneSkillId,
  attribute: AttributeId = MUNDANE_SKILLS[skill].usualAttribute,
): number => attributes[attribute] + skills[skill];

const WOUND_TREATMENT_PENALTY: Record<WoundSeverity, number> = {
  minor: 0,
  serious: 10,
  grievous: 25,
};

export const fieldDressingChance = (
  attributes: CharacterAttributes,
  skills: MundaneSkills,
  severity: WoundSeverity,
): number =>
  Math.max(
    25,
    Math.min(
      95,
      60 +
        attributes.dexterity * 5 +
        skills.medicine * 10 -
        WOUND_TREATMENT_PENALTY[severity],
    ),
  );

export const fieldDressingRecovery = (
  skills: MundaneSkills,
): number => Math.max(1, Math.min(4, skills.medicine + 1));
