import type {
  Combatant,
  EngineResult,
  GameState,
  RunState,
} from "../types";

export interface GraveWardenRuntimeAdapter {
  initializeBattle(run: RunState): void;
  sealUnavailableReason(run: RunState, targetId?: string): string | null;
  setSeal(run: RunState, target: Combatant): void;
  resolveBreach(run: RunState, enemy: Combatant): void;
  commitAnswer(
    run: RunState,
    target: Combatant,
  ): { bonusDamage: number; detail?: string };
  answerBonusFor(run: RunState, targetId: string): number;
  closeUnavailableReason(run: RunState, targetId?: string): string | null;
  closeGate(run: RunState, target: Combatant): void;
  battleSummary(run: RunState): string | null;
  initializePractice(state: GameState): EngineResult;
  normalizeRun(run: RunState): void;
  validatePracticeState(value: unknown): boolean;
  validateBattleState(value: unknown): boolean;
}

const inertAdapter: GraveWardenRuntimeAdapter = {
  initializeBattle: () => undefined,
  sealUnavailableReason: () => "Grave Warden practice content is not ready.",
  setSeal: () => undefined,
  resolveBreach: () => undefined,
  commitAnswer: () => ({ bonusDamage: 0 }),
  answerBonusFor: () => 0,
  closeUnavailableReason: () => "Grave Warden practice content is not ready.",
  closeGate: () => undefined,
  battleSummary: () => null,
  initializePractice: (state) => ({ state }),
  normalizeRun: () => undefined,
  validatePracticeState: (value) =>
    value === undefined || typeof value === "object" && value !== null,
  validateBattleState: (value) =>
    value === undefined || typeof value === "object" && value !== null,
};

let adapter = inertAdapter;

export const installGraveWardenRuntimeAdapter = (
  next: GraveWardenRuntimeAdapter,
): void => {
  adapter = next;
};

export const initializeGraveWardenBattle = (run: RunState): void =>
  adapter.initializeBattle(run);
export const thresholdSealUnavailableReason = (
  run: RunState,
  targetId?: string,
): string | null => adapter.sealUnavailableReason(run, targetId);
export const setThresholdSeal = (run: RunState, target: Combatant): void =>
  adapter.setSeal(run, target);
export const resolveThresholdSealBreach = (
  run: RunState,
  enemy: Combatant,
): void => adapter.resolveBreach(run, enemy);
export const commitBreachAnswer = (run: RunState, target: Combatant) =>
  adapter.commitAnswer(run, target);
export const breachAnswerBonusFor = (
  run: RunState,
  targetId: string,
): number => adapter.answerBonusFor(run, targetId);
export const closeGateUnavailableReason = (
  run: RunState,
  targetId?: string,
): string | null => adapter.closeUnavailableReason(run, targetId);
export const closeTheGate = (run: RunState, target: Combatant): void =>
  adapter.closeGate(run, target);
export const graveWardenBattleSummary = (run: RunState): string | null =>
  adapter.battleSummary(run);
export const initializeGraveWardenPractice = (
  state: GameState,
): EngineResult => adapter.initializePractice(state);
export const normalizeGraveWardenRun = (run: RunState): void =>
  adapter.normalizeRun(run);
export const validateGraveWardenPracticeState = (
  value: unknown,
): boolean => adapter.validatePracticeState(value);
export const validateGraveWardenBattleState = (
  value: unknown,
): boolean => adapter.validateBattleState(value);
