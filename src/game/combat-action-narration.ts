import {
  COMBAT_ACTION_NARRATION,
  COMBAT_ACTION_NARRATION_ALIASES,
  type CombatActionNarration,
  type NarratedCombatAction,
} from "./combat-action-narration-catalog";

interface NarrationContext {
  action: string;
  actor: string;
  target: string;
}

const possessive = (name: string): string =>
  /s$/i.test(name) ? `${name}’` : `${name}’s`;

const resolveNarration = (
  action: string,
): CombatActionNarration | undefined => {
  const key = action.toLowerCase();
  const canonical =
    COMBAT_ACTION_NARRATION_ALIASES[
      key as keyof typeof COMBAT_ACTION_NARRATION_ALIASES
    ] ?? (key as NarratedCombatAction);
  return COMBAT_ACTION_NARRATION[canonical];
};

const NARRATION_TOKENS = new Set([
  "action",
  "actor",
  "actorPossessive",
  "target",
  "targetPossessive",
]);

export const hasCombatActionNarration = (
  action: string,
): boolean => resolveNarration(action) !== undefined;

export const validateCombatActionNarrationCatalog = (): string[] => {
  const errors: string[] = [];
  for (const [action, narration] of Object.entries(
    COMBAT_ACTION_NARRATION,
  )) {
    for (const [outcome, template] of Object.entries(narration)) {
      if (template.trim().length === 0) {
        errors.push(`${action}.${outcome} has no authored text`);
      }
      for (const match of template.matchAll(/\{(\w+)\}/g)) {
        if (!NARRATION_TOKENS.has(match[1]!)) {
          errors.push(
            `${action}.${outcome} uses unknown token {${match[1]}}`,
          );
        }
      }
    }
  }
  return errors;
};

const renderNarration = (
  template: string,
  context: NarrationContext,
): string => {
  const tokens: Record<string, string> = {
    action: context.action.toLowerCase(),
    actor: context.actor,
    actorPossessive: possessive(context.actor),
    target: context.target,
    targetPossessive: possessive(context.target),
  };
  return template.replace(
    /\{(\w+)\}/g,
    (token, key: string) => tokens[key] ?? token,
  );
};

export const combatActionHitText = (
  context: NarrationContext,
): string => {
  const template =
    resolveNarration(context.action)?.hit ??
    "{actor} drives {action} at {target}";
  return renderNarration(template, context);
};

export const combatActionMissText = (
  context: NarrationContext,
): string => {
  const template =
    resolveNarration(context.action)?.miss ??
    "{actorPossessive} {action} fails to find {target}";
  return renderNarration(template, context);
};
