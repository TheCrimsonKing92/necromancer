import type { CheckProspect } from "./check-prospect";

export type TacticalSceneSubjectKind =
  | "actor"
  | "site"
  | "hazard"
  | "resource"
  | "force";

export type TacticalSceneTone =
  | "neutral"
  | "player"
  | "ally"
  | "danger"
  | "occult"
  | "secured"
  | "strained";

export interface TacticalScenePlacement {
  /** Presentation coordinates only. They never imply distance or reach. */
  readonly x: number;
  readonly y: number;
  readonly depth: 0 | 1 | 2 | 3;
}

export interface TacticalSceneAttention {
  /** A generic presentation signal; the renderer must not name the course it points toward. */
  readonly kind: "new-courses";
  /** Stable within the scene so a host can later remember that the player has inspected it. */
  readonly key: string;
}

export interface TacticalSceneSubject {
  readonly id: string;
  readonly label: string;
  readonly kind: TacticalSceneSubjectKind;
  readonly tone: TacticalSceneTone;
  readonly status: string;
  readonly description: string;
  readonly placement: TacticalScenePlacement;
  readonly glyph: string;
  readonly actionIds: readonly string[];
  /** A state-derived visual class owned by the scene pack, never a rule input. */
  readonly visualState?: string;
  /** Authoritative state has exposed materially new choices at this subject. */
  readonly attention?: TacticalSceneAttention;
}

/**
 * What the character is actually relying on and the qualitative prospect of
 * the authored resolution. `kind` below remains an internal action category;
 * it is not a player-facing capability label.
 */
export interface TacticalSceneResolutionReadout {
  readonly method: string;
  readonly prospect: CheckProspect | "Assured";
}

export interface TacticalSceneResourceCost {
  readonly kind: "resource";
  readonly resourceId: string;
  readonly resourceLabel: string;
  readonly amount: number;
  /** Present holdings, when they are known to the character. */
  readonly available?: number;
}

export type TacticalSceneCost = TacticalSceneResourceCost;

export interface TacticalSceneKnownConsequence {
  readonly kind: "obligation" | "time" | "world-state" | "exposure";
  readonly label: string;
  readonly detail?: string;
}

export interface TacticalSceneAction {
  readonly id: string;
  readonly subjectId: string;
  readonly label: string;
  readonly lead: string;
  readonly kind:
    | "observe"
    | "move"
    | "prepare"
    | "command"
    | "negotiate"
    | "ritual"
    | "fight";
  readonly availability:
    | { readonly state: "available" }
    | { readonly state: "unavailable"; readonly reason: string };
  readonly resolution?: TacticalSceneResolutionReadout;
  /** Assets deducted from the player or another explicitly named holder. */
  readonly costs?: readonly TacticalSceneCost[];
  /** Known effects that change scene or world state without being deducted. */
  readonly knownConsequences?: readonly TacticalSceneKnownConsequence[];
  /** Concise authored stakes that do not fit cost or resolution. */
  readonly stakes?: string;
  readonly activation:
    | { readonly kind: "prototype-transition" }
    | {
        readonly kind: "story-approach";
        readonly approachId: string;
        readonly capabilityId: string;
      }
    | { readonly kind: "story-choice"; readonly choiceId: string };
}

export interface TacticalSceneConnection {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly state: "open" | "threatened" | "blocked" | "secured";
}

export interface TacticalSceneMeasure {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: TacticalSceneTone;
}

export interface TacticalSceneEvent {
  readonly id: string;
  readonly subjectId?: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
  readonly result?: string;
}

export interface TacticalSceneProjection {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly phase: string;
  readonly background: {
    readonly key: string;
    readonly imageUrl?: string;
    readonly alt: string;
  };
  readonly subjects: readonly TacticalSceneSubject[];
  readonly actions: readonly TacticalSceneAction[];
  readonly connections: readonly TacticalSceneConnection[];
  readonly measures: readonly TacticalSceneMeasure[];
  readonly events: readonly TacticalSceneEvent[];
  readonly resolved: boolean;
}

