import { MUNDANE_SKILLS, skillRankLabel } from "./character";
import { mundaneCheckChance } from "./checks";
import { checkProspectForChance, type CheckProspect } from "./check-prospect";
import type {
  StoryApproachCatalog,
  StoryApproachDefinition,
  StoryApproachId,
} from "./story-approaches";
import type { Player } from "./types";

export type StoryApproachProspect = CheckProspect;

export interface StoryApproachResolutionReadout {
  readonly summary: string;
  readonly method: string;
  readonly prospect: StoryApproachProspect | "Assured";
  readonly detail: string;
}

const certainMethod = (
  approach: StoryApproachDefinition,
  catalog: StoryApproachCatalog,
): string => {
  const labels = new Map(
    catalog.capabilities.map(({ id, label }) => [id, label] as const),
  );
  return approach.capabilities
    .map((id) => labels.get(id) ?? id)
    .join(" + ");
};

export const storyApproachResolutionReadout = (
  approach: StoryApproachDefinition,
  catalog: StoryApproachCatalog,
  player: Player,
): StoryApproachResolutionReadout => {
  if (approach.resolution.kind === "certain") {
    const method = certainMethod(approach, catalog);
    return {
      summary: `${method} · Assured`,
      method,
      prospect: "Assured",
      detail: "Resolves without a check while its stated requirements remain met.",
    };
  }

  const { skill, difficulty } = approach.resolution;
  const rank = player.skills[skill];
  const method = `${MUNDANE_SKILLS[skill].label} ${rank} · ${skillRankLabel(rank)}`;
  const prospect = checkProspectForChance(
    mundaneCheckChance(player, { skill, difficulty }),
  );
  return {
    summary: `${method} · ${prospect}`,
    method,
    prospect,
    detail: `Prospect under the present conditions: ${prospect}.`,
  };
};

export const storyApproachResolutionReadouts = (
  catalog: StoryApproachCatalog,
  player: Player,
): ReadonlyMap<StoryApproachId, StoryApproachResolutionReadout> =>
  new Map(
    catalog.approaches.map((approach) => [
      approach.id,
      storyApproachResolutionReadout(approach, catalog, player),
    ]),
  );
