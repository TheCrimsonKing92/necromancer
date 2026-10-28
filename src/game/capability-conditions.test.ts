import { describe, expect, it } from "vitest";
import {
  evaluateCapabilityAvailability,
  validateCapabilityConditionContext,
  validateConditionedCapability,
  type ConditionedCapability,
} from "./capability-conditions";

const capability: ConditionedCapability<
  "full-expression" | "make-seat" | "mundane-fallback"
> = {
  id: "fixture-conditioned-practice",
    primaryActionId: "full-expression",
  amplifiedActionId: "full-expression",
  required: ["fixture-seat"],
  amplifying: ["fixture-deep-seat"],
  setup: [{ actionId: "make-seat", establishes: ["fixture-seat"] }],
  fallbackActionId: "mundane-fallback",
};

describe("capability requirements and affinities", () => {
  it("distinguishes direct, amplified, and portable availability", () => {
    expect(
      evaluateCapabilityAvailability(capability, {
        knownCapabilities: [capability.id],
        present: ["fixture-seat", "fixture-deep-seat"],
      }),
    ).toMatchObject({
      state: "ready",
      actionId: "full-expression",
      activeAmplifiers: ["fixture-deep-seat"],
      preparationCommitments: [],
    });

    expect(
      evaluateCapabilityAvailability(capability, {
        knownCapabilities: [capability.id],
        present: [],
        preparations: [
          {
            id: "fixture-portable-seat",
            conditionId: "fixture-seat",
            usesRemaining: 1,
            commitment: "action",
          },
        ],
      }),
    ).toMatchObject({
      state: "prepared",
      actionId: "full-expression",
      preparationCommitments: ["fixture-portable-seat"],
      activeAmplifiers: [],
    });
  });

  it("respects provider reach, access, and degradation without using region as a proxy", () => {
    const providerContext = {
      knownCapabilities: [capability.id],
      present: [] as string[],
      reachIds: ["fixture-site"],
      providers: [
        {
          id: "fixture-local-provider",
          conditionId: "fixture-seat",
          scope: "locality" as const,
          reachIds: ["fixture-site"],
          access: "available" as const,
          degradation: 0.25,
        },
      ],
    };
    expect(
      evaluateCapabilityAvailability(capability, providerContext),
    ).toMatchObject({
      state: "ready",
      required: [
        {
          conditionId: "fixture-seat",
          source: "provider",
          providerId: "fixture-local-provider",
        },
      ],
    });

    expect(
      evaluateCapabilityAvailability(capability, {
        ...providerContext,
        reachIds: ["fixture-distant-site"],
      }),
    ).toMatchObject({ state: "setup-required" });
    expect(
      evaluateCapabilityAvailability(capability, {
        ...providerContext,
        providers: [
          { ...providerContext.providers[0]!, access: "restricted" },
        ],
      }),
    ).toMatchObject({ state: "setup-required" });
    expect(
      evaluateCapabilityAvailability(capability, {
        ...providerContext,
        providers: [
          { ...providerContext.providers[0]!, degradation: 1 },
        ],
      }),
    ).toMatchObject({ state: "setup-required" });
  });

  it("offers setup, fallback, and true unavailability without mutation", () => {
    const context = {
      knownCapabilities: [capability.id],
      present: [] as string[],
    };
    expect(evaluateCapabilityAvailability(capability, context)).toMatchObject({
      state: "setup-required",
      actionId: "make-seat",
      fallbackActionId: "mundane-fallback",
      missingRequired: ["fixture-seat"],
    });
    expect(context.present).toEqual([]);

    const fallbackOnly = { ...capability, setup: undefined };
    expect(
      evaluateCapabilityAvailability(fallbackOnly, context),
    ).toMatchObject({ state: "fallback", actionId: "mundane-fallback" });

    expect(
      evaluateCapabilityAvailability(
        { ...fallbackOnly, fallbackActionId: undefined },
        context,
      ),
    ).toMatchObject({ state: "unavailable", actionId: undefined });
  });

  it("accounts for training, opportunity, and costs separately", () => {
    const costed = {
      ...capability,
      required: ["fixture-opening"],
      setup: undefined,
      costs: [
        {
          resourceId: "fixture-cost",
          amount: 2,
          commitment: "action" as const,
        },
      ],
    };
    expect(
      evaluateCapabilityAvailability(costed, {
        knownCapabilities: [],
        present: [],
        opportunities: ["fixture-opening"],
        resources: { "fixture-cost": 2 },
      }),
    ).toMatchObject({ state: "untrained", actionId: undefined });
    expect(
      evaluateCapabilityAvailability(costed, {
        knownCapabilities: [capability.id],
        present: [],
        opportunities: ["fixture-opening"],
        resources: { "fixture-cost": 1 },
      }),
    ).toMatchObject({
      state: "fallback",
      actionId: "mundane-fallback",
      missingCosts: [
        { resourceId: "fixture-cost", amount: 2, commitment: "action" },
      ],
      required: [
        { conditionId: "fixture-opening", source: "opportunity" },
      ],
    });
  });

  it("validates authored capability and preparation contracts", () => {
    expect(validateConditionedCapability(capability)).toEqual([]);
    expect(
      validateConditionedCapability({
        id: "",
        primaryActionId: "",
        required: ["needed", "needed"],
        setup: [{ actionId: "", establishes: ["unrelated"] }],
      }),
    ).toEqual(
      expect.arrayContaining([
        "capability has no id",
        "capability has no primary action",
        "capability repeats a requirement",
        "capability has an empty setup action",
        "capability has setup outside its requirements",
      ]),
    );
    expect(
      validateCapabilityConditionContext({
        knownCapabilities: [""],
        present: [""],
        reachIds: [""],
        providers: [
          {
            id: "provider",
            conditionId: "",
            scope: "site",
            reachIds: [""],
            access: "available",
            degradation: 2,
          },
        ],
        preparations: [
          {
            id: "same",
            conditionId: "",
            usesRemaining: -1,
            commitment: "action",
          },
          {
            id: "same",
            conditionId: "condition",
            usesRemaining: 1,
            commitment: "action",
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "actor contains an empty capability id",
        "context contains an empty condition id",
        "context contains an empty reach id",
        "provider has no condition id",
        "provider has invalid degradation",
        "provider has an empty reach id",
        "same has no condition id",
        "same has invalid uses",
        "context repeats preparation same",
      ]),
    );
  });
});
