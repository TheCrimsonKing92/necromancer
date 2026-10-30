import type {
  TraditionId,
  AttributeId,
  CharacterAttributes,
  MundaneSkills,
  AdvancementRuleId,
} from "./character";
import type { ActionId } from "./combat";

export interface TraditionDefinition {
  id: TraditionId;
  name: string;
  epithet: string;
  description: string;
  doctrine: string;
  occultAttribute: AttributeId;
  startingAttributes: CharacterAttributes;
  startingSkills: MundaneSkills;
  startingSpirit: number;
  actions: [ActionId, ActionId];
}

export type AdvancementModifierId =
  | "spirit-lash-ward"
  | "spirit-lash-damage"
  | "borrowed-might-ward-buffer"
  | "shade-attack"
  | "shade-duration"
  | "shade-health-return"
  | "shade-final-service"
  | "corpsefire-duration"
  | "corpsefire-base-damage"
  | "corpsefire-block-recovery"
  | "corpsefire-exposed"
  | "grave-salt-quench-burning"
  | "recovery-condition"
  | "scar-condition-penalty-reduction"
  | "brace-critical-ward"
  | "mercy-spirit"
  | "overflow-spirit-ward";

export interface AdvancementEffect {
  maxHp?: number;
  maxSpirit?: number;
  skills?: Partial<MundaneSkills>;
  modifiers?: Partial<Record<AdvancementModifierId, number>>;
  rules?: AdvancementRuleId[];
}
