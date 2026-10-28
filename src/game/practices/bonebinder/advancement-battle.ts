import { isCombatantStanding } from "../../anatomy";
import { damageWitness } from "../../combat-witness";
import { dealDamage } from "../../damage-resolution";
import {
  addLog,
  addOrRefreshStatus,
  grantWard,
} from "../../engine/combat-state";
import { rollInteger } from "../../random";
import type { GameState, RunState } from "../../types";
import { witnessMessage } from "../../witness";
import {
  assessLetterOfServiceOrder,
  bonebinderDoctrineFor,
  prepareCalledCounsel,
} from "./advancement-state";
import {
  registerBonebinderAdvancementBattleHooks,
  type ServantCommandService,
} from "./advancement-battle-hooks";
import {
  activeServantAlly,
} from "./battle";
import { issueServantCommand } from "./commands";
import { SOMATIC_COUNSEL_ACTIONS } from "./counsel";
import { bonebinderStateFor } from "./practice-state";
import type { ServantCommandId } from "./types";

export const servantCommandServiceFor = (
  run: RunState,
  commandId: ServantCommandId,
): ServantCommandService => {
  const practice = bonebinderStateFor(run);
  if (!practice) {
    return { outcome: "ordinary", spiritCost: 0, reason: null };
  }
  const doctrine = bonebinderDoctrineFor(run.player.advancements);
  if (doctrine === "conflict") {
    return {
      outcome: "refused",
      spiritCost: 0,
      reason: "Conflicting compact doctrines must be resolved outside combat.",
    };
  }
  if (doctrine !== "letter-of-service") {
    return { outcome: "ordinary", spiritCost: 0, reason: null };
  }
  const result = assessLetterOfServiceOrder(
    practice,
    run.player.advancements,
    { commandId },
  );
  if (!result.ok) {
    return {
      outcome: "refused",
      spiritCost: 0,
      reason:
        result.reason === "compact-not-written"
          ? "Write a service purpose outside combat first."
          : "The written service cannot carry out this order.",
    };
  }
  if (!result.assessment.mayIssue) {
    return {
      outcome: "refused",
      spiritCost: result.assessment.spiritAdjustment,
      reason: "This order contradicts the service and requires an explicit breach.",
    };
  }
  return {
    outcome: result.assessment.matchedPurpose
      ? "matching"
      : "exceptional",
    spiritCost: result.assessment.spiritAdjustment,
    reason: null,
  };
};

const commitLetterService = (
  run: RunState,
  commandId: ServantCommandId,
  servantName: string,
): boolean => {
  if (bonebinderDoctrineFor(run.player.advancements) !== "letter-of-service") {
    return true;
  }
  const practice = bonebinderStateFor(run)!;
  const assessed = assessLetterOfServiceOrder(
    practice,
    run.player.advancements,
    { commandId },
  );
  if (!assessed.ok || !assessed.assessment.mayIssue) return false;
  run.practiceStates!.bonebinder = assessed.practice;
  run.player.spirit -= assessed.assessment.spiritAdjustment;
  const command = commandId[0]!.toUpperCase() + commandId.slice(1);
  addLog(
    run.battle!,
    witnessMessage(
      "player",
      assessed.assessment.matchedPurpose
        ? `${servantName} accepts ${command} within the written service.`
        : `${command} lies outside the written service. ${assessed.assessment.spiritAdjustment} Spirit compels the exception.`,
    ),
  );
  return true;
};

const counselBattleReference = (run: RunState): string => {
  const battle = run.battle!;
  return `battle:${battle.encounterId}:${battle.variantId ?? "base"}`;
};

const markCounselInstruction = (
  run: RunState,
  targetId?: string,
): boolean => {
  const practice = bonebinderStateFor(run);
  const servant = practice?.servant;
  const battle = run.battle;
  if (!practice || !servant || !battle) return false;
  const issued = issueServantCommand(
    servant,
    "counsel",
    targetId ?? null,
    `battle:${battle.encounterId}:round-${battle.round}:called-counsel`,
  );
  if (!issued.ok) return false;
  practice.servant = issued.servant;
  return true;
};

const selectedCounselFor = (run: RunState) => {
  const practice = bonebinderStateFor(run);
  const battle = run.battle;
  if (!practice || !battle) return null;
  return prepareCalledCounsel(
    practice,
    run.player.advancements,
    counselBattleReference(run),
    battle.round,
    battle.seed,
  );
};

export const calledCounselPreviewFor = (
  state: GameState,
) => {
  const run = state.run;
  if (!run?.battle) return null;
  const prepared = selectedCounselFor(run);
  if (!prepared?.ok) return null;
  return SOMATIC_COUNSEL_ACTIONS[prepared.selected.actionId];
};

