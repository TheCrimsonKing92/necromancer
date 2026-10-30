import { advancementModifier } from "../advancements";
import { convalesceWounds } from "../anatomy";
import { resolveMundaneCheck } from "../checks";
import { addItem, itemCount, removeItem } from "../items";
import { awardExperience } from "../progression";
import type { GameState, RunState } from "../types";
import {
  adjustWorldPressure,
  adjustWorldStanding,
  learnWorldFact,
  revealWorldFact,
} from "../world/state";

const applyConvalescence = (run: RunState) => {
  const recovery = convalesceWounds(run.player, {
    conditionPerInjuredPart:
      3 +
      advancementModifier(
        run.player,
        "recovery-condition",
      ),
    scarConditionPenalty: Math.max(
      0,
      1 -
        advancementModifier(
          run.player,
          "scar-condition-penalty-reduction",
        ),
    ),
  });
  run.flags = run.flags.filter(
    (flag) => !flag.startsWith("convalescence:"),
  );
  run.flags.push(
    `convalescence:${recovery.stabilized.length}:${recovery.improved.length}:${recovery.scars.length}:${recovery.conditionRestored}:${recovery.healed.length}`,
  );
  return recovery;
};

export const restAtTollhouse = (next: GameState, run: RunState): void => {
  applyConvalescence(run);
  run.player.hp = Math.min(
    run.player.maxHp,
    run.player.hp + 6,
  );
  run.player.spirit = run.player.maxSpirit;
  run.flags.push("rested-at-tollhouse");
  next.storyId = "ossuary-vault";
};

export const dressSaintWounds = (run: RunState): void => {
  const healthBefore = run.player.hp;
  applyConvalescence(run);
  run.player.hp = Math.min(
    run.player.maxHp,
    run.player.hp + 8,
  );
  run.player.spirit = run.player.maxSpirit;
  run.flags = run.flags.filter(
    (flag) =>
      !flag.startsWith("saint-recovery-health:") &&
      !flag.startsWith("saint-recovery-vitality:"),
  );
  run.flags.push(
    `saint-recovery-health:${run.player.hp - healthBefore}`,
  );
  run.flags.push("rested-in-saint-wax");
  adjustWorldPressure(run.world, "escapedNames", 2);
};

export const shareCaravanFire = (run: RunState): void => {
  const healthBefore = run.player.hp;
  const spiritBefore = run.player.spirit;
  run.player.hp = Math.min(
    run.player.maxHp,
    run.player.hp + 4,
  );
  run.player.spirit = Math.min(
    run.player.maxSpirit,
    run.player.spirit + 1,
  );
  run.flags.push(
    `caravan-recovery:${run.player.hp - healthBefore}:${run.player.spirit - spiritBefore}`,
  );
  if (!run.flags.includes("road-interlude-delay")) {
    run.flags.push("road-interlude-delay");
  }
  learnWorldFact(run.world, "shared-mourning-fire");
  adjustWorldStanding(
    run.world,
    "north-road-households",
    1,
  );
  adjustWorldPressure(run.world, "escapedNames", 1);
};

export const tradeForSurgery = (run: RunState): string | undefined => {
  if (!removeItem(run.player.inventory, "ossuary-ichor")) {
    return "Iven’s careful hands require one ampoule of ossuary ichor.";
  }
  const healthBefore = run.player.hp;
  const recovery = applyConvalescence(run);
  run.player.hp = Math.min(
    run.player.maxHp,
    run.player.hp + 6,
  );
  run.flags.push(
    `surgeon-recovery:${run.player.hp - healthBefore}:${recovery.stabilized.length}:${recovery.improved.length}:${recovery.healed.length}:${recovery.scars.length}`,
  );
  learnWorldFact(run.world, "dealt-with-iven");
  adjustWorldStanding(run.world, "iven-saye", 1);
};

export const bargainForVigilCordial = (run: RunState): string | undefined => {
  if (itemCount(run.player.inventory, "ossuary-ichor") < 1) {
    return "Iven will not open the case for a promise. The trade requires one ampoule of ossuary ichor.";
  }
  if (run.player.spirit >= run.player.maxSpirit) {
    return "Iven sees no occult exhaustion to treat and leaves the case beneath the brazier.";
  }

  const attempt = resolveMundaneCheck(
    run.seed,
    run.player,
    {
      skill: "persuasion",
      difficulty: 5,
    },
  );
  run.seed = attempt.seed;
  let restored = 0;
  if (attempt.success) {
    removeItem(run.player.inventory, "ossuary-ichor");
    const spiritBefore = run.player.spirit;
    run.player.spirit = Math.min(
      run.player.maxSpirit,
      run.player.spirit + 3,
    );
    restored = run.player.spirit - spiritBefore;
    adjustWorldStanding(run.world, "iven-saye", 1);
  }
  run.flags.push(
    `iven-cordial-result:${attempt.success ? "success" : "failure"}:${attempt.chance}:${attempt.roll}:${restored}`,
  );
};

export const helpDitchBurial = (run: RunState): void => {
  const torso = run.player.body.torso;
  const strain = Math.min(
    2,
    Math.max(0, run.player.hp - 1),
    Math.max(0, torso.condition - 1),
  );
  run.player.hp -= strain;
  torso.condition -= strain;
  awardExperience(run.player, 5);
  addItem(run.player.inventory, "linen-binding");
  run.flags.push(`burial-strain:${strain}`);
  if (!run.flags.includes("road-interlude-delay")) {
    run.flags.push("road-interlude-delay");
  }
  learnWorldFact(run.world, "aided-county-burial");
  revealWorldFact(
    run.world,
    "burial-crews",
    "aided-county-burial",
  );
  adjustWorldStanding(run.world, "burial-crews", 1);
  adjustWorldPressure(run.world, "escapedNames", 1);
};
