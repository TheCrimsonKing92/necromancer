import type {
  AnatomyId,
  ItemId,
  MaterialityId,
  NaturalArmor,
  WakeVariantId,
} from "./types";
import { normalizeSeed, rollInteger } from "./random";
import type { CombatantArchetypeId } from "./combatants/archetypes";
import type { EnemyCadenceId } from "./enemy-actions/cadences";

export interface WakeEnemyDefinition {
  id: string;
  archetypeId: CombatantArchetypeId;
  cadenceId: EnemyCadenceId;
  name: string;
  title: string;
  maxHp: number;
  attack: number;
  defense: number;
  ward?: number;
  bodyScale: number;
  anatomy?: AnatomyId;
  materiality?: MaterialityId;
  materialityLabel?: string;
  naturalArmor?: NaturalArmor;
  naturalArmorLabel?: string;
}

export interface WakeVariantDefinition {
  id: WakeVariantId;
  nature: "mundane" | "otherworldly";
  eyebrow: string;
  title: string;
  sceneParagraphs: [string, string];
  battleTitle: string;
  guardedOpening: string;
  severingOpening: string;
  delayAffinity: "escaped-names" | null;
  enemies: WakeEnemyDefinition[];
  rewards: Array<{
    itemId: ItemId;
    quantity: number;
    witnessName: string;
  }>;
  victoryOpening: string;
  endingTitle: string;
  endingBody: string;
  defeatTitle: string;
  defeatBody: string;
  fledTitle: string;
  fledBody: string;
  escapeSuccess: string;
  escapeFailure: string;
}

export const WAKE_VARIANT_IDS: WakeVariantId[] = [
  "bell-widow",
  "name-thieves",
  "bone-procession",
  "reliquary-poachers",
  "reeve-patrol",
];

export const rollWakeVariant = (
  seed: number,
  eligibleIds: ReadonlyArray<WakeVariantId> = WAKE_VARIANT_IDS,
): { seed: number; variantId: WakeVariantId } => {
  const pool =
    eligibleIds.length > 0
      ? [...new Set(eligibleIds)]
      : WAKE_VARIANT_IDS;
  let mixed = normalizeSeed(seed) ^ 0x77616b65;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
  mixed = (mixed ^ (mixed >>> 15)) >>> 0;
  const roll = rollInteger(
    normalizeSeed(mixed),
    0,
    pool.length - 1,
  );
  return {
    seed: roll.seed,
    variantId: pool[roll.value]!,
  };
};

export const WAKE_VARIANTS: Record<
  WakeVariantId,
  WakeVariantDefinition
