import {
  WORLD_ACTORS,
  WORLD_FACTIONS,
  WORLD_PRACTICE_IDS,
} from "./world/actors";
import {
  WORLD_FACTION_IDS,
  WORLD_RELATION_IDS,
} from "./world/actor-identifiers";
import { WORLD_FACT_IDS } from "./world/fact-identifiers";
import { WORLD_FACTS } from "./world/facts";
import {
  createWorldState,
} from "./world/state";

export {
  roadsideRenderingWitnessChance,
  roadsideRenderingYieldChance,
  rollRoadsideRendering,
  wakeVariantPoolForWorld,
  type RenderingYield,
  type RoadsideRenderingResult,
} from "./world/north-vey-rules";

export type {
  PracticeAttitude,
  PracticeAttitudePosture,
  PracticeConcern,
  WorldActorDefinition,
  WorldFactionDefinition,
  WorldPersonDefinition,
  WorldPracticeId,
} from "./world/actors";
export {
  WORLD_ACTORS,
  WORLD_FACTIONS,
  WORLD_PEOPLE,
  WORLD_PRACTICE_IDS,
  practiceAttitudeFor,
} from "./world/actors";
export {
  WORLD_FACTION_IDS,
  WORLD_PERSON_IDS,
  WORLD_RELATION_IDS,
  isWorldRelationId,
} from "./world/actor-identifiers";
export {
  WORLD_FACTS,
  type WorldFactDefinition,
} from "./world/facts";
export { WORLD_FACT_IDS, isWorldFactId } from "./world/fact-identifiers";
export {
  activeWorldPressures,
  actorBelievesFact,
  adjustWorldPressure,
  adjustWorldStanding,
  beliefsHeldBy,
  claimsForSubject,
  createWorldState,
  currentCustodianOf,
  evidenceForFact,
  factionKnows,
  learnWorldFact,
  normalizeWorldState,
  playerKnows,
  recordWorldBelief,
  recordWorldClaim,
  recordWorldEvidence,
  recordWorldFact,
  recordWorldProvenance,
  recordWorldRelationship,
  reportFactWithEvidence,
  relationshipsFor,
  revealWorldFact,
  transferWorldCustody,
  worldHasFact,
} from "./world/state";
export {
  activeConcernEntriesFor,
  journalWorldReadModelFor,
  knownActorEntriesFor,
  knownClaimEntriesFor,
  knownCustodyEntriesFor,
  knownEvidenceEntriesFor,
  knownRelationshipEntriesFor,
  type JournalWorldEntry,
  type JournalWorldReadModel,
} from "./world/read-model";

export interface WorldRegionDefinition {
  id: "north-vey";
  name: string;
  description: string;
  authority: string;
  burialCustom: string;
}

export const NORTH_VEY: WorldRegionDefinition = {
  id: "north-vey",
  name: "North Vey",
  description:
    "A wet county margin of tenant fields, exhausted limestone pits, and villages built beyond the reach of old graves. Burial carts share the worked roads with everyone else.",
  authority:
    "County reeves keep the roads, collect lawful tolls, move prisoners, and carry a magistrate’s orders farther than the magistrate will travel.",
  burialCustom:
    "A body remains under household claim until burial and under county protection while it is carried. Taking from it without leave is theft; opening it for occult work is desecration.",
};

export const WORLD_FOUNDATIONS = [
  "Magic is specialized labor. Aptitude is uncommon, training is narrower still, and necromancers are a minority among practitioners.",
  "Most dead do not speak, walk, or answer. The possibility that they might has shaped law, burial work, domestic custom, and road design.",
  "Wardcraft is more common than spellcraft. A person without occult aptitude can carry a prepared tally, keep a grave line intact, or recognize when one has failed.",
  "The dead are not ownerless. Household claim, burial custody, county law, and shrine privilege overlap; each can turn occult practice into service or crime.",
  "News moves by carts, kitchens, burial crews, and reeve posts. A deed may be unseen, witnessed, evidenced, reported, or deliberately concealed. These are not the same state.",
] as const;

export const validateWorldModel = (
  region: WorldRegionDefinition = NORTH_VEY,
): string[] => {
  const errors: string[] = [];
  if (
    !region.description.trim() ||
    !region.authority.trim() ||
    !region.burialCustom.trim()
  ) {
    errors.push("North Vey requires geography, authority, and burial custom.");
  }

  for (const id of WORLD_FACTION_IDS) {
    const faction = WORLD_FACTIONS[id];
    if (
      !faction.name.trim() ||
      !faction.reach.trim() ||
      !faction.viewOfNecromancy.trim() ||
      !faction.tolerates.trim() ||
      !faction.condemns.trim()
    ) {
      errors.push(`${id}: faction background is incomplete.`);
    }
    for (const practiceId of WORLD_PRACTICE_IDS) {
      const attitude = faction.practiceAttitudes[practiceId];
      if (
        !attitude ||
        attitude.concerns.length === 0 ||
        !attitude.explanation.trim()
      ) {
        errors.push(
          `${id}: ${practiceId} practice attitude is incomplete.`,
        );
      }
    }
  }
  for (const id of WORLD_RELATION_IDS) {
    const actor = WORLD_ACTORS[id];
    for (const practiceId of WORLD_PRACTICE_IDS) {
      if (!actor.practiceAttitudes[practiceId]) {
        errors.push(`${id}: ${practiceId} attitude is missing.`);
      }
    }
  }
  for (const id of WORLD_FACT_IDS) {
    if (
      !WORLD_FACTS[id].title.trim() ||
      !WORLD_FACTS[id].description.trim()
    ) {
      errors.push(`${id}: player-facing fact copy is incomplete.`);
    }
  }

  const initial = createWorldState();
  for (const id of WORLD_RELATION_IDS) {
    if (!Number.isFinite(initial.standing[id])) {
      errors.push(`${id}: initial standing is missing.`);
    }
  }
  for (const id of WORLD_FACTION_IDS) {
    if (!Array.isArray(initial.knowledge[id])) {
      errors.push(`${id}: initial faction knowledge is missing.`);
    }
  }
  if (!Array.isArray(initial.playerKnowledge)) {
    errors.push("Initial player knowledge is missing.");
  }
  if (initial.activePressures.length !== 2) {
    errors.push("Initial scoped pressure records are missing.");
  }

  return errors;
};
