import type {
  AttackProfile,
  DamageTypeId,
} from "../types";

export type EnemyAttackSpec = Omit<
  AttackProfile,
  "damageType" | "traumaBonus"
> & {
  name: string;
  telegraph: string;
  damageType?: DamageTypeId;
  traumaBonus?: number;
  exposed?: {
    lead: string;
    potency: number;
    turns: number;
  };
  spiritDrain?: number;
  wardCompanions?: number;
};

export interface EnemyIntent {
  enemyId: string;
  enemyName: string;
  action: string;
  telegraph: string;
  damageType: DamageTypeId;
  effects: string[];
}
