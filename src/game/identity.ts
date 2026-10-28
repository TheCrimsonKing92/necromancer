import type { CharacterSex, Player } from "./types";

export interface Pronouns {
  subject: "he" | "she" | "they";
  object: "him" | "her" | "them";
  possessiveDeterminer: "his" | "her" | "their";
  possessivePronoun: "his" | "hers" | "theirs";
  reflexive: "himself" | "herself" | "themself";
}

const PRONOUNS: Record<CharacterSex, Pronouns> = {
  male: {
    subject: "he",
    object: "him",
    possessiveDeterminer: "his",
    possessivePronoun: "his",
    reflexive: "himself",
  },
  female: {
    subject: "she",
    object: "her",
    possessiveDeterminer: "her",
    possessivePronoun: "hers",
    reflexive: "herself",
  },
  other: {
    subject: "they",
    object: "them",
    possessiveDeterminer: "their",
    possessivePronoun: "theirs",
    reflexive: "themself",
  },
};

export const pronounsForSex = (sex: CharacterSex): Pronouns =>
  PRONOUNS[sex];

/**
 * A player-facing character name is a use-name: safe enough to offer to
 * people and lesser dead. A true name is not collected during creation.
 */
export const useNameFor = (player: Player): string => player.name;
