import { BODY_PARTS } from "../anatomy";
import { isAdvancementId } from "../advancements";
import { ATTRIBUTE_IDS, MUNDANE_SKILL_IDS } from "../character";
import { STORY_SCENES, TRADITIONS } from "../content";
import { WAKE_VARIANTS } from "../encounters";
import {
  ECONOMY_MARKET_IDS,
  ECONOMY_SERVICE_IDS,
  MAX_PERSISTED_MARKET_ACTIVITY,
} from "../economy-state";
import { EQUIPMENT_SLOTS, ITEMS } from "../items";
import { ROAD_EVENTS } from "../road-events";
import { validateBonebinderPracticeState } from "../content-packs/bonebinder-runtime";
import {
  validateGraveWardenBattleState,
  validateGraveWardenPracticeState,
} from "../content-packs/grave-warden-runtime";
import {
  WORLD_FACTION_IDS,
  WORLD_RELATION_IDS,
} from "../world/actor-identifiers";
import { WORLD_FACT_IDS } from "../world/fact-identifiers";
import type {
  BattleState,
  CharacterSex,
  Combatant,
  EncounterId,
  GameState,
  Player,
  RoadEventId,
  Scar,
  ScreenId,
  StatusEffect,
  StoryId,
  TraditionId,
  WakeVariantId,
  WorldFactId,
  WorldRelationId,
} from "../types";
import { isCombatantArchetypeId } from "../combatants/archetypes";
import { isCombatantFormId } from "../combatants/forms";
import { isCombatantIdentityProfileId } from "../combatants/identity-profiles";
import { isEnemyCadenceId } from "../enemy-actions/cadences";
import { RESUMABLE_SCREENS, SAVE_SCHEMA_VERSION } from "./schema";

export const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPackStates = (value: unknown): boolean =>
  value === undefined ||
  (isRecord(value) &&
    Object.entries(value).every(
      ([id, envelope]) =>
        id.includes(":") &&
        isRecord(envelope) &&
        Number.isSafeInteger(envelope.version) &&
        (envelope.version as number) >= 1 &&
        Object.hasOwn(envelope, "value"),
    ));

export const numberOr = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) ? value : fallback;

export const stringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

export const isTradition = (value: unknown): value is TraditionId =>
  typeof value === "string" && Object.hasOwn(TRADITIONS, value);

export const isCharacterSex = (
  value: unknown,
): value is CharacterSex =>
  value === "male" || value === "female" || value === "other";

export const isStoryId = (value: unknown): value is StoryId =>
  typeof value === "string" && Object.hasOwn(STORY_SCENES, value);

export const isEncounterId = (
  value: unknown,
): value is EncounterId =>
  value === "ossuary-road" ||
  value === "saint-orra" ||
  value === "black-mile-wake";

export const isWakeVariantId = (
  value: unknown,
): value is WakeVariantId =>
  typeof value === "string" && Object.hasOwn(WAKE_VARIANTS, value);

export const isRoadEventId = (
  value: unknown,
): value is RoadEventId =>
  typeof value === "string" && Object.hasOwn(ROAD_EVENTS, value);

const isItemId = (value: unknown): value is keyof typeof ITEMS =>
  typeof value === "string" && Object.hasOwn(ITEMS, value);

export const isStatus = (
  value: unknown,
): value is StatusEffect =>
  isRecord(value) &&
  (value.id === "bleeding" ||
    value.id === "burning" ||
    value.id === "exposed" ||
    value.id === "forewarned") &&
  isFiniteNumber(value.turns) &&
  isFiniteNumber(value.potency) &&
  (value.preventsHealthRecovery === undefined ||
    typeof value.preventsHealthRecovery === "boolean");

const isAdvancementReadiness = (value: unknown): boolean =>
  isRecord(value) &&
  Array.isArray(value.practice) &&
  value.practice.every((id) => typeof id === "string") &&
  Array.isArray(value.universal) &&
  value.universal.every((id) => typeof id === "string");

