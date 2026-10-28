import type {
  VisualMotionDefinition,
  VisualRigDefinition,
} from "./visual-rig";

const motion = (
  id: string,
  poseId: string,
  durationMs: number,
): VisualMotionDefinition => ({ id, poseId, durationMs, iterations: 1 });

const HUMANOID_RIG: VisualRigDefinition = {
  id: "humanoid",
  rootNodeId: "silhouette",
  nodes: [
    { id: "silhouette", role: "root" },
    { id: "head", role: "body" },
    { id: "torso", role: "body" },
    { id: "left-arm", role: "limb" },
    { id: "right-arm", role: "limb" },
    { id: "left-leg", role: "limb" },
    { id: "right-leg", role: "limb" },
  ],
  anatomyBindings: [
    { anatomyPartIds: ["head"], nodeIds: ["head"] },
    { anatomyPartIds: ["torso"], nodeIds: ["torso"] },
    { anatomyPartIds: ["leftArm"], nodeIds: ["left-arm"] },
    { anatomyPartIds: ["rightArm"], nodeIds: ["right-arm"] },
    { anatomyPartIds: ["leftLeg"], nodeIds: ["left-leg"] },
    { anatomyPartIds: ["rightLeg"], nodeIds: ["right-leg"] },
  ],
  mounts: [
    { id: "human-head", nodeIds: ["head"], compatibleFamilies: ["human-headwear"], layerOrder: 40, occludesNodeIds: ["head"] },
    { id: "human-torso", nodeIds: ["torso"], compatibleFamilies: ["human-torso-wear"], layerOrder: 30, occludesNodeIds: ["torso"] },
    { id: "human-main-grip", nodeIds: ["right-arm"], compatibleFamilies: ["held-one-hand"], layerOrder: 60 },
    { id: "human-off-grip", nodeIds: ["left-arm"], compatibleFamilies: ["held-one-hand"], layerOrder: 55 },
  ],
  poses: [
    { id: "human-rest" },
    { id: "human-step" },
    { id: "human-commit" },
    { id: "human-recoil" },
    { id: "human-dissolve" },
  ],
  defaultPoseId: "human-rest",
  motionProfile: {
    id: "humanoid-bounded",
    motions: [
      motion("settle", "human-rest", 260),
      motion("advance", "human-step", 210),
      motion("commit", "human-commit", 240),
      motion("recoil", "human-recoil", 220),
      motion("dissolve", "human-dissolve", 360),
    ],
  },
};

/**
 * The hound deliberately cannot accept human hand/head/torso mounts. Its
 * current domain part IDs map onto canine visual nodes, including a shared
 * forequarters node and separate paws.
 */
export const QUADRUPED_HOUND_RIG: VisualRigDefinition = {
  id: "quadruped-hound",
  rootNodeId: "hound-silhouette",
  nodes: [
    { id: "hound-silhouette", role: "root" },
    { id: "skull", role: "body" },
    { id: "trunk", role: "body" },
    { id: "forequarters", role: "body" },
    { id: "left-foreleg", role: "limb" },
    { id: "right-foreleg", role: "limb" },
    { id: "left-forepaw", role: "appendage" },
    { id: "right-forepaw", role: "appendage" },
    { id: "hindquarters", role: "body" },
    { id: "left-hindleg", role: "limb" },
    { id: "right-hindleg", role: "limb" },
    { id: "tail", role: "appendage" },
  ],
  anatomyBindings: [
    { anatomyPartIds: ["head"], nodeIds: ["skull"] },
    { anatomyPartIds: ["torso"], nodeIds: ["trunk", "hindquarters"] },
    { anatomyPartIds: ["leftArm", "rightArm"], nodeIds: ["forequarters"] },
    { anatomyPartIds: ["leftArm"], nodeIds: ["left-foreleg", "left-forepaw"] },
    { anatomyPartIds: ["rightArm"], nodeIds: ["right-foreleg", "right-forepaw"] },
    { anatomyPartIds: ["leftLeg"], nodeIds: ["left-hindleg"] },
    { anatomyPartIds: ["rightLeg"], nodeIds: ["right-hindleg"] },
  ],
  mounts: [
    { id: "hound-neck", nodeIds: ["skull", "trunk"], compatibleFamilies: ["hound-neckwear"], layerOrder: 42 },
    { id: "hound-back", nodeIds: ["trunk"], compatibleFamilies: ["hound-harness"], layerOrder: 38, occludesNodeIds: ["trunk"] },
  ],
  poses: [
    { id: "hound-rest" },
    { id: "hound-run" },
    { id: "hound-lunge" },
    { id: "hound-recoil" },
    { id: "hound-dissolve" },
  ],
  defaultPoseId: "hound-rest",
  motionProfile: {
    id: "hound-bounded",
    motions: [
      motion("settle", "hound-rest", 240),
      motion("advance", "hound-run", 190),
      motion("commit", "hound-lunge", 220),
      motion("recoil", "hound-recoil", 220),
      motion("dissolve", "hound-dissolve", 330),
    ],
  },
};

