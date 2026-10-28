import type {
  ContentStoryTransitionContext,
  ContentStoryTransitionId,
  ContentStoryTransitionResult,
  ContentRuntime,
  LoadedStoryTransitionContribution,
} from "./types";
import type { ActiveStoryId, StoryScene } from "../types";
import { installContentStoryRuntimeAdapter } from "./story-runtime-port";

interface InstalledStoryOwner {
  readonly packId: string;
}

const scenes = new Map<string, StoryScene & InstalledStoryOwner>();
const transitions = new Map<
  ContentStoryTransitionId,
  LoadedStoryTransitionContribution
>();

const assertCompatibleOwner = (
  id: string,
  installedPackId: string | undefined,
  nextPackId: string,
): void => {
  if (installedPackId && installedPackId !== nextPackId) {
    throw new Error(
      `Content story entry "${id}" is already owned by "${installedPackId}".`,
    );
  }
};

export const installContentStoryRuntime = (runtime: ContentRuntime): void => {
  for (const [id, owned] of runtime.definitions.scenes) {
    const existing = scenes.get(id);
    assertCompatibleOwner(id, existing?.packId, owned.packId);
    scenes.set(id, Object.freeze({ ...owned.value, packId: owned.packId }));
  }
  for (const [id, contribution] of runtime.rules.storyTransitions) {
    const existing = transitions.get(id);
    assertCompatibleOwner(id, existing?.packId, contribution.packId);
    transitions.set(id, contribution);
  }
};

export const contentStorySceneFor = (
  id: ActiveStoryId,
): StoryScene | undefined => scenes.get(id);

export const resolveContentStoryTransition = (
  id: ContentStoryTransitionId,
  context: ContentStoryTransitionContext,
): ContentStoryTransitionResult | undefined =>
  transitions.get(id)?.resolve(context) ?? undefined;

installContentStoryRuntimeAdapter({
  sceneFor: contentStorySceneFor,
  resolveTransition: resolveContentStoryTransition,
});
