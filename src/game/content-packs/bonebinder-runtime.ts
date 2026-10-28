import { isCombatantStanding } from "../anatomy";
import type {
  BodyPartId,
  Combatant,
  EngineResult,
  GameState,
  RunState,
} from "../types";
import type {
  BonebinderPracticeState,
  BonebinderServantState,
  ServantCommandId,
} from "../practices/bonebinder/types";

export type PersistentServantRepairRequest =
  | { readonly kind: "reinforce-part"; readonly part: BodyPartId }
  | { readonly kind: "stabilize-wound"; readonly woundId: string };

export interface QueuedServantCounselResult {
  readonly handled: boolean;
  readonly preserveThroughEnemyAnswer: boolean;
}

export interface BonebinderRuntimeAdapter {
  readonly deployForBattle: (run: RunState) => boolean;
  readonly syncFromBattle: (run: RunState, settle?: boolean) => void;
  readonly commandUnavailableReason: (
    state: GameState,
    commandId: ServantCommandId,
    targetId?: string,
  ) => string | null;
  readonly allocateCommand: (
    run: RunState,
    commandId: ServantCommandId,
    targetId?: string,
  ) => boolean;
  readonly directionRequiredFor: (run: RunState) => string | null;
  readonly resolveCommand: (run: RunState) => void;
  readonly interposingServantFor: (run: RunState) => Combatant | null;
  readonly completeCommand: (
    run: RunState,
    preserveStandingOrder?: boolean,
  ) => void;
  readonly resolveQueuedCounsel: (
    run: RunState,
  ) => QueuedServantCounselResult;
  readonly raisePreparedInterpositionWard: (
    run: RunState,
    servant: Combatant,
  ) => void;
  readonly repairServant: (
    state: GameState,
    request: PersistentServantRepairRequest,
  ) => EngineResult;
  readonly normalizeCurrentRun: (run: RunState) => void;
  readonly validatePracticeState: (value: unknown) => boolean;
}

let adapter: BonebinderRuntimeAdapter | null = null;

export const installBonebinderRuntimeAdapter = (
  implementation: BonebinderRuntimeAdapter,
): void => {
  adapter = Object.freeze({ ...implementation });
};

export const clearBonebinderRuntimeAdapterForTests = (): void => {
  adapter = null;
};

export const bonebinderStateFor = (
  run: RunState,
): BonebinderPracticeState | null => run.practiceStates?.bonebinder ?? null;

export const standingBonebinderServantFor = (
  run: RunState,
): BonebinderServantState | null => {
  const servant = bonebinderStateFor(run)?.servant;
  return servant && isCombatantStanding(servant.combatant) ? servant : null;
};

export const deployPersistentServantForBattle = (run: RunState): boolean =>
  adapter?.deployForBattle(run) ?? false;

export const syncPersistentServantFromBattle = (
  run: RunState,
  settle = false,
): void => adapter?.syncFromBattle(run, settle);

export const getServantCommandUnavailableReason = (
  state: GameState,
  commandId: ServantCommandId,
  targetId?: string,
): string | null =>
  adapter
    ? adapter.commandUnavailableReason(state, commandId, targetId)
    : "Bonebinder practice content is not ready.";

export const allocateServantCommand = (
  run: RunState,
  commandId: ServantCommandId,
  targetId?: string,
): boolean => adapter?.allocateCommand(run, commandId, targetId) ?? false;

export const servantDirectionRequiredFor = (run: RunState): string | null =>
  adapter?.directionRequiredFor(run) ?? null;

export const resolvePersistentServantCommand = (run: RunState): void =>
  adapter?.resolveCommand(run);

export const interposingServantFor = (run: RunState): Combatant | null =>
  adapter?.interposingServantFor(run) ?? null;

export const completeServantCommand = (
  run: RunState,
  preserveStandingOrder = false,
): void => adapter?.completeCommand(run, preserveStandingOrder);

export const resolveQueuedServantCounsel = (
  run: RunState,
): QueuedServantCounselResult =>
  adapter?.resolveQueuedCounsel(run) ?? {
    handled: false,
    preserveThroughEnemyAnswer: false,
  };

export const raisePreparedInterpositionWard = (
  run: RunState,
  servant: Combatant,
): void => adapter?.raisePreparedInterpositionWard(run, servant);

export const repairPersistentServant = (
  state: GameState,
  request: PersistentServantRepairRequest,
): EngineResult =>
  adapter?.repairServant(state, request) ?? {
    state,
    error: "Bonebinder practice content is not ready.",
  };

export const normalizeCurrentBonebinderRun = (run: RunState): void =>
  adapter?.normalizeCurrentRun(run);

export const validateBonebinderPracticeState = (value: unknown): boolean =>
  adapter?.validatePracticeState(value) ??
  (typeof value === "object" && value !== null && !Array.isArray(value));
