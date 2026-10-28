import type {
  ActionId,
  AdvancementDefinition,
  AdvancementId,
  AdvancementModifierId,
  AdvancementRuleId,
  GameState,
  Player,
} from "./types";
import {
  TARGET_ADVANCEMENTS,
  type TargetAdvancementId,
} from "./advancement-target-catalog";
import {
  advancementExpressionFor,
  readiedAdvancementExpressions,
} from "./advancement-readiness";
import {
  advancementNodeStateFrom,
  visibleAdvancementDefinitions,
  type AdvancementNodeState,
} from "./advancement-tree";
import {
  advancementPresentationFlag,
  advancementPresentationLocation,
} from "./advancement-presentation-location";
import {
  advancementModifiersForAction,
  advancementRulesForAction,
} from "./advancement-action-modifiers";
import { ADVANCEMENT_ORDER } from "./advancement-order";

export { validateAdvancementGraph } from "./advancement-validation";

type LegacyAdvancementId = Exclude<AdvancementId, TargetAdvancementId>;

const LEGACY_ADVANCEMENTS: Record<
  LegacyAdvancementId,
  AdvancementDefinition
> = {
  "two-way-passage": {
    id: "two-way-passage",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Two-way Passage",
    tradition: "medium",
    description:
      "Open every crossing in both directions. What passes through you leaves more of itself behind.",
    resultText:
      "The passage through you opens both ways. Every borrowed soul now leaves a thicker ward in its wake.",
    effectText: "Spirit Lash draws 2 Ward instead of 1.",
    effect: {
      modifiers: {
        "spirit-lash-ward": 1,
      },
    },
  },
  "echoing-passage": {
    id: "echoing-passage",
    branch: "tradition",
    minimumLevel: 3,
    cost: 1,
    prerequisites: ["two-way-passage"],
    name: "Echoing Passage",
    tradition: "medium",
    description:
      "Widen the crossing until a soul passes through you twice: once as a weapon, once as an echo.",
    resultText:
      "The dead no longer leave cleanly. Their second passage follows the first like thunder under the earth.",
    effectText: "Spirit Lash gains +2 base damage.",
    effect: {
      modifiers: {
        "spirit-lash-damage": 2,
      },
    },
  },
  "tempered-passage": {
    id: "tempered-passage",
    branch: "tradition",
    minimumLevel: 4,
    cost: 1,
    prerequisites: ["echoing-passage"],
    name: "Tempered Passage",
    tradition: "medium",
    description:
      "Let an established Ward take the violence of a deeper admission before your flesh does.",
    resultText:
      "The next dead strength enters a body already braced. Ward takes the first strain before bone can buckle.",
    effectText:
      "Borrowed Might spends up to 2 Ward before it costs Health, torso condition, or leaves spirit-bruised ribs.",
    effect: {
      modifiers: {
        "borrowed-might-ward-buffer": 1,
      },
    },
  },
  "longer-leash": {
    id: "longer-leash",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Longer Leash",
    tradition: "summoner",
    description:
      "Teach a bound spirit to range farther without forgetting whose voice called it back.",
    resultText:
      "The binding loosens without breaking. Your shades range farther now and return to your command with more violence in them.",
    effectText:
      "Your shades gain +1 Attack and remain for 1 additional round.",
    effect: {
      modifiers: {
        "shade-attack": 1,
        "shade-duration": 1,
      },
    },
  },
  "shared-hunger": {
    id: "shared-hunger",
    branch: "tradition",
    minimumLevel: 3,
    cost: 1,
    prerequisites: ["longer-leash"],
    name: "Shared Hunger",
    tradition: "summoner",
    description:
      "Tie a shade’s appetite to your pulse and teach each of you to feed the other.",
    resultText:
      "The leash closes around two hungers. When your dead feed, some small warmth now returns to you.",
    effectText:
      "Each shade attack that deals damage restores 1 Health.",
    effect: {
      modifiers: {
        "shade-health-return": 1,
      },
    },
  },
  "last-command": {
    id: "last-command",
    branch: "tradition",
    minimumLevel: 4,
    cost: 1,
    prerequisites: ["shared-hunger"],
    name: "Last Command",
    tradition: "summoner",
    description:
      "Fix one final order at the end of the leash, where dissolution cannot loosen it.",
    resultText:
      "The command remains after the shade begins to fail. Its outline gutters; its last obedience does not.",
    effectText:
      "When a bound shade’s time expires, it attacks once more before losing its shape.",
    effect: {
      modifiers: {
        "shade-final-service": 1,
      },
    },
  },
  "colder-furnace": {
    id: "colder-furnace",
    branch: "tradition",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Colder Furnace",
    tradition: "thaumaturgist",
    description:
      "Refine corpsefire until it spends less of itself on light and more on the work of ruin.",
    resultText:
      "You refine the mixture until the flame sheds almost no light. Its force remains in the wound after the visible fire is gone.",
    effectText: "Corpsefire burns its target for 3 rounds instead of 2.",
    effect: {
      modifiers: {
        "corpsefire-duration": 1,
      },
    },
  },
  "white-ash": {
    id: "white-ash",
    branch: "tradition",
    minimumLevel: 3,
    cost: 1,
    prerequisites: ["colder-furnace"],
    name: "White Ash",
    tradition: "thaumaturgist",
    description:
      "Salt corpsefire with what remains after a name has been burned away.",
    resultText:
      "The flame dies white at its edges. Ash enters the wound and weakens the target’s hold on its own defense.",
    effectText:
      "Corpsefire also inflicts Exposed 1 for the burning duration.",
    effect: {
      modifiers: {
        "corpsefire-exposed": 1,
      },
    },
  },
  "white-quench": {
    id: "white-quench",
    branch: "tradition",
    minimumLevel: 4,
    cost: 1,
    prerequisites: ["white-ash"],
    name: "White Quench",
    tradition: "thaumaturgist",
    description:
      "Cast grave salt through corpsefire and collapse every remaining round of cold flame into the blow.",
    resultText:
      "Salt enters the blue flame. The long burn vanishes at once, leaving its whole remainder in the struck flesh.",
    effectText:
      "Grave Salt consumes Burning on a hit and adds its remaining damage, up to 6, to the attack.",
    effect: {
      modifiers: {
        "grave-salt-quench-burning": 1,
      },
    },
  },
  "hardened-vessel": {
    id: "hardened-vessel",
    branch: "body",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Hardened Vessel",
    description:
      "Condition the body to keep working through shock, blood loss, and pain.",
    resultText:
      "Breath, posture, and repeated strain harden into endurance. The body can now survive injuries that would once have stopped it.",
    effectText:
      "Increase maximum Health by 4 and recover 4 Health now.",
    effect: {
      maxHp: 4,
    },
  },
  "grave-callus": {
    id: "grave-callus",
    branch: "body",
    minimumLevel: 3,
    cost: 1,
    prerequisites: ["hardened-vessel"],
    name: "Grave Callus",
    description:
      "Teach healing flesh to remember the grave without surrendering anything to it.",
    resultText:
      "Old pain settles into a useful hardness. The next seam your body closes will keep its strength.",
    effectText:
      "Convalescence restores 2 additional condition per injured part; new scars do not reduce maximum condition.",
    effect: {
      modifiers: {
        "recovery-condition": 2,
        "scar-condition-penalty-reduction": 1,
      },
    },
  },
  "last-stance": {
    id: "last-stance",
    branch: "body",
    minimumLevel: 4,
    cost: 1,
    prerequisites: ["grave-callus"],
    name: "Last Stance",
    description:
      "Keep the body deliberate after pain has stripped easier habits away.",
    resultText:
      "When Health runs low, posture narrows to what still works. The failing body becomes harder to move than the sound one was.",
    effectText:
      "Below half Health, Brace raises its Ward threshold by 2.",
    effect: {
      modifiers: {
        "brace-critical-ward": 2,
      },
    },
  },
  "deepened-well": {
    id: "deepened-well",
    branch: "necromancy",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Deepened Well",
    description:
      "Carve out one more quiet chamber for the grave’s pressure to collect.",
    resultText:
      "The silence behind your breath deepens. Occult force gathers there without pressing the rest out of you.",
    effectText:
      "Increase maximum Spirit by 1 and recover 1 Spirit now.",
    effect: {
      maxSpirit: 1,
    },
  },
  "second-breath": {
    id: "second-breath",
    branch: "necromancy",
    minimumLevel: 3,
    cost: 1,
    prerequisites: ["deepened-well"],
    name: "Second Breath",
    description:
      "Hold open the instant after an enemy falls and take one further measure from its departure.",
    resultText:
      "Death opens a narrow passage. You learn to keep it open for one breath longer.",
    effectText:
      "Each defeated enemy restores 2 Spirit instead of 1.",
    effect: {
      modifiers: {
        "mercy-spirit": 1,
      },
    },
  },
  "death-dividend": {
    id: "death-dividend",
    branch: "necromancy",
    minimumLevel: 4,
    cost: 1,
    prerequisites: ["second-breath"],
    name: "Death Dividend",
    description:
      "Turn what a full Spirit cannot hold toward the boundary still keeping you alive.",
    resultText:
      "No part of the departure is left idle. When the inner measure is full, the remainder closes around you.",
    effectText:
      "Spirit recovery from defeated enemies that would exceed your maximum becomes Ward instead, up to 2 per enemy and the Ward limit of 12.",
    effect: {
      modifiers: {
        "overflow-spirit-ward": 1,
      },
    },
  },
  "field-medicine": {
    id: "field-medicine",
    branch: "mundane",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Field Medicine",
    description:
      "Learn the difference between a wound that can wait and one that will decide the road before nightfall.",
    resultText:
      "Clean hands, sound knots, and an unwillingness to guess become part of your ordinary work.",
    effectText: "Increase Medicine by 1, up to 5.",
    effect: {
      skills: {
        medicine: 1,
      },
    },
  },
  roadcraft: {
    id: "roadcraft",
    branch: "mundane",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Roadcraft",
    description:
      "Study weather, spoor, bad ground, and the small signs left by people who hoped not to be followed.",
    resultText:
      "The road yields no welcome. It does begin to yield warning.",
    effectText: "Increase Survival by 1, up to 5.",
    effect: {
      skills: {
        survival: 1,
      },
    },
  },
  "plain-dealing": {
    id: "plain-dealing",
    branch: "mundane",
    minimumLevel: 2,
    cost: 1,
    prerequisites: [],
    name: "Plain Dealing",
    description:
      "Learn where a price conceals fear, where refusal conceals interest, and when silence is the stronger term.",
    resultText:
      "You leave fewer terms unexamined and fewer silences mistaken for agreement.",
    effectText: "Increase Barter by 1, up to 5.",
    effect: {
      skills: {
        barter: 1,
      },
    },
  },
};

