import type { ActionProofFigureTone } from "../development-prototypes/action-proof-figure-types";
import {
  ACTION_PROOF_FIGURES,
  ACTION_PROOF_VISUAL_RIGS,
  type ActionProofFigureVisual,
} from "./action-proof-visual-catalog";
import {
  projectAppearanceRecipe,
  type AnatomyVisualState,
  type AppearanceRecipe,
  type VisualLayerInput,
} from "./visual-rig";

const FALLBACK_BY_TONE: Readonly<Record<ActionProofFigureTone, ActionProofFigureVisual>> = {
  player: ACTION_PROOF_FIGURES.player!,
  ally: ACTION_PROOF_FIGURES.halwen!,
  neutral: ACTION_PROOF_FIGURES.mason!,
  danger: ACTION_PROOF_FIGURES["coalition-cutter"]!,
  occult: ACTION_PROOF_FIGURES.shade!,
};

export interface ActionProofAppearanceInput {
  readonly entityId: string;
  readonly tone: ActionProofFigureTone;
  readonly poseId?: string;
  readonly motionId?: string;
  readonly visualLayers?: readonly VisualLayerInput[];
  readonly anatomyStates?: readonly AnatomyVisualState[];
}

export interface ActionProofAppearanceRecipe extends AppearanceRecipe {
  readonly atlasCellClass: string;
}

/**
 * Adapts the prototypes' existing entity projection to the general recipe.
 * The atlas cell is an honest fallback; later equipment and condition visuals
 * can layer over it without changing a save or teaching game code asset paths.
 */
export const projectActionProofAppearance = ({
  entityId,
  tone,
  poseId,
  motionId,
  visualLayers,
  anatomyStates,
}: ActionProofAppearanceInput): ActionProofAppearanceRecipe => {
  const figure = ACTION_PROOF_FIGURES[entityId] ?? FALLBACK_BY_TONE[tone];
  const rig = ACTION_PROOF_VISUAL_RIGS[figure.rigId] ?? ACTION_PROOF_VISUAL_RIGS.humanoid!;
  return {
    ...projectAppearanceRecipe({
      rig,
      baseLayer: {
        visualId: figure.semanticVisualId,
        familyId: "painted-atlas-fallback",
        nodeIds: [rig.rootNodeId],
        layerOrder: 0,
        paintedFallback: true,
        assetClass: `action-stage__figure-art--${figure.atlasCellClass}`,
      },
      poseId,
      motionId,
      visualLayers,
      anatomyStates,
    }),
    atlasCellClass: figure.atlasCellClass,
  };
};
