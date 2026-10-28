import type { AdvancementDefinition } from "./types";

const isEmptyEffect = (
  effect: AdvancementDefinition["effect"],
): boolean =>
  !effect.maxHp &&
  !effect.maxSpirit &&
  Object.keys(effect.skills ?? {}).length === 0 &&
  Object.keys(effect.modifiers ?? {}).length === 0 &&
  (effect.rules?.length ?? 0) === 0;

const hasDuplicateRules = (
  effect: AdvancementDefinition["effect"],
): boolean =>
  new Set(effect.rules ?? []).size !== (effect.rules?.length ?? 0);

const samePrerequisites = (
  left: AdvancementDefinition,
  right: AdvancementDefinition,
): boolean => {
  const sorted = (definition: AdvancementDefinition): string =>
    [...definition.prerequisites].sort().join("\u0000");
  return sorted(left) === sorted(right);
};

export const validateAdvancementGraph = (
  definitions: Readonly<Record<string, AdvancementDefinition>>,
): string[] => {
  const errors: string[] = [];
  const entries = Object.entries(definitions);
  const expressionOwners = new Map<string, string>();
  const doctrineGroups = new Map<
    string,
    AdvancementDefinition[]
  >();

  for (const [key, definition] of entries) {
    if (key !== definition.id) {
      errors.push(`${key}: record key does not match node id ${definition.id}.`);
    }
    if (
      !Number.isInteger(definition.minimumLevel) ||
      definition.minimumLevel < 2
    ) {
      errors.push(`${definition.id}: minimum level must be at least 2.`);
    }
    if (!Number.isInteger(definition.cost) || definition.cost < 1) {
      errors.push(`${definition.id}: cost must be a positive integer.`);
    }
    if (
      new Set(definition.prerequisites).size !==
      definition.prerequisites.length
    ) {
      errors.push(`${definition.id}: duplicate prerequisite.`);
    }
    const preparedExpressions =
      definition.duality?.kind === "prepared"
        ? definition.duality.expressions
        : [];
    if (
      isEmptyEffect(definition.effect) &&
      preparedExpressions.length === 0
    ) {
      errors.push(`${definition.id}: effect is empty.`);
    }
    if (hasDuplicateRules(definition.effect)) {
      errors.push(`${definition.id}: duplicate advancement rule.`);
    }

    if (definition.duality && !definition.classification) {
      errors.push(
        `${definition.id}: a dual advancement requires a classification.`,
      );
    }
    if (definition.duality && definition.classification === "rank") {
      errors.push(
        `${definition.id}: rank advancements cannot define duality.`,
      );
    }

    if (definition.duality?.kind === "doctrine") {
      const group = definition.duality.group.trim();
      if (!group) {
        errors.push(`${definition.id}: doctrine group cannot be empty.`);
      } else {
        const members = doctrineGroups.get(group) ?? [];
        members.push(definition);
        doctrineGroups.set(group, members);
      }
    }

    if (definition.duality?.kind === "prepared") {
      if (preparedExpressions.length !== 2) {
        errors.push(
          `${definition.id}: prepared duality requires exactly two expressions.`,
        );
      }
      if (
        definition.duality.readiness === "practice" &&
        !definition.tradition &&
        !definition.practice
      ) {
        errors.push(
          `${definition.id}: practice readiness requires a practice or compatibility tradition.`,
        );
      }
      if (
        definition.duality.readiness === "universal" &&
        (definition.tradition || definition.practice)
      ) {
        errors.push(
          `${definition.id}: universal readiness cannot be restricted to a practice or tradition.`,
        );
      }
    }
    if (
      definition.duality?.kind === "prepared" &&
      new Set(preparedExpressions.map(({ id }) => id)).size !==
        preparedExpressions.length
    ) {
      errors.push(`${definition.id}: duplicate prepared expression.`);
    }
    for (const expression of preparedExpressions) {
      const previousOwner = expressionOwners.get(expression.id);
      if (previousOwner) {
        errors.push(
          `${definition.id}/${expression.id}: prepared expression id is already used by ${previousOwner}.`,
        );
      } else {
        expressionOwners.set(expression.id, definition.id);
      }
      if (expression.classification === "rank") {
        errors.push(
          `${definition.id}/${expression.id}: prepared expressions cannot be rank advancements.`,
        );
      }
      if (isEmptyEffect(expression.effect)) {
        errors.push(
          `${definition.id}/${expression.id}: expression effect is empty.`,
        );
      }
      if (hasDuplicateRules(expression.effect)) {
        errors.push(
          `${definition.id}/${expression.id}: duplicate advancement rule.`,
        );
      }
    }

    for (const prerequisiteId of definition.prerequisites) {
      const prerequisite = definitions[prerequisiteId];
      if (!prerequisite) {
        errors.push(
          `${definition.id}: missing prerequisite ${prerequisiteId}.`,
        );
        continue;
      }
      if (prerequisiteId === definition.id) {
        errors.push(`${definition.id}: node cannot require itself.`);
      }
      if (prerequisite.minimumLevel >= definition.minimumLevel) {
        errors.push(
          `${definition.id}: prerequisite ${prerequisiteId} must be from an earlier level.`,
        );
      }
      if (
        prerequisite.tradition &&
        prerequisite.tradition !== definition.tradition
      ) {
        errors.push(
          `${definition.id}: tradition does not match prerequisite ${prerequisiteId}.`,
        );
      }
      if (!definition.tradition && prerequisite.tradition) {
        errors.push(
          `${definition.id}: universal node cannot require a tradition node.`,
        );
      }
      if (
        prerequisite.practice &&
        prerequisite.practice !== definition.practice
      ) {
        errors.push(
          `${definition.id}: practice does not match prerequisite ${prerequisiteId}.`,
        );
      }
      if (!definition.practice && prerequisite.practice) {
        errors.push(
          `${definition.id}: universal node cannot require a practice node.`,
        );
      }
    }
  }

  for (const [group, members] of doctrineGroups) {
    const reference = members[0];
    if (!reference) continue;
    if (members.length < 2) {
      errors.push(
        `${reference.id}: doctrine group ${group} must contain at least two nodes.`,
      );
      continue;
    }

    for (const member of members.slice(1)) {
      if (
        member.branch !== reference.branch ||
        member.tradition !== reference.tradition ||
        member.practice !== reference.practice
      ) {
        errors.push(
          `${member.id}: doctrine group ${group} must share a branch and practice or tradition.`,
        );
      }
      if (
        member.minimumLevel !== reference.minimumLevel ||
        member.cost !== reference.cost ||
        !samePrerequisites(member, reference)
      ) {
        errors.push(
          `${member.id}: doctrine group ${group} must share level, cost, and prerequisites.`,
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(`${id}: prerequisite cycle detected.`);
      return;
    }
    if (visited.has(id)) return;

    const definition = definitions[id];
    if (!definition) return;
    visiting.add(id);
    definition.prerequisites.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  entries.forEach(([id]) => visit(id));

  return [...new Set(errors)];
};