export const ADVANCEMENTS: Record<
  AdvancementId,
  AdvancementDefinition
> = {
  ...LEGACY_ADVANCEMENTS,
  ...TARGET_ADVANCEMENTS,
};

export const isAdvancementId = (
  value: unknown,
): value is AdvancementId =>
  typeof value === "string" && Object.hasOwn(ADVANCEMENTS, value);

export const advancementDefinitionsFor = (
  player: Player,
): AdvancementDefinition[] =>
  visibleAdvancementDefinitions(
    player,
    ADVANCEMENTS,
    ADVANCEMENT_ORDER,
  );

export const earnedDisciplinePoints = (player: Player): number =>
  Math.max(0, Math.floor(player.level) - 1);

export const spentDisciplinePoints = (player: Player): number =>
  player.advancements.reduce(
    (total, id) => total + (ADVANCEMENTS[id]?.cost ?? 0),
    0,
  );

export const availableDisciplinePoints = (player: Player): number =>
  Math.max(
    0,
    earnedDisciplinePoints(player) - spentDisciplinePoints(player),
  );

export type { AdvancementNodeState };

export const advancementNodeState = (
  player: Player,
  definition: AdvancementDefinition,
): AdvancementNodeState =>
  advancementNodeStateFrom(
    player,
    definition,
    ADVANCEMENTS,
    availableDisciplinePoints(player),
  );