const isWound = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.part === "string" &&
  BODY_PARTS.some((definition) => definition.id === value.part) &&
  (value.severity === "minor" ||
    value.severity === "serious" ||
    value.severity === "grievous") &&
  typeof value.label === "string" &&
  isFiniteNumber(value.bleed) &&
  (value.care === undefined ||
    value.care === "binding" ||
    value.care === "rest") &&
  typeof value.treated === "boolean" &&
  typeof value.source === "string" &&
  (value.combatPenaltyReduction === undefined ||
    isFiniteNumber(value.combatPenaltyReduction)) &&
  (value.combatPenaltyReductionTurns === undefined ||
    isFiniteNumber(value.combatPenaltyReductionTurns)) &&
  (value.recoveryBurden === undefined ||
    isFiniteNumber(value.recoveryBurden));

export const isScar = (value: unknown): value is Scar =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.part === "string" &&
  BODY_PARTS.some((definition) => definition.id === value.part) &&
  typeof value.label === "string" &&
  typeof value.source === "string" &&
  isFiniteNumber(value.conditionPenalty) &&
  value.conditionPenalty >= 0;

const isBody = (value: unknown): boolean =>
  isRecord(value) &&
  BODY_PARTS.every((definition) => {
    const part = value[definition.id];
    return (
      isRecord(part) &&
      part.id === definition.id &&
      isFiniteNumber(part.condition) &&
      isFiniteNumber(part.maxCondition) &&
      Array.isArray(part.wounds) &&
      part.wounds.every(
        (wound) =>
          isWound(wound) &&
          isRecord(wound) &&
          wound.part === definition.id,
      )
    );
  });

const isInventory = (value: unknown): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([itemId, quantity]) =>
      isItemId(itemId) &&
      isFiniteNumber(quantity) &&
      Number.isInteger(quantity) &&
      quantity > 0,
  );

const isPositiveIntegerRecord = (
  value: unknown,
  acceptsId: (id: string) => boolean,
): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([id, count]) =>
      acceptsId(id) &&
      isFiniteNumber(count) &&
      Number.isSafeInteger(count) &&
      count > 0 &&
      count <= MAX_PERSISTED_MARKET_ACTIVITY,
  );

const isEconomyState = (value: unknown): boolean =>
  isRecord(value) &&
  isRecord(value.markets) &&
  Object.entries(value.markets).every(
    ([marketId, activity]) =>
      ECONOMY_MARKET_IDS.includes(
        marketId as (typeof ECONOMY_MARKET_IDS)[number],
      ) &&
      isRecord(activity) &&
      isPositiveIntegerRecord(activity.purchases, (id) =>
        isItemId(id),
      ) &&
      isPositiveIntegerRecord(activity.services, (id) =>
        ECONOMY_SERVICE_IDS.includes(
          id as (typeof ECONOMY_SERVICE_IDS)[number],
        ),
      ),
  );

const isEquipment = (value: unknown): boolean =>
  isRecord(value) &&
  EQUIPMENT_SLOTS.every((slot) => {
    const itemId = value[slot];
    return (
      itemId === null ||
      (isItemId(itemId) &&
        Boolean(ITEMS[itemId].allowedSlots?.includes(slot)))
    );
  });

const isNaturalArmor = (value: unknown): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([partId, armor]) =>
      BODY_PARTS.some((definition) => definition.id === partId) &&
      isFiniteNumber(armor) &&
      armor >= 0,
  );

const isAttributes = (value: unknown): boolean =>
  isRecord(value) &&
  ATTRIBUTE_IDS.every((id) => isFiniteNumber(value[id]));

const isSkills = (value: unknown): boolean =>
  isRecord(value) &&
  MUNDANE_SKILL_IDS.every((id) => isFiniteNumber(value[id]));

export const isWorldFact = (
  value: unknown,
): value is WorldFactId =>
  typeof value === "string" &&
  WORLD_FACT_IDS.includes(value as WorldFactId);

const isWorldRelationId = (value: unknown): boolean =>
  typeof value === "string" &&
  WORLD_RELATION_IDS.includes(value as WorldRelationId);

