export type CapabilityConditionId = string;
export type CapabilityPreparationId = string;

export interface CapabilityPreparation {
  id: CapabilityPreparationId;
  conditionId: CapabilityConditionId;
  usesRemaining: number;
  commitment: "action" | "encounter";
}

export type CapabilityProviderScope =
  | "site"
  | "locality"
  | "route"
  | "catchment"
  | "jurisdiction"
  | "network"
  | "relationship";

export interface CapabilityConditionProvider {
  id: string;
  conditionId: CapabilityConditionId;
  scope: CapabilityProviderScope;
  reachIds?: readonly string[];
  access: "available" | "restricted" | "denied";
  /** Zero is intact; one is exhausted. Content owns any intermediate meaning. */
  degradation: number;
}

export interface CapabilityConditionContext {
  knownCapabilities: readonly string[];
  present: readonly CapabilityConditionId[];
  providers?: readonly CapabilityConditionProvider[];
  reachIds?: readonly string[];
  opportunities?: readonly CapabilityConditionId[];
  preparations?: readonly CapabilityPreparation[];
  resources?: Readonly<Record<string, number>>;
}

export interface CapabilitySetup<ActionId extends string = string> {
  actionId: ActionId;
  establishes: readonly CapabilityConditionId[];
}

/**
 * A capability describes one expression of training, equipment, bodily
 * capacity, relationship, preparation, or supernatural work. Conditions are
 * content-owned facts, not necessarily environmental requirements. This domain
 * deliberately prescribes neither a universal magic grammar nor a closed list
 * of sources.
 */
export interface ConditionedCapability<ActionId extends string = string> {
  id: string;
  primaryActionId: ActionId;
  amplifiedActionId?: ActionId;
  required?: readonly CapabilityConditionId[];
  amplifying?: readonly CapabilityConditionId[];
  costs?: readonly CapabilityCost[];
  setup?: readonly CapabilitySetup<ActionId>[];
  fallbackActionId?: ActionId;
}

export interface CapabilityCost {
  resourceId: string;
  amount: number;
  commitment: "action" | "encounter";
}

export interface CapabilityConditionSource {
  conditionId: CapabilityConditionId;
  source:
    | "present"
    | "provider"
    | "opportunity"
    | "preparation"
    | "missing";
  providerId?: string;
  preparationId?: CapabilityPreparationId;
}

export type CapabilityAvailabilityState =
  | "ready"
  | "prepared"
  | "setup-required"
  | "fallback"
  | "untrained"
  | "unavailable";

export interface CapabilityAvailability<ActionId extends string = string> {
  state: CapabilityAvailabilityState;
  actionId?: ActionId;
  primaryActionId: ActionId;
  amplifiedActionId?: ActionId;
  fallbackActionId?: ActionId;
  required: CapabilityConditionSource[];
  activeAmplifiers: CapabilityConditionId[];
  inactiveAmplifiers: CapabilityConditionId[];
  preparationCommitments: CapabilityPreparationId[];
  resourceCommitments: CapabilityCost[];
  missingRequired: CapabilityConditionId[];
  missingCosts: CapabilityCost[];
}

const unique = (values: readonly string[]): string[] => [...new Set(values)];

const intersects = (left: readonly string[], right: readonly string[]): boolean =>
  left.some((entry) => right.includes(entry));

const providerIsAvailable = (
  provider: CapabilityConditionProvider,
  context: CapabilityConditionContext,
): boolean =>
  provider.access === "available" &&
  provider.degradation < 1 &&
  (provider.reachIds === undefined ||
    intersects(provider.reachIds, context.reachIds ?? []));

