import type {
  WorldFactionId,
  WorldPersonId,
  WorldRelationId,
} from "../types";

export {
  WORLD_FACTION_IDS,
  WORLD_PERSON_IDS,
  WORLD_RELATION_IDS,
  isWorldRelationId,
} from "./actor-identifiers";

export const WORLD_PRACTICE_IDS = [
  "medium",
  "bonebinder",
  "renderer",
  "grave-warden",
  "ferryman",
] as const;

export type WorldPracticeId = (typeof WORLD_PRACTICE_IDS)[number];

export type PracticeAttitudePosture =
  | "sought"
  | "welcomed"
  | "tolerated"
  | "restricted"
  | "refused"
  | "variable";

export type PracticeConcern =
  | "consent"
  | "testimony"
  | "occupation"
  | "body-claim"
  | "custody"
  | "provenance"
  | "public-safety"
  | "license"
  | "authority"
  | "kinship"
  | "burial-passage"
  | "continuity"
  | "trade-stability";

export interface PracticeAttitude {
  posture: PracticeAttitudePosture;
  concerns: PracticeConcern[];
  explanation: string;
}

export interface WorldFactionDefinition {
  id: WorldFactionId;
  actorKind: "faction";
  institutionKind:
    | "authority"
    | "labor-network"
    | "trade-network"
    | "community";
  name: string;
  reach: string;
  viewOfNecromancy: string;
  tolerates: string;
  condemns: string;
  practiceAttitudes: Record<WorldPracticeId, PracticeAttitude>;
}

export interface WorldPersonDefinition {
  id: WorldPersonId;
  actorKind: "person";
  name: string;
  role: string;
  affiliationIds: WorldFactionId[];
  practiceAttitudes: Record<WorldPracticeId, PracticeAttitude>;
}

export type WorldActorDefinition =
  | WorldFactionDefinition
  | WorldPersonDefinition;

const attitude = (
  posture: PracticeAttitudePosture,
  concerns: PracticeConcern[],
  explanation: string,
): PracticeAttitude => ({ posture, concerns, explanation });

export const WORLD_FACTIONS: Record<
  WorldFactionId,
  WorldFactionDefinition
