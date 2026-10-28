import { isAdvancementId } from "../advancements";
import {
  isAdvancementExpressionId,
  normalizeAdvancementReadiness,
} from "../advancement-readiness";
import {
  normalizeAttributes,
  normalizeSkills,
} from "../character";
import { ACTIONS, TRADITIONS } from "../content";
import { normalizeEconomyState } from "../economy-state";
import { ITEMS } from "../items";
import { levelForExperience } from "../progression";
import { normalizeDepartureRecoveryState } from "../departure-recovery";
import { MAX_PERSISTED_WITNESS_ENTRIES } from "../witness";
import { normalizeWorldState } from "../world/state";
import { synchronizeCampaignContinuity } from "../campaign-continuity";
import type {
  Ally,
  ActionId,
  BattleState,
  Player,
  RunState,
} from "../types";
import { normalizeCurrentCombatant } from "./combatant-compatibility";
import type { SaveEnvelope } from "./schema";
import { normalizeCurrentBonebinderRun } from "../content-packs/bonebinder-runtime";
import { normalizeGraveWardenRun } from "../content-packs/grave-warden-runtime";
import type { PersistentServantCombatant } from "../practices/bonebinder/types";
import { SAVE_SCHEMA_VERSION } from "./schema";
import {
  isCharacterSex,
  isEncounterId,
  isRecord,
  isResumableState,
  isRoadEventId,
  isScar,
  isWakeVariantId,
  isWorldFact,
  numberOr,
} from "./validation";

const normalizeCurrentAllyLifetime = (ally: Ally): void => {
  const raw = ally as Ally & {
    remainingTurns?: unknown;
    lifetime?: unknown;
  };
  if (
    typeof raw.lifetime !== "object" ||
    raw.lifetime === null ||
    !("kind" in raw.lifetime)
  ) {
    const remainingTurns =
      typeof raw.remainingTurns === "number"
        ? raw.remainingTurns
        : 1;
    raw.lifetime = {
      kind: "temporary",
      remainingTurns: Math.max(1, Math.trunc(remainingTurns)),
    };
  }
  delete raw.remainingTurns;
};

