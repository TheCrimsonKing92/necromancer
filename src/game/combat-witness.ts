import { pronounsForSex } from "./identity";
import type { DamageResult } from "./damage-resolution";
import {
  combatActionHitText,
  combatActionMissText,
} from "./combat-action-narration";
import { witnessDamage, witnessMiss } from "./witness";
import { combatantDefeatText } from "./combatants/defeat-narration";
import { COMBATANT_IDENTITY_PROFILES } from "./combatants/identity-profiles";
import type {
  BodyPartId,
  Combatant,
  LogTone,
  Player,
  WitnessEvent,
  WitnessSegment,
} from "./types";

export const possessiveDeterminer = (
  combatant: Combatant,
): string => {
  if (combatant.kind === "player") {
    return pronounsForSex((combatant as Player).sex)
      .possessiveDeterminer;
  }
  if (combatant.identityProfileId) {
    return COMBATANT_IDENTITY_PROFILES[combatant.identityProfileId]
      .possessiveDeterminer;
  }
  return combatant.anatomy === "humanoid" ? "their" : "its";
};

export const defeatTransitionSegment = (
  target: Combatant,
  cause: "health" | "vital-region",
  location?: BodyPartId,
  locationLabel?: string,
  woundLabel?: string,
): Extract<WitnessSegment, { type: "transition" }> => {
  return {
    type: "transition",
    entity: target.name,
    transition: "defeated",
    cause,
    text: combatantDefeatText(
      target,
      cause,
      location,
      locationLabel,
      woundLabel,
    ),
  };
};

export const damageWitness = (
  tone: LogTone,
  action: string,
  attacker: Combatant,
  target: Combatant,
  result: DamageResult,
  followUp: WitnessSegment[] = [],
  attackDetail?: string,
): WitnessEvent => {
  const context = {
    action,
    actor: attacker.name,
    target: target.name,
  };

  if (!result.hit) {
    return witnessMiss(
      tone,
      {
        actor: attacker.name,
        action,
        target: target.name,
        text: combatActionMissText(context),
        chance: result.chance,
        roll: result.roll,
      },
      followUp,
    );
  }

  const completeFollowUp = [...followUp];
  if (result.defeated && result.defeatCause) {
    completeFollowUp.unshift(
      defeatTransitionSegment(
        target,
        result.defeatCause,
        result.location,
        result.locationLabel,
        result.woundLabel,
      ),
    );
  }

  return witnessDamage(
    tone,
    {
      actor: attacker.name,
      action,
      actionLead: combatActionHitText(context),
      attackDetail,
      target: target.name,
      targetPossessive: possessiveDeterminer(target),
      location: result.location,
      locationLabel: result.locationLabel,
      damage: result.damage,
      wardAbsorbed: result.wardAbsorbed,
      armorAbsorbed: result.armorAbsorbed,
      protectionLabel: result.protectionLabel,
      resistanceAbsorbed: result.resistanceAbsorbed,
      resistanceLabel: result.resistanceLabel,
      woundLabel: result.woundLabel,
    },
    completeFollowUp,
  );
};
