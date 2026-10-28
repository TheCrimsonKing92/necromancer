import { isCombatantStanding } from "../../anatomy";
import { damageWitness } from "../../combat-witness";
import { dealDamage } from "../../damage-resolution";
import { witnessMessage } from "../../witness";
import type {
  Combatant,
  EngineResult,
  GameState,
  PersistentAlly,
  RunState,
} from "../../types";
import {
  addLog,
  grantWard,
} from "../../engine/combat-state";
import {
  commitServantCommandService,
  servantCommandServiceFor,
} from "./advancement-battle-hooks";
import { issueServantCommand } from "./commands";
import { bonebinderStateFor } from "./practice-state";
import type { ServantCommandId } from "./types";
import type { PersistentServantCombatant } from "./types";

const isStandingOrder = (commandId: ServantCommandId): boolean =>
  commandId === "guard" ||
  commandId === "interpose" ||
  commandId === "harry";

export const activeServantAlly = (
  run: RunState,
): PersistentAlly | null => {
  const servant = bonebinderStateFor(run)?.servant;
  const ally = run.battle?.allies.find(
    (candidate): candidate is PersistentAlly =>
      candidate.lifetime.kind === "persistent" &&
      candidate.lifetime.servantId === servant?.identity.id,
  );
  return ally ?? null;
};

export const deployPersistentServantForBattle = (
  run: RunState,
): boolean => {
  const battle = run.battle;
  const servant = bonebinderStateFor(run)?.servant;
  if (
    !battle ||
    !servant ||
    !isCombatantStanding(servant.combatant) ||
    activeServantAlly(run)
  ) {
    return false;
  }
  servant.combatant.ward = 0;
  servant.combatant.statuses = [];
  battle.allies.push(structuredClone(servant.combatant));
  addLog(
    battle,
    witnessMessage(
      "player",
      `${servant.identity.useName} takes its place in the line. No borrowed duration holds it there.`,
    ),
  );
  return true;
};

export const deployBonebinderServant = (
  state: GameState,
): EngineResult => {
  const run = state.run;
  const battle = run?.battle;
  const servant = run ? bonebinderStateFor(run)?.servant : null;
  if (state.screen !== "battle" || !run || !battle) {
    return { state, error: "No active battle can receive a servant." };
  }
  if (!servant) {
    return { state, error: "No persistent servant is recorded." };
  }
  if (!isCombatantStanding(servant.combatant)) {
    return {
      state,
      error: `${servant.identity.useName} cannot stand until repaired.`,
    };
  }
  if (
    battle.allies.some(
      (ally) =>
        ally.lifetime.kind === "persistent" &&
        ally.lifetime.servantId === servant.identity.id,
    )
  ) {
    return { state, error: "The persistent servant is already present." };
  }

  const next = structuredClone(state);
  const nextRun = next.run!;
  deployPersistentServantForBattle(nextRun);
  return { state: next };
};

export const syncPersistentServantFromBattle = (
  run: RunState,
  settle = false,
): void => {
  const servant = bonebinderStateFor(run)?.servant;
  if (!servant || !run.battle) return;
  const ally = activeServantAlly(run);
  if (!ally) return;
  if (ally.materiality !== "corporeal") return;
  servant.combatant = structuredClone(
    ally,
  ) as PersistentServantCombatant;
  if (settle) {
    servant.combatant.ward = 0;
    servant.combatant.statuses = [];
  }
};

export const getServantCommandUnavailableReason = (
  state: GameState,
  commandId: ServantCommandId,
  targetId?: string,
): string | null => {
  const run = state.run;
  const battle = run?.battle;
  const servant = run ? bonebinderStateFor(run)?.servant : null;
  const ally = run ? activeServantAlly(run) : null;
  if (state.screen !== "battle" || !run || !battle || battle.outcome) {
    return "No active battle.";
  }
  if (battle.advancementState?.pendingPlayerAction) {
    return "Resolve the suspended working first.";
  }
  if (!servant || !ally) return "No persistent servant is in the line.";
  if (
    commandId !== "withdraw" &&
    !isCombatantStanding(ally)
  ) {
    return `${servant.identity.useName} cannot carry a command while down.`;
  }
  if (
    commandId === "harry" &&
    !battle.enemies.some(
      (enemy) =>
        enemy.id === targetId && isCombatantStanding(enemy),
    )
  ) {
    return "Choose a living enemy for Harry.";
  }
  const service = servantCommandServiceFor(run, commandId);
  if (service.reason) return service.reason;
  if (service.spiritCost > run.player.spirit) {
    return `The exceptional order requires ${service.spiritCost} Spirit.`;
  }
  const issued = issueServantCommand(
    servant,
    commandId,
    commandId === "interpose"
      ? run.player.id
      : commandId === "harry"
        ? targetId ?? null
        : null,
  );
  return issued.ok
    ? null
    : issued.reason === "missing-target"
      ? "That command needs a target."
      : `${servant.identity.useName} cannot carry that command.`;
};

