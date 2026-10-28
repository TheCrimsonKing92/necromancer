import type {
  AdvancementDefinition,
  AdvancementId,
  Player,
} from "./types";
import { practiceIdForPrototypeTradition } from "./practices/prototype-practice-map";

export type AdvancementNodeStatus =
  | "learned"
  | "available"
  | "locked";

export interface AdvancementNodeState {
  definition: AdvancementDefinition;
  status: AdvancementNodeStatus;
  reason?: string;
}

const LEGACY_RENDERER_ADVANCEMENTS = new Set<AdvancementId>([
  "colder-furnace",
  "white-ash",
  "white-quench",
]);

export const visibleAdvancementDefinitions = (
  player: Player,
  definitions: Readonly<Record<AdvancementId, AdvancementDefinition>>,
  order: readonly AdvancementId[],
): AdvancementDefinition[] =>
  order.map((id) => definitions[id]).filter((definition) => {
    if (
      definition.tradition &&
      definition.tradition !== player.tradition
    ) {
      return false;
    }
    if (
      definition.practice &&
      definition.practice !==
        practiceIdForPrototypeTradition(player.tradition)
    ) {
      return false;
    }

    if (player.tradition !== "thaumaturgist") return true;
    const usesLegacyRenderer = player.advancements.some((id) =>
      LEGACY_RENDERER_ADVANCEMENTS.has(id),
    );
    if (definition.id === "cold-furnace-method") {
      return !usesLegacyRenderer;
    }
    if (LEGACY_RENDERER_ADVANCEMENTS.has(definition.id)) {
      return usesLegacyRenderer;
    }
    return true;
  });

export const advancementNodeStateFrom = (
  player: Player,
  definition: AdvancementDefinition,
  definitions: Readonly<Record<AdvancementId, AdvancementDefinition>>,
  availablePoints: number,
): AdvancementNodeState => {
  if (player.advancements.includes(definition.id)) {
    return { definition, status: "learned" };
  }
  if (definition.duality?.kind === "doctrine") {
    const doctrineGroup = definition.duality.group;
    const selectedDoctrine = player.advancements
      .map((id) => definitions[id])
      .find(
        (learned) =>
          learned.duality?.kind === "doctrine" &&
          learned.duality.group === doctrineGroup,
      );
    if (selectedDoctrine) {
      return {
        definition,
        status: "locked",
        reason: `Excluded by ${selectedDoctrine.name}. Retraining requires a world-grounded service.`,
      };
    }
  }
  if (player.level < definition.minimumLevel) {
    return {
      definition,
      status: "locked",
      reason: `Requires level ${definition.minimumLevel}.`,
    };
  }

  const missing = definition.prerequisites.filter(
    (id) => !player.advancements.includes(id),
  );
  if (missing.length > 0) {
    return {
      definition,
      status: "locked",
      reason: `Requires ${missing
        .map((id) => definitions[id].name)
        .join(" and ")}.`,
    };
  }
  if (availablePoints < definition.cost) {
    return {
      definition,
      status: "locked",
      reason: `Requires ${definition.cost} discipline point${definition.cost === 1 ? "" : "s"}.`,
    };
  }
  return { definition, status: "available" };
};
