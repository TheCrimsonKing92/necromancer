import { createWound } from "../anatomy";
import { resolveMundaneCheck } from "../checks";
import { standingBonebinderServantFor } from "../content-packs/bonebinder-runtime";
import { rollWakeVariant } from "../encounters";
import { addItem } from "../items";
import { awardExperience } from "../progression";
import { rollInteger } from "../random";
import { rollRoadEvent } from "../road-events";
import type { GameState, RunState, StoryChoice } from "../types";
import {
  rollRoadsideRendering,
  wakeVariantPoolForWorld,
} from "../world/north-vey-rules";
import {
  adjustWorldPressure,
  adjustWorldStanding,
  learnWorldFact,
  revealWorldFact,
} from "../world/state";
import { nextWoundNumber } from "./battle-openings";

export const resolveBurialCutCheck = (
  run: RunState,
  choice: StoryChoice,
): string | undefined => {
  if (!choice.skill && !standingBonebinderServantFor(run)) {
    return "No standing servant can bear the bier.";
  }

  const attempt = choice.skill
    ? resolveMundaneCheck(
        run.seed,
        run.player,
        { skill: choice.skill },
      )
    : { seed: run.seed, success: true, chance: 100, roll: 0 };
  run.seed = attempt.seed;
  run.flags.push(
    `burial-cut-result:${choice.id}:${attempt.success ? "success" : "failure"}`,
  );
  if (choice.skill) {
    run.flags.push(
      `burial-cut-roll:${choice.id}:${attempt.chance}:${attempt.roll}`,
    );
  }

  const canReceiveTally =
    attempt.success || choice.id === "give-use-name";
  if (canReceiveTally) run.flags.push("burial-tally");

  let healthCost = 0;
  if (!attempt.success && choice.id !== "give-use-name") {
    const torso = run.player.body.torso;
    healthCost = Math.min(
      3,
      Math.max(0, run.player.hp - 1),
      Math.max(0, torso.condition - 1),
    );
    run.player.hp -= healthCost;
    torso.condition -= healthCost;
    if (healthCost > 0) {
      torso.wounds.push(
        createWound(
          `w${nextWoundNumber(run.player)}`,
          "torso",
          "minor",
          "the burial washout",
          "Strained ribs",
          run.player.anatomy,
          "rest",
        ),
      );
    }
  }
  run.flags.push(`burial-cut-cost:${healthCost}`);
  addItem(run.player.inventory, "linen-binding");

  awardExperience(run.player, 25);

  revealWorldFact(
    run.world,
    "burial-crews",
    "aided-county-burial",
  );
  learnWorldFact(run.world, "aided-county-burial");
  if (attempt.success) {
    adjustWorldStanding(run.world, "burial-crews", 1);
  }

  if (choice.id === "give-use-name") {
    revealWorldFact(
      run.world,
      "burial-crews",
      "gave-use-name-to-burial-crews",
    );
    learnWorldFact(
      run.world,
      "gave-use-name-to-burial-crews",
    );
    if (attempt.success) {
      adjustWorldStanding(run.world, "burial-crews", 1);
    } else {
      revealWorldFact(
        run.world,
        "county-reeves",
        "gave-use-name-to-burial-crews",
      );
      adjustWorldPressure(run.world, "countyNotice", 1);
    }
  }
};

export const studyLedger = (run: RunState): void => {
  {
    awardExperience(run.player, 5);
    const notice = rollInteger(run.seed, 1, 100);
    run.seed = notice.seed;
    if (notice.value <= 40) {
      run.flags.push("ward-name-noticed");
    }
  }
  run.flags.push("read-ledger");
};

export const communeWithHollis = (run: RunState): void => {
  const healthCost = Math.min(
    2,
    Math.max(0, run.player.hp - 1),
  );
  run.player.hp -= healthCost;
  run.player.maxSpirit += 1;
  run.player.spirit = Math.min(
    run.player.maxSpirit,
    run.player.spirit + 1,
  );
  run.flags.push(`hollis-health-cost:${healthCost}`);
  run.flags.push("hollis-testimony");
};

export const renderRoadsideRemains = (run: RunState): void => {
  const rendering = rollRoadsideRendering(
    run.seed,
    run.player,
  );
  run.seed = rendering.seed;
  learnWorldFact(run.world, "hollis-vane-rendered");
  run.flags = run.flags.filter(
    (flag) => !flag.startsWith("hollis-rendering:"),
  );
  run.flags.push(
    `hollis-rendering:${rendering.yield}:${rendering.witnessed ? "witnessed" : "unseen"}`,
  );

  if (rendering.yield === "usable") {
    addItem(run.player.inventory, "grave-salt");
    addItem(run.player.inventory, "mortuary-tallow");
  } else if (rendering.yield === "pure") {
    addItem(run.player.inventory, "grave-salt", 2);
    addItem(run.player.inventory, "mortuary-tallow");
    addItem(run.player.inventory, "ossuary-ichor");
  }

  if (rendering.witnessed) {
    revealWorldFact(
      run.world,
      "county-reeves",
      "hollis-vane-rendered",
    );
    adjustWorldStanding(run.world, "county-reeves", -2);
    adjustWorldPressure(
      run.world,
      "countyNotice",
      2,
      "hollis-vane-rendered",
    );
  }
};

export const followNameStorm = (next: GameState, run: RunState): void => {
  const event = rollRoadEvent(run.seed, run.seenRoadEvents);
  run.seed = event.seed;
  run.roadEvent = event.eventId;
  if (!run.seenRoadEvents.includes(event.eventId)) {
    run.seenRoadEvents.push(event.eventId);
  }
  next.storyId = "road-interlude";
};

export const continueRoad = (next: GameState, run: RunState): void => {
  const variation = rollWakeVariant(
    run.seed,
    wakeVariantPoolForWorld(run.world),
  );
  run.seed = variation.seed;
  run.wakeVariant = variation.variantId;
  run.roadEvent = null;
  next.storyId = "black-mile-wake";
};
