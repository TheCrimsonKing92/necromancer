import { BODY_PARTS } from "../../anatomy";
import type { BodyPartId } from "../../types";
import type {
  BonebinderServantState,
  ServantRepairNeed,
  ServantRepairRecord,
} from "./types";

export const assessServantRepairNeeds = (
  servant: BonebinderServantState,
): ServantRepairNeed[] =>
  BODY_PARTS.flatMap(({ id }) => {
    const part = servant.combatant.body[id];
    const missingCondition = Math.max(
      0,
      part.maxCondition - part.condition,
    );
    return missingCondition > 0 || part.wounds.length > 0
      ? [
          {
            part: id,
            missingCondition,
            wounds: part.wounds,
          },
        ]
      : [];
  });

interface RepairRequestBase {
  repairId: string;
  part: BodyPartId;
  materialReferences: readonly string[];
  performedAtReference?: string | null;
}

export type ServantRepairRequest =
  | (RepairRequestBase & {
      kind: "reinforce-part";
      condition: number;
    })
  | (RepairRequestBase & {
      kind: "stabilize-wound";
      woundId: string;
    });

export interface ServantRepairResult {
  servant: BonebinderServantState;
  applied: boolean;
  record: ServantRepairRecord | null;
}

const appendRepair = (
  servant: BonebinderServantState,
  record: ServantRepairRecord,
): BonebinderServantState => ({
  ...servant,
  repairs: {
    sequence: servant.repairs.sequence + 1,
    history: [...servant.repairs.history, record],
  },
});

export const repairServant = (
  servant: BonebinderServantState,
  request: ServantRepairRequest,
): ServantRepairResult => {
  const part = servant.combatant.body[request.part];

  if (request.kind === "reinforce-part") {
    const conditionRestored = Math.min(
      Math.max(0, Math.trunc(request.condition)),
      Math.max(0, part.maxCondition - part.condition),
    );
    if (conditionRestored === 0) {
      return { servant, applied: false, record: null };
    }

    const record: ServantRepairRecord = {
      id: request.repairId,
      part: request.part,
      conditionRestored,
      healthRestored: 0,
      stabilizedWoundId: null,
      materialReferences: [...request.materialReferences],
      performedAtReference: request.performedAtReference ?? null,
    };
    const repaired = {
      ...servant,
      combatant: {
        ...servant.combatant,
        body: {
          ...servant.combatant.body,
          [request.part]: {
            ...part,
            condition: part.condition + conditionRestored,
          },
        },
      },
    };
    return {
      servant: appendRepair(repaired, record),
      applied: true,
      record,
    };
  }

  const woundIndex = part.wounds.findIndex(
    ({ id }) => id === request.woundId,
  );
  const wound = part.wounds[woundIndex];
  if (
    woundIndex < 0 ||
    !wound ||
    wound.treated ||
    wound.care !== "binding"
  ) {
    return { servant, applied: false, record: null };
  }

  const record: ServantRepairRecord = {
    id: request.repairId,
    part: request.part,
    conditionRestored: 0,
    healthRestored: 0,
    stabilizedWoundId: wound.id,
    materialReferences: [...request.materialReferences],
    performedAtReference: request.performedAtReference ?? null,
  };
  const wounds = [...part.wounds];
  wounds[woundIndex] = {
    ...wound,
    bleed: 0,
    treated: true,
  };
  const repaired = {
    ...servant,
    combatant: {
      ...servant.combatant,
      body: {
        ...servant.combatant.body,
        [request.part]: {
          ...part,
          wounds,
        },
      },
    },
  };
  return {
    servant: appendRepair(repaired, record),
    applied: true,
    record,
  };
};
