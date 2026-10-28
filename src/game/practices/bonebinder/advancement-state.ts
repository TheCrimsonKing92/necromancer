import type { AdvancementId } from "../../types";
import {
  assessServantCompactOrder,
  createServantCompact,
  type ServantCompactOrder,
  type ServantCompactOrderAssessment,
  type ServantServicePurposeId,
} from "./compact";
import {
  selectSomaticCounselAction,
  type SomaticCounselActionId,
  type SomaticCounselCandidate,
  type SomaticMemoryActionProfile,
} from "./counsel";
import type { BonebinderPracticeState } from "./types";
export {
  createBonebinderAdvancementState,
  isBonebinderAdvancementState,
  normalizeBonebinderAdvancementState,
  type BonebinderAdvancementState,
  type BonebinderCounselHistoryEntry,
} from "./advancement-persistence";

export type BonebinderDoctrineId = Extract<
  AdvancementId,
  "letter-of-service" | "called-counsel"
>;

export type BonebinderDoctrineSelection =
  | BonebinderDoctrineId
  | "conflict"
  | null;

export const bonebinderDoctrineFor = (
  advancements: readonly AdvancementId[],
): BonebinderDoctrineSelection => {
  const hasLetter = advancements.includes("letter-of-service");
  const hasCounsel = advancements.includes("called-counsel");
  if (hasLetter && hasCounsel) return "conflict";
  if (hasLetter) return "letter-of-service";
  if (hasCounsel) return "called-counsel";
  return null;
};

type DoctrineTransitionFailure =
  | "doctrine-not-learned"
  | "wrong-doctrine"
  | "conflicting-doctrines";

export type ConfigureServantCompactResult =
  | { ok: true; practice: BonebinderPracticeState }
  | {
      ok: false;
      reason:
        | DoctrineTransitionFailure
        | "unsafe-to-rewrite"
        | "servant-not-present"
        | "compact-breached";
      practice: BonebinderPracticeState;
    };

export const configureServantCompact = (
  practice: BonebinderPracticeState,
  advancements: readonly AdvancementId[],
  purposeId: ServantServicePurposeId,
  safeToRewrite: boolean,
): ConfigureServantCompactResult => {
  const doctrine = bonebinderDoctrineFor(advancements);
  if (doctrine === "conflict") {
    return {
      ok: false,
      reason: "conflicting-doctrines",
      practice,
    };
  }
  if (doctrine === null) {
    return { ok: false, reason: "doctrine-not-learned", practice };
  }
  if (doctrine !== "letter-of-service") {
    return { ok: false, reason: "wrong-doctrine", practice };
  }
  if (!practice.servant) {
    return { ok: false, reason: "servant-not-present", practice };
  }
  if (!safeToRewrite) {
    return { ok: false, reason: "unsafe-to-rewrite", practice };
  }
  if (practice.advancement.compact?.status === "breached") {
    return { ok: false, reason: "compact-breached", practice };
  }
  return {
    ok: true,
    practice: {
      ...practice,
      advancement: {
        ...practice.advancement,
        compact: createServantCompact(purposeId),
      },
    },
  };
};

export type AssessLetterOfServiceResult =
  | {
      ok: true;
      assessment: ServantCompactOrderAssessment;
      practice: BonebinderPracticeState;
    }
  | {
      ok: false;
      reason: DoctrineTransitionFailure | "compact-not-written";
    };

export const assessLetterOfServiceOrder = (
  practice: BonebinderPracticeState,
  advancements: readonly AdvancementId[],
  order: ServantCompactOrder,
): AssessLetterOfServiceResult => {
  const doctrine = bonebinderDoctrineFor(advancements);
  if (doctrine === "conflict") {
    return { ok: false, reason: "conflicting-doctrines" };
  }
  if (doctrine === null) {
    return { ok: false, reason: "doctrine-not-learned" };
  }
  if (doctrine !== "letter-of-service") {
    return { ok: false, reason: "wrong-doctrine" };
  }
  if (!practice.advancement.compact) {
    return { ok: false, reason: "compact-not-written" };
  }
  const assessment = assessServantCompactOrder(
    practice.advancement.compact,
    order,
  );
  return {
    ok: true,
    assessment,
    practice: {
      ...practice,
      advancement: {
        ...practice.advancement,
        compact: assessment.compact,
      },
    },
  };
};

export const previousCounselActionFor = (
  practice: BonebinderPracticeState,
  battleReference: string,
  round: number,
): SomaticCounselActionId | null => {
  const last = practice.advancement.counsel.lastAction;
  if (
    !last ||
    last.battleReference !== battleReference ||
    (last.round !== round && last.round !== round - 1)
  ) {
    return null;
  }
  return last.actionId;
};

export type PrepareCalledCounselResult =
  | {
      ok: true;
      practice: BonebinderPracticeState;
      selected: SomaticCounselCandidate;
      available: readonly SomaticCounselCandidate[];
    }
  | {
      ok: false;
      reason:
        | DoctrineTransitionFailure
        | "servant-not-present"
        | "invalid-battle-context"
        | "no-somatic-memory"
        | "no-eligible-nonrepeating-action";
      practice: BonebinderPracticeState;
    };

export const prepareCalledCounsel = (
  practice: BonebinderPracticeState,
  advancements: readonly AdvancementId[],
  battleReference: string,
  round: number,
  selectionSeed: number,
  profiles?: readonly SomaticMemoryActionProfile[],
): PrepareCalledCounselResult => {
  const doctrine = bonebinderDoctrineFor(advancements);
  if (doctrine === "conflict") {
    return {
      ok: false,
      reason: "conflicting-doctrines",
      practice,
    };
  }
  if (doctrine === null) {
    return { ok: false, reason: "doctrine-not-learned", practice };
  }
  if (doctrine !== "called-counsel") {
    return { ok: false, reason: "wrong-doctrine", practice };
  }
  if (!practice.servant) {
    return { ok: false, reason: "servant-not-present", practice };
  }
  if (
    !battleReference.trim() ||
    !Number.isInteger(round) ||
    round < 1
  ) {
    return { ok: false, reason: "invalid-battle-context", practice };
  }
  const selection = selectSomaticCounselAction({
    servant: practice.servant,
    profiles,
    previousActionId: previousCounselActionFor(
      practice,
      battleReference,
      round,
    ),
    selectionSeed,
  });
  if (!selection.ok) {
    return { ...selection, practice };
  }
  return {
    ok: true,
    selected: selection.selected,
    available: selection.available,
    practice: {
      ...practice,
      advancement: {
        ...practice.advancement,
        counsel: {
          sequence: practice.advancement.counsel.sequence + 1,
          lastAction: {
            ...selection.selected,
            battleReference,
            round,
          },
        },
      },
    },
  };
};
