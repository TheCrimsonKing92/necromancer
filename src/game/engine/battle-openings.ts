import {
  allWounds,
  createWound,
  getBodyPartLabel,
  isCombatantStanding,
  isVitalPartDestroyed,
} from "../anatomy";
import { damageWitness, possessiveDeterminer } from "../combat-witness";
import { applyIncomingDamage } from "../damage-resolution";
import { WAKE_VARIANTS, rollWakeVariant } from "../encounters";
import { spendPreparation } from "../campaign-preparations";
import { normalizeSeed } from "../random";
import {
  createWitnessEntry,
  witnessDamage,
  witnessMessage,
} from "../witness";
import type {
  Player,
  RunState,
  WakeVariantId,
  WitnessEvent,
} from "../types";
import {
  addLog,
  addOrRefreshStatus,
  additiveWardWitness,
  grantWard,
} from "./combat-state";
import { initializeGraveWardenBattle } from "../content-packs/grave-warden-runtime";
import {
  createAshShade,
  createRoadEnemies,
  createVaultEnemies,
  createWakeEnemies,
} from "./combatants";
import { deployPersistentServantForBattle } from "../content-packs/bonebinder-runtime";

export const nextWoundNumber = (player: Player): number =>
  allWounds(player).reduce((highest, wound) => {
    const match = /^w(\d+)$/.exec(wound.id);
    return match
      ? Math.max(highest, Number.parseInt(match[1]!, 10))
      : highest;
  }, 0) + 1;

export const startRoadBattle = (
  run: RunState,
  opening: "open-ground" | "dead-advance",
): void => {
  const enemies = createRoadEnemies();
  let nextWoundId = nextWoundNumber(run.player);
  const openingConsequences: WitnessEvent[] = [];

  if (opening === "open-ground") {
    run.player.ward = 4;
    run.flags.push("stood-open-ground");
  } else {
    run.player.spirit = Math.max(0, run.player.spirit - 1);
    enemies.forEach((enemy) => {
      const hpBefore = enemy.hp;
      enemy.hp = Math.max(1, enemy.hp - 3);
      enemy.body.torso.condition = Math.max(
        1,
        enemy.body.torso.condition - 3,
      );
      const wound = createWound(
        `w${nextWoundId}`,
        "torso",
        "minor",
        "the buried dead",
        undefined,
        enemy.anatomy,
      );
      enemy.body.torso.wounds.push(wound);
      openingConsequences.push(
        witnessDamage("player", {
          actor: "The buried dead",
          verb: "strike",
          actionLead: `The buried dead claw upward into ${enemy.name}`,
          target: enemy.name,
          targetPossessive: possessiveDeterminer(enemy),
          location: "torso",
          locationLabel: getBodyPartLabel("torso", enemy.anatomy),
          damage: hpBefore - enemy.hp,
          wardAbsorbed: 0,
          armorAbsorbed: 0,
          woundLabel: wound.label,
        }),
      );
      nextWoundId += 1;
    });
    run.flags.push("sent-dead-advance");
  }

  run.battle = {
    encounterId: "ossuary-road",
    variantId: null,
    round: 1,
    seed: normalizeSeed(run.seed ^ 0xa511e9b3),
    enemies,
    allies: [],
    outcome: null,
    nextWoundId,
    log:
      opening === "open-ground"
        ? [
            createWitnessEntry(
              1,
              1,
              witnessMessage(
                "system",
                "You set your feet on the open road. The first rush breaks against your Ward.",
              ),
            ),
          ]
        : [
            createWitnessEntry(
              1,
              1,
              witnessMessage(
                "system",
                "The burial stones stir. The dead surge across the road.",
              ),
            ),
            ...openingConsequences.map((event, index) =>
              createWitnessEntry(index + 2, 1, event),
            ),
          ],
  };
  initializeGraveWardenBattle(run);
  deployPersistentServantForBattle(run);

  if (run.flags.includes("heard-warning")) {
    addOrRefreshStatus(run.player, {
      id: "forewarned",
      turns: 1,
      potency: 10,
    });
    addLog(
      run.battle,
      witnessMessage(
        "system",
        "The floorboard dead already gave you the shape of their first movement. Forewarned grants +10% Accuracy and Evasion through this first exchange.",
      ),
    );
  }
};

