import { describe, expect, it } from "vitest";
import {
  NORTH_VEY_ROAD_THREAT_FIXTURE,
  composeProceduralEnemyRoster,
  resolveProceduralPopulationCandidate,
  validateProceduralRosterRequest,
  type ProceduralPopulationProfile,
  type ProceduralPopulationRequest,
} from "./procedural-enemies";
import { createProceduralEnemies } from "./engine/combatants";
import { enemyAttackFor } from "./enemy-actions";

const fixtureProfile = (
  setup = true,
): ProceduralPopulationProfile => ({
  id: "fixture-oriented-specialist",
  selector: { loadoutIds: ["crossbow"] },
  orientations: [
    {
      regionTags: ["fixture-origin-region"],
      institutionTags: ["fixture-origin-institution"],
    },
  ],
  capability: {
    id: "fixture-conditioned-capability",
    primaryActionId: "poacher-crossbow",
    required: ["fixture-enabling-condition"],
    setup: setup
      ? [
          {
            actionId: "reeve-spear-shield",
            establishes: ["fixture-enabling-condition"],
          },
        ]
      : undefined,
    fallbackActionId: "poacher-billhook",
  },
});

const population = (
  overrides: Partial<ProceduralPopulationRequest["context"]> = {},
  profile = fixtureProfile(),
): ProceduralPopulationRequest => ({
  context: {
    regionTags: ["fixture-origin-region"],
    institutionTags: ["fixture-origin-institution"],
    conditions: ["fixture-enabling-condition"],
    ...overrides,
  },
  profiles: [profile],
});

const requestWith = (populationRequest: ProceduralPopulationRequest) => ({
  seed: 41,
  encounterKey: "fixture-population",
  threatBudget: 8,
  minimumSize: 1,
  maximumSize: 1,
  allowedRoleIds: ["marksman"] as const,
  population: populationRequest,
});

