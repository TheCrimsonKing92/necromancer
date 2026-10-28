import type {
  BodyPartId,
  EquipmentSlot,
  EquipmentState,
  InjuryProfileId,
  InventoryState,
  ItemDefinition,
  ItemId,
  Player,
  TraditionId,
} from "./types";
import { carryCapacityFromAttributes } from "./character";

export const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  "mainHand",
  "offHand",
  "head",
  "torso",
  "arms",
  "legs",
  "charm",
];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  mainHand: "Main hand",
  offHand: "Off hand",
  head: "Head",
  torso: "Torso",
  arms: "Arms",
  legs: "Legs",
  charm: "Charm",
};

export const ITEMS: Record<ItemId, ItemDefinition> = {
  "ritual-knife": {
    id: "ritual-knife",
    name: "Ritual knife",
    kind: "weapon",
    description:
      "A narrow funerary blade. Better at opening a threshold than winning a duel, but capable of both.",
    sellValue: 2,
    weight: 1.5,
    stackable: false,
    allowedSlots: ["mainHand", "offHand"],
    weapon: {
      strikeLead: "Drive the ritual knife at one enemy",
      baseDamage: 2,
      attackBonus: 1,
      traumaBonus: 0,
      damageType: "physical",
      injuryProfile: "edge",
    },
  },
  "bone-wand": {
    id: "bone-wand",
    name: "Bone wand",
    kind: "weapon",
    description:
      "A polished radius bone packed with grave wax. The line it casts strikes from an angle the hand did not draw.",
    sellValue: 2,
    weight: 1,
    stackable: false,
    allowedSlots: ["mainHand", "offHand"],
    weapon: {
      strikeLead:
        "Draw a grave-line through one enemy with the bone wand",
      baseDamage: 2,
      attackBonus: 0,
      traumaBonus: 0,
      damageType: "occult",
      injuryProfile: "spectral",
    },
  },
  "iron-sickle": {
    id: "iron-sickle",
    name: "Iron sickle",
    kind: "weapon",
    description:
      "An herb knife forged with a thicker spine and a forward-weighted edge. It cuts deep when the hook finds flesh.",
    sellValue: 3,
    weight: 2.5,
    stackable: false,
    allowedSlots: ["mainHand"],
    weapon: {
      strikeLead: "Sweep the iron sickle through one enemy",
      baseDamage: 3,
      attackBonus: 1,
      traumaBonus: 1,
      damageType: "physical",
      injuryProfile: "edge",
    },
  },
  "mortuary-mallet": {
    id: "mortuary-mallet",
    name: "Mortuary mallet",
    kind: "weapon",
    description:
      "A short iron-faced mallet for coffin pegs, grave stakes, and stubborn seal fittings. Its head is plain, heavy, and repeatedly cleaned.",
    sellValue: 2,
    weight: 2.5,
    stackable: false,
    allowedSlots: ["mainHand"],
    weapon: {
      strikeLead: "Bring the mortuary mallet down on one enemy",
      baseDamage: 3,
      attackBonus: 0,
      traumaBonus: 2,
      damageType: "physical",
      injuryProfile: "impact",
    },
  },
  "warding-awl": {
    id: "warding-awl",
    name: "Warding awl",
    kind: "weapon",
    description:
      "A grave-iron awl scored from point to pommel. Drawn through a spent ward, its grooves catch enough of the broken pattern to pry at another prepared defense.",
    sellValue: 2,
    weight: 0.6,
    stackable: false,
    allowedSlots: ["mainHand", "offHand"],
    weapon: {
      strikeLead:
        "Score through one enemy’s hold with the warding awl",
      baseDamage: 1,
      attackBonus: 1,
      traumaBonus: 0,
      damageType: "occult",
      injuryProfile: "spectral",
    },
  },
  "gravecloth-coat": {
    id: "gravecloth-coat",
    name: "Gravecloth coat",
    kind: "armor",
    description:
      "Funeral cloth layered with horsehair, waxed cord, and narrow iron stays. Light protection for the chest and arms.",
    sellValue: 3,
    weight: 3,
    stackable: false,
    allowedSlots: ["torso"],
    armor: {
      value: 1,
      parts: ["torso", "leftArm", "rightArm"],
    },
  },
  "binder-wraps": {
    id: "binder-wraps",
    name: "Binder’s wraps",
    kind: "armor",
    description:
      "Waxed linen wound around the hands and forearms to keep an invited spirit from entering too far.",
    sellValue: 2,
    weight: 1,
    stackable: false,
    allowedSlots: ["arms"],
    armor: {
      value: 1,
      parts: ["leftArm", "rightArm"],
    },
  },
  "apothecary-apron": {
    id: "apothecary-apron",
    name: "Apothecary apron",
    kind: "armor",
    description:
      "Stiff leather scarred by acids and hot glass, blackened at the hem where a revival mixture caught fire.",
    sellValue: 3,
    weight: 3.5,
    stackable: false,
    allowedSlots: ["torso"],
    armor: {
      value: 2,
      parts: ["torso"],
    },
  },
  "burial-hood": {
    id: "burial-hood",
    name: "Burial hood",
    kind: "armor",
    description:
      "Layered gravecloth quilted with horsehair and closed by waxed cord. Two narrow iron stays turn glancing blows from the brow.",
    sellValue: 2,
    weight: 1.5,
    stackable: false,
    allowedSlots: ["head"],
    armor: {
      value: 1,
      parts: ["head"],
    },
  },
  "hooked-knife": {
    id: "hooked-knife",
    name: "Hollis’s hooked knife",
    kind: "weapon",
    description:
      "A road reeve’s working blade. The inward hook catches cloth, tendon, and the rim of light armor.",
    provenance: {
      distinction: "singular",
      label: "Hollis Vane · tollhouse reeve",
    },
    sellValue: 6,
    weight: 2,
    stackable: false,
    allowedSlots: ["mainHand", "offHand"],
    weapon: {
      strikeLead:
        "Catch one enemy with Hollis’s hooked knife",
      baseDamage: 4,
      attackBonus: 1,
      traumaBonus: 2,
      damageType: "physical",
      injuryProfile: "edge",
    },
  },
  "road-leathers": {
    id: "road-leathers",
    name: "Road leathers",
    kind: "armor",
    description:
      "Layered hide with iron scales sewn over the ribs and shoulders. Rain-stiff, blood-softened.",
    sellValue: 6,
    weight: 6,
    stackable: false,
    allowedSlots: ["torso"],
    armor: {
      value: 2,
      parts: ["torso", "leftArm", "rightArm"],
    },
  },
  "ash-hide-boots": {
    id: "ash-hide-boots",
    name: "Ash-hide boots",
    kind: "armor",
    description:
      "Boots patched with the pale hide of a grave-hound. Unpleasantly warm around burial ground.",
    sellValue: 4,
    weight: 3,
    stackable: false,
    allowedSlots: ["legs"],
    armor: {
      value: 1,
      parts: ["leftLeg", "rightLeg"],
    },
  },
  "grave-iron-mask": {
    id: "grave-iron-mask",
    name: "Grave-iron mask",
    kind: "armor",
    description:
      "The ossuary saint’s funerary face: iron hammered paper-thin over old bone, cold enough to numb a fresh blow.",
    sellValue: 6,
    weight: 2.5,
    stackable: false,
    allowedSlots: ["head"],
    armor: {
      value: 2,
      parts: ["head"],
    },
  },
  "saint-bone-charm": {
    id: "saint-bone-charm",
    name: "Saint-bone charm",
    kind: "charm",
    description:
      "Three finger bones wired around a lead seal. They twitch a warning before violence crosses the threshold.",
    sellValue: 7,
    weight: 0.4,
    stackable: false,
    allowedSlots: ["charm"],
    bonuses: {
      defense: 1,
    },
  },
  "debtor-tally": {
    id: "debtor-tally",
    name: "Debtor’s tally",
    kind: "charm",
    description:
      "Saint Orra’s last copper tally, still warm with the urge to collect. It pulls the hand toward whatever owes blood.",
    sellValue: 7,
    weight: 0.4,
    stackable: false,
    allowedSlots: ["charm"],
    bonuses: {
      attack: 1,
    },
  },
  "ossuary-ichor": {
    id: "ossuary-ichor",
    name: "Ossuary ichor",
    kind: "material",
    description:
      "A thumb-sized ampoule of silver-black residue rendered from remains altered by burial magic.",
    sellValue: 3,
    weight: 0.2,
    stackable: true,
  },
  "black-tonic": {
    id: "black-tonic",
    name: "Black tonic",
    kind: "consumable",
    description:
      "Bitter spirits, iron filings, and a heavy measure of poppy. Restores 10 Health but does not mend wounds.",
    sellValue: 2,
    weight: 0.5,
    stackable: true,
    consumable: {
      effect: "heal",
      power: 10,
    },
  },
  "linen-binding": {
    id: "linen-binding",
    name: "Clean linen binding",
    kind: "consumable",
    description:
      "Boiled linen and a small pot of resin. Gives one chance to dress an open wound; practiced hands recover more condition. Closed injuries still require rest.",
    sellValue: 1,
    weight: 0.25,
    stackable: true,
    consumable: {
      effect: "treat",
      power: 3,
    },
  },
  "hound-tooth": {
    id: "hound-tooth",
    name: "Ash-hound tooth",
    kind: "material",
    description:
      "A smoke-gray canine with a root that twitches near disturbed graves. Used in bindings and small mortuary instruments.",
    sellValue: 1,
    weight: 0.1,
    stackable: true,
  },
  "grave-salt": {
    id: "grave-salt",
    name: "Grave salt",
    kind: "material",
    description:
      "Gray crystals drawn from blood, bone, and grave wax. They preserve unstable remains and weaken prepared wards.",
    sellValue: 2,
    weight: 0.15,
    stackable: true,
  },
  "mortuary-tallow": {
    id: "mortuary-tallow",
    name: "Mortuary tallow",
    kind: "material",
    description:
      "Hard tallow rendered from recent human fat. It burns cold and carries a trace of the body’s last condition.",
    sellValue: 3,
    weight: 0.3,
    stackable: true,
  },
  "vigil-cordial": {
    id: "vigil-cordial",
    name: "Vigil cordial",
    kind: "consumable",
    description:
      "Grave mint, bitter bark, and a thread of silver-black residue sealed in brown glass. It restores 3 Spirit without granting rest.",
    sellValue: 2,
    weight: 0.25,
    stackable: true,
    consumable: {
      effect: "restore-spirit",
      power: 3,
    },
  },
  "carrier-harness": {
    id: "carrier-harness",
    name: "Carrier's harness",
    kind: "armor",
    description:
      "A broad leather yoke with rope loops and low iron rings. It leaves the ribs exposed but keeps another four measures from dragging at the shoulders.",
    sellValue: 3,
    weight: 2.5,
    stackable: false,
    allowedSlots: ["torso"],
    bonuses: {
      carryCapacity: 4,
    },
  },
  "grave-copper": {
    id: "grave-copper",
    name: "Stamped grave copper",
    kind: "material",
    description:
      "Thin vault fittings punched with burial marks and green at the edges. A reliquary worker can still recover the metal and the warding laid into it.",
    sellValue: 3,
    weight: 0.6,
    stackable: true,
  },
  "orra-crozier": {
    id: "orra-crozier",
    name: "Saint Orra's broken crozier",
    kind: "weapon",
    description:
      "The grave-iron crook broke below the saint's grip. Wax fills its old rivet holes, and loose names draw away from the fractured end.",
    provenance: {
      distinction: "singular",
      label: "Saint Orra · counting room",
    },
    sellValue: 9,
    weight: 3.5,
    stackable: false,
    allowedSlots: ["mainHand"],
    weapon: {
      strikeLead:
        "Sweep Saint Orra's broken crozier through one enemy",
      baseDamage: 4,
      attackBonus: -1,
      traumaBonus: 2,
      damageType: "occult",
      injuryProfile: "spectral",
    },
  },
};