const conditionSources = (
  required: readonly CapabilityConditionId[],
  context: CapabilityConditionContext,
): CapabilityConditionSource[] => {
  const present = new Set(context.present);
  const opportunities = new Set(context.opportunities ?? []);
  const preparations = context.preparations ?? [];
  const committedUses = new Map<CapabilityPreparationId, number>();

  return unique(required).map((conditionId) => {
    if (present.has(conditionId)) {
      return { conditionId, source: "present" };
    }
    const provider = (context.providers ?? []).find(
      (entry) =>
        entry.conditionId === conditionId &&
        providerIsAvailable(entry, context),
    );
    if (provider) {
      return {
        conditionId,
        source: "provider",
        providerId: provider.id,
      };
    }
    if (opportunities.has(conditionId)) {
      return { conditionId, source: "opportunity" };
    }

    const preparation = preparations.find((entry) => {
      const committed = committedUses.get(entry.id) ?? 0;
      return (
        entry.conditionId === conditionId && entry.usesRemaining > committed
      );
    });
    if (!preparation) return { conditionId, source: "missing" };

    committedUses.set(
      preparation.id,
      (committedUses.get(preparation.id) ?? 0) + 1,
    );
    return {
      conditionId,
      source: "preparation",
      preparationId: preparation.id,
    };
  });
};

export const evaluateCapabilityAvailability = <ActionId extends string>(
  capability: ConditionedCapability<ActionId>,
  context: CapabilityConditionContext,
): CapabilityAvailability<ActionId> => {
  const required = conditionSources(capability.required ?? [], context);
  const missingRequired = required
    .filter((entry) => entry.source === "missing")
    .map((entry) => entry.conditionId);
  const present = new Set([
    ...context.present,
    ...(context.opportunities ?? []),
    ...(context.providers ?? [])
      .filter((provider) => providerIsAvailable(provider, context))
      .map((provider) => provider.conditionId),
  ]);
  const activeAmplifiers = unique(capability.amplifying ?? []).filter((id) =>
    present.has(id),
  );
  const inactiveAmplifiers = unique(capability.amplifying ?? []).filter(
    (id) => !present.has(id),
  );
  const preparationCommitments = required.flatMap((entry) =>
    entry.preparationId ? [entry.preparationId] : [],
  );
  const resourceCommitments = (capability.costs ?? []).map((cost) => ({
    ...cost,
  }));
  const missingCosts = resourceCommitments.filter(
    (cost) => (context.resources?.[cost.resourceId] ?? 0) < cost.amount,
  );
  const base = {
    primaryActionId: capability.primaryActionId,
    amplifiedActionId: capability.amplifiedActionId,
    fallbackActionId: capability.fallbackActionId,
    required,
    activeAmplifiers,
    inactiveAmplifiers,
    preparationCommitments,
    resourceCommitments,
    missingRequired,
    missingCosts,
  };

  if (!context.knownCapabilities.includes(capability.id)) {
    return { ...base, state: "untrained", actionId: undefined };
  }

  if (missingRequired.length === 0 && missingCosts.length === 0) {
    return {
      ...base,
      state: preparationCommitments.length > 0 ? "prepared" : "ready",
      actionId:
        activeAmplifiers.length > 0 && capability.amplifiedActionId
          ? capability.amplifiedActionId
          : capability.primaryActionId,
    };
  }

  const setup = (capability.setup ?? []).find((entry) =>
    entry.establishes.some((conditionId) =>
      missingRequired.includes(conditionId),
    ),
  );
  if (setup && missingCosts.length === 0) {
    return { ...base, state: "setup-required", actionId: setup.actionId };
  }
  if (capability.fallbackActionId) {
    return {
      ...base,
      state: "fallback",
      actionId: capability.fallbackActionId,
    };
  }
  return { ...base, state: "unavailable", actionId: undefined };
};

