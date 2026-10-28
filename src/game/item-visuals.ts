import type { ItemId } from "./types";

export interface ItemVisualDefinition {
  src: string;
  alt: string;
  aspectRatio: string;
}

const image = (
  src: string,
  alt: string,
  aspectRatio = "1 / 1",
): ItemVisualDefinition => ({
  src,
  alt,
  aspectRatio,
});

export const ITEM_VISUALS = {
  "ritual-knife": image("/assets/items/individual/ritual-knife.webp", "A narrow iron ritual knife with an old bone grip."),
  "bone-wand": image("/assets/items/individual/bone-wand.webp", "A polished forearm-bone wand packed with dark grave wax."),
  "iron-sickle": image("/assets/items/individual/iron-sickle.webp", "A heavy iron sickle with a thick spine and forward hook."),
  "mortuary-mallet": image("/assets/items/individual/mortuary-mallet.webp", "A short, plain mortuary mallet with a worn iron head and wax-darkened wooden handle."),
  "warding-awl": image("/assets/items/individual/warding-awl.webp", "A narrow grave-iron awl scored with shallow work grooves and wrapped in waxed linen."),
  "hooked-knife": image("/assets/items/individual/hooked-knife.webp", "Hollis’s battered road knife, with a severe inward hook, split leather grip, and uneven rain-dark wear."),
  "gravecloth-coat": image("/assets/items/individual/gravecloth-coat.webp", "A long black gravecloth coat stiffened with waxed cord."),
  "binder-wraps": image("/assets/items/individual/binder-wraps.webp", "A matched pair of dark waxed forearm bindings."),
  "apothecary-apron": image("/assets/items/individual/apothecary-apron.webp", "A stiff leather apron scarred by acid and fire."),
  "burial-hood": image("/assets/items/individual/burial-hood.webp", "A layered black burial hood quilted with horsehair and reinforced by two narrow brow stays."),
  "road-leathers": image("/assets/items/individual/road-leathers.webp", "Layered road leathers reinforced across the ribs and shoulders."),
  "ash-hide-boots": image("/assets/items/individual/ash-hide-boots.webp", "A pair of ash-gray boots patched with pale hide."),
  "grave-iron-mask": image("/assets/items/individual/grave-iron-mask.webp", "A thin iron funerary mask hammered over old bone."),
  "saint-bone-charm": image("/assets/items/individual/saint-bone-charm.webp", "Three small finger bones wired around a lead seal.", "3 / 4"),
  "debtor-tally": image("/assets/items/individual/debtor-tally.webp", "A worn copper tally cut with deep accounting notches.", "3 / 4"),
  "black-tonic": image("/assets/items/individual/black-tonic.webp", "A squat stoppered bottle filled with opaque black tonic.", "3 / 4"),
  "linen-binding": image("/assets/items/individual/linen-binding.webp", "A roll of boiled linen beside a small pot of resin.", "3 / 4"),
  "ossuary-ichor": image("/assets/items/individual/ossuary-ichor.webp", "A sealed ampoule holding silver-black ossuary residue.", "3 / 4"),
  "hound-tooth": image("/assets/items/individual/hound-tooth.webp", "A smoke-gray hound tooth with its hooked root intact.", "3 / 4"),
  "grave-salt": image("/assets/items/individual/grave-salt.webp", "A paper twist opened around coarse gray grave salt.", "3 / 4"),
  "mortuary-tallow": image("/assets/items/individual/mortuary-tallow.webp", "A hard gray-white cake of mortuary tallow.", "3 / 4"),
  "vigil-cordial": image("/assets/items/individual/vigil-cordial.webp", "A single brown-glass vial of vigil cordial, corked and tied with black waxed thread.", "3 / 4"),
  "carrier-harness": image("/assets/items/individual/carrier-harness.webp", "A broad, worn leather carrying harness with rope loops and low iron rings."),
  "grave-copper": image("/assets/items/individual/grave-copper.webp", "Thin green-edged copper vault fittings punched with small burial marks.", "3 / 4"),
  "orra-crozier": image("/assets/items/individual/orra-crozier.webp", "Saint Orra's broken grave-iron crozier, its hooked head inset with old bone and dark wax."),
} satisfies Record<ItemId, ItemVisualDefinition>;

export const itemVisual = (
  itemId: ItemId,
): ItemVisualDefinition => ITEM_VISUALS[itemId];