export interface TacticalSceneTransition<State> {
  readonly state: State;
  readonly event?: TacticalSceneEvent;
  readonly error?: string;
}

export interface TacticalScenePrototype<State> {
  readonly id: string;
  readonly createState: () => State;
  readonly project: (state: State) => TacticalSceneProjection;
  /** Pure synchronous transition. Hosting and persistence remain outside the proof. */
  readonly act: (state: State, actionId: string) => TacticalSceneTransition<State>;
}

const hasText = (value: string): boolean => value.trim().length > 0;
const unique = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

export const validateTacticalSceneProjection = (
  scene: TacticalSceneProjection,
): string[] => {
  const errors: string[] = [];
  const subjectIds = new Set(scene.subjects.map(({ id }) => id));
  const actionIds = new Set(scene.actions.map(({ id }) => id));
  if (!hasText(scene.id) || !hasText(scene.title) || !hasText(scene.summary)) {
    errors.push("A tactical scene requires an id, title, and summary.");
  }
  if (!unique(scene.subjects.map(({ id }) => id))) {
    errors.push(`${scene.id} repeats a subject id.`);
  }
  if (!unique(scene.actions.map(({ id }) => id))) {
    errors.push(`${scene.id} repeats an action id.`);
  }
  for (const subject of scene.subjects) {
    if (!hasText(subject.id) || !hasText(subject.label) ||
        !hasText(subject.status) || !hasText(subject.description)) {
      errors.push(`${scene.id} has an incomplete subject.`);
    }
    if (subject.placement.x < 0 || subject.placement.x > 100 ||
        subject.placement.y < 0 || subject.placement.y > 100) {
      errors.push(`${scene.id}:${subject.id} has an invalid placement.`);
    }
    if (subject.attention && !hasText(subject.attention.key)) {
      errors.push(`${scene.id}:${subject.id} has an invalid attention key.`);
    }
    for (const actionId of subject.actionIds) {
      const action = scene.actions.find(({ id }) => id === actionId);
      if (!action) errors.push(`${scene.id}:${subject.id} references missing action ${actionId}.`);
      else if (action.subjectId !== subject.id) {
        errors.push(`${scene.id}:${actionId} is indexed by the wrong subject.`);
      }
    }
  }
  for (const action of scene.actions) {
    if (!subjectIds.has(action.subjectId)) {
      errors.push(`${scene.id}:${action.id} references missing subject ${action.subjectId}.`);
    }
    if (!actionIds.has(action.id) || !hasText(action.label) || !hasText(action.lead)) {
      errors.push(`${scene.id} has an incomplete action.`);
    }
    if (action.availability.state === "unavailable" &&
        !hasText(action.availability.reason)) {
      errors.push(`${scene.id}:${action.id} requires an unavailable reason.`);
    }
    if (action.resolution && !hasText(action.resolution.method)) {
      errors.push(`${scene.id}:${action.id} requires a resolution method.`);
    }
    for (const cost of action.costs ?? []) {
      if (!hasText(cost.resourceId) || !hasText(cost.resourceLabel) ||
          cost.amount <= 0 || (cost.available !== undefined && cost.available < 0)) {
        errors.push(`${scene.id}:${action.id} has an invalid resource cost.`);
      }
    }
    for (const consequence of action.knownConsequences ?? []) {
      if (!hasText(consequence.label) ||
          (consequence.detail !== undefined && !hasText(consequence.detail))) {
        errors.push(`${scene.id}:${action.id} has an invalid known consequence.`);
      }
    }
    if (action.stakes !== undefined && !hasText(action.stakes)) {
      errors.push(`${scene.id}:${action.id} has empty stakes.`);
    }
  }
  for (const connection of scene.connections) {
    if (!subjectIds.has(connection.from) || !subjectIds.has(connection.to)) {
      errors.push(`${scene.id}:${connection.id} has a dangling connection.`);
    }
  }
  for (const event of scene.events) {
    if (event.subjectId && !subjectIds.has(event.subjectId)) {
      errors.push(`${scene.id}:${event.id} references missing subject ${event.subjectId}.`);
    }
  }
  return errors;
};
