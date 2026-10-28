import {
  storyApproachById,
  validateStoryApproachCatalog,
  validateStoryApproachReadContext,
  type StoryApproachCatalog,
  type StoryApproachId,
  type StoryApproachIndex,
  type StoryApproachReadContext,
  type StoryApproachView,
  type StoryApproachSurfaceStatus,
  type StoryPreparationSummaryEntry,
} from "../story-approaches";
import type { ActiveStoryId, RunState } from "../types";
import {
  storyApproachResolutionReadouts,
  type StoryApproachResolutionReadout,
} from "../story-approach-resolution";

export interface ContentStoryApproachSurface {
  readonly ownerId: string;
  readonly sceneId: ActiveStoryId;
  readonly catalog: StoryApproachCatalog;
  readonly index: StoryApproachIndex;
  readonly transitionIds: ReadonlySet<string>;
  readonly contextFor: (run: RunState) => StoryApproachReadContext;
  readonly preparedFor: (run: RunState) => readonly StoryPreparationSummaryEntry[];
  readonly statusFor?: (run: RunState) => StoryApproachSurfaceStatus;
  readonly visibleFor?: (run: RunState) => boolean;
}

export interface ActiveStoryApproachSurface {
  readonly catalog: StoryApproachCatalog;
  readonly index: StoryApproachIndex;
  readonly context: StoryApproachReadContext;
  readonly prepared: readonly StoryPreparationSummaryEntry[];
  readonly resolutions: ReadonlyMap<StoryApproachId, StoryApproachResolutionReadout>;
  readonly status?: StoryApproachSurfaceStatus;
}

const surfaces = new Map<ActiveStoryId, ContentStoryApproachSurface>();

export const installContentStoryApproachSurface = (
  surface: ContentStoryApproachSurface,
): void => {
  const existing = surfaces.get(surface.sceneId);
  if (existing && existing.ownerId !== surface.ownerId) {
    throw new Error(
      `Story approach surface "${surface.sceneId}" is already owned by "${existing.ownerId}".`,
    );
  }
  const errors = validateStoryApproachCatalog(
    surface.catalog,
    surface.transitionIds,
  );
  if (errors.length > 0) {
    throw new Error(`Invalid story approach surface: ${errors.join(" ")}`);
  }
  surfaces.set(surface.sceneId, surface);
};

export const storyApproachSurfaceFor = (
  sceneId: ActiveStoryId,
  run: RunState,
): ActiveStoryApproachSurface | undefined => {
  const surface = surfaces.get(sceneId);
  if (!surface || surface.visibleFor?.(run) === false) return undefined;
  const context = surface.contextFor(run);
  const errors = validateStoryApproachReadContext(surface.catalog, context);
  if (errors.length > 0) {
    throw new Error(`Invalid story approach context: ${errors.join(" ")}`);
  }
  return {
    catalog: surface.catalog,
    index: surface.index,
    context,
    prepared: surface.preparedFor(run),
    resolutions: storyApproachResolutionReadouts(surface.catalog, run.player),
    status: surface.statusFor?.(run),
  };
};

export const activeStoryApproachFor = (
  sceneId: ActiveStoryId,
  run: RunState,
  approachId: StoryApproachId,
): StoryApproachView | undefined => {
  const surface = storyApproachSurfaceFor(sceneId, run);
  return surface
    ? storyApproachById(surface.index, surface.context, approachId)
    : undefined;
};