const isWorldBelief = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldRelationId(value.holderId) &&
  isWorldFact(value.factId) &&
  (value.certainty === "rumor" ||
    value.certainty === "credible" ||
    value.certainty === "accepted") &&
  Array.isArray(value.basisEvidenceIds) &&
  value.basisEvidenceIds.every(
    (evidenceId) => typeof evidenceId === "string",
  );

const isWorldEvidence = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldFact(value.factId) &&
  (value.kind === "witness" ||
    value.kind === "body" ||
    value.kind === "object" ||
    value.kind === "record" ||
    value.kind === "occult-trace") &&
  (value.custodianId === null ||
    isWorldRelationId(value.custodianId)) &&
  (value.strength === 1 ||
    value.strength === 2 ||
    value.strength === 3) &&
  (value.provenanceId === null ||
    typeof value.provenanceId === "string");

const isWorldCustodyEntry = (value: unknown): boolean =>
  isRecord(value) &&
  isWorldRelationId(value.custodianId) &&
  (value.basis === "claim" ||
    value.basis === "law" ||
    value.basis === "permission" ||
    value.basis === "possession") &&
  (value.status === "current" ||
    value.status === "transferred" ||
    value.status === "lost") &&
  (value.originFactId === null ||
    isWorldFact(value.originFactId));

const isWorldProvenance = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.subjectId === "string" &&
  (value.subjectKind === "person" ||
    value.subjectKind === "body" ||
    value.subjectKind === "item" ||
    value.subjectKind === "place" ||
    value.subjectKind === "record") &&
  (value.originFactId === null ||
    isWorldFact(value.originFactId)) &&
  Array.isArray(value.claimantIds) &&
  value.claimantIds.every(isWorldRelationId) &&
  Array.isArray(value.custody) &&
  value.custody.every(isWorldCustodyEntry) &&
  Array.isArray(value.tags) &&
  value.tags.every((tag) => typeof tag === "string");

const isWorldClaim = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldRelationId(value.claimantId) &&
  typeof value.subjectId === "string" &&
  (value.kind === "ownership" ||
    value.kind === "custody" ||
    value.kind === "authority" ||
    value.kind === "identity") &&
  (value.status === "asserted" ||
    value.status === "recognized" ||
    value.status === "disputed" ||
    value.status === "released") &&
  Array.isArray(value.basisFactIds) &&
  value.basisFactIds.every(isWorldFact);

const isWorldRelationship = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isWorldRelationId(value.fromId) &&
  isWorldRelationId(value.toId) &&
  (value.kind === "membership" ||
    value.kind === "employment" ||
    value.kind === "kinship" ||
    value.kind === "custody" ||
    value.kind === "obligation") &&
  (value.status === "active" ||
    value.status === "strained" ||
    value.status === "ended") &&
  (value.originFactId === null ||
    isWorldFact(value.originFactId));

const isWorldPressure = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.scopeId === "string" &&
  isFiniteNumber(value.intensity) &&
  Array.isArray(value.stakeholderIds) &&
  value.stakeholderIds.every(isWorldRelationId) &&
  Array.isArray(value.sourceFactIds) &&
  value.sourceFactIds.every(isWorldFact) &&
  (value.status === "active" || value.status === "resolved");

const isWorldState = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const {
    pressures,
    standing,
    facts,
    playerKnowledge,
    knowledge,
    beliefs,
    evidence,
    provenance,
    claims,
    relationships,
    activePressures,
  } = value;

  return (
    isRecord(pressures) &&
    isFiniteNumber(pressures.escapedNames) &&
    isFiniteNumber(pressures.countyNotice) &&
    isRecord(standing) &&
    WORLD_RELATION_IDS.every(
      (id) =>
        standing[id] === undefined ||
        isFiniteNumber(standing[id]),
    ) &&
    Array.isArray(facts) &&
    facts.every(isWorldFact) &&
    (playerKnowledge === undefined ||
      (Array.isArray(playerKnowledge) &&
        playerKnowledge.every(isWorldFact))) &&
    isRecord(knowledge) &&
    WORLD_FACTION_IDS.every((id) => {
      const knownFacts = knowledge[id];
      return Array.isArray(knownFacts) && knownFacts.every(isWorldFact);
    }) &&
    (beliefs === undefined ||
      (Array.isArray(beliefs) && beliefs.every(isWorldBelief))) &&
    (evidence === undefined ||
      (Array.isArray(evidence) && evidence.every(isWorldEvidence))) &&
    (provenance === undefined ||
      (Array.isArray(provenance) &&
        provenance.every(isWorldProvenance))) &&
    (claims === undefined ||
      (Array.isArray(claims) && claims.every(isWorldClaim))) &&
    (relationships === undefined ||
      (Array.isArray(relationships) &&
        relationships.every(isWorldRelationship))) &&
    (activePressures === undefined ||
      (Array.isArray(activePressures) &&
        activePressures.every(isWorldPressure)))
  );
};

