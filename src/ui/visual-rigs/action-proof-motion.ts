import type { DevelopmentActionIntent } from "../../game/development-action-proof";
import { ACTION_PROOF_VISUAL_RIGS } from "./action-proof-visual-catalog";

export interface ActionProofMotionCue {
  readonly entityId: string;
  readonly motionId: "settle" | "advance" | "commit" | "recoil" | "dissolve";
  readonly delayMs?: number;
}

const cue = (
  motionId: ActionProofMotionCue["motionId"],
  ...entityIds: readonly string[]
): readonly ActionProofMotionCue[] => entityIds.map((entityId) => ({ entityId, motionId }));

const delayedCue = (
  motionId: ActionProofMotionCue["motionId"],
  delayMs: number,
  ...entityIds: readonly string[]
): readonly ActionProofMotionCue[] => entityIds.map((entityId) => ({ entityId, motionId, delayMs }));

const ACTION_CUES: Readonly<Record<string, readonly ActionProofMotionCue[]>> = {
  strike: cue("commit", "player", "necromancer"),
  "spirit-lash": cue("commit", "player", "necromancer"),
  "raise-scout": cue("settle", "shade"),
  "raise-road-dead": cue("settle", "raised-carter"),
  "render-scout": cue("commit", "player", "necromancer"),
  "clear-obstruction": cue("commit", "servant", "ditch-hand"),
  "claim-grain": cue("commit", "raised-carter"),
  "order-harry": cue("commit", "servant", "ditch-hand"),
  "order:harry": cue("commit", "servant", "ditch-hand"),
};

export const motionCuesForActionProofIntent = (
  intent: DevelopmentActionIntent,
): readonly ActionProofMotionCue[] => intent.kind === "move"
  ? cue("advance", "player", "necromancer")
  : [
      ...(ACTION_CUES[intent.actionId] ?? cue("commit", "player", "necromancer")),
      ...(intent.targetId ? delayedCue("recoil", 150, intent.targetId) : []),
    ];

export const motionForRenderedFigure = (
  entityId: string,
  supportedMotionIds: readonly string[],
  cues: readonly ActionProofMotionCue[],
): ActionProofMotionCue["motionId"] | undefined => {
  const specific = cues.find((cue) => cue.entityId === entityId)?.motionId;
  const wildcard = cues.find((cue) => cue.entityId === "*")?.motionId;
  const motionId = specific ?? wildcard;
  return motionId && supportedMotionIds.includes(motionId) ? motionId : undefined;
};

/**
 * Applies a finite transition token after authoritative state has rendered.
 * Event delegation remains in the owning app; figures receive no listeners.
 */
export const applyActionProofMotionCues = (
  host: ParentNode,
  cues: readonly ActionProofMotionCue[],
): void => {
  for (const figure of host.querySelectorAll<HTMLElement>("[data-visual-entity-id]")) {
    const motionId = motionForRenderedFigure(
      figure.dataset.visualEntityId ?? "",
      (figure.dataset.supportedMotions ?? "").split(" "),
      cues,
    );
    if (!motionId) continue;
    figure.dataset.motion = motionId;
    const rig = ACTION_PROOF_VISUAL_RIGS[figure.dataset.visualRigId ?? ""];
    const motion = rig?.motionProfile.motions.find(({ id }) => id === motionId);
    if (motion) {
      const activeCue = cues.find(({ entityId }) => entityId === figure.dataset.visualEntityId)
        ?? cues.find(({ entityId }) => entityId === "*");
      figure.dataset.visualPoseId = motion.poseId;
      figure.style.setProperty("--visual-motion-duration", `${motion.durationMs}ms`);
      figure.style.setProperty("--visual-motion-delay", `${activeCue?.delayMs ?? 0}ms`);
    }
  }
};

export const ACTION_PROOF_ENTRY_MOTION: readonly ActionProofMotionCue[] = [
  { entityId: "*", motionId: "settle" },
];
