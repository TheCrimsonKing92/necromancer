export type TraditionId =
  | "medium"
  | "summoner"
  | "thaumaturgist"
  | "grave-warden";
export type AttributeId =
  | "strength"
  | "dexterity"
  | "vitality"
  | "intelligence"
  | "willpower"
  | "charisma";
export type CharacterAttributes = Record<AttributeId, number>;
export type MundaneSkillId =
  | "athletics"
  | "medicine"
  | "survival"
  | "perception"
  | "persuasion"
  | "barter";
export type MundaneSkills = Record<MundaneSkillId, number>;
export type AdvancementId =
  | "two-way-passage"
  | "longer-leash"
  | "colder-furnace"
  | "hardened-vessel"
  | "deepened-well"
  | "echoing-passage"
  | "shared-hunger"
  | "white-ash"
  | "grave-callus"
  | "second-breath"
  | "tempered-passage"
  | "last-command"
  | "white-quench"
  | "last-stance"
  | "death-dividend"
  | "field-medicine"
  | "roadcraft"
  | "plain-dealing"
  | "cold-furnace-method"
  | "working-contingency"
  | "departure-disposition"
  | "letter-of-service"
  | "called-counsel"
  | "set-the-frame"
  | "residue-disposition"
  | "threshold-discipline"
  | "field-splint"
  | "worked-around";
export type AdvancementExpressionId =
  | "cold-furnace-white-quench"
  | "cold-furnace-long-reduction"
  | "abort-the-working"
  | "held-measure"
  | "bank-the-departure"
  | "open-hand"
  | "decant-the-remainder"
  | "carry-the-reduction"
  | "invitation-to-breach"
  | "closed-gate";
export type AdvancementRuleId =
  | "abort-the-working"
  | "held-measure"
  | "bank-the-departure"
  | "open-hand"
  | "letter-of-service"
  | "called-counsel"
  | "set-the-frame"
  | "decant-the-remainder"
  | "carry-the-reduction"
  | "invitation-to-breach"
  | "closed-gate"
  | "field-splint"
  | "worked-around";
export type AdvancementClassification =
  | "active"
  | "passive"
  | "transform"
  | "reaction"
  | "rank";
export type AdvancementReadinessKind = "practice" | "universal";
