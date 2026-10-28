import type { EnemyAttackSpec } from "./contracts";

export const ENEMY_TECHNIQUES = {
  "unremembered-violence": {
    name: "unremembered violence",
    telegraph:
      "Its posture settles into a violence the body no longer remembers.",
    baseDamage: 0,
    injuryProfile: "impact",
  },
  "death-knell": {
    name: "death knell",
    telegraph:
      "A toll gathers behind the mask, waiting for your name.",
    baseDamage: 4,
    injuryProfile: "spectral",
    damageType: "occult",
    exposed: {
      lead: "The knell names your unpaid deaths:",
      potency: 1,
      turns: 2,
    },
  },
  "bone-crozier": {
    name: "bone crozier",
    telegraph:
      "The linked fingers draw back for a crushing sweep.",
    baseDamage: 2,
    injuryProfile: "impact",
  },
  "accounting-touch": {
    name: "accounting touch",
    telegraph:
      "One open hand reaches for the debt written in you.",
    baseDamage: 1,
    injuryProfile: "spectral",
    damageType: "occult",
  },
  "hooked-knife": {
    name: "hooked knife",
    telegraph:
      "Hollis turns the hook inward and waits for you to commit.",
    baseDamage: 3,
    injuryProfile: "edge",
    traumaBonus: 2,
  },
  "knife-thrust": {
    name: "knife thrust",
    telegraph:
      "Hollis keeps the knife low and tests the distance.",
    baseDamage: 0,
    injuryProfile: "puncture",
  },
  "raking-bite": {
    name: "raking bite",
    telegraph:
      "The hound lowers its chest and bunches its hind legs.",
    baseDamage: 1,
    injuryProfile: "bite",
    traumaBonus: 2,
  },
  bite: {
    name: "bite",
    telegraph:
      "The hound follows your leading leg with its teeth.",
    baseDamage: 0,
    injuryProfile: "bite",
  },
  "thirteenth-peal": {
    name: "thirteenth peal",
    telegraph:
      "The veiled bell draws breath for a toll with no place in the count.",
    baseDamage: 4,
    injuryProfile: "spectral",
    damageType: "occult",
    exposed: {
      lead: "The bell tolls from inside your name:",
      potency: 1,
      turns: 2,
    },
  },
  "clapper-chain": {
    name: "clapper-chain",
    telegraph:
      "The chain rises, each iron link pulled straight.",
    baseDamage: 2,
    injuryProfile: "impact",
    traumaBonus: 2,
  },
  "veiled-hand": {
    name: "veiled hand",
    telegraph:
      "A pale reach gathers beneath the widow’s veil.",
    baseDamage: 1,
    injuryProfile: "spectral",
    damageType: "occult",
  },
  "redaction-hook": {
    name: "redaction hook",
    telegraph:
      "The left hand sets its hook against the shape of a limb.",
    baseDamage: 3,
    injuryProfile: "edge",
    traumaBonus: 2,
  },
  "editorial-knife": {
    name: "editorial knife",
    telegraph:
      "A black edge searches for something it can remove.",
    baseDamage: 1,
    injuryProfile: "edge",
  },
  "stolen-syllable": {
    name: "stolen syllable",
    telegraph:
      "The cantor worries one stolen sound between its stitches.",
    baseDamage: 2,
    injuryProfile: "spectral",
    damageType: "occult",
    spiritDrain: 1,
  },
  "stitched-antiphon": {
    name: "stitched antiphon",
    telegraph:
      "Several dead voices strain toward the same note.",
    baseDamage: 1,
    injuryProfile: "spectral",
    damageType: "occult",
  },
  "office-for-the-unburied": {
    name: "office for the unburied",
    telegraph:
      "The pallbearer begins the next office over an empty bier.",
    baseDamage: 2,
    injuryProfile: "spectral",
    damageType: "occult",
    wardCompanions: 1,
  },
  "bier-pole": {
    name: "bier-pole",
    telegraph:
      "The long pole settles across both hands like a staff.",
    baseDamage: 1,
    injuryProfile: "impact",
    traumaBonus: 1,
  },
  "borrowed-grief": {
    name: "borrowed grief",
    telegraph:
      "The mourner draws another household’s grief tight between both hands.",
    baseDamage: 1,
    injuryProfile: "spectral",
    damageType: "occult",
  },
  "grief-nail": {
    name: "grief-nail",
    telegraph:
      "A long iron nail appears between two funeral-worn fingers.",
    baseDamage: 0,
    injuryProfile: "puncture",
  },
  "billhook-drag": {
    name: "billhook drag",
    telegraph:
      "The captain turns the billhook to catch and pull.",
    baseDamage: 3,
    injuryProfile: "edge",
    traumaBonus: 2,
  },
  "billhook-jab": {
    name: "billhook jab",
    telegraph:
      "The bill’s point stays forward behind a measured step.",
    baseDamage: 1,
    injuryProfile: "puncture",
  },
  "barbed-bolt": {
    name: "barbed bolt",
    telegraph:
      "A dark-fletched bolt settles into the crossbow groove.",
    baseDamage: 2,
    injuryProfile: "puncture",
    traumaBonus: 1,
  },
  "crossbow-bolt": {
    name: "crossbow bolt",
    telegraph:
      "The poacher raises the bow and follows your center.",
    baseDamage: 1,
    injuryProfile: "puncture",
  },
  "arresting-hook": {
    name: "arresting hook",
    telegraph:
      "The sergeant opens the hook meant for a resisting limb.",
    baseDamage: 2,
    injuryProfile: "edge",
    traumaBonus: 2,
  },
  "ashwood-baton": {
    name: "ashwood baton",
    telegraph:
      "The baton rises no higher than the sergeant’s shoulder.",
    baseDamage: 1,
    injuryProfile: "impact",
  },
  "shield-rush": {
    name: "shield rush",
    telegraph: "The levy lowers behind the county shield.",
    baseDamage: 1,
    injuryProfile: "impact",
    traumaBonus: 1,
  },
  "short-spear": {
    name: "short spear",
    telegraph:
      "The spear point holds steady beneath the shield rim.",
    baseDamage: 1,
    injuryProfile: "puncture",
  },
} as const satisfies Record<string, EnemyAttackSpec>;

export type EnemyTechniqueId = keyof typeof ENEMY_TECHNIQUES;

export const DEFAULT_ENEMY_TECHNIQUE_ID: EnemyTechniqueId =
  "unremembered-violence";