export const advancementTreeFor = (
  player: Player,
): AdvancementNodeState[] =>
  advancementDefinitionsFor(player).map((definition) =>
    advancementNodeState(player, definition),
  );

export interface AdvancementOffer {
  level: number;
  points: number;
  nodes: AdvancementNodeState[];
}

export const getAdvancementOffer = (
  state: GameState,
): AdvancementOffer | null => {
  const run = state.run;
  const location = advancementPresentationLocation(state);
  if (!run || !location) return null;

  const points = availableDisciplinePoints(run.player);
  if (points < 1) return null;

  return {
    level: run.player.level,
    points,
    nodes: advancementTreeFor(run.player),
  };
};

export const getPresentedAdvancement = (
  state: GameState,
): AdvancementDefinition | undefined => {
  const location = advancementPresentationLocation(state);
  const flags = state.run?.flags;
  if (!location || !flags) return undefined;

  const prefix = `advancement-presented:${location}:`;
  const id = [...flags]
    .reverse()
    .find((flag) => flag.startsWith(prefix))
    ?.slice(prefix.length);

  return isAdvancementId(id) ? ADVANCEMENTS[id] : undefined;
};

export const clearPresentedAdvancement = (
  state: GameState,
  advancementId: AdvancementId,
): boolean => {
  const location = advancementPresentationLocation(state);
  const run = state.run;
  if (!location || !run) return false;

  const flag = advancementPresentationFlag(
    location,
    advancementId,
  );
  if (!run.flags.includes(flag)) return false;

  run.flags = run.flags.filter((candidate) => candidate !== flag);
  return true;
};

