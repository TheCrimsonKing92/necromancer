import { describe, expect, it } from "vitest";
import type {
  AdvancementDefinition,
  AdvancementExpressionDefinition,
  AdvancementExpressionId,
  AdvancementId,
} from "./types";
import { validateAdvancementGraph } from "./advancement-validation";

const node = (
  id: string,
  overrides: Partial<AdvancementDefinition> = {},
): AdvancementDefinition => ({
  id: id as AdvancementId,
  branch: "necromancy",
  minimumLevel: 2,
  cost: 1,
  prerequisites: [],
  name: id,
  description: `${id} description`,
  resultText: `${id} result`,
  effectText: `${id} effect`,
  effect: { maxHp: 1 },
  ...overrides,
});

const expression = (
  id: string,
  classification: AdvancementExpressionDefinition["classification"] =
    "passive",
): AdvancementExpressionDefinition => ({
  id: id as AdvancementExpressionId,
  name: id,
  classification,
  description: `${id} description`,
  effectText: `${id} effect`,
  effect: { maxSpirit: 1 },
});

describe("advancement graph v2 validation", () => {
  it("accepts coherent doctrine peers with different active/passive roles", () => {
    const definitions = {
      shelter: node("shelter", {
        classification: "passive",
        duality: { kind: "doctrine", group: "wound-method" },
      }),
      splint: node("splint", {
        classification: "active",
        duality: { kind: "doctrine", group: "wound-method" },
      }),
    };

    expect(validateAdvancementGraph(definitions)).toEqual([]);
  });

  it("rejects singleton doctrines and peers with incompatible scope or availability", () => {
    const singleton = {
      shelter: node("shelter", {
        classification: "passive",
        duality: { kind: "doctrine", group: "wound-method" },
      }),
    };
    expect(validateAdvancementGraph(singleton)).toContain(
      "shelter: doctrine group wound-method must contain at least two nodes.",
    );

    const incompatible = {
      shelter: singleton.shelter,
      splint: node("splint", {
        branch: "tradition",
        tradition: "medium",
        minimumLevel: 3,
        cost: 2,
        classification: "active",
        duality: { kind: "doctrine", group: "wound-method" },
      }),
    };
    expect(validateAdvancementGraph(incompatible)).toEqual(
      expect.arrayContaining([
        "splint: doctrine group wound-method must share a branch and practice or tradition.",
        "splint: doctrine group wound-method must share level, cost, and prerequisites.",
      ]),
    );
  });

  it("requires classified, non-rank dual nodes and coherent readiness scope", () => {
    const definitions = {
      unclassified: node("unclassified", {
        duality: { kind: "doctrine", group: "broken" },
      }),
      ranked: node("ranked", {
        classification: "rank",
        duality: { kind: "doctrine", group: "broken" },
      }),
      universalPractice: node("universal-practice", {
        classification: "transform",
        duality: {
          kind: "prepared",
          readiness: "practice",
          expressions: [expression("one"), expression("two")],
        },
      }),
      traditionUniversal: node("tradition-universal", {
        branch: "tradition",
        tradition: "medium",
        classification: "transform",
        duality: {
          kind: "prepared",
          readiness: "universal",
          expressions: [expression("three"), expression("four")],
        },
      }),
    };

    expect(validateAdvancementGraph(definitions)).toEqual(
      expect.arrayContaining([
        "unclassified: a dual advancement requires a classification.",
        "ranked: rank advancements cannot define duality.",
        "universal-practice: practice readiness requires a practice or compatibility tradition.",
        "tradition-universal: universal readiness cannot be restricted to a practice or tradition.",
      ]),
    );
  });

  it("rejects prepared-expression IDs reused anywhere in the graph", () => {
    const definitions = {
      first: node("first", {
        classification: "transform",
        duality: {
          kind: "prepared",
          readiness: "universal",
          expressions: [
            expression("shared-expression"),
            expression("first-other"),
          ],
        },
      }),
      second: node("second", {
        classification: "reaction",
        duality: {
          kind: "prepared",
          readiness: "universal",
          expressions: [
            expression("shared-expression", "active"),
            expression("second-other"),
          ],
        },
      }),
    };

    expect(validateAdvancementGraph(definitions)).toContain(
      "second/shared-expression: prepared expression id is already used by first.",
    );
  });

  it("accepts qualitative rules as effects and rejects duplicate declarations", () => {
    const definitions = {
      measured: node("measured", {
        effect: { rules: ["held-measure"] },
      }),
      repeated: node("repeated", {
        effect: {
          rules: ["field-splint", "field-splint"],
        },
      }),
    };

    expect(validateAdvancementGraph(definitions)).not.toContain(
      "measured: effect is empty.",
    );
    expect(validateAdvancementGraph(definitions)).toContain(
      "repeated: duplicate advancement rule.",
    );
  });
});