> = {
  "bell-widow": {
    id: "bell-widow",
    nature: "otherworldly",
    eyebrow: "Black Mile · The Unstruck Bell",
    title: "A widow woven from weather",
    sceneParagraphs: [
      "The tollhouse bell has never possessed a clapper. Tonight it rings hard enough to shake old coins from the rafters.",
      "Beneath it, the names freed from Saint Orra knot rain and burial veils around a woman-shaped absence. Each toll teaches her another face, and none of them forgive you.",
    ],
    battleTitle: "The bell tolls inward.",
    guardedOpening:
      "You receive the Bell-Widow beneath a funerary ward.",
    severingOpening:
      "You speak before the veils can finish tying themselves around a face. The word cuts through every name holding the widow upright.",
    delayAffinity: "escaped-names",
    enemies: [
      {
        id: "wake-bell-widow",
        archetypeId: "bell-widow",
        cadenceId: "bell-widow-toll",
        name: "The Bell-Widow",
        title: "Bride of the unstruck hour",
        maxHp: 34,
        attack: 4,
        defense: 2,
        ward: 4,
        bodyScale: 1,
        anatomy: "manifestation",
        materiality: "incorporeal",
        materialityLabel: "The widow’s rain-woven outline",
      },
    ],
    rewards: [
      {
        itemId: "black-tonic",
        quantity: 1,
        witnessName: "a widow-black tonic",
      },
      {
        itemId: "ossuary-ichor",
        quantity: 1,
        witnessName: "an ampoule of rain-thinned ichor",
      },
    ],
    victoryOpening:
      "The Bell-Widow loosens into rain and names that remember how to leave.",
    endingTitle: "The last toll belongs to you.",
    endingBody:
      "The bell gives one final, voiceless shudder. Freed names pass through the rain without borrowing another face. The woman-shaped absence collapses beneath the belfry. Dawn finds you there, still singular, still breathing.",
    defeatTitle: "The bell learns your face.",
    defeatBody:
      "The widow bends close as the thirteenth toll enters your bones. By dawn, the bell has a clapper at last—and one more face moves beneath her veil.",
    fledTitle: "The bell keeps ringing behind you.",
    fledBody:
      "You leave the widow her belfry and run until the tolls become weather. Your name remains your own, though each echo pronounces it more confidently.",
    escapeSuccess:
      "You cut across the flooded graves while the widow gathers herself for another toll. The bell spends your name on the empty road behind you.",
    escapeFailure:
      "The bell rings from inside your ribs. For one terrible step, every direction leads back beneath her veil.",
  },
  "name-thieves": {
    id: "name-thieves",
    nature: "otherworldly",
    eyebrow: "Black Mile · The Name Market",
    title: "Two mouths for every name",
    sceneParagraphs: [
      "The escaped names do not rise. They pool in the wheel-ruts, bright as drowned stars, while two figures kneel to drink them from the mud.",
      "One carries a hooked stylus and the other has sewn its mouth around a silver key. Between them they speak your name correctly, then begin deciding which half each will keep.",
    ],
    battleTitle: "Keep your name behind your teeth.",
    guardedOpening:
      "You close your name behind a funerary ward before the thieves can divide it.",
    severingOpening:
      "You speak across the bargain before either thief can claim a share. The word cuts both stolen bodies.",
    delayAffinity: "escaped-names",
    enemies: [
      {
        id: "wake-redactor",
        archetypeId: "redactor",
        cadenceId: "redactor-hook",
        name: "The Redactor",
        title: "Editor of the breathing",
        maxHp: 20,
        attack: 4,
        defense: 1,
        bodyScale: 0.9,
        anatomy: "manifestation",
        materiality: "incorporeal",
        materialityLabel: "The Redactor’s written body",
      },
      {
        id: "wake-cantor",
        archetypeId: "cantor",
        cadenceId: "cantor-antiphon",
        name: "Cantor Without Tongue",
        title: "A hymn wearing skin",
        maxHp: 18,
        attack: 3,
        defense: 2,
        ward: 3,
        bodyScale: 0.88,
        anatomy: "manifestation",
        materiality: "incorporeal",
        materialityLabel: "The cantor’s hymn-shaped form",
      },
    ],
    rewards: [
      {
        itemId: "black-tonic",
        quantity: 1,
        witnessName: "a stoppered draft of stolen breath",
      },
      {
        itemId: "linen-binding",
        quantity: 1,
        witnessName: "a roll of name-scribed linen",
      },
    ],
    victoryOpening:
      "The thieves choke on every name they took and leave yours where it belongs.",
    endingTitle: "Your name survives its editors.",
    endingBody:
      "The Redactor’s last correction runs pink into the wheel-rut. The cantor opens its sewn mouth and a hundred stolen names climb free, each carrying a little voice and no desire for another body. You speak your own aloud. Nothing answers for you.",
    defeatTitle: "Your name changes hands.",
    defeatBody:
      "The stylus finds the soft margin beneath your jaw. One thief takes what you were called; the other takes whoever used to answer.",
    fledTitle: "You leave them the lesser names.",
    fledBody:
      "You run while the thieves speak each stolen name in turn. By the time they reach the one that belongs to you, the flooded graves have carried you beyond their hearing.",
    escapeSuccess:
      "You speak three false names into the rain. Both thieves turn toward the voices, and you reach the flooded graves before they recover yours.",
    escapeFailure:
      "The cantor speaks your childhood name through its stitches. Your body turns toward it before you can remember why it should not.",
  },
  "bone-procession": {
    id: "bone-procession",
    nature: "otherworldly",
    eyebrow: "Black Mile · The Last Procession",
    title: "No grave ordered this march",
    sceneParagraphs: [
      "Every burial stone along the road has turned to face north. Between them, three dead bear an empty bier toward a grave that has not yet been dug.",
      "Saint Orra’s freed names hang from the bier like votive ribbons. The pallbearers have mistaken escape for a funeral, and they have left one place open at the rear.",
    ],
    battleTitle: "The empty bier turns toward you.",
    guardedOpening:
      "You bar the procession’s empty place with a funerary ward.",
    severingOpening:
      "You speak before the pallbearers can settle the bier between them. The word passes down the whole procession like a snapped pole.",
    delayAffinity: "escaped-names",
    enemies: [
      {
        id: "wake-pallbearer",
        archetypeId: "pallbearer",
        cadenceId: "pallbearer-office",
        name: "First Pallbearer",
        title: "Master of the empty bier",
        maxHp: 18,
        attack: 3,
        defense: 2,
        bodyScale: 0.9,
        naturalArmor: {
          torso: 2,
        },
        naturalArmorLabel: "Bier-frame and burial bone",
      },
      {
        id: "wake-mourner-left",
        archetypeId: "mourner",
        cadenceId: "mourner-grief",
        name: "Left-hand Mourner",
        title: "Grief without an owner",
        maxHp: 12,
        attack: 3,
        defense: 0,
        bodyScale: 0.74,
        anatomy: "manifestation",
        materiality: "incorporeal",
        materialityLabel: "The mourner’s ownerless grief",
      },
      {
        id: "wake-mourner-right",
        archetypeId: "mourner",
        cadenceId: "mourner-grief",
        name: "Right-hand Mourner",
        title: "Grief without an owner",
        maxHp: 12,
        attack: 3,
        defense: 0,
        bodyScale: 0.74,
        anatomy: "manifestation",
        materiality: "incorporeal",
        materialityLabel: "The mourner’s ownerless grief",
      },
    ],
    rewards: [
      {
        itemId: "linen-binding",
        quantity: 2,
        witnessName: "two lengths of pall-cloth",
      },
      {
        itemId: "hound-tooth",
        quantity: 1,
        witnessName: "a grave-hound tooth sewn beneath the bier",
      },
    ],
    victoryOpening:
      "The empty bier strikes mud, and the procession remembers it has nowhere to go.",
    endingTitle: "The place on the bier remains empty.",
    endingBody:
      "The pallbearers fold beside their empty burden. One by one, the names tied to it slip their knots and pass into the paling sky. The open place at the bier’s rear remains open. You walk past it without slowing.",
    defeatTitle: "The empty place is filled.",
    defeatBody:
      "Cold hands settle you onto the bier with the care used for any corpse. The procession turns north, carrying one name too few and one body too many.",
    fledTitle: "The procession keeps its empty place.",
    fledBody:
      "You break through the burial markers and leave the dead to their route. The bier continues north behind you. Its rear place remains open.",
    escapeSuccess:
      "You overturn a burial stone across the road. The first bearer strikes it and the procession folds inward around the empty bier.",
    escapeFailure:
      "The empty bier keeps pace beside you without touching the earth. Its open place seems easier to reach with every step.",
  },
  "reliquary-poachers": {
    id: "reliquary-poachers",
    nature: "mundane",
    eyebrow: "Black Mile · The Spoil Road",
    title: "Living hands reach the vault first",
    sceneParagraphs: [
      "Fresh bootprints cross the rain-soft graves toward Saint Orra’s open stair. Rope and pry bars hang from a mule tied beyond the burial stones.",
      "Two reliquary poachers emerge with grave copper under their coats. Their leader watches you come from Saint Orra’s open stair and tells her companion not to leave a witness.",
    ],
    battleTitle: "The billhooks come down.",
    guardedOpening:
      "You make the vault threshold a funerary line the poachers must cross.",
    severingOpening:
      "You speak while the poachers are still spreading out. The word cuts both living bodies before they reach cover.",
    delayAffinity: null,
    enemies: [
      {
        id: "wake-poacher-captain",
        archetypeId: "reliquary-poacher",
        cadenceId: "poacher-billhook",
        name: "Sella Rook",
        title: "Reliquary poacher",
        maxHp: 20,
        attack: 4,
        defense: 2,
        bodyScale: 0.94,
        naturalArmor: {
          torso: 1,
          leftArm: 1,
          rightArm: 1,
        },
        naturalArmorLabel: "Boiled-leather jack",
      },
      {
        id: "wake-poacher-bow",
        archetypeId: "reliquary-poacher",
        cadenceId: "poacher-crossbow",
        name: "Nim Bale",
        title: "Vault-side crossbow",
        maxHp: 16,
        attack: 3,
        defense: 1,
        bodyScale: 0.88,
      },
    ],
    rewards: [
      {
        itemId: "grave-copper",
        quantity: 2,
        witnessName: "two stamped grave-copper fittings",
      },
      {
        itemId: "black-tonic",
        quantity: 1,
        witnessName: "a poacher’s black tonic",
      },
      {
        itemId: "linen-binding",
        quantity: 1,
        witnessName: "a clean field dressing",
      },
    ],
    victoryOpening:
      "The poachers fall in the burial mud. Stolen copper spills from beneath their coats.",
    endingTitle: "The living also haunt this road.",
    endingBody:
      "Rain ticks against the poachers’ tools. Their mule waits beyond the graves with its reins trailing. You turn it toward the nearest village before taking the road alone.",
    defeatTitle: "The vault changes hands.",
    defeatBody:
      "The billhook pins you long enough for practiced hands to inventory your pack. By dawn, Saint Orra’s relics have new owners and the Black Mile has one witness fewer.",
    fledTitle: "They return to the open vault.",
    fledBody:
      "You leave grave copper and shouted threats behind. The poachers do not follow far; the open vault promises easier weight than a running body.",
    escapeSuccess:
      "You cut the mule’s tether. The animal bolts with half the tools, and both poachers choose their livelihood over your trail.",
    escapeFailure:
      "A crossbow bolt buries itself in the milestone ahead. The poachers close the distance while you are still choosing another route.",
  },
  "reeve-patrol": {
    id: "reeve-patrol",
    nature: "mundane",
    eyebrow: "Black Mile · The Reeve’s Lanterns",
    title: "The road keeps a human account",
    sceneParagraphs: [
      "Three hooded lanterns descend from the north, steady in the rain. The people carrying them wear county gray and know Hollis Vane’s toll marks by sight.",
      "Sergeant Elian Rusk takes in the hooked knife, the hound’s missing tooth, and the grave goods in your pack. He asks for your hands. The levy beside him has already lowered her spear.",
    ],
    battleTitle: "The patrol closes the road.",
    guardedOpening:
      "You set a funerary ward between yourself and the reeve patrol’s iron.",
    severingOpening:
      "You speak before the sergeant can finish the arrest. The severing word finds two living bodies already braced for violence.",
    delayAffinity: null,
    enemies: [
      {
        id: "wake-reeve-sergeant",
        archetypeId: "county-reeve",
        cadenceId: "reeve-baton-hook",
        name: "Elian Rusk",
        title: "County road sergeant",
        maxHp: 22,
        attack: 4,
        defense: 2,
        bodyScale: 1,
        naturalArmor: {
          head: 1,
          torso: 1,
        },
        naturalArmorLabel: "Kettle helm and road leathers",
      },
      {
        id: "wake-reeve-levy",
        archetypeId: "county-reeve",
        cadenceId: "reeve-spear-shield",
        name: "Tess Fen",
        title: "Toll-road levy",
        maxHp: 17,
        attack: 3,
        defense: 1,
        bodyScale: 0.9,
        naturalArmor: {
          torso: 1,
        },
        naturalArmorLabel: "Quilted road coat",
      },
    ],
    rewards: [
      {
        itemId: "road-leathers",
        quantity: 1,
        witnessName: "a serviceable road-leather coat",
      },
      {
        itemId: "linen-binding",
        quantity: 1,
        witnessName: "the patrol’s field linen",
      },
    ],
    victoryOpening:
      "The county lanterns fall beside the road. Their flames go out in the rain.",
    endingTitle: "No miracle excuses a body.",
    endingBody:
      "The patrol’s lanterns gutter beside the road. Elian Rusk and Tess Fen were frightened, armed, and alive. Their bodies remain where they fell. You leave Hollis’s ledger where the next county rider will find it.",
    defeatTitle: "The county takes custody.",
    defeatBody:
      "Iron closes around your wrists. The levy binds your wounds for transport. The nearest magistrate lies two days north.",
    fledTitle: "The warrant carries your description.",
    fledBody:
      "You lose the lanterns among the burial stones. By noon, every tollhouse north of the Black Mile will know your coat, your weapons, and the name you gave Hollis.",
    escapeSuccess:
      "You kick the nearest lantern into the ditch and run among the burial stones while the patrol closes around the fallen light.",
    escapeFailure:
      "The levy’s spear hooks your coat against a burial stone. The sergeant reaches you before the seam can tear.",
  },
};

