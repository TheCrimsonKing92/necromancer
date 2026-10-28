import { chronicleReadModelFor, type ChronicleReadModel } from "../chronicle";
import { normalizeSeed } from "../random";
import type {
  CharacterSex,
  ClosedTestamentSummary,
  SuccessorRelationshipMode,
  TestamentEndReason,
  TraditionId,
} from "../types";
import {
  LEGACY_SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  SAVE_KEY,
  V2_SAVE_KEY,
  type StorageLike,
} from "./schema";

const SAVE_KEYS = [
  SAVE_KEY,
  PREVIOUS_SAVE_KEY,
  V2_SAVE_KEY,
  LEGACY_SAVE_KEY,
] as const;
const TRADITIONS = new Set<TraditionId>([
  "medium",
  "summoner",
  "thaumaturgist",
  "grave-warden",
]);
const END_REASONS = new Set<TestamentEndReason>([
  "death",
  "completion",
  "withdrawal",
  "retirement",
  "yielding",
  "disappearance",
]);
const SUCCESSOR_RELATIONSHIPS = new Set<SuccessorRelationshipMode>([
  "familiar",
  "spiritual",
  "independent",
]);
const MAX_CHRONICLE_ENTRIES = 256;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const natural = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;

const positive = (value: unknown, fallback = 1): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;

const text = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, 96)
    : fallback;

const fallbackPracticeName = (tradition: TraditionId): string =>
  tradition
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");

const endingReasonFrom = (
  state: Record<string, unknown>,
  run: Record<string, unknown>,
): TestamentEndReason | null => {
  if (state.screen !== "ending") return null;
  if (state.ending === "defeat") return "death";
  if (state.ending === "fled") return "withdrawal";
  const battle = isRecord(run.battle) ? run.battle : null;
  return state.ending === "victory" &&
    (battle?.encounterId === "black-mile-wake" ||
      (!battle?.encounterId && natural(run.battlesWon) >= 3))
    ? "completion"
    : null;
};

const closedTestamentFrom = (
  value: unknown,
): ClosedTestamentSummary | null => {
  if (
    !isRecord(value) ||
    typeof value.testamentId !== "string" ||
    !TRADITIONS.has(value.tradition as TraditionId) ||
    (value.sex !== "male" && value.sex !== "female" && value.sex !== "other") ||
    !END_REASONS.has(value.endReason as TestamentEndReason)
  ) {
    return null;
  }
  const testamentId = text(value.testamentId, "");
  if (!testamentId) return null;
  const successor = isRecord(value.successor) &&
    typeof value.successor.testamentId === "string" &&
    SUCCESSOR_RELATIONSHIPS.has(
      value.successor.relationship as SuccessorRelationshipMode,
    )
    ? {
        testamentId: text(value.successor.testamentId, ""),
        relationship:
          value.successor.relationship as SuccessorRelationshipMode,
      }
    : null;
  return {
    testamentId,
    ordinal: positive(value.ordinal),
    useName: text(value.useName, "Unnamed"),
    sex: value.sex,
    tradition: value.tradition as TraditionId,
    practiceName: text(
      value.practiceName,
      fallbackPracticeName(value.tradition as TraditionId),
    ),
    endReason: value.endReason as TestamentEndReason,
    level: positive(value.level),
    experience: natural(value.experience),
    battlesWon: natural(value.battlesWon),
    finalHealth: natural(value.finalHealth),
    maximumHealth: positive(value.maximumHealth),
    worldRevision: natural(value.worldRevision),
    successor: successor?.testamentId ? successor : null,
  };
};

/** A bounded parser is kept here so the title never admits gameplay modules. */
const closedHistoryFrom = (value: unknown): ClosedTestamentSummary[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .slice(0, MAX_CHRONICLE_ENTRIES)
    .map(closedTestamentFrom)
    .filter((entry): entry is ClosedTestamentSummary => {
      if (!entry || seen.has(entry.testamentId)) return false;
      seen.add(entry.testamentId);
      return true;
    })
    .sort((left, right) => left.ordinal - right.ordinal);
};

const legacyClosedSummary = (
  state: Record<string, unknown>,
  run: Record<string, unknown>,
  campaign: Record<string, unknown> | null,
): ClosedTestamentSummary | null => {
  if (!isRecord(run.player)) return null;
  const player = run.player;
  if (
    typeof player.name !== "string" ||
    !TRADITIONS.has(player.tradition as TraditionId)
  ) {
    return null;
  }
  const reason = endingReasonFrom(state, run);
  if (!reason) return null;
  const seed = normalizeSeed(
    typeof run.seed === "number" ? run.seed : 1,
  );
  const campaignId =
    typeof campaign?.id === "string" && campaign.id.trim()
      ? campaign.id.trim().slice(0, 96)
      : `campaign-${seed.toString(36)}`;
  const active = isRecord(campaign?.activeTestament)
    ? campaign.activeTestament
    : null;
  const ordinal = positive(active?.ordinal, 1);
  const sex: CharacterSex =
    player.sex === "male" || player.sex === "female" || player.sex === "other"
      ? player.sex
      : "other";

  return {
    testamentId:
      typeof active?.id === "string" && active.id.trim()
        ? active.id.trim().slice(0, 96)
        : `${campaignId}:testament-${ordinal}`,
    ordinal,
    useName: player.name.trim().slice(0, 96) || "Unnamed",
    sex,
    tradition: player.tradition as TraditionId,
    practiceName: text(
      player.practiceName,
      fallbackPracticeName(player.tradition as TraditionId),
    ),
    endReason: reason,
    level: positive(player.level, 1),
    experience: natural(player.xp),
    battlesWon: natural(run.battlesWon),
    finalHealth: natural(player.hp),
    maximumHealth: positive(player.maxHp, 1),
    worldRevision: natural(campaign?.worldRevision),
    successor: null,
  };
};

const chronicleFromParsedSave = (value: unknown): ChronicleReadModel | null => {
  if (!isRecord(value) || !isRecord(value.state)) {
    return null;
  }
  const state = value.state;
  const runValue = state.run;
  if (!isRecord(runValue)) return null;
  const run = runValue;
  const campaign = isRecord(state.campaign) ? state.campaign : null;
  const savedHistory = closedHistoryFrom(
    campaign?.closedTestaments,
  );
  const recoveredEnding = legacyClosedSummary(state, run, campaign);
  const closedTestaments = savedHistory.length > 0
    ? savedHistory
    : recoveredEnding
      ? [recoveredEnding]
      : [];
  const seed = normalizeSeed(
    typeof campaign?.seed === "number"
      ? campaign.seed
      : typeof run.seed === "number"
        ? run.seed
        : 1,
  );
  const id =
    typeof campaign?.id === "string" && campaign.id.trim()
      ? campaign.id.trim().slice(0, 96)
      : `campaign-${seed.toString(36)}`;
  const hasActiveTestament = campaign
    ? campaign.activeTestament !== null
    : !recoveredEnding;

  return chronicleReadModelFor({
    id,
    activeTestament: hasActiveTestament
      ? {
          id: `${id}:active`,
          ordinal: closedTestaments.length + 1,
          predecessorTestamentId: null,
          successorRelationship: null,
        }
      : null,
    closedTestaments,
  });
};

/** Reads only the bounded Chronicle projection; it does not admit gameplay. */
export const readStoredChronicle = (
  storage: Pick<StorageLike, "getItem">,
): ChronicleReadModel | null => {
  for (const key of SAVE_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const chronicle = chronicleFromParsedSave(JSON.parse(raw));
      if (chronicle) return chronicle;
    } catch {
      // Try the next known save generation.
    }
  }
  return null;
};