export const startVaultBattle = (
  run: RunState,
  opening: "warded" | "shattered-seal",
): void => {
  const enemies = createVaultEnemies();
  const saint = enemies[0]!;
  let nextWoundId = nextWoundNumber(run.player);
  const allies = [];
  const openingNotes: string[] = [];

  if (run.flags.includes("pressed-descent")) {
    saint.hp -= 4;
    saint.body.torso.condition -= 4;
    saint.body.torso.wounds.push(
      createWound(
        `w${nextWoundId}`,
        "torso",
        "minor",
        "an unfinished incarnation",
      ),
    );
    nextWoundId += 1;
    openingNotes.push(
      "Caught half-assembled, Saint Orra begins wounded.",
    );
    spendPreparation(run, "early-descent");
  }

  if (run.flags.includes("read-ledger")) {
    saint.defense = Math.max(0, saint.defense - 1);
    if (run.flags.includes("ward-name-noticed")) {
      addOrRefreshStatus(run.player, {
        id: "exposed",
        turns: 2,
        potency: 1,
      });
      openingNotes.push(
        "Her surrendered ward-name leaves one point of Defense behind. One pale eye opens in the remembered ink and looks your way: you begin Exposed 1 for 2 rounds.",
      );
    } else {
      openingNotes.push(
        "Her surrendered ward-name leaves one point of Defense behind. Whatever watched from the ink has lost your trail.",
      );
    }
    spendPreparation(run, "ward-name");
  }

  if (run.flags.includes("hollis-testimony")) {
    const testimonyWard = grantWard(run.player, 3);
    openingNotes.push(
      additiveWardWitness(
        "Hollis’s last memory closes around you and",
        testimonyWard,
      ),
    );
    spendPreparation(run, "hollis-testimony");
  }

  if (run.flags.includes("burial-tally")) {
    const tallyWard = grantWard(run.player, 3);
    openingNotes.push(
      additiveWardWitness(
        "The burial crew’s stamped tally",
        tallyWard,
      ),
    );
    spendPreparation(run, "burial-tally");
  }

  if (run.flags.includes("bound-ash-hound")) {
    allies.push(createAshShade(run.player));
    openingNotes.push(
      "The ash-hound’s shade enters at your heel.",
    );
    spendPreparation(run, "bound-ash-hound");
  }

  if (opening === "warded") {
    const funeraryWard = grantWard(run.player, 6);
    openingNotes.push(
      additiveWardWitness(
        "The funerary ward",
        funeraryWard,
      ),
    );
  } else {
    run.player.spirit = Math.max(0, run.player.spirit - 1);
    saint.hp = Math.max(1, saint.hp - 5);
    saint.body.torso.condition = Math.max(
      1,
      saint.body.torso.condition - 5,
    );
    const sealWound = createWound(
      `w${nextWoundId}`,
      "torso",
      "serious",
      "the broken jaw-seal",
      "Jaw-seal rupture",
      "humanoid",
      "binding",
    );
    sealWound.bleed = 1;
    saint.body.torso.wounds.push(sealWound);
    nextWoundId += 1;
    openingNotes.push(
      "The broken jaw-seal tears a bleeding wound through her borrowed chest.",
    );
  }

  run.battle = {
    encounterId: "saint-orra",
    variantId: null,
    round: 1,
    seed: normalizeSeed(run.seed ^ 0x6f727261),
    enemies,
    allies,
    outcome: null,
    nextWoundId,
    log: [
      createWitnessEntry(
        1,
        1,
        witnessMessage(
          "system",
          `The counting room stands and names its price. ${openingNotes.join(" ")}`,
        ),
      ),
    ],
  };
  initializeGraveWardenBattle(run);
  deployPersistentServantForBattle(run);
};

export const startWakeBattle = (
  run: RunState,
  opening: "guarded" | "severing",
): void => {
  if (!run.wakeVariant) {
    const variation = rollWakeVariant(run.seed);
    run.seed = variation.seed;
    run.wakeVariant = variation.variantId;
  }
  const variantId = run.wakeVariant;
  const variant = WAKE_VARIANTS[variantId];
  const enemies = createWakeEnemies(variantId);
  let nextWoundId = nextWoundNumber(run.player);
  const openingConsequences: WitnessEvent[] = [];

  const occultDelayCount = [
    "rested-in-saint-wax",
    "road-interlude-delay",
  ].filter((flag) => run.flags.includes(flag)).length;
  if (
    variant.delayAffinity === "escaped-names" &&
    occultDelayCount > 0
  ) {
    const gatheredWard = occultDelayCount * 2;
    for (const enemy of enemies) {
      grantWard(enemy, gatheredWard);
    }
    openingConsequences.push(
      witnessMessage(
        "system",
        `The escaped names use the lost time to gather ${gatheredWard} Ward around each thing in their wake.`,
      ),
    );
  }

  if (opening === "guarded") {
    grantWard(run.player, 5);
  } else {
    run.player.spirit = Math.max(0, run.player.spirit - 1);
    for (const enemy of enemies) {
      const wasStanding = isCombatantStanding(enemy);
      const healthBefore = enemy.hp;
      const applied = applyIncomingDamage(
        enemy,
        4,
        "occult",
        "torso",
        "a severing word",
        0,
        `w${nextWoundId}`,
      );
      if (applied.woundCreated) {
        nextWoundId += 1;
      }
      openingConsequences.push(
        damageWitness(
          "player",
          "a severing word",
          run.player,
          enemy,
          {
            hit: true,
            chance: 100,
            roll: 1,
            defeated:
              wasStanding && !isCombatantStanding(enemy),
            defeatCause:
              wasStanding &&
              !isCombatantStanding(enemy) &&
              isVitalPartDestroyed(enemy) &&
              healthBefore - applied.result.damage > 0
                ? "vital-region"
                : wasStanding &&
                    !isCombatantStanding(enemy)
                  ? "health"
                  : undefined,
            ...applied.result,
          },
        ),
      );
    }
  }

  const openingMessage =
    opening === "guarded"
      ? `${variant.guardedOpening} Your Ward rises to ${run.player.ward}.`
      : variant.severingOpening;
  const seedSalt: Record<WakeVariantId, number> = {
    "bell-widow": 0x62656c6c,
    "name-thieves": 0x6e616d65,
    "bone-procession": 0x62696572,
    "reliquary-poachers": 0x706f6163,
    "reeve-patrol": 0x72656576,
  };

  run.battle = {
    encounterId: "black-mile-wake",
    variantId,
    round: 1,
    seed: normalizeSeed(run.seed ^ seedSalt[variantId]),
    enemies,
    allies: [],
    outcome: null,
    nextWoundId,
    log: [
      createWitnessEntry(
        1,
        1,
        witnessMessage("system", openingMessage),
      ),
      ...openingConsequences.map((event, index) =>
        createWitnessEntry(index + 2, 1, event),
      ),
    ],
  };
  initializeGraveWardenBattle(run);
  deployPersistentServantForBattle(run);
};
