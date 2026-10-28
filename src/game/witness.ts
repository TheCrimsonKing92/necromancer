import { BODY_PARTS, getBodyPartLabel } from "./anatomy";
import { combatActionHitText } from "./combat-action-narration";
import { statusDisplayName } from "./statuses";
import type {
  BattleLogEntry,
  BattleState,
  LogTone,
  StatusId,
  WitnessEvent,
  WitnessSegment,
} from "./types";

type DamageSegment = Extract<
  WitnessSegment,
  { type: "damage" }
>;
type MissSegment = Extract<WitnessSegment, { type: "miss" }>;
type TransitionSegment = Extract<
  WitnessSegment,
  { type: "transition" }
>;
type StatusSegment = Extract<
  WitnessSegment,
  { type: "status" }
>;
type HealthLossSegment = Extract<
  WitnessSegment,
  { type: "health-loss" }
>;
type RewardSegment = Extract<
  WitnessSegment,
  { type: "reward" }
>;

export const MAX_PERSISTED_WITNESS_ENTRIES = 80;

const sentence = (text: string): string => {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const capitalizedSentence = (text: string): string => {
  const complete = sentence(text);
  return complete.length > 0
    ? `${complete[0]!.toUpperCase()}${complete.slice(1)}`
    : complete;
};

const formatStatus = (
  status: StatusId,
  potency: number,
  turns: number,
): string => {
  const duration = `${turns} ${turns === 1 ? "round" : "rounds"}`;
  const consequence =
    status === "exposed"
      ? ` (-${potency} Defense and Evasion)`
      : status === "forewarned"
        ? ` (+${potency}% Accuracy and Evasion)`
        : "";
  return `${statusDisplayName(status)} ${potency} for ${duration}${consequence}`;
};

const formatList = (items: string[]): string => {
  if (items.length === 0) return "nothing";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
};

const formatDamage = (segment: DamageSegment): string => {
  const location = (
    segment.locationLabel ?? getBodyPartLabel(segment.location)
  ).toLowerCase();
  const ownedLocation = `${segment.targetPossessive ?? "the"} ${location}`;
  const authoredLead =
    segment.actionLead?.trim() ??
    (segment.action
      ? combatActionHitText({
          action: segment.action,
          actor: segment.actor,
          target: segment.target,
        })
      : undefined);
  const approach =
    authoredLead ??
    `${segment.actor} ${segment.verb ?? "strikes"}`;
  const contact =
    authoredLead ??
    (segment.action
      ? `${approach}, striking ${segment.target}`
      : `${approach} ${segment.target}`);
  const attackSetup = segment.attackDetail
    ? `${sentence(contact)} ${sentence(segment.attackDetail)}`
    : undefined;

  const resistanceAbsorbed = segment.resistanceAbsorbed ?? 0;

  if (
    segment.damage === 0 &&
    segment.wardAbsorbed > 0 &&
    resistanceAbsorbed === 0 &&
    segment.armorAbsorbed === 0
  ) {
    if (attackSetup) {
      return `${attackSetup} ${segment.wardAbsorbed} Ward turns the committed attack aside completely before it reaches ${ownedLocation}.`;
    }
    return `${authoredLead ? contact : `${approach} against ${segment.target}`}, but ${segment.wardAbsorbed} Ward turns the blow aside completely before it reaches ${ownedLocation}.`;
  }

  const wound = segment.woundLabel
    ? ` ${segment.target} suffers ${segment.woundLabel.toLowerCase()}.`
    : "";

  if (
    segment.wardAbsorbed > 0 ||
    resistanceAbsorbed > 0 ||
    segment.armorAbsorbed > 0
  ) {
    const mitigatedLead =
      attackSetup ??
      (authoredLead
        ? contact
        : `${approach} against ${segment.target}`);
    const ward =
      segment.wardAbsorbed > 0
        ? `${segment.wardAbsorbed} Ward absorbs part of the blow. `
        : "";
    const armor =
      segment.armorAbsorbed > 0
        ? `${segment.protectionLabel ?? "Armor"} turns ${segment.armorAbsorbed} damage. `
        : "";
    const resistance =
      resistanceAbsorbed > 0
        ? `${segment.resistanceLabel ?? "The incorporeal form"} lets ${resistanceAbsorbed} damage pass through harmlessly. `
        : "";
    const mitigatedOpening = attackSetup
      ? `${attackSetup} `
      : `${mitigatedLead}. `;
    if (segment.damage === 0) {
      return `${mitigatedOpening}${ward}${resistance}${armor}Nothing reaches ${ownedLocation}.`;
    }
    return `${mitigatedOpening}${ward}${resistance}${armor}The remainder strikes ${ownedLocation} for ${segment.damage} damage.${wound}`;
  }

  if (attackSetup) {
    return `${attackSetup} The committed attack deals ${segment.damage} damage to ${ownedLocation}.${wound}`;
  }

  return authoredLead
    ? `${contact}, dealing ${segment.damage} damage to ${ownedLocation}.${wound}`
    : `${contact} in ${ownedLocation} for ${segment.damage} damage.${wound}`;
};

const formatMiss = (segment: MissSegment): string =>
  capitalizedSentence(segment.text);

const formatTransition = (segment: TransitionSegment): string =>
  capitalizedSentence(segment.text);

const formatStatusSegment = (segment: StatusSegment): string => {
  const lead = segment.lead ? `${segment.lead.trim()} ` : "";
  const verb =
    segment.status === "forewarned" ? "gains" : "suffers";
  return `${lead}${segment.target} ${verb} ${formatStatus(segment.status, segment.potency, segment.turns)}.`;
};

const formatHealthLoss = (
  segment: HealthLossSegment,
): string => {
  switch (segment.cause) {
    case "burning":
      return `${segment.target} burns for ${segment.amount} damage.`;
    case "bleeding":
      return `${segment.target} bleeds for ${segment.amount} damage.`;
    case "untreated-wounds":
      return `${segment.target} loses ${segment.amount} Health to untreated wounds.`;
    case "lingering-trauma":
      return `${segment.target} loses ${segment.amount} Health to lingering combat trauma before the danger passes.`;
  }
};

const formatReward = (segment: RewardSegment): string => {
  const level = segment.levelReached
    ? ` You reach level ${segment.levelReached}.`
    : "";
  return `${sentence(segment.opening)} You gain ${segment.experience} experience and ${segment.lootVerb} ${formatList(segment.loot)}.${level}`;
};

const formatSegment = (segment: WitnessSegment): string => {
  switch (segment.type) {
    case "text":
      return sentence(segment.text);
    case "damage":
      return formatDamage(segment);
    case "miss":
      return formatMiss(segment);
    case "transition":
      return formatTransition(segment);
    case "status":
      return formatStatusSegment(segment);
    case "health-loss":
      return formatHealthLoss(segment);
    case "reward":
      return formatReward(segment);
    case "skill":
      return capitalizedSentence(segment.effect);
  }
};

export const formatWitnessEvent = (
  event: WitnessEvent,
): string => event.segments.map(formatSegment).join(" ");

export const witnessMessage = (
  tone: LogTone,
  text: string,
): WitnessEvent => ({
  tone,
  segments: [{ type: "text", text }],
});

export const witnessDamage = (
  tone: LogTone,
  damage: Omit<DamageSegment, "type">,
  followUp: WitnessSegment[] = [],
): WitnessEvent => ({
  tone,
  segments: [{ type: "damage", ...damage }, ...followUp],
});

export const witnessMiss = (
  tone: LogTone,
  miss: Omit<MissSegment, "type">,
  followUp: WitnessSegment[] = [],
): WitnessEvent => ({
  tone,
  segments: [{ type: "miss", ...miss }, ...followUp],
});

export const witnessStatus = (
  tone: LogTone,
  status: Omit<StatusSegment, "type">,
): WitnessEvent => ({
  tone,
  segments: [{ type: "status", ...status }],
});

export const witnessHealthLoss = (
  tone: LogTone,
  loss: Omit<HealthLossSegment, "type">,
): WitnessEvent => ({
  tone,
  segments: [{ type: "health-loss", ...loss }],
});

export const witnessReward = (
  reward: Omit<RewardSegment, "type">,
): WitnessEvent => ({
  tone: "reward",
  segments: [{ type: "reward", ...reward }],
});

export const createWitnessEntry = (
  id: number,
  round: number,
  event: WitnessEvent,
): BattleLogEntry => ({
  id,
  round,
  tone: event.tone,
  text: formatWitnessEvent(event),
  event,
});

export const appendWitness = (
  battle: BattleState,
  event: WitnessEvent,
): void => {
  const nextId = (battle.log.at(-1)?.id ?? 0) + 1;
  battle.log.push(
    createWitnessEntry(
      nextId,
      battle.round,
      event,
    ),
  );

  const excess =
    battle.log.length - MAX_PERSISTED_WITNESS_ENTRIES;
  if (excess > 0) battle.log.splice(0, excess);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWitnessSegment = (value: unknown): value is WitnessSegment => {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "text":
      return typeof value.text === "string";
    case "damage":
      return (
        typeof value.actor === "string" &&
        (value.action === undefined || typeof value.action === "string") &&
        (value.actionLead === undefined ||
          typeof value.actionLead === "string") &&
        (value.attackDetail === undefined ||
          typeof value.attackDetail === "string") &&
        (value.verb === undefined || typeof value.verb === "string") &&
        typeof value.target === "string" &&
        (value.targetPossessive === undefined ||
          typeof value.targetPossessive === "string") &&
        typeof value.location === "string" &&
        BODY_PARTS.some((part) => part.id === value.location) &&
        (value.locationLabel === undefined ||
          typeof value.locationLabel === "string") &&
        typeof value.damage === "number" &&
        typeof value.wardAbsorbed === "number" &&
        typeof value.armorAbsorbed === "number" &&
        (value.resistanceAbsorbed === undefined ||
          typeof value.resistanceAbsorbed === "number") &&
        (value.protectionLabel === undefined ||
          typeof value.protectionLabel === "string") &&
        (value.resistanceLabel === undefined ||
          typeof value.resistanceLabel === "string") &&
        (value.woundLabel === undefined ||
          typeof value.woundLabel === "string")
      );
    case "miss":
      return (
        typeof value.actor === "string" &&
        typeof value.action === "string" &&
        typeof value.target === "string" &&
        typeof value.text === "string" &&
        typeof value.chance === "number" &&
        typeof value.roll === "number"
      );
    case "transition":
      return (
        typeof value.entity === "string" &&
        value.transition === "defeated" &&
        (value.cause === "health" ||
          value.cause === "vital-region") &&
        typeof value.text === "string"
      );
    case "status":
      return (
        (value.lead === undefined || typeof value.lead === "string") &&
        typeof value.target === "string" &&
        (value.status === "bleeding" ||
          value.status === "burning" ||
          value.status === "exposed" ||
          value.status === "forewarned") &&
        typeof value.potency === "number" &&
        typeof value.turns === "number"
      );
    case "health-loss":
      return (
        typeof value.target === "string" &&
        typeof value.amount === "number" &&
        (value.cause === "burning" ||
          value.cause === "bleeding" ||
          value.cause === "untreated-wounds" ||
          value.cause === "lingering-trauma")
      );
    case "reward":
      return (
        typeof value.opening === "string" &&
        typeof value.experience === "number" &&
        (value.lootVerb === "take" || value.lootVerb === "salvage") &&
        Array.isArray(value.loot) &&
        value.loot.every((item) => typeof item === "string") &&
        (value.levelReached === undefined ||
          typeof value.levelReached === "number")
      );
    case "skill":
      return (
        typeof value.skill === "string" &&
        typeof value.effect === "string"
      );
    default:
      return false;
  }
};

export const isWitnessEvent = (
  value: unknown,
): value is WitnessEvent =>
  isRecord(value) &&
  (value.tone === "system" ||
    value.tone === "player" ||
    value.tone === "enemy" ||
    value.tone === "reward") &&
  Array.isArray(value.segments) &&
  value.segments.length > 0 &&
  value.segments.every(isWitnessSegment);

export const witnessPresentation = (
  entry: BattleLogEntry,
): { tone: LogTone; text: string } => {
  if (isWitnessEvent(entry.event)) {
    return {
      tone: entry.event.tone,
      text: formatWitnessEvent(entry.event),
    };
  }

  return {
    tone: entry.tone,
    text: entry.text,
  };
};
