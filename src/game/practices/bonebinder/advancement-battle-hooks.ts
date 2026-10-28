import type { RunState } from "../../types";
import type { ServantCommandId } from "./types";

export interface ServantCommandService {
  outcome: "ordinary" | "matching" | "exceptional" | "refused";
  spiritCost: number;
  reason: string | null;
}

export interface QueuedCounselResolution {
  handled: boolean;
  preserveThroughEnemyAnswer: boolean;
}

interface BonebinderAdvancementBattleHooks {
  serviceFor: (
    run: RunState,
    commandId: ServantCommandId,
  ) => ServantCommandService;
  commitService: (
    run: RunState,
    commandId: ServantCommandId,
    servantName: string,
  ) => boolean;
  resolveQueuedCounsel: (run: RunState) => QueuedCounselResolution;
}

let advancementHooks: BonebinderAdvancementBattleHooks | undefined;

export const registerBonebinderAdvancementBattleHooks = (
  hooks: BonebinderAdvancementBattleHooks,
): void => {
  advancementHooks = hooks;
};

export const servantCommandServiceFor = (
  run: RunState,
  commandId: ServantCommandId,
): ServantCommandService => advancementHooks?.serviceFor(run, commandId) ?? {
  outcome: "ordinary",
  spiritCost: 0,
  reason: null,
};

export const commitServantCommandService = (
  run: RunState,
  commandId: ServantCommandId,
  servantName: string,
): boolean => advancementHooks?.commitService(
  run,
  commandId,
  servantName,
) ?? true;

export const resolveQueuedServantCounsel = (
  run: RunState,
): QueuedCounselResolution => advancementHooks?.resolveQueuedCounsel(run) ?? {
  handled: false,
  preserveThroughEnemyAnswer: false,
};