describe("procedural population and capability constraints", () => {
  it("preserves legacy generation exactly when no population model is supplied", () => {
    expect(
      composeProceduralEnemyRoster({
        ...NORTH_VEY_ROAD_THREAT_FIXTURE,
        population: undefined,
      }),
    ).toEqual(composeProceduralEnemyRoster(NORTH_VEY_ROAD_THREAT_FIXTURE));
  });

  it("generates an oriented specialist near full capability", () => {
    const first = composeProceduralEnemyRoster(
      requestWith(
        population({
          conditions: ["fixture-enabling-condition"],
        }),
      ),
    );
    const again = composeProceduralEnemyRoster(
      requestWith(
        population({
          conditions: ["fixture-enabling-condition"],
        }),
      ),
    );

    expect(again).toEqual(first);
    expect(first.enemies[0]).toMatchObject({
      loadoutId: "crossbow",
      cadenceId: "poacher-crossbow",
      populationPlan: {
        profileId: "fixture-oriented-specialist",
        placement: "oriented",
        capability: {
          state: "ready",
          actionId: "poacher-crossbow",
          activeAmplifiers: [],
        },
      },
    });
  });

  it("admits travel through a credible origin, reason, and portable substitute", () => {
    const roster = composeProceduralEnemyRoster(
      requestWith(
        population({
          regionTags: ["fixture-current-region"],
          institutionTags: [],
          conditions: [],
          preparations: [
            {
              id: "fixture-portable-substitute",
              conditionId: "fixture-enabling-condition",
              usesRemaining: 1,
              commitment: "encounter",
            },
          ],
          presence: {
            kind: "travel",
            originId: "fixture-origin",
            origin: {
              regionTags: ["fixture-origin-region"],
              institutionTags: ["fixture-origin-institution"],
            },
            reasonId: "fixture-credible-journey",
          },
        }),
      ),
    );

    expect(roster.enemies[0]!.populationPlan).toMatchObject({
      placement: "travel-prepared",
      originId: "fixture-origin",
      presenceReasonId: "fixture-credible-journey",
      capability: {
        state: "prepared",
        actionId: "poacher-crossbow",
        preparationCommitments: ["fixture-portable-substitute"],
      },
    });
  });

  it("requires explicit deprivation and retains setup or fallback behavior", () => {
    const setupPopulation = population({ conditions: [] });
    const setupPlan = resolveProceduralPopulationCandidate(
      {
        roleId: "marksman",
        loadoutId: "crossbow",
        archetypeId: "reliquary-poacher",
        cadenceId: "poacher-crossbow",
      },
      setupPopulation,
    );
    expect(setupPlan).toMatchObject({
      placement: "setup-required",
      capability: {
        state: "setup-required",
        actionId: "reeve-spear-shield",
        fallbackActionId: "poacher-billhook",
      },
    });
    expect(
      validateProceduralRosterRequest(requestWith(setupPopulation)),
    ).toEqual(
      expect.arrayContaining([
        "population requires stateful capability execution unsupported by static battle cadences",
        "request has no compatible enemies",
      ]),
    );
    expect(() =>
      composeProceduralEnemyRoster(requestWith(setupPopulation)),
    ).toThrow(/stateful capability execution/);

    const deprivedPopulation = population(
      { conditions: [] },
      fixtureProfile(false),
    );
    expect(
      validateProceduralRosterRequest(requestWith(deprivedPopulation)),
    ).toContain("request has no compatible enemies");

    deprivedPopulation.context.intentionalDeprivation = {
      reasonId: "fixture-disrupted-site",
    };
    const deprived = composeProceduralEnemyRoster(
      requestWith(deprivedPopulation),
    );
    expect(deprived.enemies[0]!.populationPlan).toMatchObject({
      placement: "intentionally-deprived",
      deprivationReasonId: "fixture-disrupted-site",
      capability: {
        state: "fallback",
        actionId: "poacher-billhook",
      },
    });
    expect(deprived.enemies[0]!.cadenceId).toBe("poacher-billhook");
    const operational = createProceduralEnemies(
      requestWith(deprivedPopulation),
    ).enemies[0]!;
    expect(operational.cadenceId).toBe("poacher-billhook");
    expect(enemyAttackFor(operational, 1).name).toBe("billhook jab");
  });

  it("refuses action-scoped preparation until combat can consume it", () => {
    const actionPrepared = population({
      conditions: [],
      preparations: [
        {
          id: "fixture-action-preparation",
          conditionId: "fixture-enabling-condition",
          usesRemaining: 1,
          commitment: "action",
        },
      ],
    });
    expect(validateProceduralRosterRequest(requestWith(actionPrepared))).toContain(
      "population requires stateful capability execution unsupported by static battle cadences",
    );
  });

  it("rejects an unexplained regional mismatch and malformed content", () => {
    expect(
      validateProceduralRosterRequest(
        requestWith(
          population({
            regionTags: ["fixture-unrelated-region"],
            institutionTags: [],
          }),
        ),
      ),
    ).toContain("request has no compatible enemies");

    const invalid = population(
      {
        presence: {
          kind: "travel",
          originId: "",
          origin: { regionTags: [""], institutionTags: [] },
          reasonId: "",
        },
        intentionalDeprivation: { reasonId: "" },
      },
      {
        ...fixtureProfile(),
        id: "",
        orientations: [],
        capability: {
          ...fixtureProfile().capability!,
          primaryActionId: "missing-cadence" as never,
        },
      },
    );
    expect(validateProceduralRosterRequest(requestWith(invalid))).toEqual(
      expect.arrayContaining([
        "travel population has no reason",
        "travel population has no origin",
        "travel population has an invalid origin",
        "intentional deprivation has no reason",
        "population profile has no id",
        "population profile has no orientation",
        " references missing cadence missing-cadence",
        " primary cadence does not match crossbow",
        "request has no compatible enemies",
      ]),
    );
  });
});
