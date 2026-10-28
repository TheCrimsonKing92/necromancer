import type {
  AnatomyId,
  BodyPartId,
} from "../types";

export interface BodyPartDefinition {
  id: BodyPartId;
  label: string;
  shortLabel: string;
  maxCondition: number;
  hitWeight: number;
  vital: boolean;
}

export interface AnatomyPartDefinition {
  label: string;
  shortLabel: string;
  hitWeight: number;
}

export const BODY_PARTS: BodyPartDefinition[] = [
  {
    id: "head",
    label: "Head",
    shortLabel: "Head",
    maxCondition: 8,
    hitWeight: 10,
    vital: true,
  },
  {
    id: "torso",
    label: "Torso",
    shortLabel: "Torso",
    maxCondition: 14,
    hitWeight: 30,
    vital: true,
  },
  {
    id: "leftArm",
    label: "Left arm",
    shortLabel: "L. arm",
    maxCondition: 10,
    hitWeight: 15,
    vital: false,
  },
  {
    id: "rightArm",
    label: "Right arm",
    shortLabel: "R. arm",
    maxCondition: 10,
    hitWeight: 15,
    vital: false,
  },
  {
    id: "leftLeg",
    label: "Left leg",
    shortLabel: "L. leg",
    maxCondition: 11,
    hitWeight: 15,
    vital: false,
  },
  {
    id: "rightLeg",
    label: "Right leg",
    shortLabel: "R. leg",
    maxCondition: 11,
    hitWeight: 15,
    vital: false,
  },
];

const HUMANOID_PARTS = Object.fromEntries(
  BODY_PARTS.map((part) => [
    part.id,
    {
      label: part.label,
      shortLabel: part.shortLabel,
      hitWeight: part.hitWeight,
    },
  ]),
) as Record<BodyPartId, AnatomyPartDefinition>;

const QUADRUPED_PARTS: Record<BodyPartId, AnatomyPartDefinition> = {
  head: {
    label: "Head",
    shortLabel: "Head",
    hitWeight: 15,
  },
  torso: {
    label: "Torso",
    shortLabel: "Torso",
    hitWeight: 35,
  },
  leftArm: {
    label: "Left foreleg",
    shortLabel: "L. foreleg",
    hitWeight: 12,
  },
  rightArm: {
    label: "Right foreleg",
    shortLabel: "R. foreleg",
    hitWeight: 12,
  },
  leftLeg: {
    label: "Left hind leg",
    shortLabel: "L. hind leg",
    hitWeight: 13,
  },
  rightLeg: {
    label: "Right hind leg",
    shortLabel: "R. hind leg",
    hitWeight: 13,
  },
};

const MANIFESTATION_PARTS: Record<BodyPartId, AnatomyPartDefinition> = {
  head: {
    label: "Visage",
    shortLabel: "Visage",
    hitWeight: 10,
  },
  torso: {
    label: "Core",
    shortLabel: "Core",
    hitWeight: 30,
  },
  leftArm: {
    label: "Left reach",
    shortLabel: "L. reach",
    hitWeight: 15,
  },
  rightArm: {
    label: "Right reach",
    shortLabel: "R. reach",
    hitWeight: 15,
  },
  leftLeg: {
    label: "Left tether",
    shortLabel: "L. tether",
    hitWeight: 15,
  },
  rightLeg: {
    label: "Right tether",
    shortLabel: "R. tether",
    hitWeight: 15,
  },
};

export const ANATOMY_PARTS: Record<
  AnatomyId,
  Record<BodyPartId, AnatomyPartDefinition>
> = {
  humanoid: HUMANOID_PARTS,
  quadruped: QUADRUPED_PARTS,
  manifestation: MANIFESTATION_PARTS,
};
