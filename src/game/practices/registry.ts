import type {
  PracticeCapabilityId,
  PracticeCapabilitySource,
  PracticeDefinition,
  PracticeId,
} from "./types";
import { practiceIdForPrototypeTradition } from "./prototype-practice-map";
import type { TraditionId } from "../types";

export const PRACTICES = {
  medium: {
    id: "medium",
    name: "Medium",
    ownedVerb: "host",
    locus: "living-self",
    recurringQuestion: "Whom may I admit, and under what terms?",
    implementation: "prototype-playable",
    spiritCadence: "bounded-hosting",
    capabilities: [
      "host-dead-initiative",
      "receive-dead-testimony",
      "recognize-foreign-initiative",
    ],
    socialTags: ["dead-testimony", "hosting-scars"],
    grants: {
      implementedActionIds: ["spirit-lash", "borrowed-might"],
      plannedActionIds: ["admit-guest"],
      startingKitId: "medium-prototype-kit",
      implementedAdvancementIds: [
        "two-way-passage",
        "echoing-passage",
      ],
      advancementBranchIds: [
        "medium-hospitality",
        "medium-usurpation",
        "medium-chorus",
      ],
    },
  },
  bonebinder: {
    id: "bonebinder",
    name: "Bonebinder",
    ownedVerb: "bind",
    locus: "prepared-remains",
    recurringQuestion:
      "What initiative does this body carry, and what do I owe it?",
    implementation: "vertical-slice",
    spiritCadence: "servant-upkeep",
    capabilities: [
      "command-dead-initiative",
      "maintain-corporeal-servant",
      "read-somatic-memory",
      "verify-mortuary-provenance",
    ],
    socialTags: ["visible-corporeal-servant", "claimed-remains"],
    grants: {
      implementedActionIds: [],
      plannedActionIds: ["command-servant", "repair-servant"],
      startingKitId: "bonebinder-kit",
      implementedAdvancementIds: [
        "letter-of-service",
        "called-counsel",
        "set-the-frame",
      ],
      advancementBranchIds: [
        "bonebinder-compact",
        "bonebinder-impression",
        "bonebinder-echo-work",
      ],
    },
  },
  renderer: {
    id: "renderer",
    name: "Renderer",
    ownedVerb: "render",
    locus: "death-altered-matter",
    recurringQuestion:
      "What should I prepare, preserve, or transform?",
    implementation: "vertical-slice",
    spiritCadence: "banked-preparation",
    capabilities: [
      "diagnose-death-altered-matter",
      "render-death-altered-matter",
      "preserve-mortuary-evidence",
    ],
    socialTags: ["rendering-residue", "mortuary-service"],
    grants: {
      implementedActionIds: ["grave-salt", "corpsefire"],
      plannedActionIds: ["prepare-mortuary-mixture"],
      startingKitId: "renderer-kit",
      implementedAdvancementIds: [
        "cold-furnace-method",
        "residue-disposition",
      ],
      advancementBranchIds: [
        "renderer-preservation",
        "renderer-rendering",
        "renderer-cold-furnace",
      ],
    },
  },
  "grave-warden": {
    id: "grave-warden",
    name: "Grave Warden",
    ownedVerb: "keep",
    locus: "continuity-and-custody",
    recurringQuestion:
      "What must remain intact, and where will it be tested?",
    implementation: "vertical-slice",
    spiritCadence: "breached-seal",
    capabilities: [
      "establish-mortuary-seal",
      "diagnose-continuity-breach",
      "stabilize-body-continuity",
      "verify-mortuary-provenance",
    ],
    socialTags: ["boundary-work", "custody-work"],
    grants: {
      implementedActionIds: [
        "set-threshold-seal",
        "answer-the-breach",
      ],
      plannedActionIds: [],
      startingKitId: "grave-warden-kit",
      implementedAdvancementIds: ["threshold-discipline"],
      advancementBranchIds: [
        "grave-warden-threshold",
        "grave-warden-custody",
        "grave-warden-revision",
      ],
    },
  },
  ferryman: {
    id: "ferryman",
    name: "Ferryman",
    ownedVerb: "conduct",
    locus: "passage-and-thresholds",
    recurringQuestion:
      "What should cross, return, remain, or be denied passage?",
    implementation: "deferred",
    spiritCadence: "completed-passage",
    capabilities: [
      "mark-dead-passage",
      "close-dead-passage",
      "conduct-dead-initiative",
    ],
    socialTags: ["safe-conduct", "disturbed-threshold"],
    grants: {
      implementedActionIds: [],
      plannedActionIds: ["mark-last-passage"],
      startingKitId: "ferryman-kit",
      implementedAdvancementIds: [],
      advancementBranchIds: [
        "ferryman-return",
        "ferryman-exile",
        "ferryman-roadwork",
      ],
    },
  },
} as const satisfies Record<PracticeId, PracticeDefinition>;

export const getPractice = (id: PracticeId): PracticeDefinition =>
  PRACTICES[id];

export const practiceForPrototypeTradition = (
  traditionId: TraditionId,
): PracticeDefinition => PRACTICES[practiceIdForPrototypeTradition(traditionId)];

export const hasPracticeCapability = (
  source: PracticeId | PracticeCapabilitySource,
  capability: PracticeCapabilityId,
): boolean => {
  const capabilities =
    typeof source === "string"
      ? PRACTICES[source].capabilities
      : source.capabilities;
  return capabilities.some(
    (granted) => (granted as PracticeCapabilityId) === capability,
  );
};