export const getCalledCounselUnavailableReason = (
  state: GameState,
  targetId?: string,
): string | null => {
  const run = state.run;
  const battle = run?.battle;
  const ally = run ? activeServantAlly(run) : null;
  if (state.screen !== "battle" || !run || !battle || battle.outcome) {
    return "No active battle.";
  }
  if (battle.advancementState?.pendingPlayerAction) {
    return "Resolve the suspended working first.";
  }
  if (!ally || !isCombatantStanding(ally)) {
    return "No persistent servant can recall a motion here.";
  }
  const prepared = selectedCounselFor(run);
  if (!prepared?.ok) {
    if (prepared?.reason === "no-eligible-nonrepeating-action") {
      return "Every usable motion was recalled in the preceding round.";
    }
    if (prepared?.reason === "no-somatic-memory") {
      return "This body retains no usable motion.";
    }
    return "Called Counsel is not available.";
  }
  if (
    (prepared.selected.actionId === "shove" ||
      prepared.selected.actionId === "weapon-technique") &&
    !battle.enemies.some(
      (enemy) => enemy.id === targetId && isCombatantStanding(enemy),
    )
  ) {
    return "Choose a living enemy before calling counsel.";
  }
  return null;
};

export const queueCalledCounsel = (
  run: RunState,
  targetId?: string,
): boolean => markCounselInstruction(run, targetId);

export const resolveCalledCounselMotion = (
  run: RunState,
  targetId?: string,
): boolean => {
  const battle = run.battle;
  const ally = activeServantAlly(run);
  const practice = bonebinderStateFor(run);
  if (!battle || !ally || !practice || !isCombatantStanding(ally)) {
    return false;
  }
  const prepared = selectedCounselFor(run);
  if (!prepared?.ok) return false;
  const target = battle.enemies.find(
    (enemy) => enemy.id === targetId && isCombatantStanding(enemy),
  );
  if (
    (prepared.selected.actionId === "shove" ||
      prepared.selected.actionId === "weapon-technique") &&
    !target
  ) return false;

  run.practiceStates!.bonebinder = prepared.practice;
  battle.seed = rollInteger(battle.seed, 0, 0).seed;
  const work = prepared.selected.workReference === "county-pallbearer"
    ? "the old balance of a county pallbearer"
    : "work retained in the body";

  switch (prepared.selected.actionId) {
    case "brace": {
      const grant = grantWard(ally, Math.max(0, 4 - ally.ward));
      addLog(
        battle,
        witnessMessage(
          "player",
          grant.gained > 0
            ? `${ally.name} settles into ${work} and raises ${grant.gained} Ward, to ${grant.after}.`
            : `${ally.name} settles into ${work}; its Ward is already set.`,
        ),
      );
      return true;
    }
    case "guarded-movement": {
      const issued = issueServantCommand(
        bonebinderStateFor(run)!.servant!,
        "interpose",
        run.player.id,
        `${counselBattleReference(run)}:round-${battle.round}:counsel`,
      );
      if (!issued.ok) return false;
      bonebinderStateFor(run)!.servant = issued.servant;
      const grant = grantWard(ally, Math.max(0, 2 - ally.ward));
      addLog(
        battle,
        witnessMessage(
          "player",
          `${ally.name} crosses by ${work} and takes the line before ${run.player.name}.${grant.gained > 0 ? ` The guarded passage raises its Ward to ${grant.after}.` : ""}`,
        ),
      );
      return true;
    }
    case "shove": {
      const result = dealDamage(
        battle,
        ally,
        target!,
        0,
        "physical",
        "remembered pallbearer shove",
        0,
        "impact",
      );
      if (result.hit && !result.defeated) {
        addOrRefreshStatus(target!, {
          id: "exposed",
          potency: 1,
          turns: 1,
        });
      }
      addLog(
        battle,
        damageWitness(
          "player",
          "remembered pallbearer shove",
          ally,
          target!,
          result,
          result.hit && !result.defeated
            ? [{
                type: "status",
                target: target!.name,
                status: "exposed",
                potency: 1,
                turns: 1,
              }]
            : [],
        ),
      );
      return true;
    }
    case "weapon-technique": {
      const result = dealDamage(
        battle,
        ally,
        target!,
        1,
        "physical",
        "remembered tool-work",
        0,
        "edge",
      );
      addLog(
        battle,
        damageWitness(
          "player",
          "remembered tool-work",
          ally,
          target!,
          result,
        ),
      );
      return true;
    }
  }
};

registerBonebinderAdvancementBattleHooks({
  serviceFor: servantCommandServiceFor,
  commitService: commitLetterService,
  resolveQueuedCounsel: (run) => {
    const command = bonebinderStateFor(run)?.servant?.command.current;
    if (command?.id !== "counsel") {
      return { handled: false, preserveThroughEnemyAnswer: false };
    }
    const handled = resolveCalledCounselMotion(
      run,
      command.targetReference ?? undefined,
    );
    const resolved = bonebinderStateFor(run)?.servant?.command.current;
    return {
      handled,
      preserveThroughEnemyAnswer:
        handled &&
        resolved?.id === "interpose" &&
        resolved.issuedAtReference?.endsWith(":counsel") === true,
    };
  },
});
