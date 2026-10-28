import { createBody } from "../../anatomy";
import type { NaturalArmor } from "../../types";
import type {
  BonebinderServantState,
  PersistentServantCombatant,
  ServantCapabilityId,
  ServantContinuityKind,
  ServantSomaticMemory,
  ServantWorldReferences,
} from "./types";

export interface CreateBonebinderServantOptions {
  id: string;
  useName: string;
  continuity: ServantContinuityKind;
  bodyIdentity: BonebinderServantState["identity"]["bodyIdentity"];
  worldReferences: ServantWorldReferences;
  maxHp: number;
  attack: number;
  defense: number;
  bodyScale?: number;
  naturalArmor?: NaturalArmor;
  capabilities?: readonly ServantCapabilityId[];
  somaticMemories?: readonly ServantSomaticMemory[];
}

const DEFAULT_SERVANT_CAPABILITIES: readonly ServantCapabilityId[] = [
  "guard",
  "interpose",
  "harry",
  "corporeal-labor",
];

export const createBonebinderServant = (
  options: CreateBonebinderServantOptions,
): BonebinderServantState => {
  const combatant: PersistentServantCombatant = {
    id: options.id,
    name: options.useName,
    kind: "ally",
    title: "Bound corporeal servant",
    anatomy: "humanoid",
    materiality: "corporeal",
    hp: options.maxHp,
    maxHp: options.maxHp,
    attack: options.attack,
    defense: options.defense,
    ward: 0,
    statuses: [],
    body: createBody(options.bodyScale),
    naturalArmor: options.naturalArmor ?? {},
    lifetime: {
      kind: "persistent",
      servantId: options.id,
    },
  };

  return {
    identity: {
      id: options.id,
      useName: options.useName,
      continuity: options.continuity,
      bodyIdentity: {
        ...options.bodyIdentity,
        recognitionMarks: [
          ...options.bodyIdentity.recognitionMarks,
        ],
      },
    },
    combatant,
    worldReferences: {
      provenanceId: options.worldReferences.provenanceId,
      claimIds: [...options.worldReferences.claimIds],
      recognitionEvidenceIds: [
        ...options.worldReferences.recognitionEvidenceIds,
      ],
    },
    capabilities: [
      ...(options.capabilities ?? DEFAULT_SERVANT_CAPABILITIES),
    ],
    somaticMemories: (options.somaticMemories ?? []).map((memory) => ({
      ...memory,
    })),
    command: {
      sequence: 0,
      current: {
        id: "await",
        targetReference: null,
        issuedAtReference: null,
      },
    },
    repairs: {
      sequence: 0,
      history: [],
    },
  };
};
