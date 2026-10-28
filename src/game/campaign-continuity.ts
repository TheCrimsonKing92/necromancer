import { normalizeSeed } from "./random";
import { TRADITIONS as PRACTICE_DEFINITIONS } from "./content/definitions";
import type {
  ActiveTestamentIdentity,
  CampaignContinuityState,
  CharacterSex,
  ClosedTestamentSummary,
  GameState,
  RunState,
  SuccessorRelationshipMode,
  TestamentEndReason,
  TraditionId,
} from "./types";

const TRADITIONS = new Set<TraditionId>([
  "medium",
  "summoner",
  "thaumaturgist",
  "grave-warden",
]);
const SEXES = new Set<CharacterSex>(["male", "female", "other"]);
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const naturalNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;

const positiveNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;

const boundedText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 96)
    : fallback;

const campaignIdFor = (seed: number): string =>
  `campaign-${normalizeSeed(seed).toString(36)}`;

const testamentIdFor = (campaignId: string, ordinal: number): string =>
  `${campaignId}:testament-${ordinal}`;

const initialActiveTestament = (
  campaignId: string,
): ActiveTestamentIdentity => ({
  id: testamentIdFor(campaignId, 1),
  ordinal: 1,
  predecessorTestamentId: null,
  successorRelationship: null,
});

export const createCampaignContinuity = (
  seed: number,
): CampaignContinuityState => {
  const normalizedSeed = normalizeSeed(seed);
  const id = campaignIdFor(normalizedSeed);
  return {
    id,
    seed: normalizedSeed,
    worldRevision: 0,
    nextTestamentOrdinal: 2,
    activeTestament: initialActiveTestament(id),
    closedTestaments: [],
  };
};

export const testamentEndReasonFor = (
  state: Pick<GameState, "screen" | "ending" | "run">,
): TestamentEndReason | null => testamentEndReasonFromSnapshot({
  screen: state.screen,
  ending: state.ending,
  encounterId: state.run?.battle?.encounterId ?? null,
  battlesWon: state.run?.battlesWon ?? 0,
});

export const testamentEndReasonFromSnapshot = (
  snapshot: {
    readonly screen: unknown;
    readonly ending: unknown;
    readonly encounterId: unknown;
    readonly battlesWon: unknown;
  },
): TestamentEndReason | null => {
  if (snapshot.screen !== "ending") return null;
  if (snapshot.ending === "defeat") return "death";
  if (snapshot.ending === "fled") return "withdrawal";
  return snapshot.ending === "victory" &&
    (snapshot.encounterId === "black-mile-wake" ||
      (snapshot.encounterId === null &&
        typeof snapshot.battlesWon === "number" &&
        snapshot.battlesWon >= 3))
    ? "completion"
    : null;
};

const normalizedSuccessorLink = (
  value: unknown,
): ClosedTestamentSummary["successor"] => {
  if (!isRecord(value)) return null;
  if (
    typeof value.testamentId !== "string" ||
    !SUCCESSOR_RELATIONSHIPS.has(
      value.relationship as SuccessorRelationshipMode,
    )
  ) {
    return null;
  }
  const testamentId = boundedText(value.testamentId, "");
  if (!testamentId) return null;
  return {
    testamentId,
    relationship: value.relationship as SuccessorRelationshipMode,
  };
};

const normalizedClosedTestament = (
  value: unknown,
): ClosedTestamentSummary | null => {
  if (
    !isRecord(value) ||
    typeof value.testamentId !== "string" ||
    !TRADITIONS.has(value.tradition as TraditionId) ||
    !SEXES.has(value.sex as CharacterSex) ||
    !END_REASONS.has(value.endReason as TestamentEndReason)
  ) {
    return null;
  }
  const testamentId = boundedText(value.testamentId, "");
  if (!testamentId) return null;
  return {
    testamentId,
    ordinal: positiveNumber(value.ordinal, 1),
    useName: boundedText(value.useName, "Unnamed"),
    sex: value.sex as CharacterSex,
    tradition: value.tradition as TraditionId,
    practiceName: boundedText(
      value.practiceName,
      PRACTICE_DEFINITIONS[value.tradition as TraditionId].name,
    ),
    endReason: value.endReason as TestamentEndReason,
    level: positiveNumber(value.level, 1),
    experience: naturalNumber(value.experience, 0),
    battlesWon: naturalNumber(value.battlesWon, 0),
    finalHealth: naturalNumber(value.finalHealth, 0),
    maximumHealth: positiveNumber(value.maximumHealth, 1),
    worldRevision: naturalNumber(value.worldRevision, 0),
    successor: normalizedSuccessorLink(value.successor),
  };
};

