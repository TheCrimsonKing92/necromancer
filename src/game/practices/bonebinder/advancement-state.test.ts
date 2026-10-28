import { describe, expect, it } from "vitest";

import {
  assessLetterOfServiceOrder,
  bonebinderDoctrineFor,
  configureServantCompact,
  createBonebinderAdvancementState,
  isBonebinderAdvancementState,
  normalizeBonebinderAdvancementState,
  prepareCalledCounsel,
  previousCounselActionFor,
} from "./advancement-state";
import { createDitchHandServant } from "./fixture";
import type { BonebinderPracticeState } from "./types";

const createPractice = (): BonebinderPracticeState => ({
  servant: createDitchHandServant(),
  advancement: createBonebinderAdvancementState(),
});

describe("Bonebinder Tier-I advancement state", () => {
  it("detects absent, selected, and corrupt doctrine selections", () => {
    expect(bonebinderDoctrineFor([])).toBeNull();
    expect(bonebinderDoctrineFor(["letter-of-service"])).toBe(
      "letter-of-service",
    );
    expect(bonebinderDoctrineFor(["called-counsel"])).toBe(
      "called-counsel",
    );
    expect(
      bonebinderDoctrineFor(["letter-of-service", "called-counsel"]),
    ).toBe("conflict");
  });

  it("writes a service purpose only for its learned doctrine at a safe pause", () => {
    const practice = createPractice();

    expect(
      configureServantCompact(
        practice,
        ["letter-of-service"],
        "hold-watch",
        false,
      ),
    ).toMatchObject({ ok: false, reason: "unsafe-to-rewrite" });
    expect(
      configureServantCompact(
        practice,
        ["called-counsel"],
        "hold-watch",
        true,
      ),
    ).toMatchObject({ ok: false, reason: "wrong-doctrine" });

    const configured = configureServantCompact(
      practice,
      ["letter-of-service"],
      "hold-watch",
      true,
    );
    expect(configured.ok).toBe(true);
    if (!configured.ok) return;
    expect(configured.practice.advancement.compact).toEqual({
      purposeId: "hold-watch",
      status: "kept",
      breachReference: null,
    });
    expect(practice.advancement.compact).toBeNull();
  });

  it("returns the updated compact state when an order explicitly breaks it", () => {
    const configured = configureServantCompact(
      createPractice(),
      ["letter-of-service"],
      "hold-watch",
      true,
    );
    if (!configured.ok) throw new Error(configured.reason);

    const refusal = assessLetterOfServiceOrder(
      configured.practice,
      ["letter-of-service"],
      {
        commandId: "withdraw",
        serviceTags: ["abandon-charge"],
      },
    );
    expect(refusal).toMatchObject({
      ok: true,
      assessment: { outcome: "refused", mayIssue: false },
      practice: { advancement: { compact: { status: "kept" } } },
    });

    const breach = assessLetterOfServiceOrder(
      configured.practice,
      ["letter-of-service"],
      {
        commandId: "withdraw",
        serviceTags: ["abandon-charge"],
        decision: "break-compact",
        reference: "battle:saint-orra:round-2",
      },
    );
    expect(breach).toMatchObject({
      ok: true,
      assessment: { outcome: "breached", mayIssue: true },
      practice: {
        advancement: {
          compact: {
            status: "breached",
            breachReference: "battle:saint-orra:round-2",
          },
        },
      },
    });
    if (!breach.ok) return;
    expect(
      configureServantCompact(
        breach.practice,
        ["letter-of-service"],
        "keep-custody",
        true,
      ),
    ).toMatchObject({ ok: false, reason: "compact-breached" });
  });

  it("records counsel source and prevents consecutive repetition within a battle", () => {
    const first = prepareCalledCounsel(
      createPractice(),
      ["called-counsel"],
      "battle:road",
      1,
      0,
    );
    expect(first).toMatchObject({
      ok: true,
      selected: {
        actionId: "brace",
        memoryId: "memory:ditch-hand:pallbearer",
      },
      practice: {
        advancement: {
          counsel: {
            sequence: 1,
            lastAction: {
              battleReference: "battle:road",
              round: 1,
            },
          },
        },
      },
    });
    if (!first.ok) return;

    const second = prepareCalledCounsel(
      first.practice,
      ["called-counsel"],
      "battle:road",
      2,
      0,
    );
    expect(second).toMatchObject({
      ok: true,
      practice: { advancement: { counsel: { sequence: 2 } } },
    });
    if (!second.ok) return;
    expect(second.selected.actionId).not.toBe(first.selected.actionId);
    expect(
      previousCounselActionFor(
        second.practice,
        "battle:another-road",
        2,
      ),
    ).toBeNull();
  });

  it("normalizes missing or partial additive state without preserving invalid history", () => {
    expect(normalizeBonebinderAdvancementState(undefined)).toEqual(
      createBonebinderAdvancementState(),
    );
    const normalized = normalizeBonebinderAdvancementState({
      compact: { purposeId: "unknown", status: "kept" },
      counsel: {
        sequence: 3.9,
        lastAction: { actionId: "testimony", round: -1 },
      },
    });
    expect(normalized).toEqual({
      compact: null,
      counsel: { sequence: 3, lastAction: null },
    });
    expect(isBonebinderAdvancementState(normalized)).toBe(true);
  });
});
