import type {
  AnatomyId,
  BodyPartId,
  WoundCareId,
  WoundSeverity,
} from "../types";

export interface WoundDefinition {
  label: string;
  bleed: number;
  care: WoundCareId;
}

const HUMANOID_WOUNDS: Record<
  BodyPartId,
  Record<WoundSeverity, WoundDefinition>
> = {
  head: {
    minor: {
      label: "Scalp cut",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Concussion",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Fractured skull",
      bleed: 0,
      care: "rest",
    },
  },
  torso: {
    minor: {
      label: "Rib bruise",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Cracked ribs",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Ruptured chest",
      bleed: 2,
      care: "binding",
    },
  },
  leftArm: {
    minor: {
      label: "Cut left forearm",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn left arm",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled left arm",
      bleed: 2,
      care: "binding",
    },
  },
  rightArm: {
    minor: {
      label: "Cut right forearm",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn right arm",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled right arm",
      bleed: 2,
      care: "binding",
    },
  },
  leftLeg: {
    minor: {
      label: "Cut left shin",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn left leg",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled left leg",
      bleed: 2,
      care: "binding",
    },
  },
  rightLeg: {
    minor: {
      label: "Cut right shin",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn right leg",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled right leg",
      bleed: 2,
      care: "binding",
    },
  },
};

const QUADRUPED_WOUNDS: Record<
  BodyPartId,
  Record<WoundSeverity, WoundDefinition>
> = {
  head: {
    minor: {
      label: "Cut muzzle",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Concussion",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Fractured skull",
      bleed: 0,
      care: "rest",
    },
  },
  torso: {
    minor: {
      label: "Bruised ribs",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Cracked ribs",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Torn flank",
      bleed: 2,
      care: "binding",
    },
  },
  leftArm: {
    minor: {
      label: "Cut left forepaw",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn left foreleg",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled left foreleg",
      bleed: 2,
      care: "binding",
    },
  },
  rightArm: {
    minor: {
      label: "Cut right forepaw",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn right foreleg",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled right foreleg",
      bleed: 2,
      care: "binding",
    },
  },
  leftLeg: {
    minor: {
      label: "Cut left hind paw",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn left hind leg",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled left hind leg",
      bleed: 2,
      care: "binding",
    },
  },
  rightLeg: {
    minor: {
      label: "Cut right hind paw",
      bleed: 0,
      care: "binding",
    },
    serious: {
      label: "Torn right hind leg",
      bleed: 1,
      care: "binding",
    },
    grievous: {
      label: "Mangled right hind leg",
      bleed: 2,
      care: "binding",
    },
  },
};

const MANIFESTATION_WOUNDS: Record<
  BodyPartId,
  Record<WoundSeverity, WoundDefinition>
> = {
  head: {
    minor: {
      label: "Frayed visage",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Split countenance",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Collapsing visage",
      bleed: 0,
      care: "rest",
    },
  },
  torso: {
    minor: {
      label: "Faltering outline",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Riven core",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Unraveling core",
      bleed: 0,
      care: "rest",
    },
  },
  leftArm: {
    minor: {
      label: "Frayed left reach",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Riven left reach",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Dissolving left reach",
      bleed: 0,
      care: "rest",
    },
  },
  rightArm: {
    minor: {
      label: "Frayed right reach",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Riven right reach",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Dissolving right reach",
      bleed: 0,
      care: "rest",
    },
  },
  leftLeg: {
    minor: {
      label: "Loosened left tether",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Fraying left tether",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Unmoored left tether",
      bleed: 0,
      care: "rest",
    },
  },
  rightLeg: {
    minor: {
      label: "Loosened right tether",
      bleed: 0,
      care: "rest",
    },
    serious: {
      label: "Fraying right tether",
      bleed: 0,
      care: "rest",
    },
    grievous: {
      label: "Unmoored right tether",
      bleed: 0,
      care: "rest",
    },
  },
};

const WOUNDS_BY_ANATOMY: Record<
  AnatomyId,
  Record<BodyPartId, Record<WoundSeverity, WoundDefinition>>
> = {
  humanoid: HUMANOID_WOUNDS,
  quadruped: QUADRUPED_WOUNDS,
  manifestation: MANIFESTATION_WOUNDS,
};

export const anatomyWoundDefinition = (
  anatomy: AnatomyId,
  part: BodyPartId,
  severity: WoundSeverity,
): WoundDefinition => WOUNDS_BY_ANATOMY[anatomy][part][severity];
