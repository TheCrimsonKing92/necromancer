import { TARGET_ADVANCEMENTS } from "./advancement-target-catalog";
import type {
  AdvancementDefinition,
  AdvancementExpressionDefinition,
  AdvancementExpressionId,
  AdvancementReadinessKind,
  AdvancementReadinessState,
  AdvancementRuleId,
  Player,
} from "./types";

export interface AdvancementExpressionView
  extends AdvancementExpressionDefinition {
  parent: AdvancementDefinition;
  readiness: AdvancementReadinessKind;
}

const EXPRESSIONS: AdvancementExpressionView[] = Object.values(
  TARGET_ADVANCEMENTS,
).flatMap((parent) =>
  parent.duality?.kind === "prepared"
    ? parent.duality.expressions.map((expression) => ({
        ...expression,
        parent,
        readiness: parent.duality!.kind === "prepared"
          ? parent.duality!.readiness
          : "universal",
      }))
    : [],
);

const EXPRESSION_BY_ID = new Map<
  AdvancementExpressionId,
  AdvancementExpressionView
>(
  EXPRESSIONS.map((expression) => [expression.id, expression]),
);

export const isAdvancementExpressionId = (
  value: unknown,
): value is AdvancementExpressionId =>
  typeof value === "string" &&
  EXPRESSION_BY_ID.has(value as AdvancementExpressionId);

export const advancementExpressionFor = (
  id: AdvancementExpressionId,
): AdvancementExpressionView | undefined => EXPRESSION_BY_ID.get(id);

export const advancementReadinessCapacity = (
  player: Player,
  kind: AdvancementReadinessKind,
): number => {
  if (kind === "practice") {
    if (player.level >= 10) return 4;
    if (player.level >= 6) return 3;
    return player.level >= 2 ? 2 : 0;
  }
  if (player.level >= 8) return 2;
  return player.level >= 2 ? 1 : 0;
};

const emptyReadiness = (): AdvancementReadinessState => ({
  practice: [],
  universal: [],
});

export const advancementReadinessFor = (
  player: Player,
): AdvancementReadinessState => {
  const saved = player.advancementReadiness as
    | {
        practice?: unknown;
        universal?: unknown;
      }
    | undefined;
  return {
    practice: Array.isArray(saved?.practice)
      ? saved.practice.filter(isAdvancementExpressionId)
      : [],
    universal: Array.isArray(saved?.universal)
      ? saved.universal.filter(isAdvancementExpressionId)
      : [],
  };
};

export const readiedAdvancementExpressions = (
  player: Player,
): AdvancementExpressionId[] => {
  const readiness = advancementReadinessFor(player);
  return [...readiness.practice, ...readiness.universal];
};

export const hasReadiedAdvancementRule = (
  player: Player,
  rule: AdvancementRuleId,
): boolean =>
  readiedAdvancementExpressions(player).some((id) =>
    advancementExpressionFor(id)?.effect.rules?.includes(rule),
  );

const learnedExpression = (
  player: Player,
  expression: AdvancementExpressionView,
): boolean => player.advancements.includes(expression.parent.id);

export const normalizeAdvancementReadiness = (
  player: Player,
): void => {
  const saved = advancementReadinessFor(player);
  const next = emptyReadiness();

  for (const kind of ["practice", "universal"] as const) {
    const capacity = advancementReadinessCapacity(player, kind);
    for (const id of saved[kind]) {
      const expression = advancementExpressionFor(id);
      if (
        !expression ||
        expression.readiness !== kind ||
        !learnedExpression(player, expression) ||
        next[kind].includes(id) ||
        next[kind].some(
          (otherId) =>
            advancementExpressionFor(otherId)?.parent.id ===
            expression.parent.id,
        ) ||
        next[kind].length >= capacity
      ) {
        continue;
      }
      next[kind].push(id);
    }
  }

  player.advancementReadiness = next;
};

export const readyAdvancementExpression = (
  player: Player,
  expressionId: AdvancementExpressionId,
): string | undefined => {
  normalizeAdvancementReadiness(player);
  const expression = advancementExpressionFor(expressionId);
  if (!expression || !learnedExpression(player, expression)) {
    return "That expression has not been learned.";
  }

  const readiness = player.advancementReadiness!;
  const slots = readiness[expression.readiness];
  if (slots.includes(expressionId)) return undefined;

  const siblingIndex = slots.findIndex(
    (id) =>
      advancementExpressionFor(id)?.parent.id ===
      expression.parent.id,
  );
  if (siblingIndex >= 0) {
    slots.splice(siblingIndex, 1, expressionId);
    return undefined;
  }

  const capacity = advancementReadinessCapacity(
    player,
    expression.readiness,
  );
  if (slots.length >= capacity) {
    return `All ${expression.readiness} readiness slots are occupied.`;
  }
  slots.push(expressionId);
  return undefined;
};
