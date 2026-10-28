export interface ActionProofSpatialPoint {
  readonly x: number;
  readonly y: number;
}

export type ActionProofSpatialSnapshot = ReadonlyMap<string, ActionProofSpatialPoint>;

const spatialPointFor = (visual: HTMLElement): ActionProofSpatialPoint | undefined => {
  const figure = visual.closest<HTMLElement>(".action-stage__figure");
  const frame = visual.closest<HTMLElement>(".action-stage__frame");
  if (!figure || !frame) return undefined;
  const figureRect = figure.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return {
    x: figureRect.left + (figureRect.width / 2) - frameRect.left,
    y: figureRect.top + (figureRect.height / 2) - frameRect.top,
  };
};

export const captureActionProofSpatialPositions = (host: ParentNode): ActionProofSpatialSnapshot => {
  const positions = new Map<string, ActionProofSpatialPoint>();
  for (const visual of host.querySelectorAll<HTMLElement>("[data-visual-entity-id]")) {
    const id = visual.dataset.visualEntityId;
    const point = id ? spatialPointFor(visual) : undefined;
    if (id && point) positions.set(id, point);
  }
  return positions;
};

export const actionProofTravelVector = (
  from: ActionProofSpatialPoint,
  to: ActionProofSpatialPoint,
): { readonly x: number; readonly y: number; readonly distance: number } => {
  const x = from.x - to.x;
  const y = from.y - to.y;
  return { x, y, distance: Math.hypot(x, y) };
};

const SPATIAL_TURN_BY_ENTITY: Readonly<Record<string, number>> = {
  player: 0,
  necromancer: 0,
  servant: 1,
  "ditch-hand": 1,
  shade: 2,
  "raised-carter": 2,
  sera: 3,
  households: 3,
  halwen: 3,
  mason: 3,
  hound: 4,
  "coalition-cutter": 4,
  "coalition-bow": 4,
};

export const actionProofSpatialTurnGroups = (
  entityIds: readonly string[],
): readonly (readonly string[])[] => {
  const turns = new Map<number, string[]>();
  for (const id of entityIds) {
    const turn = SPATIAL_TURN_BY_ENTITY[id] ?? 5;
    const group = turns.get(turn) ?? [];
    group.push(id);
    turns.set(turn, group);
  }
  return [...turns.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, ids]) => ids);
};

interface SpatialMover {
  readonly id: string;
  readonly figure: HTMLElement;
  readonly travel: ReturnType<typeof actionProofTravelVector>;
  readonly duration: number;
}

export const scheduleActionProofSpatialMotion = (
  host: HTMLElement,
  before: ActionProofSpatialSnapshot,
): void => {
  const view = host.ownerDocument.defaultView;
  if (!view || view.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  host.dataset.turnSequenceActive = "";
  host.setAttribute("aria-busy", "true");
  view.requestAnimationFrame(() => {
    const movers: SpatialMover[] = [];
    for (const visual of host.querySelectorAll<HTMLElement>("[data-visual-entity-id]")) {
      const id = visual.dataset.visualEntityId;
      const from = id ? before.get(id) : undefined;
      const to = spatialPointFor(visual);
      const figure = visual.closest<HTMLElement>(".action-stage__figure");
      if (!id || !from || !to || !figure || typeof figure.animate !== "function") continue;
      const travel = actionProofTravelVector(from, to);
      if (travel.distance < 3) continue;
      movers.push({
        id,
        figure,
        travel,
        duration: Math.min(320, Math.max(220, travel.distance * 1.2)),
      });
    }

    const animations: Animation[] = [];
    let elapsed = 0;
    for (const [turnIndex, ids] of actionProofSpatialTurnGroups(movers.map(({ id }) => id)).entries()) {
      const group = movers.filter(({ id }) => ids.includes(id));
      const groupDuration = Math.max(...group.map(({ duration }) => duration));
      for (const mover of group) {
        mover.figure.dataset.spatialMotion = "travel";
        mover.figure.dataset.spatialTurn = String(turnIndex + 1);
        animations.push(mover.figure.animate([
          { translate: String(mover.travel.x).concat("px ", String(mover.travel.y), "px") },
          { translate: "0 0" },
        ], {
          delay: elapsed,
          duration: mover.duration,
          easing: "cubic-bezier(.2,.72,.28,1)",
          fill: "backwards",
        }));
      }
      elapsed += groupDuration + 45;
    }

    const finishSequence = (): void => {
      for (const { figure } of movers) {
        delete figure.dataset.spatialMotion;
        delete figure.dataset.spatialTurn;
      }
      for (const animation of animations) animation.cancel();
      delete host.dataset.turnSequenceActive;
      host.removeAttribute("aria-busy");
    };

    if (!animations.length) {
      finishSequence();
      return;
    }
    void Promise.allSettled(animations.map(({ finished }) => finished)).then(finishSequence);
  });
};
