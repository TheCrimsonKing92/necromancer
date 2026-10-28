import type { BodyPartId, Combatant } from "../types";
import { COMBATANT_IDENTITY_PROFILES } from "./identity-profiles";

const possessive = (name: string): string =>
  /s$/i.test(name) ? `${name}’` : `${name}’s`;

const defeatProfileFor = (
  target: Combatant,
): (typeof COMBATANT_IDENTITY_PROFILES)[keyof typeof COMBATANT_IDENTITY_PROFILES]["defeatProfile"] =>
  target.identityProfileId
    ? COMBATANT_IDENTITY_PROFILES[target.identityProfileId].defeatProfile
    : target.materiality === "incorporeal"
      ? "manifestation"
      : target.anatomy === "quadruped"
        ? "grave-hound"
        : "living-humanoid";

export const combatantDefeatText = (
  target: Combatant,
  cause: "health" | "vital-region",
  location?: BodyPartId,
  locationLabel?: string,
  woundLabel?: string,
): string => {
  const profile = defeatProfileFor(target);
  if (profile === "grave-hound") {
    return cause === "vital-region"
      ? location === "head"
        ? `${possessive(target.name)} ruined head strikes the ground first. The cinder behind the hound’s teeth gutters out`
        : `${possessive(target.name)} ${(
            woundLabel ?? locationLabel ?? "ruined frame"
          ).toLowerCase()} gives way. Its legs collapse, and the cinder behind its teeth gutters out`
      : `${target.name} loses its footing. The cinder behind its teeth gutters out before the body reaches the ground`;
  }
  if (profile === "manifestation") {
    return cause === "vital-region"
      ? `${possessive(target.name)} ${(
          woundLabel ?? locationLabel ?? "core"
        ).toLowerCase()} loses coherence. The whole outline unthreads into the weather`
      : `The last force holding ${possessive(target.name)} outline is spent. It unthreads into the weather`;
  }
  if (profile === "bound-saint") {
    return cause === "vital-region"
      ? `${possessive(target.name)} ${(
          woundLabel ?? locationLabel ?? "borrowed shape"
        ).toLowerCase()} gives way. The names holding her together come loose, one by one`
      : `The last borrowed force in ${target.name} is spent. Her shape slackens, and its names come loose one by one`;
  }
  if (cause === "vital-region") {
    return location === "head"
      ? `${possessive(target.name)} head is destroyed. ${target.name} falls and does not move again`
      : `${possessive(target.name)} ${(
          woundLabel ?? locationLabel ?? "body"
        ).toLowerCase()} can bear no more. ${target.name} falls and does not rise`;
  }
  return `${target.name} falters under the accumulated hurt, falls, and does not rise`;
};