export const validateWakeVariants = (
  definitions: Readonly<
    Record<string, WakeVariantDefinition>
  >,
): string[] => {
  const errors: string[] = [];
  const enemyOwners = new Map<string, string>();

  for (const [key, definition] of Object.entries(definitions)) {
    if (key !== definition.id) {
      errors.push(
        `${key}: record key does not match variant id ${definition.id}.`,
      );
    }
    if (
      definition.nature !== "mundane" &&
      definition.nature !== "otherworldly"
    ) {
      errors.push(`${definition.id}: encounter nature is invalid.`);
    }
    for (const [field, copy] of Object.entries({
      eyebrow: definition.eyebrow,
      title: definition.title,
      battleTitle: definition.battleTitle,
      guardedOpening: definition.guardedOpening,
      severingOpening: definition.severingOpening,
      victoryOpening: definition.victoryOpening,
      endingTitle: definition.endingTitle,
      endingBody: definition.endingBody,
      defeatTitle: definition.defeatTitle,
      defeatBody: definition.defeatBody,
      fledTitle: definition.fledTitle,
      fledBody: definition.fledBody,
      escapeSuccess: definition.escapeSuccess,
      escapeFailure: definition.escapeFailure,
    })) {
      if (copy.trim().length === 0) {
        errors.push(`${definition.id}: ${field} copy is empty.`);
      }
    }
    if (
      (definition.nature === "otherworldly" &&
        definition.delayAffinity !== "escaped-names") ||
      (definition.nature === "mundane" &&
        definition.delayAffinity !== null)
    ) {
      errors.push(
        `${definition.id}: delay affinity does not match encounter nature.`,
      );
    }
    if (
      definition.sceneParagraphs.some(
        (paragraph) => paragraph.trim().length === 0,
      )
    ) {
      errors.push(
        `${definition.id}: scene paragraphs cannot be empty.`,
      );
    }
    if (definition.enemies.length === 0) {
      errors.push(`${definition.id}: enemy roster is empty.`);
    }

    for (const enemy of definition.enemies) {
      const previousOwner = enemyOwners.get(enemy.id);
      if (previousOwner) {
        errors.push(
          `${definition.id}: enemy id ${enemy.id} is already owned by ${previousOwner}.`,
        );
      } else {
        enemyOwners.set(enemy.id, definition.id);
      }
      if (
        enemy.name.trim().length === 0 ||
        enemy.title.trim().length === 0
      ) {
        errors.push(
          `${definition.id}: enemy ${enemy.id} needs a name and title.`,
        );
      }
      if (
        !Number.isFinite(enemy.maxHp) ||
        enemy.maxHp < 1 ||
        !Number.isFinite(enemy.bodyScale) ||
        enemy.bodyScale <= 0
      ) {
        errors.push(
          `${definition.id}: enemy ${enemy.id} has invalid durability.`,
        );
      }
      if (
        enemy.attack < 0 ||
        enemy.defense < 0 ||
        (enemy.ward ?? 0) < 0
      ) {
        errors.push(
          `${definition.id}: enemy ${enemy.id} has a negative combat stat.`,
        );
      }
      if (
        enemy.materiality === "incorporeal" &&
        Object.keys(enemy.naturalArmor ?? {}).length > 0
      ) {
        errors.push(
          `${definition.id}: incorporeal enemy ${enemy.id} cannot use material armor.`,
        );
      }
      if (
        enemy.anatomy === "manifestation" &&
        enemy.materiality !== "incorporeal"
      ) {
        errors.push(
          `${definition.id}: manifestation ${enemy.id} must be incorporeal.`,
        );
      }
    }

    for (const reward of definition.rewards) {
      if (
        !Number.isInteger(reward.quantity) ||
        reward.quantity < 1 ||
        reward.witnessName.trim().length === 0
      ) {
        errors.push(
          `${definition.id}: reward ${reward.itemId} is invalid.`,
        );
      }
    }
  }

  const orderedIds = new Set(WAKE_VARIANT_IDS);
  if (orderedIds.size !== WAKE_VARIANT_IDS.length) {
    errors.push("Wake variant order contains a duplicate id.");
  }
  for (const id of WAKE_VARIANT_IDS) {
    if (!definitions[id]) {
      errors.push(`Wake variant order references missing id ${id}.`);
    }
  }
  for (const id of Object.keys(definitions)) {
    if (!orderedIds.has(id as WakeVariantId)) {
      errors.push(`Wake variant ${id} is missing from selection order.`);
    }
  }

  return [...new Set(errors)];
};
