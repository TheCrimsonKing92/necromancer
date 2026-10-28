import type { Player } from "./types";

export const experienceForLevel = (level: number): number => {
  const rank = Math.max(0, Math.floor(level) - 1);
  return 5 * rank * rank + 20 * rank;
};

export const levelForExperience = (experience: number): number => {
  const total = Math.max(0, Math.floor(experience));
  let level = 1;

  while (experienceForLevel(level + 1) <= total) {
    level += 1;
  }

  return level;
};

export interface ExperienceAward {
  amount: number;
  previousLevel: number;
  level: number;
  levelsGained: number;
}

export const awardExperience = (
  player: Player,
  amount: number,
): ExperienceAward => {
  const award = Math.max(0, Math.floor(amount));
  const previousLevel = player.level;
  player.xp += award;
  player.level = Math.max(
    player.level,
    levelForExperience(player.xp),
  );

  return {
    amount: award,
    previousLevel,
    level: player.level,
    levelsGained: player.level - previousLevel,
  };
};

export const experienceProgress = (
  player: Pick<Player, "level" | "xp">,
): {
  earned: number;
  required: number;
  remaining: number;
  nextLevel: number;
} => {
  const currentThreshold = experienceForLevel(player.level);
  const nextThreshold = experienceForLevel(player.level + 1);
  const earned = Math.max(0, player.xp - currentThreshold);
  const required = nextThreshold - currentThreshold;

  return {
    earned,
    required,
    remaining: Math.max(0, nextThreshold - player.xp),
    nextLevel: player.level + 1,
  };
};

export const romanLevel = (level: number): string => {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = Math.max(1, Math.floor(level));
  let result = "";

  for (const [value, numeral] of numerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
};