export const VICTORY_LOOT: Array<{
  itemId: ItemId;
  quantity: number;
}> = [
  { itemId: "hooked-knife", quantity: 1 },
  { itemId: "road-leathers", quantity: 1 },
  { itemId: "ash-hide-boots", quantity: 1 },
  { itemId: "linen-binding", quantity: 1 },
  { itemId: "hound-tooth", quantity: 2 },
];

export const VAULT_LOOT: Array<{
  itemId: ItemId;
  quantity: number;
}> = [
  { itemId: "grave-iron-mask", quantity: 1 },
  { itemId: "saint-bone-charm", quantity: 1 },
  { itemId: "debtor-tally", quantity: 1 },
  { itemId: "orra-crozier", quantity: 1 },
  { itemId: "grave-copper", quantity: 1 },
  { itemId: "ossuary-ichor", quantity: 2 },
  { itemId: "linen-binding", quantity: 1 },
];

export const createEmptyEquipment = (): EquipmentState => ({
  mainHand: null,
  offHand: null,
  head: null,
  torso: null,
  arms: null,
  legs: null,
  charm: null,
});

export const createStartingKit = (
  tradition: TraditionId,
): {
  inventory: InventoryState;
  equipment: EquipmentState;
} => {
  const equipment = createEmptyEquipment();
  const inventory: InventoryState = {
    "linen-binding": 1,
  };

  switch (tradition) {
    case "medium":
      equipment.mainHand = "ritual-knife";
      equipment.torso = "gravecloth-coat";
      break;
    case "summoner":
      equipment.mainHand = "bone-wand";
      equipment.arms = "binder-wraps";
      break;
    case "thaumaturgist":
      equipment.mainHand = "iron-sickle";
      equipment.torso = "apothecary-apron";
      break;
  }

  return { inventory, equipment };
};