const isVitalParts = (value: unknown): boolean =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every(
      (part) =>
        typeof part === "string" &&
        BODY_PARTS.some((definition) => definition.id === part),
    ));

const isBodyDamageModifiers = (value: unknown): boolean =>
  value === undefined ||
  (isRecord(value) &&
    (value.physical === undefined ||
      (isFiniteNumber(value.physical) && value.physical >= 0)) &&
    (value.occult === undefined ||
      (isFiniteNumber(value.occult) && value.occult >= 0)));

export const isCombatant = (
  value: unknown,
): value is Combatant =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.title === "string" &&
  (value.formId === undefined || isCombatantFormId(value.formId)) &&
  (value.archetypeId === undefined ||
    isCombatantArchetypeId(value.archetypeId)) &&
  (value.identityProfileId === undefined ||
    isCombatantIdentityProfileId(value.identityProfileId)) &&
  (value.cadenceId === undefined || isEnemyCadenceId(value.cadenceId)) &&
  (value.anatomy === undefined ||
    value.anatomy === "humanoid" ||
    value.anatomy === "quadruped" ||
    value.anatomy === "manifestation") &&
  (value.materiality === undefined ||
    value.materiality === "corporeal" ||
    value.materiality === "incorporeal") &&
  (value.materialityLabel === undefined ||
    typeof value.materialityLabel === "string") &&
  (value.kind === "player" ||
    value.kind === "enemy" ||
    value.kind === "ally") &&
  isFiniteNumber(value.hp) &&
  isFiniteNumber(value.maxHp) &&
  isFiniteNumber(value.attack) &&
  isFiniteNumber(value.defense) &&
  isFiniteNumber(value.ward) &&
  Array.isArray(value.statuses) &&
  value.statuses.every(isStatus) &&
  isBody(value.body) &&
  isNaturalArmor(value.naturalArmor) &&
  (value.naturalArmorLabel === undefined ||
    typeof value.naturalArmorLabel === "string") &&
  isVitalParts(value.vitalParts) &&
  isBodyDamageModifiers(value.bodyDamageModifiers);

const isPlayer = (value: unknown): value is Player => {
  if (!isRecord(value) || !isCombatant(value)) return false;
  return (
    value.kind === "player" &&
    (value.sex === undefined || isCharacterSex(value.sex)) &&
    isTradition(value.tradition) &&
    isFiniteNumber(value.level) &&
    isFiniteNumber(value.xp) &&
    (value.obols === undefined || isFiniteNumber(value.obols)) &&
    (value.advancements === undefined ||
      (Array.isArray(value.advancements) &&
        value.advancements.every(isAdvancementId))) &&
    (value.advancementReadiness === undefined ||
      isAdvancementReadiness(value.advancementReadiness)) &&
    (value.scars === undefined ||
      (Array.isArray(value.scars) && value.scars.every(isScar))) &&
    isAttributes(value.attributes) &&
    isSkills(value.skills) &&
    isFiniteNumber(value.spirit) &&
    isFiniteNumber(value.maxSpirit) &&
    isInventory(value.inventory) &&
    isEquipment(value.equipment)
  );
};

const isLogEntry = (value: unknown): boolean =>
  isRecord(value) &&
  isFiniteNumber(value.id) &&
  isFiniteNumber(value.round) &&
  typeof value.text === "string" &&
  (value.tone === "system" ||
    value.tone === "player" ||
    value.tone === "enemy" ||
    value.tone === "reward");

