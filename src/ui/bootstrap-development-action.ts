import type { StorageLike } from "../game/persistence/save-metadata";
import type { TraditionId } from "../game/types";

const isPrototypeTradition = (
  value: string | undefined,
): value is TraditionId =>
  value === "medium" || value === "summoner" ||
  value === "thaumaturgist" || value === "grave-warden";

export const admitDevelopmentPrototype = async (
  root: HTMLElement,
  storage: StorageLike,
  origin: HTMLElement,
): Promise<boolean> => {
  origin.setAttribute("aria-busy", "true");
  if (origin.dataset.action === "start-action-prototype") {
    const [runtime] = await Promise.all([
      import("./development-action-prototype-app"),
      import("./development-tactical-prototype-style"),
    ]);
    return Boolean(await runtime.DevelopmentActionPrototypeApp.mount(
      root,
      storage,
      origin.dataset.prototypeId,
    ));
  }
  if (origin.dataset.action === "start-tactical-prototype") {
    const [runtime] = await Promise.all([
      import("./development-tactical-prototype-app"),
      import("./development-tactical-prototype-style"),
    ]);
    return Boolean(await runtime.DevelopmentTacticalPrototypeApp.mount(
      root,
      storage,
      origin.dataset.prototypeId,
    ));
  }

  const tradition = origin.dataset.tradition;
  if (
    origin.dataset.action !== "start-fire-road-prototype" ||
    !isPrototypeTradition(tradition)
  ) return false;

  const [runtime, prototype] = await Promise.all([
    import("./app"),
    import("../game/content-packs/development-loader"),
    import("./story-approach-surface-style"),
    import("./story-approach-surface"),
    import("./development-proof-surface"),
    import("./tactical-scene-surface-style"),
    import("./tactical-scene-surface"),
  ]);
  const initialState = await prototype.createMovingShadePrototypeState(tradition);
  const app = new runtime.NecromancerApp(root, storage, {
    initialState,
    ephemeral: true,
    ephemeralJourney: {
      isComplete: prototype.movingShadePrototypeIsComplete,
      start: prototype.createMovingShadePrototypeState,
    },
  });
  await app.mount();
  return true;
};