export const validateCapabilityConditionContext = (
  context: CapabilityConditionContext,
): string[] => {
  const errors: string[] = [];
  if (context.knownCapabilities.some((id) => id.trim().length === 0)) {
    errors.push("actor contains an empty capability id");
  }
  if (context.present.some((id) => id.trim().length === 0)) {
    errors.push("context contains an empty condition id");
  }
  if ((context.opportunities ?? []).some((id) => id.trim().length === 0)) {
    errors.push("context contains an empty opportunity id");
  }
  if ((context.reachIds ?? []).some((id) => id.trim().length === 0)) {
    errors.push("context contains an empty reach id");
  }
  const providerIds = new Set<string>();
  for (const provider of context.providers ?? []) {
    if (provider.id.trim().length === 0) {
      errors.push("context contains an empty provider id");
    } else if (providerIds.has(provider.id)) {
      errors.push(`environment repeats provider ${provider.id}`);
    }
    providerIds.add(provider.id);
    if (provider.conditionId.trim().length === 0) {
      errors.push(`${provider.id || "provider"} has no condition id`);
    }
    if (
      ![
        "site",
        "locality",
        "route",
        "catchment",
        "jurisdiction",
        "network",
        "relationship",
      ].includes(provider.scope)
    ) {
      errors.push(`${provider.id || "provider"} has invalid scope`);
    }
    if (!["available", "restricted", "denied"].includes(provider.access)) {
      errors.push(`${provider.id || "provider"} has invalid access`);
    }
    if (invalidProviderNumber(provider.degradation)) {
      errors.push(`${provider.id || "provider"} has invalid degradation`);
    }
    if ((provider.reachIds ?? []).some((id) => id.trim().length === 0)) {
      errors.push(`${provider.id || "provider"} has an empty reach id`);
    }
  }
  for (const [resourceId, amount] of Object.entries(context.resources ?? {})) {
    if (
      resourceId.trim().length === 0 ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      errors.push("context contains an invalid capability resource");
    }
  }
  const preparationIds = new Set<string>();
  for (const preparation of context.preparations ?? []) {
    if (preparation.id.trim().length === 0) {
      errors.push("context contains an empty preparation id");
    } else if (preparationIds.has(preparation.id)) {
      errors.push(`context repeats preparation ${preparation.id}`);
    }
    preparationIds.add(preparation.id);
    if (preparation.conditionId.trim().length === 0) {
      errors.push(`${preparation.id || "preparation"} has no condition id`);
    }
    if (
      !Number.isSafeInteger(preparation.usesRemaining) ||
      preparation.usesRemaining < 0
    ) {
      errors.push(`${preparation.id || "preparation"} has invalid uses`);
    }
    if (!["action", "encounter"].includes(preparation.commitment)) {
      errors.push(`${preparation.id || "preparation"} has invalid commitment`);
    }
  }
  return errors;
};

const invalidProviderNumber = (value: number): boolean =>
  !Number.isFinite(value) || value < 0 || value > 1;

export const validateConditionedCapability = (
  capability: ConditionedCapability,
): string[] => {
  const errors: string[] = [];
  if (capability.id.trim().length === 0) errors.push("capability has no id");
  if (capability.primaryActionId.trim().length === 0) {
    errors.push(`${capability.id || "capability"} has no primary action`);
  }
  if (capability.amplifiedActionId?.trim().length === 0) {
    errors.push(`${capability.id || "capability"} has an empty amplified action`);
  }
  const required = capability.required ?? [];
  const amplifying = capability.amplifying ?? [];
  if (required.some((id) => id.trim().length === 0)) {
    errors.push(`${capability.id || "capability"} has an empty requirement`);
  }
  if (new Set(required).size !== required.length) {
    errors.push(`${capability.id || "capability"} repeats a requirement`);
  }
  if (new Set(amplifying).size !== amplifying.length) {
    errors.push(`${capability.id || "capability"} repeats an amplifier`);
  }
  for (const cost of capability.costs ?? []) {
    if (
      cost.resourceId.trim().length === 0 ||
      !Number.isSafeInteger(cost.amount) ||
      cost.amount < 1
    ) {
      errors.push(`${capability.id || "capability"} has an invalid cost`);
    }
    if (!["action", "encounter"].includes(cost.commitment)) {
      errors.push(`${capability.id || "capability"} has an invalid commitment`);
    }
  }
  for (const setup of capability.setup ?? []) {
    if (setup.actionId.trim().length === 0) {
      errors.push(`${capability.id || "capability"} has an empty setup action`);
    }
    if (
      setup.establishes.length === 0 ||
      setup.establishes.some((id) => !required.includes(id))
    ) {
      errors.push(
        `${capability.id || "capability"} has setup outside its requirements`,
      );
    }
  }
  return errors;
};
