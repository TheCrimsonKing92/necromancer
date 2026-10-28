export type DevelopmentActionIntent =
  | { readonly kind: "move"; readonly destinationId: string }
  | { readonly kind: "act"; readonly actionId: string; readonly targetId?: string };

export interface DevelopmentActionTarget {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly currentHealth?: number;
  readonly maxHealth?: number;
}

export interface DevelopmentActionTransition<State> {
  readonly state: State;
  readonly event?: string;
  readonly error?: string;
}

/**
 * A deliberately narrow port for noncanonical direct-play experiments.
 * The domain owns adjacency, eligibility, time, and outcomes; renderers merely
 * project its state into an isometric and ordered semantic surface.
 */
export interface DevelopmentActionPrototype<State, Projection> {
  readonly id: string;
  readonly createState: () => State;
  readonly project: (state: State) => Projection;
  readonly step: (
    state: State,
    intent: DevelopmentActionIntent,
  ) => DevelopmentActionTransition<State>;
}
