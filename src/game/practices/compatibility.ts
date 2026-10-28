import type { TraditionId } from "../types";
import type {
  PracticeCapabilityId,
  PracticeId,
} from "./types";

export type PrototypeCompatibilityKind =
  | "direct-prototype"
  | "conceptual-predecessor"
  | "renamed-prototype";

export interface PrototypePracticeCompatibility {
  traditionId: TraditionId;
  practiceId: PracticeId;
  kind: PrototypeCompatibilityKind;
  /**
   * Capabilities actually supported by current production mechanics/content.
   * This deliberately does not copy every target-practice capability.
   */
  implementedCapabilities: readonly PracticeCapabilityId[];
}

export const PROTOTYPE_PRACTICE_COMPATIBILITY = {
  medium: {
    traditionId: "medium",
    practiceId: "medium",
    kind: "direct-prototype",
    implementedCapabilities: [
      "host-dead-initiative",
      "receive-dead-testimony",
    ],
  },
  summoner: {
    traditionId: "summoner",
    practiceId: "bonebinder",
    kind: "conceptual-predecessor",
    implementedCapabilities: ["command-dead-initiative"],
  },
  thaumaturgist: {
    traditionId: "thaumaturgist",
    practiceId: "renderer",
    kind: "renamed-prototype",
    implementedCapabilities: [
      "diagnose-death-altered-matter",
      "render-death-altered-matter",
    ],
  },
  "grave-warden": {
    traditionId: "grave-warden",
    practiceId: "grave-warden",
    kind: "direct-prototype",
    implementedCapabilities: [
      "establish-mortuary-seal",
      "diagnose-continuity-breach",
    ],
  },
} as const satisfies Record<
  TraditionId,
  PrototypePracticeCompatibility
>;

export const prototypeTraditionHasCapability = (
  traditionId: TraditionId,
  capability: PracticeCapabilityId,
): boolean =>
  PROTOTYPE_PRACTICE_COMPATIBILITY[
    traditionId
  ].implementedCapabilities.some(
    (implemented) =>
      (implemented as PracticeCapabilityId) === capability,
  );
