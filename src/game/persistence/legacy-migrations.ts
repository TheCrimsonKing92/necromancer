import { TRADITIONS } from "../content";
import {
  VICTORY_LOOT,
  addItem,
  createStartingKit,
} from "../items";
import { levelForExperience } from "../progression";
import { createEconomyState } from "../economy-state";
import { createWorldState } from "../world/state";
import { MAX_PERSISTED_WITNESS_ENTRIES } from "../witness";
import {
  createCampaignContinuity,
  synchronizeCampaignContinuity,
} from "../campaign-continuity";
import type {
  Ally,
  BattleLogEntry,
  BattleOutcome,
  BattleState,
  Combatant,
  EndingId,
  GameState,
  LogTone,
  Player,
  ScreenId,
  StoryId,
  TraditionId,
} from "../types";
import { migrateCombatant } from "./combatant-compatibility";
import {
  LEGACY_RESUMABLE_SCREENS,
  SAVE_SCHEMA_VERSION,
} from "./schema";
import {
  isRecord,
  isStoryId,
  isTradition,
  numberOr,
} from "./validation";

const migrateLog = (value: unknown): BattleLogEntry[] => {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((entry, index) => {
      if (!isRecord(entry) || typeof entry.text !== "string") return [];
      const tone: LogTone =
        entry.tone === "player" ||
        entry.tone === "enemy" ||
        entry.tone === "reward"
          ? entry.tone
          : "system";
      return [
        {
          id: numberOr(entry.id, index + 1),
          round: numberOr(entry.round, 1),
          tone,
          text: entry.text,
        },
      ];
    })
    .slice(-MAX_PERSISTED_WITNESS_ENTRIES);
};

const migrateBattle = (
  value: unknown,
  fallbackSeed: number,
): BattleState | null => {
  if (value === null || value === undefined || !isRecord(value)) {
    return null;
  }

  const enemies = Array.isArray(value.enemies)
    ? value.enemies
        .map((enemy) => migrateCombatant(enemy, "enemy"))
        .filter((enemy): enemy is Combatant => enemy !== null)
    : [];
  const allies = Array.isArray(value.allies)
    ? value.allies.flatMap((rawAlly) => {
        const migrated = migrateCombatant(rawAlly, "ally");
        if (!migrated) return [];
        const remainingTurns = isRecord(rawAlly)
          ? numberOr(rawAlly.remainingTurns, 1)
          : 1;
        return [
          {
            ...migrated,
            kind: "ally" as const,
            lifetime: {
              kind: "temporary" as const,
              remainingTurns,
            },
          } satisfies Ally,
        ];
      })
    : [];
  const outcome: BattleOutcome =
    value.outcome === "victory" ||
    value.outcome === "defeat" ||
    value.outcome === "fled"
      ? value.outcome
      : null;

  return {
    encounterId: enemies.some((enemy) => enemy.id === "ossuary-saint")
      ? "saint-orra"
      : "ossuary-road",
    variantId: null,
    round: Math.max(1, numberOr(value.round, 1)),
    seed: numberOr(value.seed, fallbackSeed),
    enemies,
    allies,
    log: migrateLog(value.log),
    outcome,
    nextWoundId: 1,
  };
};