const isBattle = (value: unknown): value is BattleState =>
  isRecord(value) &&
  (value.encounterId === undefined ||
    isEncounterId(value.encounterId)) &&
  (value.variantId === undefined ||
    value.variantId === null ||
    isWakeVariantId(value.variantId)) &&
  isFiniteNumber(value.round) &&
  isFiniteNumber(value.seed) &&
  isFiniteNumber(value.nextWoundId) &&
  Array.isArray(value.enemies) &&
  value.enemies.every(isCombatant) &&
  Array.isArray(value.allies) &&
  value.allies.every(
    (ally) =>
      isCombatant(ally) &&
      isRecord(ally) &&
      ((isRecord(ally.lifetime) &&
        ally.lifetime.kind === "temporary" &&
        isFiniteNumber(ally.lifetime.remainingTurns)) ||
        (isRecord(ally.lifetime) &&
          ally.lifetime.kind === "persistent" &&
          typeof ally.lifetime.servantId === "string") ||
        isFiniteNumber(ally.remainingTurns)),
  ) &&
  Array.isArray(value.log) &&
  value.log.every(isLogEntry) &&
  (value.practiceStates === undefined ||
    isRecord(value.practiceStates) &&
      validateGraveWardenBattleState(value.practiceStates.graveWarden)) &&
  (value.outcome === null ||
    value.outcome === "victory" ||
    value.outcome === "defeat" ||
    value.outcome === "fled");

export const isResumableState = (
  value: unknown,
): value is GameState => {
  if (!isRecord(value) || value.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return false;
  }
  if (
    typeof value.screen !== "string" ||
    !RESUMABLE_SCREENS.has(value.screen as ScreenId)
  ) {
    return false;
  }
  if (!isRecord(value.run) || !isRecord(value.run.player)) return false;
  if (
    value.campaign !== undefined &&
    value.campaign !== null &&
    !isRecord(value.campaign)
  ) {
    return false;
  }

  const run = value.run;
  if (
    !isPlayer(run.player) ||
    !isFiniteNumber(run.seed) ||
    !isFiniteNumber(run.battlesWon) ||
    !isWorldState(run.world) ||
    !(run.economy === undefined || isEconomyState(run.economy)) ||
    !Array.isArray(run.flags) ||
    !run.flags.every((flag) => typeof flag === "string") ||
    !isPackStates(run.packStates) ||
    !(
      run.wakeVariant === undefined ||
      run.wakeVariant === null ||
      isWakeVariantId(run.wakeVariant)
    ) ||
    !(
      run.roadEvent === undefined ||
      run.roadEvent === null ||
      isRoadEventId(run.roadEvent)
    ) ||
    !(
      run.seenRoadEvents === undefined ||
      (Array.isArray(run.seenRoadEvents) &&
        run.seenRoadEvents.every(isRoadEventId))
    ) ||
    !(
      run.practiceStates === undefined ||
      (isRecord(run.practiceStates) &&
        (run.practiceStates.bonebinder === undefined ||
          validateBonebinderPracticeState(
            run.practiceStates.bonebinder,
          )) &&
        validateGraveWardenPracticeState(
          run.practiceStates.graveWarden,
        ))
    )
  ) {
    return false;
  }

  const battle = run.battle;
  if (battle !== null && !isBattle(battle)) return false;
  if (value.screen === "battle" && battle === null) return false;
  if (value.screen === "story" && !isStoryId(value.storyId)) return false;
  if (
    value.screen === "ending" &&
    value.ending !== "victory" &&
    value.ending !== "defeat" &&
    value.ending !== "fled"
  ) {
    return false;
  }

  const validInventoryReturn =
    value.inventoryReturnScreen === null ||
    value.inventoryReturnScreen === "story" ||
    value.inventoryReturnScreen === "ending";
  const validJournalReturn =
    value.journalReturnScreen === undefined ||
    value.journalReturnScreen === null ||
    value.journalReturnScreen === "story" ||
    value.journalReturnScreen === "battle" ||
    value.journalReturnScreen === "ending";
  return validInventoryReturn && validJournalReturn;
};