export const applyAdvancement = (
  player: Player,
  advancementId: AdvancementId,
): void => {
  if (player.advancements.includes(advancementId)) return;

  const definition = ADVANCEMENTS[advancementId];
  player.advancements.push(advancementId);

  const maxHp = definition.effect.maxHp ?? 0;
  if (maxHp > 0) {
    player.maxHp += maxHp;
    player.hp = Math.min(player.maxHp, player.hp + maxHp);
  }

  const maxSpirit = definition.effect.maxSpirit ?? 0;
  if (maxSpirit > 0) {
    player.maxSpirit += maxSpirit;
    player.spirit = Math.min(
      player.maxSpirit,
      player.spirit + maxSpirit,
    );
  }

  for (const [skill, amount] of Object.entries(
    definition.effect.skills ?? {},
  )) {
    const id = skill as keyof Player["skills"];
    player.skills[id] = Math.min(
      5,
      Math.max(0, player.skills[id] + (amount ?? 0)),
    );
  }
};

export const advancementModifier = (
  player: Player,
  modifier: AdvancementModifierId,
): number =>
  player.advancements.reduce(
    (total, id) =>
      total + (ADVANCEMENTS[id].effect.modifiers?.[modifier] ?? 0),
    readiedAdvancementExpressions(player).reduce(
      (total, expressionId) =>
        total +
        (advancementExpressionFor(expressionId)?.effect.modifiers?.[
          modifier
        ] ?? 0),
      0,
    ),
  );

export const hasAdvancementRule = (
  player: Player,
  rule: AdvancementRuleId,
): boolean =>
  player.advancements.some((id) =>
    ADVANCEMENTS[id].effect.rules?.includes(rule),
  ) ||
  readiedAdvancementExpressions(player).some((id) =>
    advancementExpressionFor(id)?.effect.rules?.includes(rule),
  );

export const advancementSources = (
  player: Player,
  modifier: AdvancementModifierId,
): AdvancementDefinition[] =>
  [
    ...player.advancements.map((id) => ADVANCEMENTS[id]),
    ...readiedAdvancementExpressions(player)
      .map((id) => advancementExpressionFor(id)?.parent)
      .filter(
        (definition): definition is AdvancementDefinition =>
          Boolean(definition),
      ),
  ]
    .filter(
      (definition) =>
        (definition.effect.modifiers?.[modifier] ?? 0) !== 0 ||
        definition.duality?.kind === "prepared" &&
          definition.duality.expressions.some(
            (expression) =>
              readiedAdvancementExpressions(player).includes(
                expression.id,
              ) &&
              (expression.effect.modifiers?.[modifier] ?? 0) !== 0,
          ),
    );

export const advancementSourcesForAction = (
  player: Player,
  actionId: ActionId,
): AdvancementDefinition[] => {
  const ids = new Set<AdvancementId>();
  for (const modifier of advancementModifiersForAction(actionId)) {
    for (const definition of advancementSources(player, modifier)) {
      ids.add(definition.id);
    }
  }
  for (const rule of advancementRulesForAction(actionId)) {
    for (const definition of [
      ...player.advancements.map((id) => ADVANCEMENTS[id]),
      ...readiedAdvancementExpressions(player)
        .map((id) => advancementExpressionFor(id)?.parent)
        .filter(
          (candidate): candidate is AdvancementDefinition =>
            Boolean(candidate),
        ),
    ]) {
      if (
        definition.effect.rules?.includes(rule) ||
        definition.duality?.kind === "prepared" &&
          definition.duality.expressions.some(
            (expression) =>
              readiedAdvancementExpressions(player).includes(expression.id) &&
              expression.effect.rules?.includes(rule),
          )
      ) {
        ids.add(definition.id);
      }
    }
  }
  return [...ids].map((id) => ADVANCEMENTS[id]);
};

export const markAdvancementPresented = (
  state: GameState,
  advancementId: AdvancementId,
): void => {
  const location = advancementPresentationLocation(state);
  const run = state.run;
  if (!location || !run) return;

  run.flags = run.flags.filter(
    (flag) =>
      !flag.startsWith(`advancement-presented:${location}:`) &&
      !flag.startsWith("advancement-deferred:"),
  );
  run.flags.push(
    advancementPresentationFlag(location, advancementId),
  );
};
