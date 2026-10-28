import type {
  AnatomyId,
  BodyPartId,
  BodyState,
} from "../types";
import { ANATOMY_PARTS, BODY_PARTS } from "./definitions";

export const createBody = (scale = 1): BodyState =>
  Object.fromEntries(
    BODY_PARTS.map((definition) => {
      const maxCondition = Math.max(
        1,
        Math.round(definition.maxCondition * scale),
      );
      return [
        definition.id,
        {
          id: definition.id,
          condition: maxCondition,
          maxCondition,
          wounds: [],
        },
      ];
    }),
  ) as unknown as BodyState;

export const getBodyPartLabel = (
  partId: BodyPartId,
  anatomy: AnatomyId = "humanoid",
): string => ANATOMY_PARTS[anatomy][partId].label;

export const getBodyPartShortLabel = (
  partId: BodyPartId,
  anatomy: AnatomyId = "humanoid",
): string => ANATOMY_PARTS[anatomy][partId].shortLabel;

export const pickBodyPart = (
  roll: number,
  anatomy: AnatomyId = "humanoid",
): BodyPartId => {
  const boundedRoll = Math.max(1, Math.min(100, Math.trunc(roll)));
  let cumulative = 0;

  for (const part of BODY_PARTS) {
    cumulative += ANATOMY_PARTS[anatomy][part.id].hitWeight;
    if (boundedRoll <= cumulative) return part.id;
  }

  return "torso";
};
