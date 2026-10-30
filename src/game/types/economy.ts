import type {
  TraditionId,
  CharacterAttributes,
  MundaneSkills,
  AdvancementId,
} from "./character";
import type { AdvancementReadinessState } from "./advancement";
import type {
  ItemId,
  Scar,
  Combatant,
  InventoryState,
  EquipmentState,
  CharacterSex,
} from "./combat";

export type EconomyMarketId = "north-vey-reliquary";
export type EconomyServiceId = "graveglass-ward";

export interface MarketActivityState {
  purchases: Partial<Record<ItemId, number>>;
  services: Partial<Record<EconomyServiceId, number>>;
}

export interface EconomyState {
  markets: Partial<Record<EconomyMarketId, MarketActivityState>>;
}

export interface Player extends Combatant {
  kind: "player";
  sex: CharacterSex;
  tradition: TraditionId;
  level: number;
  xp: number;
  obols: number;
  advancements: AdvancementId[];
  advancementReadiness?: AdvancementReadinessState;
  scars: Scar[];
  attributes: CharacterAttributes;
  skills: MundaneSkills;
  spirit: number;
  maxSpirit: number;
  inventory: InventoryState;
  equipment: EquipmentState;
}

export interface TemporaryAlly extends Combatant {
  kind: "ally";
  lifetime: {
    kind: "temporary";
    remainingTurns: number;
  };
}

export interface PersistentAlly extends Combatant {
  kind: "ally";
  lifetime: {
    kind: "persistent";
    servantId: string;
  };
}

export type Ally = TemporaryAlly | PersistentAlly;