export const allocateServantCommand = (
  run: RunState,
  commandId: ServantCommandId,
  targetId?: string,
): boolean => {
  const state = bonebinderStateFor(run);
  const servant = state?.servant;
  if (!servant || !run.battle) return false;
  const service = servantCommandServiceFor(run, commandId);
  if (service.reason || service.spiritCost > run.player.spirit) {
    return false;
  }
  const issued = issueServantCommand(
    servant,
    commandId,
    commandId === "interpose"
      ? run.player.id
      : commandId === "harry"
        ? targetId ?? null
        : null,
    `battle:${run.battle.encounterId}:round-${run.battle.round}`,
  );
  if (!issued.ok) return false;
  run.practiceStates!.bonebinder!.servant = issued.servant;
  return true;
};

export const servantDirectionRequiredFor = (
  run: RunState,
): string | null => {
  const servant = bonebinderStateFor(run)?.servant;
  const ally = activeServantAlly(run);
  if (!servant || !ally || !isCombatantStanding(ally)) return null;
  const command = servant.command.current;
  if (command.id === "await") return servant.identity.useName;
  if (command.id === "counsel" || command.id === "withdraw") return null;
  const service = servantCommandServiceFor(run, command.id);
  return service.reason || service.spiritCost > run.player.spirit
    ? servant.identity.useName
    : null;
};

export const resolvePersistentServantCommand = (
  run: RunState,
): void => {
  const battle = run.battle;
  const servant = bonebinderStateFor(run)?.servant;
  const ally = activeServantAlly(run);
  if (!battle || !servant || !ally) return;
  const command = servant.command.current;

  if (command.id === "await") return;
  if (!commitServantCommandService(
    run,
    command.id,
    servant.identity.useName,
  )) {
    addLog(
      battle,
      witnessMessage(
        "system",
        `${servant.identity.useName} cannot carry the standing order as given.`,
      ),
    );
    return;
  }
  if (command.id === "withdraw") {
    syncPersistentServantFromBattle(run);
    battle.allies = battle.allies.filter(
      (candidate) => candidate !== ally,
    );
    addLog(
      battle,
      witnessMessage(
        "player",
        `${servant.identity.useName} leaves the line and waits beyond the enemy’s reach.`,
      ),
    );
    return;
  }
  if (!isCombatantStanding(ally)) {
    addLog(
      battle,
      witnessMessage(
        "system",
        `${servant.identity.useName} cannot carry out the command.`,
      ),
    );
    return;
  }

  if (command.id === "guard") {
    const ward = grantWard(run.player, Math.max(0, 2 - run.player.ward));
    addLog(
      battle,
      witnessMessage(
        "player",
        ward.gained > 0
          ? `${servant.identity.useName} settles its prepared frame at ${run.player.name}’s shoulder. ${ward.gained} Ward passes across, raising ${run.player.name}’s Ward to ${ward.after}.`
          : `${servant.identity.useName} holds close. ${run.player.name}’s Ward already stands at ${ward.after}.`,
      ),
    );
    return;
  }
  if (command.id === "interpose") {
    addLog(
      battle,
      witnessMessage(
        "player",
        `${servant.identity.useName} puts its prepared body between ${run.player.name} and the enemy.`,
      ),
    );
    return;
  }
  if (command.id !== "harry") return;

  const target = battle.enemies.find(
    (enemy) =>
      enemy.id === command.targetReference &&
      isCombatantStanding(enemy),
  ) ?? battle.enemies.find(isCombatantStanding);
  if (!target) {
    addLog(
      battle,
      witnessMessage(
        "system",
        `${servant.identity.useName} finds no living mark for Harry.`,
      ),
    );
    return;
  }
  const result = dealDamage(
    battle,
    ally,
    target,
    2,
    "physical",
    "hooked hands",
    0,
    "impact",
  );
  addLog(
    battle,
    damageWitness(
      "player",
      "hooked hands",
      ally,
      target,
      result,
    ),
  );
};

export const interposingServantFor = (
  run: RunState,
): Combatant | null => {
  const servant = bonebinderStateFor(run)?.servant;
  const ally = activeServantAlly(run);
  return servant?.command.current.id === "interpose" &&
    servant.command.current.targetReference === run.player.id &&
    ally &&
    isCombatantStanding(ally)
    ? ally
    : null;
};

export const completeServantCommand = (
  run: RunState,
  preserveStandingOrder = false,
): void => {
  const servant = bonebinderStateFor(run)?.servant;
  if (
    !servant ||
    (preserveStandingOrder &&
      isStandingOrder(servant.command.current.id) &&
      !servant.command.current.issuedAtReference?.endsWith(":counsel"))
  ) return;
  servant.command.current = {
    id: "await",
    targetReference: null,
    issuedAtReference: null,
  };
};
