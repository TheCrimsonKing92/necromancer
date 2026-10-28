export type VisualRigId = string;
export type VisualNodeId = string;
export type VisualPoseId = string;
export type VisualMotionId = string;
export type SemanticVisualId = string;
export type VisualMountId = string;
export type VisualFamilyId = string;

export interface VisualNodeDefinition {
  readonly id: VisualNodeId;
  readonly role: "root" | "body" | "limb" | "appendage" | "effect";
}

/**
 * A binding may join several anatomy parts to one visual node or spread one
 * anatomy part across several visual nodes. Visual anatomy is not required to
 * resemble a humanoid skeleton.
 */
export interface VisualAnatomyBinding {
  readonly anatomyPartIds: readonly string[];
  readonly nodeIds: readonly VisualNodeId[];
}

export interface VisualMountDefinition {
  readonly id: VisualMountId;
  readonly nodeIds: readonly VisualNodeId[];
  readonly compatibleFamilies: readonly VisualFamilyId[];
  readonly layerOrder: number;
  readonly occludesNodeIds?: readonly VisualNodeId[];
}

export interface VisualPoseDefinition {
  readonly id: VisualPoseId;
  readonly visibleNodeIds?: readonly VisualNodeId[];
}

export interface VisualMotionDefinition {
  readonly id: VisualMotionId;
  readonly poseId: VisualPoseId;
  readonly durationMs: number;
  readonly iterations: 1;
}

export interface VisualMotionProfile {
  readonly id: string;
  readonly motions: readonly VisualMotionDefinition[];
}

export interface VisualRigDefinition {
  readonly id: VisualRigId;
  readonly rootNodeId: VisualNodeId;
  readonly nodes: readonly VisualNodeDefinition[];
  readonly anatomyBindings: readonly VisualAnatomyBinding[];
  readonly mounts: readonly VisualMountDefinition[];
  readonly poses: readonly VisualPoseDefinition[];
  readonly defaultPoseId: VisualPoseId;
  readonly motionProfile: VisualMotionProfile;
}

export interface VisualLayerInput {
  readonly visualId: SemanticVisualId;
  readonly familyId: VisualFamilyId;
  readonly assetClass?: string;
  readonly paintedFallback?: boolean;
  readonly mountId?: VisualMountId;
  readonly nodeIds?: readonly VisualNodeId[];
  readonly layerOrder?: number;
  readonly occludesNodeIds?: readonly VisualNodeId[];
}

export interface AnatomyVisualState {
  readonly anatomyPartId: string;
  readonly visualId: SemanticVisualId;
  readonly assetClass?: string;
  readonly layerOrder?: number;
}

export interface AppearanceProjectionInput {
  readonly rig: VisualRigDefinition;
  readonly baseLayer: VisualLayerInput;
  readonly poseId?: VisualPoseId;
  readonly motionId?: VisualMotionId;
  readonly visualLayers?: readonly VisualLayerInput[];
  readonly anatomyStates?: readonly AnatomyVisualState[];
}

export interface AppearanceLayer {
  readonly visualId: SemanticVisualId;
  readonly nodeIds: readonly VisualNodeId[];
  readonly layerOrder: number;
  readonly occludesNodeIds: readonly VisualNodeId[];
  readonly assetClass?: string;
  readonly paintedFallback: boolean;
}

export interface AppearanceRecipe {
  readonly rigId: VisualRigId;
  readonly poseId: VisualPoseId;
  readonly motionId?: VisualMotionId;
  readonly supportedMotionIds: readonly VisualMotionId[];
  readonly layers: readonly AppearanceLayer[];
  readonly affectedNodeIds: readonly VisualNodeId[];
  readonly occludedNodeIds: readonly VisualNodeId[];
  readonly rejectedVisualIds: readonly SemanticVisualId[];
}

const unique = <Value>(values: readonly Value[]): Value[] => [...new Set(values)];

export const visualNodesForAnatomyPart = (
  rig: VisualRigDefinition,
  anatomyPartId: string,
): readonly VisualNodeId[] => unique(rig.anatomyBindings
  .filter(({ anatomyPartIds }) => anatomyPartIds.includes(anatomyPartId))
  .flatMap(({ nodeIds }) => nodeIds));

const layerFromInput = (
  input: VisualLayerInput,
  nodeIds: readonly VisualNodeId[],
  layerOrder: number,
  occludesNodeIds: readonly VisualNodeId[] = [],
): AppearanceLayer => ({
  visualId: input.visualId,
  nodeIds,
  layerOrder,
  occludesNodeIds,
  paintedFallback: input.paintedFallback ?? false,
  ...(input.assetClass ? { assetClass: input.assetClass } : {}),
});

