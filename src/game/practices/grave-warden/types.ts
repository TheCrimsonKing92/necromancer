export interface ThresholdSealState {
  id: number;
  targetId: string;
  integrity: number;
  maxIntegrity: number;
  breached: boolean;
}

export interface GraveWardenBattleState {
  version: 1;
  sealsPlaced: number;
  breachRecoveries: number;
  nextSealId: number;
  seals: ThresholdSealState[];
}

export interface GraveWardenPracticeState {
  version: 1;
  sealCapacity: number;
}
