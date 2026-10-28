import type {
  AnatomyId,
  BodyPartId,
  InjuryProfileId,
  WoundSeverity,
} from "../types";
import { ANATOMY_PARTS } from "./definitions";
import {
  anatomyWoundDefinition,
  type WoundDefinition,
} from "./wound-catalog";

export const profiledWoundDefinition = (
  part: BodyPartId,
  severity: WoundSeverity,
  anatomy: AnatomyId,
  profile: InjuryProfileId,
): WoundDefinition => {
  const existing = anatomyWoundDefinition(anatomy, part, severity);

  // A manifestation's regions describe coherence rather than flesh. Its
  // wounds therefore follow its form regardless of the instrument used.
  if (anatomy === "manifestation") return existing;

  const region = ANATOMY_PARTS[anatomy][part].label.toLowerCase();
  if (profile === "impact") {
    if (part === "head") {
      return {
        label:
          severity === "minor"
            ? "Head bruise"
            : severity === "serious"
              ? "Concussion"
              : "Fractured skull",
        bleed: 0,
        care: "rest",
      };
    }
    if (part === "torso") {
      return {
        label:
          severity === "minor"
            ? "Rib bruise"
            : severity === "serious"
              ? "Cracked ribs"
              : "Crushed chest",
        bleed: 0,
        care: "rest",
      };
    }
    return {
      label: `${
        severity === "minor"
          ? "Bruised"
          : severity === "serious"
            ? "Fractured"
            : "Crushed"
      } ${region}`,
      bleed: 0,
      care: "rest",
    };
  }

  const labels: Record<
    Exclude<InjuryProfileId, "impact">,
    Record<WoundSeverity, string>
  > = {
    edge: {
      minor: `Cut ${region}`,
      serious: `Gashed ${region}`,
      grievous: `Opened ${region}`,
    },
    puncture: {
      minor: `Pierced ${region}`,
      serious: `Impaled ${region}`,
      grievous: `Transfixed ${region}`,
    },
    bite: {
      minor: `Tooth-marked ${region}`,
      serious: `Torn ${region}`,
      grievous: `Mangled ${region}`,
    },
    "grave-salt": {
      minor: `Salt-burned ${region}`,
      serious: `Desiccated ${region}`,
      grievous: `Crystallized ${region}`,
    },
    "cold-fire": {
      minor: `Cold-burned ${region}`,
      serious: `Necrotized ${region}`,
      grievous: `Cold-charred ${region}`,
    },
    spectral: {
      minor: `Spirit-bruised ${region}`,
      serious: `Withered ${region}`,
      grievous: `Spirit-riven ${region}`,
    },
  };
  const bleeding =
    profile === "edge" ||
    profile === "puncture" ||
    profile === "bite";

  return {
    label: labels[profile][severity],
    bleed: bleeding
      ? severity === "grievous"
        ? 2
        : severity === "serious"
          ? 1
          : 0
      : 0,
    care: profile === "spectral" ? "rest" : "binding",
  };
};