/** Pure UI projection. It derives an appearance recipe and never mutates state. */
export const projectAppearanceRecipe = ({
  rig,
  baseLayer,
  poseId,
  motionId,
  visualLayers = [],
  anatomyStates = [],
}: AppearanceProjectionInput): AppearanceRecipe => {
  const nodeIds = new Set(rig.nodes.map(({ id }) => id));
  const requestedPose = rig.poses.some(({ id }) => id === poseId)
    ? poseId!
    : rig.defaultPoseId;
  const supportedMotion = rig.motionProfile.motions.find(({ id }) => id === motionId);
  const layers: AppearanceLayer[] = [layerFromInput(
    baseLayer,
    baseLayer.nodeIds?.filter((id) => nodeIds.has(id)) ?? [rig.rootNodeId],
    baseLayer.layerOrder ?? 0,
    baseLayer.occludesNodeIds?.filter((id) => nodeIds.has(id)),
  )];
  const rejectedVisualIds: SemanticVisualId[] = [];
  const affectedNodeIds: VisualNodeId[] = [];

  for (const visual of visualLayers) {
    if (visual.mountId) {
      const mount = rig.mounts.find(({ id }) => id === visual.mountId);
      if (!mount || !mount.compatibleFamilies.includes(visual.familyId)) {
        rejectedVisualIds.push(visual.visualId);
        continue;
      }
      layers.push(layerFromInput(
        visual,
        mount.nodeIds,
        visual.layerOrder ?? mount.layerOrder,
        visual.occludesNodeIds ?? mount.occludesNodeIds,
      ));
      continue;
    }

    const explicitNodes = visual.nodeIds?.filter((id) => nodeIds.has(id));
    if (!explicitNodes?.length) {
      rejectedVisualIds.push(visual.visualId);
      continue;
    }
    layers.push(layerFromInput(
      visual,
      explicitNodes,
      visual.layerOrder ?? 50,
      visual.occludesNodeIds?.filter((id) => nodeIds.has(id)),
    ));
  }

  for (const state of anatomyStates) {
    const affected = visualNodesForAnatomyPart(rig, state.anatomyPartId);
    if (!affected.length) {
      rejectedVisualIds.push(state.visualId);
      continue;
    }
    affectedNodeIds.push(...affected);
    layers.push({
      visualId: state.visualId,
      nodeIds: affected,
      layerOrder: state.layerOrder ?? 80,
      occludesNodeIds: [],
      paintedFallback: false,
      ...(state.assetClass ? { assetClass: state.assetClass } : {}),
    });
  }

  layers.sort((left, right) => left.layerOrder - right.layerOrder);
  return {
    rigId: rig.id,
    poseId: supportedMotion?.poseId ?? requestedPose,
    ...(supportedMotion ? { motionId: supportedMotion.id } : {}),
    supportedMotionIds: rig.motionProfile.motions.map(({ id }) => id),
    layers,
    affectedNodeIds: unique(affectedNodeIds),
    occludedNodeIds: unique(layers.flatMap(({ occludesNodeIds }) => occludesNodeIds)),
    rejectedVisualIds,
  };
};

export const validateVisualRig = (rig: VisualRigDefinition): readonly string[] => {
  const errors: string[] = [];
  const nodeIds = rig.nodes.map(({ id }) => id);
  const nodes = new Set(nodeIds);
  const poseIds = rig.poses.map(({ id }) => id);
  const knownPoses = new Set(poseIds);
  const duplicate = (values: readonly string[]): boolean => new Set(values).size !== values.length;

  if (duplicate(nodeIds)) errors.push(`${rig.id}: duplicate visual node.`);
  if (!nodes.has(rig.rootNodeId)) errors.push(`${rig.id}: root node is missing.`);
  if (duplicate(poseIds)) errors.push(`${rig.id}: duplicate pose.`);
  if (!knownPoses.has(rig.defaultPoseId)) errors.push(`${rig.id}: default pose is missing.`);

  const referencedNodes = [
    ...rig.anatomyBindings.flatMap(({ nodeIds: ids }) => ids),
    ...rig.mounts.flatMap(({ nodeIds: ids, occludesNodeIds = [] }) => [...ids, ...occludesNodeIds]),
    ...rig.poses.flatMap(({ visibleNodeIds = [] }) => visibleNodeIds),
  ];
  for (const id of referencedNodes) {
    if (!nodes.has(id)) errors.push(`${rig.id}: visual node ${id} is not defined.`);
  }

  for (const motion of rig.motionProfile.motions) {
    if (!knownPoses.has(motion.poseId)) errors.push(`${rig.id}: motion ${motion.id} uses an unknown pose.`);
    if (motion.iterations !== 1 || motion.durationMs <= 0 || motion.durationMs > 1200) {
      errors.push(`${rig.id}: motion ${motion.id} must be finite and at most 1200ms.`);
    }
  }
  return unique(errors);
};
