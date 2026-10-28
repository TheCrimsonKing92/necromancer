import { MUNDANE_SKILLS, skillCheckScore } from "./character";
import { rollInteger } from "./random";
import type {
  AttributeId,
  MundaneSkillId,
  Player,
} from "./types";

export interface MundaneCheck {
  skill: MundaneSkillId;
  attribute?: AttributeId;
  difficulty?: number;
}

export interface MundaneCheckResult {
  seed: number;
  chance: number;
  roll: number;
  success: boolean;
}

const boundedChance = (value: number): number =>
  Math.max(15, Math.min(90, Math.trunc(value)));

export const mundaneCheckChance = (
  player: Player,
  check: MundaneCheck,
): number => {
  const attribute =
    check.attribute ?? MUNDANE_SKILLS[check.skill].usualAttribute;
  return boundedChance(
    25 +
      skillCheckScore(
        player.attributes,
        player.skills,
        check.skill,
        attribute,
      ) *
        10 -
      (check.difficulty ?? 0),
  );
};

export const resolveMundaneCheck = (
  seed: number,
  player: Player,
  check: MundaneCheck,
): MundaneCheckResult => {
  const chance = mundaneCheckChance(player, check);
  const attempt = rollInteger(seed, 1, 100);
  return {
    seed: attempt.seed,
    chance,
    roll: attempt.value,
    success: attempt.value <= chance,
  };
};
