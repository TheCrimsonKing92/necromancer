export interface ActionProofSceneAsset {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export interface ActionProofSceneAnchor {
  readonly id: string;
  readonly ground: "road" | "yard" | "bridge" | "floor" | "threshold" | "wild";
  readonly desktop: readonly [x: number, y: number];
  readonly mobile: readonly [x: number, y: number];
  readonly depth: number;
}

export interface ActionProofSceneStateLayer {
  readonly id: string;
  readonly asset: ActionProofSceneAsset;
  readonly anchorId?: string;
  readonly purpose: string;
}

export interface ActionProofSceneArtDefinition {
  readonly id: string;
  readonly projection: "isometric";
  readonly desktop: ActionProofSceneAsset;
  readonly mobile: ActionProofSceneAsset;
  readonly standingFigureHeightPercent: number;
  readonly anchors: readonly ActionProofSceneAnchor[];
  readonly stateLayers: readonly ActionProofSceneStateLayer[];
}

const coordinatesAreValid = ([x, y]: readonly [number, number]): boolean =>
  Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100;

export const validateActionProofSceneArt = (
  definition: ActionProofSceneArtDefinition,
): readonly string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  if (!definition.id.trim()) errors.push("Scene art must have an id.");
  if (!definition.desktop.src || !definition.mobile.src) errors.push(`${definition.id}: both responsive scene plates are required.`);
  if (definition.desktop.width <= 0 || definition.desktop.height <= 0 || definition.mobile.width <= 0 || definition.mobile.height <= 0) {
    errors.push(`${definition.id}: scene plate dimensions must be positive.`);
  }
  if (definition.standingFigureHeightPercent < 5 || definition.standingFigureHeightPercent > 24) {
    errors.push(`${definition.id}: standing figure scale must remain between 5% and 24% of the scene height.`);
  }
  for (const anchor of definition.anchors) {
    if (ids.has(anchor.id)) errors.push(`${definition.id}: duplicate anchor ${anchor.id}.`);
    ids.add(anchor.id);
    if (!coordinatesAreValid(anchor.desktop) || !coordinatesAreValid(anchor.mobile)) {
      errors.push(`${definition.id}: anchor ${anchor.id} falls outside a scene plate.`);
    }
    if (!Number.isFinite(anchor.depth)) errors.push(`${definition.id}: anchor ${anchor.id} needs a finite depth.`);
  }
  for (const layer of definition.stateLayers) {
    if (!layer.id.trim() || !layer.asset.src || !layer.purpose.trim()) {
      errors.push(`${definition.id}: every state layer needs an id, asset, and semantic purpose.`);
    }
    if (layer.anchorId && !ids.has(layer.anchorId)) {
      errors.push(`${definition.id}: state layer ${layer.id} refers to missing anchor ${layer.anchorId}.`);
    }
  }
  return errors;
};

export const actionProofSceneAnchorIndex = (
  definition: ActionProofSceneArtDefinition,
): ReadonlyMap<string, ActionProofSceneAnchor> =>
  new Map(definition.anchors.map((anchor) => [anchor.id, anchor]));

export const actionProofSceneAnchorStyle = (anchor: ActionProofSceneAnchor): string =>
  `--stage-x:${anchor.desktop[0]}%;--stage-y:${anchor.desktop[1]}%;--stage-mobile-x:${anchor.mobile[0]}%;--stage-mobile-y:${anchor.mobile[1]}%;--stage-depth:${anchor.depth}`;