const MANIFESTATION_RIG: VisualRigDefinition = {
  id: "manifestation",
  rootNodeId: "manifested-form",
  nodes: [
    { id: "manifested-form", role: "root" },
    { id: "visage", role: "body" },
    { id: "core", role: "body" },
    { id: "reaches", role: "appendage" },
    { id: "tethers", role: "appendage" },
  ],
  anatomyBindings: [
    { anatomyPartIds: ["head"], nodeIds: ["visage"] },
    { anatomyPartIds: ["torso"], nodeIds: ["core"] },
    { anatomyPartIds: ["leftArm", "rightArm"], nodeIds: ["reaches"] },
    { anatomyPartIds: ["leftLeg", "rightLeg"], nodeIds: ["tethers"] },
  ],
  mounts: [],
  poses: [{ id: "form-rest" }, { id: "form-commit" }, { id: "form-recoil" }, { id: "form-dissolve" }],
  defaultPoseId: "form-rest",
  motionProfile: {
    id: "manifestation-bounded",
    motions: [
      motion("settle", "form-rest", 280),
      motion("commit", "form-commit", 250),
      motion("recoil", "form-recoil", 220),
      motion("dissolve", "form-dissolve", 380),
    ],
  },
};

const COLLECTIVE_RIG: VisualRigDefinition = {
  id: "collective",
  rootNodeId: "group",
  nodes: [{ id: "group", role: "root" }],
  anatomyBindings: [],
  mounts: [],
  poses: [{ id: "group-rest" }, { id: "group-step" }],
  defaultPoseId: "group-rest",
  motionProfile: {
    id: "collective-bounded",
    motions: [motion("settle", "group-rest", 260), motion("advance", "group-step", 220)],
  },
};

export const ACTION_PROOF_VISUAL_RIGS: Readonly<Record<string, VisualRigDefinition>> = {
  humanoid: HUMANOID_RIG,
  "quadruped-hound": QUADRUPED_HOUND_RIG,
  manifestation: MANIFESTATION_RIG,
  collective: COLLECTIVE_RIG,
};

export interface ActionProofFigureVisual {
  readonly atlasCellClass: string;
  readonly rigId: keyof typeof ACTION_PROOF_VISUAL_RIGS;
  readonly semanticVisualId: string;
}

export const ACTION_PROOF_FIGURES: Readonly<Record<string, ActionProofFigureVisual>> = {
  player: { atlasCellClass: "necromancer", rigId: "humanoid", semanticVisualId: "cast:necromancer" },
  necromancer: { atlasCellClass: "necromancer", rigId: "humanoid", semanticVisualId: "cast:necromancer" },
  servant: { atlasCellClass: "ditch-hand", rigId: "humanoid", semanticVisualId: "cast:ditch-hand" },
  "ditch-hand": { atlasCellClass: "ditch-hand", rigId: "humanoid", semanticVisualId: "cast:ditch-hand" },
  halwen: { atlasCellClass: "halwen", rigId: "humanoid", semanticVisualId: "cast:halwen" },
  mason: { atlasCellClass: "mason", rigId: "humanoid", semanticVisualId: "cast:mason" },
  "coalition-cutter": { atlasCellClass: "cutter", rigId: "humanoid", semanticVisualId: "cast:coalition-cutter" },
  "coalition-bow": { atlasCellClass: "bow", rigId: "humanoid", semanticVisualId: "cast:coalition-bow" },
  corpse: { atlasCellClass: "corpse", rigId: "humanoid", semanticVisualId: "cast:fallen-scout" },
  "road-dead": { atlasCellClass: "road-carter", rigId: "humanoid", semanticVisualId: "cast:road-carter" },
  shade: { atlasCellClass: "cutter", rigId: "manifestation", semanticVisualId: "cast:raised-scout" },
  "raised-carter": { atlasCellClass: "mason", rigId: "manifestation", semanticVisualId: "cast:raised-carter" },
  sera: { atlasCellClass: "sera", rigId: "humanoid", semanticVisualId: "cast:sera" },
  households: { atlasCellClass: "households", rigId: "collective", semanticVisualId: "cast:households" },
  hound: { atlasCellClass: "hound", rigId: "quadruped-hound", semanticVisualId: "cast:ash-hound" },
  "hound-remains": { atlasCellClass: "hound", rigId: "quadruped-hound", semanticVisualId: "cast:ash-hound-remains" },
};
