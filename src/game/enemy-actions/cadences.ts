import {
  DEFAULT_ENEMY_TECHNIQUE_ID,
  ENEMY_TECHNIQUES,
  type EnemyTechniqueId,
} from "./techniques";
import type { EnemyAttackSpec } from "./contracts";

interface EnemyCadenceDefinition {
  sequence: readonly EnemyTechniqueId[];
}

export const ENEMY_CADENCES = {
  "saint-ossuary-cycle": {
    sequence: [
      "accounting-touch",
      "bone-crozier",
      "death-knell",
      "bone-crozier",
      "accounting-touch",
      "death-knell",
    ],
  },
  "reeve-hooked-knife": {
    sequence: ["knife-thrust", "knife-thrust", "hooked-knife"],
  },
  "grave-hound-rake": {
    sequence: ["bite", "raking-bite"],
  },
  "bell-widow-toll": {
    sequence: [
      "veiled-hand",
      "clapper-chain",
      "thirteenth-peal",
      "clapper-chain",
      "veiled-hand",
      "thirteenth-peal",
    ],
  },
  "redactor-hook": {
    sequence: [
      "editorial-knife",
      "editorial-knife",
      "redaction-hook",
    ],
  },
  "cantor-antiphon": {
    sequence: ["stitched-antiphon", "stolen-syllable"],
  },
  "pallbearer-office": {
    sequence: ["bier-pole", "office-for-the-unburied"],
  },
  "mourner-grief": {
    sequence: ["grief-nail", "borrowed-grief"],
  },
  "poacher-billhook": {
    sequence: ["billhook-jab", "billhook-jab", "billhook-drag"],
  },
  "poacher-crossbow": {
    sequence: ["crossbow-bolt", "barbed-bolt"],
  },
  "reeve-baton-hook": {
    sequence: [
      "ashwood-baton",
      "ashwood-baton",
      "arresting-hook",
    ],
  },
  "reeve-spear-shield": {
    sequence: ["short-spear", "shield-rush"],
  },
} as const satisfies Record<string, EnemyCadenceDefinition>;

export type EnemyCadenceId = keyof typeof ENEMY_CADENCES;

export const isEnemyCadenceId = (value: unknown): value is EnemyCadenceId =>
  typeof value === "string" && Object.hasOwn(ENEMY_CADENCES, value);

export const ENEMY_CADENCE_ALIASES = {
  "ossuary-saint": "saint-ossuary-cycle",
  "road-reeve": "reeve-hooked-knife",
  "ash-hound": "grave-hound-rake",
  "wake-bell-widow": "bell-widow-toll",
  "wake-redactor": "redactor-hook",
  "wake-cantor": "cantor-antiphon",
  "wake-pallbearer": "pallbearer-office",
  "wake-mourner-left": "mourner-grief",
  "wake-mourner-right": "mourner-grief",
  "wake-poacher-captain": "poacher-billhook",
  "wake-poacher-bow": "poacher-crossbow",
  "wake-reeve-sergeant": "reeve-baton-hook",
  "wake-reeve-levy": "reeve-spear-shield",
} as const satisfies Record<string, EnemyCadenceId>;

export const legacyCadenceIdFor = (
  combatantId: string,
): EnemyCadenceId | undefined => {
  if (Object.hasOwn(ENEMY_CADENCES, combatantId)) {
    return combatantId as EnemyCadenceId;
  }
  return ENEMY_CADENCE_ALIASES[
    combatantId as keyof typeof ENEMY_CADENCE_ALIASES
  ];
};

export const enemyTechniqueIdFor = (
  cadenceId: EnemyCadenceId | undefined,
  round: number,
): EnemyTechniqueId => {
  if (!cadenceId) return DEFAULT_ENEMY_TECHNIQUE_ID;

  const sequence = ENEMY_CADENCES[cadenceId].sequence;
  const index =
    ((round - 1) % sequence.length + sequence.length) %
    sequence.length;
  return sequence[index]!;
};

export interface EnemyActionCatalogValidationInput {
  techniques: Readonly<
    Record<
      string,
      Pick<EnemyAttackSpec, "name" | "telegraph" | "baseDamage">
    >
  >;
  cadences: Readonly<
    Record<string, { sequence: readonly string[] }>
  >;
  aliases: Readonly<Record<string, string>>;
}

export const validateEnemyActionCatalogs = (
  catalogs: EnemyActionCatalogValidationInput = {
    techniques: ENEMY_TECHNIQUES,
    cadences: ENEMY_CADENCES,
    aliases: ENEMY_CADENCE_ALIASES,
  },
): string[] => {
  const errors: string[] = [];

  for (const [techniqueId, technique] of Object.entries(
    catalogs.techniques,
  )) {
    if (technique.name.trim().length === 0) {
      errors.push(`${techniqueId} has no action name`);
    }
    if (technique.telegraph.trim().length === 0) {
      errors.push(`${techniqueId} has no telegraph`);
    }
    if (
      !Number.isFinite(technique.baseDamage) ||
      technique.baseDamage < 0
    ) {
      errors.push(`${techniqueId} has invalid base damage`);
    }
  }

  for (const [enemyId, cadence] of Object.entries(
    catalogs.cadences,
  )) {
    const sequence = cadence.sequence;
    if (sequence.length === 0) {
      errors.push(`${enemyId} has an empty cadence`);
    }
    for (const techniqueId of sequence) {
      if (!Object.hasOwn(catalogs.techniques, techniqueId)) {
        errors.push(
          `${enemyId} references missing technique ${techniqueId}`,
        );
      }
    }
  }

  for (const [enemyId, cadenceId] of Object.entries(
    catalogs.aliases,
  )) {
    if (Object.hasOwn(catalogs.cadences, enemyId)) {
      errors.push(`${enemyId} shadows a defined cadence`);
    }
    if (!Object.hasOwn(catalogs.cadences, cadenceId)) {
      errors.push(
        `${enemyId} aliases missing cadence ${cadenceId}`,
      );
    }
  }

  return errors;
};
