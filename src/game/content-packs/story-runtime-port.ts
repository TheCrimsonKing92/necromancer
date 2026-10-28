import type {
  ContentStoryTransitionContext,
  ContentStoryTransitionResult,
} from "./types";
import type {
  ActiveStoryId,
  ContentStoryTransitionId,
  StoryScene,
} from "../types";

interface ContentStoryRuntimeAdapter {
  readonly sceneFor: (id: ActiveStoryId) => StoryScene | undefined;
  readonly resolveTransition: (
    id: ContentStoryTransitionId,
    context: ContentStoryTransitionContext,
  ) => ContentStoryTransitionResult | undefined;
}

const inertAdapter: ContentStoryRuntimeAdapter = {
  sceneFor: () => undefined,
  resolveTransition: () => undefined,
};

let adapter = inertAdapter;

export const installContentStoryRuntimeAdapter = (
  next: ContentStoryRuntimeAdapter,
): void => {
  adapter = Object.freeze({ ...next });
};

export const contentStorySceneFor = (
  id: ActiveStoryId,
): StoryScene | undefined => adapter.sceneFor(id);

export const resolveContentStoryTransition = (
  id: ContentStoryTransitionId,
  context: ContentStoryTransitionContext,
): ContentStoryTransitionResult | undefined =>
  adapter.resolveTransition(id, context);
