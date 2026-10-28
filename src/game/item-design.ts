import type { ItemId } from "./types";

export const GROUNDED_ITEM_EXPANSION_IDS = [
  "mortuary-mallet",
  "warding-awl",
  "burial-hood",
] as const satisfies readonly ItemId[];

export const EXCHANGE_ITEM_EXPANSION_IDS = [
  "vigil-cordial",
  "carrier-harness",
  "grave-copper",
  "orra-crozier",
] as const satisfies readonly ItemId[];

export interface ItemDesignNote {
  provenance: string;
  economyRole: string;
  acquisitionIntent: string;
}

export const ITEM_DESIGN_NOTES: Record<
  | (typeof GROUNDED_ITEM_EXPANSION_IDS)[number]
  | (typeof EXCHANGE_ITEM_EXPANSION_IDS)[number],
  ItemDesignNote
> = {
  "mortuary-mallet": {
    provenance:
      "An ordinary burial and ward-worker’s tool whose cleaning, wax, and soil wear matter more than ornament.",
    economyRole:
      "A low-cost impact alternative that trades the iron sickle’s accuracy for exceptional trauma.",
    acquisitionIntent:
      "Reliquary market stock after the vault, attainable by selling one valuable relic or several common materials.",
  },
  "warding-awl": {
    provenance:
      "A grave-iron work tool prepared by repeated contact with spent ward lines; its retained counter-pattern justifies occult damage without visible spell effects.",
    economyRole:
      "A light, accurate occult sidearm with lower base damage than the starting bone wand.",
    acquisitionIntent:
      "Reliquary market stock after the vault, giving any current character a means to harm incorporeal enemies.",
  },
  "burial-hood": {
    provenance:
      "Protective gravecloth assembled from established funeral cloth, horsehair, waxed cord, and narrow iron reinforcement.",
    economyRole:
      "An affordable one-armor head option that leaves the unique grave-iron mask as a clear two-armor upgrade.",
    acquisitionIntent:
      "Reliquary market stock after the vault, filling an otherwise empty equipment slot before the final road.",
  },
  "vigil-cordial": {
    provenance:
      "Iven's grave-mint preparation in a portable brown vial; the reliquary broker has one sealed measure from the same narrow trade.",
    economyRole:
      "A portable 3-Spirit recovery that competes with selling one ampoule of ossuary ichor or spending scarce obols on other preparation.",
    acquisitionIntent:
      "One reliquary market measure per testament, bought for obols or bartered directly for ossuary ichor.",
  },
  "carrier-harness": {
    provenance:
      "Ordinary cart and corpse-carrier's tackle: broad leather, low iron rings, and replaceable rope loops rather than occult craft.",
    economyRole:
      "Four additional measures of carrying capacity at the cost of the torso slot and its usual armor.",
    acquisitionIntent:
      "One reliquary market harness, bought outright or taken at a favorable in-kind price for stamped grave copper and two obols.",
  },
  "grave-copper": {
    provenance:
      "Old vault fittings whose burial marks and chain of custody make them more valuable to a reliquary worker than their metal alone.",
    economyRole:
      "Compact sale and barter value that asks whether Saint Orra's spoils should fund supplies, a carrying solution, or remain unsold.",
    acquisitionIntent:
      "One piece leaves Saint Orra's vault; reliquary poachers may carry more beyond the present exchange point.",
  },
  "orra-crozier": {
    provenance:
      "The broken grave-iron head of Saint Orra's own crozier, taken only after her borrowed form is defeated.",
    economyRole:
      "A heavy, inaccurate occult main-hand weapon with strong base force and trauma, valuable enough that selling it can finance several lesser preparations.",
    acquisitionIntent:
      "Unique vault loot. Its mechanical and visual identity should remain singular rather than joining ordinary market stock.",
  },
};