> = {
  "county-reeves": {
    id: "county-reeves",
    actorKind: "faction",
    institutionKind: "authority",
    name: "County reeves",
    reach:
      "Tollhouses, road patrols, warrants, burial escorts, and informants among carriers and innkeepers.",
    viewOfNecromancy:
      "A rare and dangerous specialization. A reeve may accept its use under a magistrate, a household claim, or immediate necessity, but never assumes it is harmless.",
    tolerates:
      "Wardcraft, quieting a dangerous dead, examination ordered by law, and relic work whose ownership can be proved.",
    condemns:
      "Raising bodies without claim, cutting the recent dead for reagents, coercing testimony from a corpse, and occult violence on a public road.",
    practiceAttitudes: {
      medium: attitude(
        "restricted",
        ["consent", "testimony", "occupation"],
        "Testimony may be heard when authority and terms are clear; coerced or unverifiable speech is treated as danger, not proof.",
      ),
      bonebinder: attitude(
        "restricted",
        ["body-claim", "custody", "public-safety"],
        "A walking body requires a recognized claim, declared custody, and conduct that does not endanger the road.",
      ),
      renderer: attitude(
        "restricted",
        ["provenance", "license", "body-claim"],
        "Ordered examination and licensed materials are tolerated. Recent remains without leave are evidence of a crime.",
      ),
      "grave-warden": attitude(
        "welcomed",
        ["authority", "continuity", "public-safety"],
        "Reeves value intact seals and defensible boundaries, but still ask whose continuity a Warden is enforcing.",
      ),
      ferryman: attitude(
        "tolerated",
        ["burial-passage", "authority", "public-safety"],
        "Safe conduct is useful; unauthorized exile, return, or denial of passage can interfere with an order or a household claim.",
      ),
    },
  },
  "burial-crews": {
    id: "burial-crews",
    actorKind: "faction",
    institutionKind: "labor-network",
    name: "County burial crews",
    reach:
      "Gravediggers, corpse drivers, ditch crews, bell keepers, and the families who house them between routes.",
    viewOfNecromancy:
      "Practical knowledge does not make them trusting. They know that some dead must be handled by specialists and that specialists sometimes create the danger they are paid to end.",
    tolerates:
      "Work that protects a burial, settles a restless dead, or is requested by those who hold the body’s claim.",
    condemns:
      "Damage to a named body, interference with funeral passage, and any practice that leaves laborers to contain what the practitioner released.",
    practiceAttitudes: {
      medium: attitude(
        "tolerated",
        ["consent", "testimony", "occupation"],
        "A requested guest may settle a burial question. A Medium who cannot close the invitation becomes the crew’s problem.",
      ),
      bonebinder: attitude(
        "refused",
        ["body-claim", "custody", "burial-passage"],
        "Crews will not ordinarily carry a body that has been raised from their charge, even when another authority recognizes the work.",
      ),
      renderer: attitude(
        "restricted",
        ["body-claim", "provenance", "custody"],
        "Material may be surrendered after the burial claim is settled. Cutting first and asking later violates the work itself.",
      ),
      "grave-warden": attitude(
        "sought",
        ["continuity", "custody", "public-safety"],
        "Wardens can keep a line, cart, or grave intact long enough for ordinary workers to finish.",
      ),
      ferryman: attitude(
        "sought",
        ["burial-passage", "custody"],
        "A Ferryman who keeps the route clear serves the same passage by different means.",
      ),
    },
  },
  "reliquary-brokers": {
    id: "reliquary-brokers",
    actorKind: "faction",
    institutionKind: "trade-network",
    name: "Reliquary brokers",
    reach:
      "Licensed carts, guarded storehouses, apothecaries, shrine factors, and quiet buyers beyond the county rolls.",
    viewOfNecromancy:
      "Useful when disciplined, ruinous when public. Brokers value provenance because a profitable relic becomes contraband when its former owner is identified.",
    tolerates:
      "Salvage from hostile dead, sealed reagents, documented grave goods, and practitioners who do not bring a patrol to the cart.",
    condemns:
      "Unstable material, stolen household remains, conspicuous work, and any bargain that threatens the broker’s license.",
    practiceAttitudes: {
      medium: attitude(
        "tolerated",
        ["testimony", "trade-stability"],
        "A Medium can verify history, but an unrecordable witness is poor security for a disputed object.",
      ),
      bonebinder: attitude(
        "restricted",
        ["body-claim", "custody", "trade-stability"],
        "Persistent servants are acceptable only when their provenance cannot overturn the broker’s title to related goods.",
      ),
      renderer: attitude(
        "sought",
        ["provenance", "license", "trade-stability"],
        "Skilled Renderers make unstable material saleable. Brokers still refuse work whose origin threatens the license.",
      ),
      "grave-warden": attitude(
        "welcomed",
        ["continuity", "trade-stability"],
        "Reliable seals preserve stock and make custody legible during transport.",
      ),
      ferryman: attitude(
        "tolerated",
        ["burial-passage", "trade-stability"],
        "Brokers value clean removals and distrust any conducted return that can restore an old claimant.",
      ),
    },
  },
  "north-road-households": {
    id: "north-road-households",
    actorKind: "faction",
    institutionKind: "community",
    name: "North-road households",
    reach:
      "Farmsteads, mourning parties, village fires, carriers, roadside inns, and the memory that travels among them.",
    viewOfNecromancy:
      "No common judgment survives every village. Need, kinship, local saints, and old injury matter more than doctrine. Very few have met a necromancer before.",
    tolerates:
      "Whatever clearly protects a household, leaves the named dead at rest, and ends when the practitioner departs.",
    condemns:
      "Secret work near children or graves, command of a familiar corpse, and any use that treats the dead as ownerless material.",
    practiceAttitudes: {
      medium: attitude(
        "variable",
        ["consent", "testimony", "occupation"],
        "Some households request last words; others will not admit a body carrying an unfamiliar voice.",
      ),
      bonebinder: attitude(
        "variable",
        ["body-claim", "custody", "kinship"],
        "The same servant may be honored as returned kin, hired as dangerous labor, or recognized as a stolen body.",
      ),
      renderer: attitude(
        "variable",
        ["body-claim", "provenance", "public-safety"],
        "Animal matter and surrendered remains are judged differently from a neighbor opened beside the road.",
      ),
      "grave-warden": attitude(
        "variable",
        ["continuity", "authority"],
        "A seal can preserve refuge or enforce an old claim the present household rejects.",
      ),
      ferryman: attitude(
        "variable",
        ["burial-passage", "consent"],
        "Safe passage may be a blessing; an announced departure or denied return may be heard as a threat.",
      ),
    },
  },
};

