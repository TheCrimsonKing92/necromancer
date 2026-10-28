import type {
  BonebinderServantState,
  ServantCapabilityId,
  ServantSomaticMemory,
} from "./types";

export type SomaticCounselActionId =
  | "brace"
  | "shove"
  | "weapon-technique"
  | "guarded-movement";

export interface SomaticCounselActionDefinition {
  id: SomaticCounselActionId;
  label: string;
  effect: string;
  requiresTarget: boolean;
}

export const SOMATIC_COUNSEL_ACTIONS = {
  brace: {
    id: "brace",
    label: "Set the frame",
    effect: "Ditch-Hand sets its Ward to at least 4.",
    requiresTarget: false,
  },
  shove: {
    id: "shove",
    label: "Pallbearer’s shoulder",
    effect:
      "Ditch-Hand drives a remembered shoulder into the target and inflicts Exposed 1 on a hit.",
    requiresTarget: true,
  },
  "weapon-technique": {
    id: "weapon-technique",
    label: "Remembered tool-work",
    effect: "Ditch-Hand makes a physical edge attack against the target.",
    requiresTarget: true,
  },
  "guarded-movement": {
    id: "guarded-movement",
    label: "Guarded passage",
    effect:
      "Ditch-Hand takes the enemy’s next attack in your place and sets its Ward to at least 2.",
    requiresTarget: false,
  },
} as const satisfies Record<
  SomaticCounselActionId,
  SomaticCounselActionDefinition
>;

export interface SomaticMemoryActionProfile {
  workReference: string;
  actionIds: readonly SomaticCounselActionId[];
}

export interface SomaticCounselCandidate {
  actionId: SomaticCounselActionId;
  memoryId: ServantSomaticMemory["id"];
  workReference: ServantSomaticMemory["workReference"];
  confidence: ServantSomaticMemory["confidence"];
}

export interface SelectSomaticCounselOptions {
  servant: BonebinderServantState;
  profiles?: readonly SomaticMemoryActionProfile[];
  previousActionId: SomaticCounselActionId | null;
  selectionSeed: number;
}

export const SOMATIC_MEMORY_ACTION_PROFILES: readonly SomaticMemoryActionProfile[] = [
  {
    workReference: "county-pallbearer",
    actionIds: ["brace", "shove", "guarded-movement"],
  },
  {
    workReference: "grave-cutter",
    actionIds: ["brace", "weapon-technique"],
  },
];

export type SelectSomaticCounselResult =
  | {
      ok: true;
      selected: SomaticCounselCandidate;
      available: readonly SomaticCounselCandidate[];
    }
  | {
      ok: false;
      reason: "no-somatic-memory" | "no-eligible-nonrepeating-action";
      available: readonly SomaticCounselCandidate[];
    };

interface CounselActionRequirement {
  requiredCapability: ServantCapabilityId;
  hasUsableBody: (servant: BonebinderServantState) => boolean;
}

const hasUsableArm = (servant: BonebinderServantState): boolean =>
  servant.combatant.body.leftArm.condition > 0 ||
  servant.combatant.body.rightArm.condition > 0;

const hasUsableLeg = (servant: BonebinderServantState): boolean =>
  servant.combatant.body.leftLeg.condition > 0 ||
  servant.combatant.body.rightLeg.condition > 0;

const COUNSEL_ACTION_REQUIREMENTS = {
  brace: {
    requiredCapability: "guard",
    hasUsableBody: (servant) =>
      servant.combatant.body.torso.condition > 0,
  },
  shove: {
    requiredCapability: "corporeal-labor",
    hasUsableBody: hasUsableArm,
  },
  "weapon-technique": {
    requiredCapability: "harry",
    hasUsableBody: hasUsableArm,
  },
  "guarded-movement": {
    requiredCapability: "guard",
    hasUsableBody: hasUsableLeg,
  },
} as const satisfies Record<
  SomaticCounselActionId,
  CounselActionRequirement
>;

const CONFIDENCE_ORDER: Record<
  ServantSomaticMemory["confidence"],
  number
> = {
  trace: 0,
  reliable: 1,
  ingrained: 2,
};

const canPerformCounselAction = (
  servant: BonebinderServantState,
  actionId: SomaticCounselActionId,
): boolean => {
  const requirement = COUNSEL_ACTION_REQUIREMENTS[actionId];
  return (
    servant.capabilities.includes(requirement.requiredCapability) &&
    requirement.hasUsableBody(servant)
  );
};

export const availableSomaticCounselActions = (
  servant: BonebinderServantState,
  profiles: readonly SomaticMemoryActionProfile[] =
    SOMATIC_MEMORY_ACTION_PROFILES,
): readonly SomaticCounselCandidate[] => {
  const profilesByReference = new Map(
    profiles.map((profile) => [profile.workReference, profile]),
  );
  const bestByAction = new Map<
    SomaticCounselActionId,
    SomaticCounselCandidate
  >();

  for (const memory of servant.somaticMemories) {
    const profile = profilesByReference.get(memory.workReference);
    if (!profile) continue;
    for (const actionId of profile.actionIds) {
      if (!canPerformCounselAction(servant, actionId)) continue;
      const candidate: SomaticCounselCandidate = {
        actionId,
        memoryId: memory.id,
        workReference: memory.workReference,
        confidence: memory.confidence,
      };
      const incumbent = bestByAction.get(actionId);
      if (
        !incumbent ||
        CONFIDENCE_ORDER[candidate.confidence] >
          CONFIDENCE_ORDER[incumbent.confidence] ||
        (candidate.confidence === incumbent.confidence &&
          candidate.memoryId.localeCompare(incumbent.memoryId) < 0)
      ) {
        bestByAction.set(actionId, candidate);
      }
    }
  }

  return [...bestByAction.values()].sort((left, right) =>
    left.actionId.localeCompare(right.actionId),
  );
};

export const selectSomaticCounselAction = (
  options: SelectSomaticCounselOptions,
): SelectSomaticCounselResult => {
  const allAvailable = availableSomaticCounselActions(
    options.servant,
    options.profiles ?? SOMATIC_MEMORY_ACTION_PROFILES,
  );
  if (allAvailable.length === 0) {
    return {
      ok: false,
      reason: "no-somatic-memory",
      available: allAvailable,
    };
  }

  const nonrepeating = allAvailable.filter(
    ({ actionId }) => actionId !== options.previousActionId,
  );
  if (nonrepeating.length === 0) {
    return {
      ok: false,
      reason: "no-eligible-nonrepeating-action",
      available: allAvailable,
    };
  }

  const stableSeed = Number.isFinite(options.selectionSeed)
    ? Math.abs(Math.trunc(options.selectionSeed))
    : 0;
  const index = stableSeed % nonrepeating.length;
  return {
    ok: true,
    selected: nonrepeating[index]!,
    available: nonrepeating,
  };
};
