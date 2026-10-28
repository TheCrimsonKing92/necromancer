// Build-only coordinates for regenerating right-sized production item images.
// Runtime presentation owns only the per-item URLs in src/game/item-visuals.ts.
const on = (id, file, columns, rows, column, row) => ({
  id,
  src: `/assets/items/${file}`,
  file,
  columns,
  rows,
  column,
  row,
});

export const ITEM_ART_SOURCE_DEFINITIONS = Object.freeze([
  on("ritual-knife", "weapons.png", 2, 2, 0, 0),
  on("bone-wand", "weapons.png", 2, 2, 1, 0),
  on("iron-sickle", "weapons.png", 2, 2, 0, 1),
  on("mortuary-mallet", "field-tools.png", 2, 2, 1, 0),
  on("warding-awl", "field-tools.png", 2, 2, 0, 1),
  on("hooked-knife", "field-tools.png", 2, 2, 0, 0),
  on("gravecloth-coat", "armor.png", 3, 2, 0, 0),
  on("binder-wraps", "armor.png", 3, 2, 1, 0),
  on("apothecary-apron", "armor.png", 3, 2, 2, 0),
  on("burial-hood", "field-tools.png", 2, 2, 1, 1),
  on("road-leathers", "armor.png", 3, 2, 0, 1),
  on("ash-hide-boots", "armor.png", 3, 2, 1, 1),
  on("grave-iron-mask", "armor.png", 3, 2, 2, 1),
  on("saint-bone-charm", "charms-and-supplies.png", 4, 2, 0, 0),
  on("debtor-tally", "charms-and-supplies.png", 4, 2, 1, 0),
  on("black-tonic", "charms-and-supplies.png", 4, 2, 2, 0),
  on("linen-binding", "charms-and-supplies.png", 4, 2, 3, 0),
  on("ossuary-ichor", "charms-and-supplies.png", 4, 2, 0, 1),
  on("hound-tooth", "charms-and-supplies.png", 4, 2, 1, 1),
  on("grave-salt", "charms-and-supplies.png", 4, 2, 2, 1),
  on("mortuary-tallow", "charms-and-supplies.png", 4, 2, 3, 1),
]);