export const migrateLegacyState = (
  value: unknown,
): GameState | null => {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (
    typeof value.screen !== "string" ||
    !LEGACY_RESUMABLE_SCREENS.has(value.screen as ScreenId)
  ) {
    return null;
  }

  const legacyRun = value.run;
  if (!isRecord(legacyRun) || !isRecord(legacyRun.player)) {
    return null;
  }

  const legacyPlayer = legacyRun.player;
  if (
    typeof legacyPlayer.name !== "string" ||
    !isTradition(legacyPlayer.tradition)
  ) {
    return null;
  }

  const tradition = legacyPlayer.tradition;
  const definition = TRADITIONS[tradition];
  const migratedBase = migrateCombatant(legacyPlayer, "player");
  if (!migratedBase) return null;
  const kit = createStartingKit(tradition);
  const supplies = isRecord(legacyPlayer.supplies)
    ? legacyPlayer.supplies
    : {};
  const tonicCount = Math.max(
    0,
    Math.trunc(numberOr(supplies.blackTonic, 0)),
  );
  if (tonicCount > 0) {
    addItem(kit.inventory, "black-tonic", tonicCount);
  }

  const battlesWon = Math.max(
    0,
    Math.trunc(numberOr(legacyRun.battlesWon, 0)),
  );
  if (battlesWon > 0) {
    for (const loot of VICTORY_LOOT) {
      addItem(
        kit.inventory,
        loot.itemId,
        loot.quantity * battlesWon,
      );
    }
  }

  const player: Player = {
    ...migratedBase,
    kind: "player",
    sex: "other",
    tradition,
    level: Math.max(1, numberOr(legacyPlayer.level, 1)),
    xp: Math.max(0, numberOr(legacyPlayer.xp, 0)),
    obols: 0,
    advancements: [],
    advancementReadiness: {
      practice: [],
      universal: [],
    },
    scars: [],
    attributes: { ...definition.startingAttributes },
    skills: { ...definition.startingSkills },
    spirit: Math.max(
      0,
      numberOr(legacyPlayer.focus, definition.startingSpirit),
    ),
    maxSpirit: Math.max(
      1,
      numberOr(legacyPlayer.maxFocus, definition.startingSpirit),
    ),
    inventory: kit.inventory,
    equipment: kit.equipment,
  };
  player.level = Math.max(
    player.level,
    levelForExperience(player.xp),
  );
  if (value.screen === "ending") {
    player.statuses = [];
    player.ward = 0;
  }
  const seed = numberOr(legacyRun.seed, 1);
  const battle = migrateBattle(legacyRun.battle, seed);
  if (value.screen === "battle" && !battle) return null;

  const storyId: StoryId | null = isStoryId(value.storyId)
    ? value.storyId
    : null;
  const ending: EndingId | null =
    value.ending === "victory" ||
    value.ending === "defeat" ||
    value.ending === "fled"
      ? value.ending
      : null;

  const migratedState: GameState = {
    schemaVersion: 4,
    campaign: createCampaignContinuity(seed),
    screen: value.screen as "story" | "battle" | "ending",
    storyId,
    ending,
    run: {
      seed,
      player,
      world: createWorldState(),
      economy: createEconomyState(),
      flags: Array.isArray(legacyRun.flags)
        ? legacyRun.flags.filter(
            (flag): flag is string => typeof flag === "string",
          )
        : [],
      wakeVariant: null,
      roadEvent: null,
      seenRoadEvents: [],
      battle,
      battlesWon,
    },
    inventoryReturnScreen: null,
    journalReturnScreen: null,
  };
  synchronizeCampaignContinuity(migratedState);
  return migratedState;
};

export const promoteV3Value = (parsed: unknown): unknown => {
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 3 ||
    typeof parsed.savedAt !== "string" ||
    !isRecord(parsed.state) ||
    parsed.state.schemaVersion !== 3 ||
    !isRecord(parsed.state.run)
  ) {
    return null;
  }

  parsed.state.run.world = createWorldState();
  parsed.state.schemaVersion = SAVE_SCHEMA_VERSION;
  parsed.schemaVersion = SAVE_SCHEMA_VERSION;
  return parsed;
};

export const promoteV2Value = (parsed: unknown): unknown => {
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 2 ||
    typeof parsed.savedAt !== "string" ||
    !isRecord(parsed.state) ||
    parsed.state.schemaVersion !== 2 ||
    !isRecord(parsed.state.run) ||
    !isRecord(parsed.state.run.player) ||
    !isTradition(parsed.state.run.player.tradition)
  ) {
    return null;
  }

  const player = parsed.state.run.player;
  const definition =
    TRADITIONS[player.tradition as TraditionId];
  player.attributes = { ...definition.startingAttributes };
  player.skills = { ...definition.startingSkills };
  player.spirit = Math.max(
    0,
    numberOr(player.focus, definition.startingSpirit),
  );
  player.maxSpirit = Math.max(
    1,
    numberOr(player.maxFocus, definition.startingSpirit),
  );
  delete player.focus;
  delete player.maxFocus;
  parsed.state.run.world = createWorldState();
  parsed.state.schemaVersion = SAVE_SCHEMA_VERSION;
  parsed.schemaVersion = SAVE_SCHEMA_VERSION;
  return parsed;
};
