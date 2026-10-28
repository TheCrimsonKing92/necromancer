import { ACTIONS, TRADITIONS } from "../game/content";
import { EQUIPMENT_SLOTS, ITEMS } from "../game/items";
import type {
  ActionId,
  CharacterSex,
  EquipmentSlot,
  ItemId,
  TraditionId,
} from "../game/types";

export const isTraditionId = (value: string): value is TraditionId =>
  Object.hasOwn(TRADITIONS, value);

export const isActionId = (value: string): value is ActionId =>
  Object.hasOwn(ACTIONS, value);

export const isCharacterSex = (
  value: string,
): value is CharacterSex =>
  value === "male" || value === "female" || value === "other";

export const isItemId = (value: string): value is ItemId =>
  Object.hasOwn(ITEMS, value);

export const isEquipmentSlot = (
  value: string,
): value is EquipmentSlot =>
  (EQUIPMENT_SLOTS as string[]).includes(value);