export const itemCount = (
  inventory: InventoryState,
  itemId: ItemId,
): number => inventory[itemId] ?? 0;

export const addItem = (
  inventory: InventoryState,
  itemId: ItemId,
  quantity = 1,
): void => {
  if (quantity <= 0) return;
  inventory[itemId] = itemCount(inventory, itemId) + quantity;
};

export const removeItem = (
  inventory: InventoryState,
  itemId: ItemId,
  quantity = 1,
): boolean => {
  const current = itemCount(inventory, itemId);
  if (quantity <= 0 || current < quantity) return false;

  const remaining = current - quantity;
  if (remaining > 0) {
    inventory[itemId] = remaining;
  } else {
    delete inventory[itemId];
  }
  return true;
};

export const equippedDefinitions = (
  player: Player,
): ItemDefinition[] =>
  EQUIPMENT_SLOTS.flatMap((slot) => {
    const itemId = player.equipment[slot];
    return itemId ? [ITEMS[itemId]] : [];
  });

export const equippedWeapon = (
  player: Player,
): {
  name: string;
  strikeLead: string;
  baseDamage: number;
  attackBonus: number;
  traumaBonus: number;
  damageType: "physical" | "occult";
  injuryProfile: InjuryProfileId;
} => {
  const itemId =
    player.equipment.mainHand ?? player.equipment.offHand;
  const item = itemId ? ITEMS[itemId] : undefined;

  if (!item?.weapon) {
    return {
      name: "bare hands",
      strikeLead: "Strike one enemy bare-handed",
      baseDamage: 0,
      attackBonus: 0,
      traumaBonus: 0,
      damageType: "physical",
      injuryProfile: "impact",
    };
  }

  return {
    name: item.name,
    ...item.weapon,
  };
};

