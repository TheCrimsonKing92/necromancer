export interface StatKnowledge {
  description: string;
  detail?: string;
}

export const STAT_KNOWLEDGE = {
  health: {
    description:
      "How much harm the whole body can withstand. At zero Health, the testament ends.",
    detail:
      "Vitality establishes the base maximum; disciplines may raise it further.",
  },
  spirit: {
    description:
      "Occult reserve spent to force necromantic techniques into the world.",
    detail:
      "Defeating an enemy restores one Spirit. Some disciplines and items change that cadence.",
  },
  ward: {
    description:
      "A temporary barrier spent before a blow reaches Health or the struck body part.",
    detail:
      "Ward persists between turns but is cleared when the journey moves beyond an encounter.",
  },
  experience: {
    description:
      "Experience raises level when a threshold is crossed. Each level after the first grants one discipline point.",
    detail:
      "Unspent discipline points remain available until you choose to use them.",
  },
  physicalPower: {
    description:
      "The force behind physical attacks before a weapon, technique, protection, or wound changes the result.",
    detail:
      "Strength is the foundation. Equipment and injuries can modify the current value.",
  },
  occultPower: {
    description:
      "The force behind occult attacks and workings.",
    detail:
      "Willpower combines with the governing attribute of your necromantic practice.",
  },
  defense: {
    description:
      "Your present resistance to attacks after equipment, statuses, and wounds.",
    detail:
      "Defense reduces the chance of being hit. Armor mitigates damage separately after a hit lands.",
  },
  fleeChance: {
    description:
      "The current chance to escape an encounter when you choose to flee.",
    detail:
      "Dexterity establishes the base chance. Leg wounds and other effects can reduce it.",
  },
  body: {
    description:
      "The combined condition of every anatomical region.",
    detail:
      "A body part can be impaired or destroyed before total Health is exhausted.",
  },
  load: {
    description:
      "The weight of carried and equipped possessions against your carrying capacity.",
    detail:
      "Strength and Vitality increase the amount you can carry.",
  },
} satisfies Record<string, StatKnowledge>;