export const WORLD_PEOPLE: Record<WorldPersonId, WorldPersonDefinition> = {
  "iven-saye": {
    id: "iven-saye",
    actorKind: "person",
    name: "Iven Saye",
    role: "Roadside surgeon and itinerant exchanger",
    affiliationIds: [],
    practiceAttitudes: {
      medium: attitude(
        "tolerated",
        ["consent", "occupation"],
        "Iven judges what a guest does to the living body before he judges the invitation.",
      ),
      bonebinder: attitude(
        "variable",
        ["body-claim", "custody"],
        "He will repair what he understands, but not while another person can make a stronger claim to the body.",
      ),
      renderer: attitude(
        "welcomed",
        ["provenance", "trade-stability"],
        "Competent preparation resembles work he knows. Its origin still governs whether he will touch it.",
      ),
      "grave-warden": attitude(
        "tolerated",
        ["continuity", "public-safety"],
        "A useful seal buys time for surgery; a seal used to disguise injury earns no professional courtesy.",
      ),
      ferryman: attitude(
        "variable",
        ["burial-passage", "consent"],
        "He has seen peaceful endings and premature ones, and asks which is being offered.",
      ),
    },
  },
  "eda-pell": {
    id: "eda-pell",
    actorKind: "person",
    name: "Eda Pell",
    role: "County burial driver",
    affiliationIds: ["burial-crews"],
    practiceAttitudes: {
      ...WORLD_FACTIONS["burial-crews"].practiceAttitudes,
      renderer: attitude(
        "restricted",
        ["body-claim", "custody", "provenance"],
        "Eda has carried lawful material for Renderers. She refuses any work that makes an unrecorded bundle part of her burial charge.",
      ),
      "grave-warden": attitude(
        "welcomed",
        ["continuity", "custody", "public-safety"],
        "A sound seal lets Eda account for what entered her cart and what left it.",
      ),
    },
  },
  "oren-vask": {
    id: "oren-vask",
    actorKind: "person",
    name: "Oren Vask",
    role: "Reliquary factor",
    affiliationIds: ["reliquary-brokers"],
    practiceAttitudes: {
      ...WORLD_FACTIONS["reliquary-brokers"].practiceAttitudes,
      renderer: attitude(
        "sought",
        ["provenance", "license", "trade-stability"],
        "Oren pays for disciplined preparation and refuses material whose custody cannot survive a written question.",
      ),
      "grave-warden": attitude(
        "welcomed",
        ["continuity", "custody", "trade-stability"],
        "Oren trusts seals that make a transfer legible and distrusts any continuity only its maker can explain.",
      ),
    },
  },
};

export const WORLD_ACTORS: Record<
  WorldRelationId,
  WorldActorDefinition
> = {
  ...WORLD_FACTIONS,
  ...WORLD_PEOPLE,
};

export const practiceAttitudeFor = (
  actorId: WorldRelationId,
  practiceId: WorldPracticeId,
): PracticeAttitude => WORLD_ACTORS[actorId].practiceAttitudes[practiceId];
