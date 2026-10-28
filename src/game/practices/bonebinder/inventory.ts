import { BODY_PARTS, canBindWound, getBodyPartLabel } from "../../anatomy";
import { isPostDeathState } from "../../inventory-engine";
import { itemCount, removeItem } from "../../items";
import type {
  EngineResult,
  GameState,
} from "../../types";
import type { PersistentServantRepairRequest } from "../../content-packs/bonebinder-runtime";
import { bonebinderStateFor } from "./practice-state";
import { repairServant } from "./repairs";

export const repairBonebinderServantInPack = (
  state: GameState,
  request: PersistentServantRepairRequest,
): EngineResult => {
  if (state.screen !== "inventory" || !state.run) {
    return { state, error: "Your inventory is not open." };
  }
  if (isPostDeathState(state)) {
    return {
      state,
      error: "This body can no longer use, treat, or rearrange what it carried.",
    };
  }

  const practiceState = bonebinderStateFor(state.run);
  const servant = practiceState?.servant;
  if (!servant) {
    return { state, error: "No persistent servant is recorded." };
  }

  const part =
    request.kind === "reinforce-part"
      ? servant.combatant.body[request.part]
      : BODY_PARTS.map(({ id }) => servant.combatant.body[id]).find(
          (candidate) =>
            candidate.wounds.some((wound) => wound.id === request.woundId),
        );
  if (!part) {
    return { state, error: "That servant wound could not be found." };
  }

  const wound =
    request.kind === "stabilize-wound"
      ? part.wounds.find(({ id }) => id === request.woundId)
      : null;
  if (wound?.treated) {
    return { state, error: "That servant wound is already stabilized." };
  }
  if (wound && !canBindWound(wound)) {
    return {
      state,
      error: `${wound.label} cannot be dressed with linen. It needs mortuary rest beyond field repair.`,
    };
  }

  const materialId =
    request.kind === "reinforce-part" ? "mortuary-tallow" : "linen-binding";
  if (itemCount(state.run.player.inventory, materialId) < 1) {
    return {
      state,
      error:
        materialId === "mortuary-tallow"
          ? "No mortuary tallow remains for reinforcement."
          : "No clean linen binding remains.",
    };
  }

  const next = structuredClone(state);
  const nextRun = next.run!;
  const nextPractice = bonebinderStateFor(nextRun)!;
  const nextServant = nextPractice.servant!;
  const repairId = `servant-repair:${nextServant.repairs.sequence + 1}`;
  const result =
    request.kind === "reinforce-part"
      ? repairServant(nextServant, {
          kind: "reinforce-part",
          repairId,
          part: request.part,
          condition: 3,
          materialReferences: [`item:${materialId}`],
          performedAtReference: "inventory",
        })
      : repairServant(nextServant, {
          kind: "stabilize-wound",
          repairId,
          part: part.id,
          woundId: request.woundId,
          materialReferences: [`item:${materialId}`],
          performedAtReference: "inventory",
        });
  if (!result.applied || !result.record) {
    return {
      state,
      error:
        request.kind === "reinforce-part"
          ? "That part needs no structural reinforcement."
          : "That wound cannot be stabilized by this repair.",
    };
  }

  removeItem(nextRun.player.inventory, materialId);
  nextPractice.servant = result.servant;
  if (request.kind === "reinforce-part") {
    const before = result.servant.combatant.hp;
    result.servant.combatant.hp = Math.min(
      result.servant.combatant.maxHp,
      result.servant.combatant.hp + 3,
    );
    result.record.healthRestored = result.servant.combatant.hp - before;
  }
  return {
    state: next,
    message:
      request.kind === "reinforce-part"
        ? `${servant.identity.useName} recovers ${result.record.conditionRestored} ${getBodyPartLabel(part.id, "humanoid").toLowerCase()} condition and ${result.record.healthRestored} Health. Mortuary tallow −1.`
        : `${wound!.label} is stabilized on ${servant.identity.useName}. Clean linen −1.`,
  };
};