export const parseCurrentValue = (
  parsed: unknown,
): SaveEnvelope | null => {
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== SAVE_SCHEMA_VERSION ||
    typeof parsed.savedAt !== "string" ||
    !isResumableState(parsed.state)
  ) {
    return null;
  }
  const envelope = parsed as unknown as SaveEnvelope;
  const run = envelope.state.run;
  const player = run?.player;
  if (player) {
    normalizeCurrentCombatant(player);
    player.sex = isCharacterSex(player.sex) ? player.sex : "other";
    const definition = TRADITIONS[player.tradition];
    player.attributes = normalizeAttributes(
      player.attributes,
      definition.startingAttributes,
    );
    player.skills = normalizeSkills(
      player.skills,
      definition.startingSkills,
    );
    player.maxSpirit = Math.max(1, player.maxSpirit);
    player.spirit = Math.max(
      0,
      Math.min(player.maxSpirit, player.spirit),
    );
    const savedObols = (
      player as Player & { obols?: unknown }
    ).obols;
    player.obols = Math.max(
      0,
      Math.trunc(numberOr(savedObols, 0)),
    );
    const savedAdvancements = (
      player as Player & { advancements?: unknown }
    ).advancements;
    player.advancements = Array.isArray(savedAdvancements)
      ? [...new Set(savedAdvancements.filter(isAdvancementId))]
      : [];
    normalizeAdvancementReadiness(player);
    const savedScars = (
      player as Player & { scars?: unknown }
    ).scars;
    player.scars = Array.isArray(savedScars)
      ? savedScars
          .filter(isScar)
          .filter(
            (scar, index, scars) =>
              scars.findIndex(
                (candidate) => candidate.id === scar.id,
              ) === index,
          )
      : [];
    player.level = Math.max(
      player.level,
      levelForExperience(player.xp),
    );
  }
  if (run) {
    normalizeWorldState(run.world);
    run.economy = normalizeEconomyState(
      (run as RunState & { economy?: unknown }).economy,
      (id): id is keyof typeof ITEMS => Object.hasOwn(ITEMS, id),
    );
    normalizeCurrentBonebinderRun(run);
    normalizeGraveWardenRun(run);
    const savedPlayerKnowledge = (
      run.world as RunState["world"] & {
        playerKnowledge?: unknown;
      }
    ).playerKnowledge;
    run.world.playerKnowledge = Array.isArray(savedPlayerKnowledge)
      ? [...new Set(savedPlayerKnowledge.filter(isWorldFact))]
      : [];
    const savedWakeVariant = (
      run as RunState & { wakeVariant?: unknown }
    ).wakeVariant;
    run.wakeVariant = isWakeVariantId(savedWakeVariant)
      ? savedWakeVariant
      : null;
    const savedRoadEvent = (
      run as RunState & { roadEvent?: unknown }
    ).roadEvent;
    run.roadEvent = isRoadEventId(savedRoadEvent)
      ? savedRoadEvent
      : null;
    const savedRoadHistory = (
      run as RunState & { seenRoadEvents?: unknown }
    ).seenRoadEvents;
    run.seenRoadEvents = Array.isArray(savedRoadHistory)
      ? [...new Set(savedRoadHistory.filter(isRoadEventId))]
      : run.roadEvent
        ? [run.roadEvent]
        : [];

    if (run.battle) {
      const battle = run.battle as BattleState & {
        encounterId?: unknown;
        variantId?: unknown;
      };
      battle.encounterId = isEncounterId(battle.encounterId)
        ? battle.encounterId
        : battle.enemies.some(
              (enemy) => enemy.id === "ossuary-saint",
            )
          ? "saint-orra"
          : battle.enemies.some((enemy) =>
                enemy.id.startsWith("wake-"),
              )
            ? "black-mile-wake"
            : "ossuary-road";
      battle.variantId = isWakeVariantId(battle.variantId)
        ? battle.variantId
        : battle.encounterId === "black-mile-wake"
          ? run.wakeVariant
          : null;
      battle.enemies.forEach(normalizeCurrentCombatant);
      battle.allies.forEach((ally) => {
        normalizeCurrentCombatant(ally);
        normalizeCurrentAllyLifetime(ally);
      });
      const rawAdvancementState = battle.advancementState as
        | Record<string, unknown>
        | undefined;
      const rawPending = rawAdvancementState?.pendingPlayerAction;
      const pending = isRecord(rawPending) &&
        typeof rawPending.actionId === "string" &&
        Object.hasOwn(ACTIONS, rawPending.actionId) &&
        (rawPending.targetId === undefined ||
          typeof rawPending.targetId === "string") &&
        (rawPending.chance === undefined ||
          typeof rawPending.chance === "number") &&
        (rawPending.roll === undefined ||
          typeof rawPending.roll === "number") &&
        (rawPending.hit === undefined ||
          typeof rawPending.hit === "boolean")
        ? {
            actionId: rawPending.actionId as ActionId,
            targetId: rawPending.targetId as string | undefined,
            chance: rawPending.chance as number | undefined,
            roll: rawPending.roll as number | undefined,
            hit: rawPending.hit as boolean | undefined,
          }
        : undefined;
      battle.advancementState = {
        usedExpressions: Array.isArray(
          rawAdvancementState?.usedExpressions,
        )
          ? rawAdvancementState.usedExpressions.filter(
              isAdvancementExpressionId,
            )
          : [],
        ...(pending ? { pendingPlayerAction: pending } : {}),
        fieldSplintUsed:
          rawAdvancementState?.fieldSplintUsed === true,
        workedAroundWoundId:
          typeof rawAdvancementState?.workedAroundWoundId === "string"
            ? rawAdvancementState.workedAroundWoundId
            : undefined,
        workedAroundBurdenApplied:
          rawAdvancementState?.workedAroundBurdenApplied === true,
        workedAroundResolved:
          rawAdvancementState?.workedAroundResolved === true,
        departureRecovery: normalizeDepartureRecoveryState(
          rawAdvancementState?.departureRecovery,
        ),
      };
      const servant = run.practiceStates?.bonebinder?.servant;
      const activePersistent = servant
        ? battle.allies.find(
            (ally) =>
              ally.lifetime.kind === "persistent" &&
              ally.lifetime.servantId === servant.identity.id,
          )
        : undefined;
      if (servant && activePersistent) {
        if (activePersistent.materiality === "corporeal") {
          servant.combatant = structuredClone(
            activePersistent,
          ) as PersistentServantCombatant;
        }
      }
      battle.log = battle.log.slice(
        -MAX_PERSISTED_WITNESS_ENTRIES,
      );
    }
  }
  envelope.state.journalReturnScreen =
    envelope.state.journalReturnScreen === "story" ||
    envelope.state.journalReturnScreen === "battle" ||
    envelope.state.journalReturnScreen === "ending"
      ? envelope.state.journalReturnScreen
      : null;
  synchronizeCampaignContinuity(envelope.state);
  return envelope;
};

export const parseCurrentEnvelope = (
  raw: string,
): SaveEnvelope | null => parseCurrentValue(JSON.parse(raw));
