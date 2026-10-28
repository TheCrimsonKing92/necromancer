import type {
  ActionId,
  AdvancementModifierId,
  AdvancementRuleId,
} from "./types";

const ACTION_MODIFIERS: Partial<
  Record<ActionId, AdvancementModifierId[]>
> = {
  "spirit-lash": ["spirit-lash-ward", "spirit-lash-damage"],
  "borrowed-might": ["borrowed-might-ward-buffer"],
  "raise-shade": [
    "shade-attack",
    "shade-duration",
    "shade-health-return",
    "shade-final-service",
  ],
  corpsefire: ["corpsefire-duration", "corpsefire-exposed"],
  "grave-salt": ["grave-salt-quench-burning"],
  guard: ["brace-critical-ward"],
};

export const advancementModifiersForAction = (
  actionId: ActionId,
): readonly AdvancementModifierId[] => ACTION_MODIFIERS[actionId] ?? [];

const ACTION_RULES: Partial<Record<ActionId, AdvancementRuleId[]>> = {
  "close-the-gate": ["closed-gate"],
  "set-threshold-seal": ["invitation-to-breach"],
};

export const advancementRulesForAction = (
  actionId: ActionId,
): readonly AdvancementRuleId[] => ACTION_RULES[actionId] ?? [];
