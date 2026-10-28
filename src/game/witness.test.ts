import { describe, expect, it } from "vitest";
import {
  MAX_PERSISTED_WITNESS_ENTRIES,
  appendWitness,
  createWitnessEntry,
  witnessDamage,
  witnessMessage,
  witnessMiss,
  witnessPresentation,
  witnessStatus,
} from "./witness";
import type { BattleLogEntry, BattleState } from "./types";

describe("structured Witness events", () => {
  it("formats damage, mitigation, and wounds in one canonical order", () => {
    const entry = createWitnessEntry(
      4,
      2,
      witnessDamage("enemy", {
        actor: "Ash hound",
        action: "raking bite",
        target: "Mara",
        location: "rightArm",
        damage: 2,
        wardAbsorbed: 1,
        armorAbsorbed: 1,
        woundLabel: "Cut right forearm",
      }),
    );

    expect(entry.text).toBe(
      "Ash hound lunges low and rakes its teeth across Mara. 1 Ward absorbs part of the blow. Armor turns 1 damage. The remainder strikes the right arm for 2 damage. Mara suffers cut right forearm.",
    );
    expect(entry.event?.segments[0]).toMatchObject({
      type: "damage",
      location: "rightArm",
      damage: 2,
      wardAbsorbed: 1,
      armorAbsorbed: 1,
      woundLabel: "Cut right forearm",
    });
  });

  it("describes complete Ward absorption without implying damage or a wound", () => {
    const entry = createWitnessEntry(
      2,
      1,
      witnessDamage("enemy", {
        actor: "Ash hound",
        action: "raking bite",
        target: "Mara",
        location: "leftArm",
        damage: 0,
        wardAbsorbed: 3,
        armorAbsorbed: 0,
      }),
    );

    expect(entry.text).toBe(
      "Ash hound lunges low and rakes its teeth across Mara, but 3 Ward turns the blow aside completely before it reaches the left arm.",
    );
    expect(entry.text).not.toContain("0 damage");
    expect(entry.text).not.toContain("suffers");
  });

  it("names an incorporeal form and its own anatomy when steel passes through", () => {
    const entry = createWitnessEntry(
      3,
      1,
      witnessDamage("player", {
        actor: "Mara",
        action: "iron sickle",
        target: "The Bell-Widow",
        location: "leftArm",
        locationLabel: "Left reach",
        damage: 2,
        wardAbsorbed: 0,
        resistanceAbsorbed: 3,
        resistanceLabel: "Rain-woven form",
        armorAbsorbed: 0,
        woundLabel: "Frayed left reach",
      }),
    );

    expect(entry.text).toBe(
      "Mara sweeps the iron sickle through The Bell-Widow. Rain-woven form lets 3 damage pass through harmlessly. The remainder strikes the left reach for 2 damage. The Bell-Widow suffers frayed left reach.",
    );
    expect(entry.text).not.toContain("Armor");
    expect(entry.text).not.toContain("left arm");
  });

  it("prefers authored action narration while retaining the action as metadata", () => {
    const entry = createWitnessEntry(
      4,
      1,
      witnessDamage("player", {
        actor: "Malaki",
        action: "Spirit Lash",
        actionLead:
          "Malaki lashes a borrowed soul through Left-hand Mourner",
        target: "Left-hand Mourner",
        location: "leftArm",
        locationLabel: "Left reach",
        damage: 7,
        wardAbsorbed: 4,
        armorAbsorbed: 0,
        woundLabel: "Dissolving left reach",
      }),
    );

    expect(entry.text).toContain(
      "Malaki lashes a borrowed soul through Left-hand Mourner.",
    );
    expect(entry.text).not.toContain("uses Spirit Lash");
    expect(entry.event?.segments[0]).toMatchObject({
      type: "damage",
      action: "Spirit Lash",
    });
  });

  it("uses a supplied possessive determiner for the struck location", () => {
    const entry = createWitnessEntry(
      2,
      1,
      witnessDamage("enemy", {
        actor: "Hollis Vane",
        action: "knife thrust",
        actionLead: "Hollis Vane darts the knife toward Ahdna",
        target: "Ahdna",
        targetPossessive: "your",
        location: "torso",
        damage: 1,
        wardAbsorbed: 0,
        armorAbsorbed: 0,
      }),
    );

    expect(entry.text).toBe(
      "Hollis Vane darts the knife toward Ahdna, dealing 1 damage to your torso.",
    );
  });

  it("keeps miss rolls and defeat causes structured beneath authored prose", () => {
    const miss = createWitnessEntry(
      5,
      2,
      witnessMiss("player", {
        actor: "Malaki",
        action: "Spirit Lash",
        target: "The Bell-Widow",
        text: "The borrowed soul lashes through empty air",
        chance: 75,
        roll: 91,
      }),
    );
    expect(miss.text).toBe(
      "The borrowed soul lashes through empty air.",
    );
    expect(miss.event?.segments[0]).toMatchObject({
      type: "miss",
      chance: 75,
      roll: 91,
    });

    const defeated = createWitnessEntry(6, 2, {
      tone: "player",
      segments: [
        {
          type: "transition",
          entity: "Ash hound",
          transition: "defeated",
          cause: "vital-region",
          text: "The torn flank gives way",
        },
      ],
    });
    expect(defeated.text).toBe("The torn flank gives way.");
    expect(defeated.event?.segments[0]).toMatchObject({
      cause: "vital-region",
    });
  });

  it("formats statuses centrally and preserves legacy text-only entries", () => {
    const status = createWitnessEntry(
      3,
      1,
      witnessStatus("player", {
        lead: "Cold flame clings to the wound:",
        target: "Hollis Vane",
        status: "burning",
        potency: 2,
        turns: 3,
      }),
    );
    expect(status.text).toBe(
      "Cold flame clings to the wound: Hollis Vane suffers Burning 2 for 3 rounds.",
    );

    const legacy: BattleLogEntry = {
      id: 1,
      round: 1,
      tone: "system",
      text: "An older testament remains readable.",
    };
    expect(witnessPresentation(legacy)).toEqual({
      tone: "system",
      text: legacy.text,
    });
  });

  it("keeps discipline identity as metadata while witnessing its flavor", () => {
    const entry = createWitnessEntry(5, 2, {
      tone: "player",
      segments: [
        {
          type: "skill",
          skill: "White Ash",
          effect:
            "white ash settles in corpsefire’s wake and leaves its defense open.",
        },
      ],
    });

    expect(entry.text).toBe(
      "White ash settles in corpsefire’s wake and leaves its defense open.",
    );
    expect(entry.text).not.toContain("White Ash:");
    expect(entry.event?.segments[0]).toMatchObject({
      type: "skill",
      skill: "White Ash",
    });
  });

  it("bounds persisted combat history without losing recent entries or monotonic ids", () => {
    const battle: BattleState = {
      encounterId: "ossuary-road",
      variantId: null,
      round: 1,
      seed: 1,
      enemies: [],
      allies: [],
      log: [],
      outcome: null,
      nextWoundId: 1,
    };
    const total = MAX_PERSISTED_WITNESS_ENTRIES + 7;

    for (let index = 1; index <= total; index += 1) {
      appendWitness(
        battle,
        witnessMessage("system", `Exchange ${index}`),
      );
    }

    expect(battle.log).toHaveLength(
      MAX_PERSISTED_WITNESS_ENTRIES,
    );
    expect(battle.log[0]).toMatchObject({
      id: 8,
      text: "Exchange 8.",
    });
    expect(battle.log.at(-1)).toMatchObject({
      id: total,
      text: `Exchange ${total}.`,
    });
  });
});
