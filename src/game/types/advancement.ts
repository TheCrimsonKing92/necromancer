import type {
  AdvancementExpressionId,
  AdvancementClassification,
  AdvancementReadinessKind,
} from "./character";
import type { AdvancementEffect } from "./content-core";

export interface AdvancementExpressionDefinition {
  id: AdvancementExpressionId;
  name: string;
  classification: AdvancementClassification;
  description: string;
  effectText: string;
  effect: AdvancementEffect;
}
export type AdvancementDuality =
  | {
      kind: "doctrine";
      group: string;
    }
  | {
      kind: "prepared";
      readiness: AdvancementReadinessKind;
      expressions: [
        AdvancementExpressionDefinition,
        AdvancementExpressionDefinition,
      ];
    };
export interface AdvancementReadinessState {
  practice: AdvancementExpressionId[];
  universal: AdvancementExpressionId[];
}
export type AdvancementBranchId =
  | "tradition"
  | "body"
  | "necromancy"
  | "mundane";