const normalizedActiveTestament = (
  value: unknown,
): ActiveTestamentIdentity | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const id = boundedText(value.id, "");
  if (!id) return null;
  const relationship = SUCCESSOR_RELATIONSHIPS.has(
    value.successorRelationship as SuccessorRelationshipMode,
  )
    ? value.successorRelationship as SuccessorRelationshipMode
    : null;
  return {
    id,
    ordinal: positiveNumber(value.ordinal, 1),
    predecessorTestamentId:
      typeof value.predecessorTestamentId === "string"
        ? boundedText(value.predecessorTestamentId, "") || null
        : null,
    successorRelationship: relationship,
  };
};

export const normalizeClosedTestamentHistory = (
  value: unknown,
): ClosedTestamentSummary[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const closed: ClosedTestamentSummary[] = [];
  for (const candidate of value) {
    const summary = normalizedClosedTestament(candidate);
    if (!summary || seen.has(summary.testamentId)) continue;
    seen.add(summary.testamentId);
    closed.push(summary);
  }
  return closed.sort((left, right) => left.ordinal - right.ordinal);
};

export const normalizeCampaignContinuity = (
  value: unknown,
  run: RunState,
  hasTerminalEnding: boolean,
): CampaignContinuityState => {
  const fallback = createCampaignContinuity(run.seed);
  if (!isRecord(value)) return fallback;

  const seed = normalizeSeed(
    typeof value.seed === "number" ? value.seed : run.seed,
  );
  const id = boundedText(value.id, campaignIdFor(seed));
  const closedTestaments = normalizeClosedTestamentHistory(
    value.closedTestaments,
  );
  const greatestOrdinal = closedTestaments.reduce(
    (greatest, summary) => Math.max(greatest, summary.ordinal),
    0,
  );
  const savedActive = normalizedActiveTestament(value.activeTestament);
  const missingTerminalRecord =
    hasTerminalEnding &&
    value.activeTestament === null &&
    closedTestaments.length === 0;
  const activeTestament = value.activeTestament === null
    ? hasTerminalEnding && !missingTerminalRecord
      ? null
      : {
          id: testamentIdFor(id, greatestOrdinal + 1),
          ordinal: greatestOrdinal + 1,
          predecessorTestamentId: closedTestaments.at(-1)?.testamentId ?? null,
          successorRelationship: null,
        }
    : savedActive ?? initialActiveTestament(id);
  const minimumNext = Math.max(
    greatestOrdinal,
    activeTestament?.ordinal ?? 0,
  ) + 1;

  return {
    id,
    seed,
    worldRevision: naturalNumber(value.worldRevision, 0),
    nextTestamentOrdinal: Math.max(
      minimumNext,
      positiveNumber(value.nextTestamentOrdinal, minimumNext),
    ),
    activeTestament,
    closedTestaments,
  };
};

const closedSummaryFor = (
  run: RunState,
  active: ActiveTestamentIdentity,
  reason: TestamentEndReason,
  worldRevision: number,
): ClosedTestamentSummary => ({
  testamentId: active.id,
  ordinal: active.ordinal,
  useName: run.player.name,
  sex: run.player.sex,
  tradition: run.player.tradition,
  practiceName: PRACTICE_DEFINITIONS[run.player.tradition].name,
  endReason: reason,
  level: run.player.level,
  experience: run.player.xp,
  battlesWon: run.battlesWon,
  finalHealth: Math.max(0, run.player.hp),
  maximumHealth: run.player.maxHp,
  worldRevision,
  successor: null,
});

/**
 * Synchronize the additive campaign record at a transition or load boundary.
 * The caller already owns the mutable transition state.
 */
export const synchronizeCampaignContinuity = (
  state: GameState,
): void => {
  const run = state.run;
  if (!run) {
    state.campaign ??= null;
    return;
  }
  const reason = testamentEndReasonFor(state);
  const campaign = normalizeCampaignContinuity(
    state.campaign,
    run,
    Boolean(reason),
  );
  state.campaign = campaign;
  if (!reason) return;

  const active = campaign.activeTestament;
  if (!active) return;
  if (
    !campaign.closedTestaments.some(
      (summary) => summary.testamentId === active.id,
    )
  ) {
    campaign.closedTestaments.push(
      closedSummaryFor(run, active, reason, campaign.worldRevision),
    );
    campaign.closedTestaments.sort(
      (left, right) => left.ordinal - right.ordinal,
    );
  }
  campaign.activeTestament = null;
  campaign.nextTestamentOrdinal = Math.max(
    campaign.nextTestamentOrdinal,
    active.ordinal + 1,
  );
};