export const offHandStrikeDamage = (player: Player): number => {
  if (!player.equipment.mainHand || !player.equipment.offHand) return 0;
  const offHand = ITEMS[player.equipment.offHand];
  return offHand.weapon
    ? Math.max(1, Math.floor(offHand.weapon.baseDamage / 2))
    : 0;
};

export const equippedArmorForPart = (
  player: Player,
  partId: BodyPartId,
): number =>
  equippedDefinitions(player).reduce((total, item) => {
    if (item.armor?.parts.includes(partId)) {
      return total + item.armor.value;
    }
    return total;
  }, 0);

export const equipmentAttackBonus = (player: Player): number =>
  equippedDefinitions(player).reduce(
    (total, item) =>
      total +
      (item.bonuses?.attack ?? 0) +
      (item.weapon?.attackBonus ?? 0),
    0,
  );

export const equipmentDefenseBonus = (player: Player): number =>
  equippedDefinitions(player).reduce(
    (total, item) => total + (item.bonuses?.defense ?? 0),
    0,
  );

export const carriedWeight = (player: Player): number => {
  const inventoryWeight = Object.entries(player.inventory).reduce(
    (total, [rawItemId, quantity]) => {
      const itemId = rawItemId as ItemId;
      return total + ITEMS[itemId].weight * (quantity ?? 0);
    },
    0,
  );
  const equipmentWeight = equippedDefinitions(player).reduce(
    (total, item) => total + item.weight,
    0,
  );

  return Math.round((inventoryWeight + equipmentWeight) * 100) / 100;
};

export const carryCapacity = (player: Player): number =>
  carryCapacityFromAttributes(player.attributes) +
  equippedDefinitions(player).reduce(
    (total, item) => total + (item.bonuses?.carryCapacity ?? 0),
    0,
  );

export const canCarry = (
  player: Player,
  itemId: ItemId,
  quantity = 1,
): boolean =>
  carriedWeight(player) + ITEMS[itemId].weight * quantity <=
  carryCapacity(player);

export const canCarryAfterExchange = (
  player: Player,
  incomingItemId: ItemId,
  outgoingItemId: ItemId,
  outgoingQuantity = 1,
  incomingQuantity = 1,
): boolean =>
  carriedWeight(player) -
    ITEMS[outgoingItemId].weight * outgoingQuantity +
    ITEMS[incomingItemId].weight * incomingQuantity <=
  carryCapacity(player);
