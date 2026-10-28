import type { ServantCommandId } from "./types";

export type ServantServicePurposeId =
  | "keep-custody"
  | "hold-watch"
  | "road-labor";

export type ServantServiceTag =
  | "custody"
  | "watch"
  | "labor"
  | "escort"
  | "hold-ground"
  | "pursue-threat"
  | "abandon-charge"
  | "admit-forbidden-crossing"
  | "desecrate-remains"
  | "sabotage-work";

export interface ServantServicePurposeDefinition {
  id: ServantServicePurposeId;
  label: string;
  matchingCommandIds: readonly ServantCommandId[];
  matchingServiceTags: readonly ServantServiceTag[];
  forbiddenServiceTags: readonly ServantServiceTag[];
  routeUse: string;
}

export const SERVANT_SERVICE_PURPOSES: Readonly<
  Record<ServantServicePurposeId, ServantServicePurposeDefinition>
> = {
  "keep-custody": {
    id: "keep-custody",
    label: "Keep custody",
    matchingCommandIds: ["guard", "interpose"],
    matchingServiceTags: ["custody", "escort", "hold-ground"],
    forbiddenServiceTags: [
      "abandon-charge",
      "desecrate-remains",
    ],
    routeUse:
      "Guard, carry, or return remains placed under the compact's custody.",
  },
  "hold-watch": {
    id: "hold-watch",
    label: "Hold watch",
    matchingCommandIds: ["await", "guard", "harry"],
    matchingServiceTags: ["watch", "hold-ground", "pursue-threat"],
    forbiddenServiceTags: [
      "abandon-charge",
      "admit-forbidden-crossing",
    ],
    routeUse:
      "Keep an authored threshold or camp under watch until relieved.",
  },
  "road-labor": {
    id: "road-labor",
    label: "Bear the road's labor",
    matchingCommandIds: ["labor", "withdraw"],
    matchingServiceTags: ["labor", "escort"],
    forbiddenServiceTags: ["abandon-charge", "sabotage-work"],
    routeUse:
      "Carry, clear, raise, or lower an authored obstacle on the road.",
  },
};

export interface ServantCompact {
  purposeId: ServantServicePurposeId;
  status: "kept" | "breached";
  breachReference: string | null;
}

export interface ServantCompactOrder {
  commandId: ServantCommandId;
  serviceTags?: readonly ServantServiceTag[];
  decision?: "keep-compact" | "break-compact";
  reference?: string | null;
}

export type ServantCompactOrderOutcome =
  | "compliant"
  | "exceptional"
  | "refused"
  | "breached"
  | "unbound";

export interface ServantCompactOrderAssessment {
  outcome: ServantCompactOrderOutcome;
  mayIssue: boolean;
  spiritAdjustment: 0 | 1;
  requiresExplicitBreach: boolean;
  matchedPurpose: boolean;
  compact: ServantCompact;
}

export const createServantCompact = (
  purposeId: ServantServicePurposeId,
): ServantCompact => ({
  purposeId,
  status: "kept",
  breachReference: null,
});

export const assessServantCompactOrder = (
  compact: ServantCompact,
  order: ServantCompactOrder,
): ServantCompactOrderAssessment => {
  if (compact.status === "breached") {
    return {
      outcome: "unbound",
      mayIssue: true,
      spiritAdjustment: 0,
      requiresExplicitBreach: false,
      matchedPurpose: false,
      compact,
    };
  }

  const purpose = SERVANT_SERVICE_PURPOSES[compact.purposeId];
  const tags = order.serviceTags ?? [];
  const violatesPurpose = tags.some((tag) =>
    purpose.forbiddenServiceTags.includes(tag),
  );
  if (violatesPurpose) {
    if (
      order.decision !== "break-compact" ||
      !order.reference?.trim()
    ) {
      return {
        outcome: "refused",
        mayIssue: false,
        spiritAdjustment: 0,
        requiresExplicitBreach: true,
        matchedPurpose: false,
        compact,
      };
    }
    return {
      outcome: "breached",
      mayIssue: true,
      spiritAdjustment: 1,
      requiresExplicitBreach: false,
      matchedPurpose: false,
      compact: {
        ...compact,
        status: "breached",
        breachReference: order.reference,
      },
    };
  }

  const matchedPurpose =
    purpose.matchingCommandIds.includes(order.commandId) ||
    tags.some((tag) => purpose.matchingServiceTags.includes(tag));
  return {
    outcome: matchedPurpose ? "compliant" : "exceptional",
    mayIssue: true,
    spiritAdjustment: matchedPurpose ? 0 : 1,
    requiresExplicitBreach: false,
    matchedPurpose,
    compact,
  };
};
