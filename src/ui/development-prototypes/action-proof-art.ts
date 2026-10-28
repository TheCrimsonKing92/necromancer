import { escapeHtml } from "../html";
import { projectActionProofAppearance } from "../visual-rigs/action-proof-appearance";
import type {
  AnatomyVisualState,
  VisualLayerInput,
} from "../visual-rigs/visual-rig";
import type { ActionProofFigureTone } from "./action-proof-figure-types";

export type { ActionProofFigureTone } from "./action-proof-figure-types";

const ACTION_GLYPH: Readonly<Record<string, string>> = {
  strike: "⚔",
  "raise-scout": "✦",
  "render-scout": "◇",
  "repair-shore": "⌁",
  "bind-wound": "+",
  "take-survey": "▤",
  withdraw: "↙",
  wait: "◷",
  "raise-road-dead": "✦",
  "clear-obstruction": "▰",
  "spirit-lash": "ϟ",
  "claim-grain": "▱",
  "order-follow": "●",
  "order-harry": "△",
  "order-guard": "▣",
  "order:follow": "●",
  "order:harry": "△",
  "order:brace": "▣",
};

const renderAppearanceLayer = ({
  visualId,
  nodeIds,
  layerOrder,
  occludesNodeIds,
  assetClass,
  paintedFallback,
}: ReturnType<typeof projectActionProofAppearance>["layers"][number]): string => {
  const classes = [
    "action-stage__visual-layer",
    ...(paintedFallback ? ["action-stage__figure-art"] : []),
    ...(assetClass ? [assetClass] : []),
  ].join(" ");
  return `<span class="${classes}" data-visual-id="${escapeHtml(visualId)}" data-visual-node-ids="${escapeHtml(nodeIds.join(" "))}"${occludesNodeIds.length ? ` data-occludes-visual-nodes="${escapeHtml(occludesNodeIds.join(" "))}"` : ""} style="--visual-layer-order:${layerOrder}" aria-hidden="true"></span>`;
};

// Compatibility seam for the two prototype renderers. The illustrated atlas
// remains the base layer while semantic equipment, condition, and effect layers
// can be derived over it without asset paths or state living in the domain.
export const renderActionProofFigure = ({
  id,
  label,
  tone,
  detail,
  style = "",
  offset = 0,
  poseId,
  motionId,
  visualLayers,
  anatomyStates,
  health,
  healthVisibility = "persistent",
  conversationId,
  conversationLabel,
  subjectId,
  subjectLabel,
}: {
  readonly id: string;
  readonly label: string;
  readonly tone: ActionProofFigureTone;
  readonly detail?: string;
  readonly style?: string;
  readonly offset?: number;
  readonly poseId?: string;
  readonly motionId?: string;
  readonly visualLayers?: readonly VisualLayerInput[];
  readonly anatomyStates?: readonly AnatomyVisualState[];
  readonly health?: { readonly current: number; readonly max: number };
  readonly healthVisibility?: "persistent" | "disclosure";
  readonly conversationId?: string;
  readonly conversationLabel?: string;
  readonly subjectId?: string;
  readonly subjectLabel?: string;
}): string => {
  const appearance = projectActionProofAppearance({
    entityId: id,
    tone,
    poseId,
    motionId,
    visualLayers,
    anatomyStates,
  });
  const accessible = `${label}${health ? `, ${health.current} of ${health.max} Health` : ""}${detail ? `, ${detail}` : ""}`;
  const healthRatio = health ? Math.max(0, Math.min(1, health.current / health.max)) : 0;
  const disclosesHealth = health && healthVisibility === "disclosure";
  const tag = conversationId || subjectId ? "button" : "span";
  const interaction = conversationId
    ? ` type="button" data-action="open-action-proof-conversation" data-action-proof-conversation-id="${escapeHtml(conversationId)}" aria-label="${escapeHtml(conversationLabel ?? `Speak with ${label}. ${accessible}`)}"`
    : subjectId
      ? ` type="button" data-action="select-action-proof-subject" data-action-proof-subject-id="${escapeHtml(subjectId)}" aria-expanded="false" aria-controls="action-proof-subject-${escapeHtml(subjectId)}" aria-label="${escapeHtml(subjectLabel ?? `Examine ${label}. ${accessible}`)}"`
    : ` role="img" aria-label="${escapeHtml(accessible)}"${disclosesHealth ? ' tabindex="0" data-health-disclosure' : ""}`;
  return `<${tag} class="action-stage__figure action-stage__figure--${tone}${disclosesHealth ? " action-stage__figure--health-disclosure" : ""}${conversationId ? " action-stage__figure--conversable" : ""}${subjectId ? " action-stage__figure--subject" : ""}" style="${style};--figure-offset:${offset}"${interaction}>
    <span class="action-stage__visual-rig" data-visual-entity-id="${escapeHtml(id)}" data-visual-rig-id="${escapeHtml(appearance.rigId)}" data-visual-pose-id="${escapeHtml(appearance.poseId)}" data-supported-motions="${escapeHtml(appearance.supportedMotionIds.join(" "))}"${appearance.motionId ? ` data-motion="${escapeHtml(appearance.motionId)}"` : ""}${appearance.affectedNodeIds.length ? ` data-affected-visual-nodes="${escapeHtml(appearance.affectedNodeIds.join(" "))}"` : ""}${appearance.occludedNodeIds.length ? ` data-occluded-visual-nodes="${escapeHtml(appearance.occludedNodeIds.join(" "))}"` : ""}>
      ${appearance.layers.map(renderAppearanceLayer).join("")}
    </span>
    <span class="action-stage__figure-name">${escapeHtml(label)}</span>
    ${health ? `<span class="action-stage__health${healthVisibility === "disclosure" ? " action-stage__health--disclosure" : " action-stage__health--persistent"}" role="meter" aria-label="${escapeHtml(`${label} Health`)}" aria-valuemin="0" aria-valuemax="${health.max}" aria-valuenow="${health.current}"><span class="action-stage__health-fill" style="--health-ratio:${healthRatio}"></span><small>${health.current}/${health.max}</small></span>` : ""}
    ${detail ? `<span class="action-stage__figure-detail">${escapeHtml(detail)}</span>` : ""}
  </${tag}>`;
};

export const actionProofGlyph = (actionId: string): string => ACTION_GLYPH[actionId] ?? "◆";
