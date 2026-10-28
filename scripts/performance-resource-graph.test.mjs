import assert from "node:assert/strict";
import test from "node:test";
import {
  COLD_RESOURCE_STAGE_BUDGETS,
  derivedTransferBudgetBytes,
} from "./performance-cold-resource-budget.mjs";
import { summarizeResourceGraph } from "./performance-resource-graph.mjs";

const resource = (name, transferSize, encodedBodySize = transferSize) => ({
  name: `http://127.0.0.1:4173${name}`,
  initiatorType: "script",
  transferSize,
  encodedBodySize,
  decodedBodySize: encodedBodySize * 2,
});

test("attributes each cold resource to its first observed UI checkpoint", () => {
  const result = summarizeResourceGraph(
    [
      {
        id: "title",
        observedAtMs: 100,
        resources: [resource("/index.js", 40), resource("/style.css", 20)],
      },
      {
        id: "creation",
        observedAtMs: 200,
        resources: [resource("/index.js", 40), resource("/creation.js", 15)],
      },
      {
        id: "battle",
        observedAtMs: 300,
        resources: [
          resource("/index.js", 40),
          resource("/creation.js", 15),
          resource("/battle.js?hash=one", 30),
        ],
      },
    ],
    {
      stageBudgets: {
        title: {
          encodedBodyBytes: 60,
          resourceCount: 2,
          transferOverheadBytesPerRequest: 5,
        },
        creation: {
          encodedBodyBytes: 10,
          resourceCount: 1,
          transferOverheadBytesPerRequest: 5,
        },
        battle: {
          encodedBodyBytes: 25,
          resourceCount: 1,
          transferOverheadBytesPerRequest: 5,
        },
      },
    },
  );

  assert.equal(result.available, true);
  assert.equal(result.resourceCount, 4);
  assert.equal(result.transferBytes, 105);
  assert.equal(result.stages[0].addedTransferBytes, 60);
  assert.deepEqual(result.stages[0].budget, {
    encodedBodyBytes: 60,
    resourceCount: 2,
    transferOverheadBytesPerRequest: 5,
    transferBytes: 70,
  });
  assert.equal(result.stages[0].withinBudget, true);
  assert.deepEqual(result.stages[1].budgetFailures, [
    "encodedBodyBytes",
  ]);
  assert.deepEqual(result.stages[1].overBudget, {
    encodedBodyBytes: 5,
    resourceCount: 0,
    transferBytes: 0,
  });
  assert.deepEqual(result.stages[2].budgetFailures, [
    "encodedBodyBytes",
  ]);
  assert.equal(result.budget.withinBudget, false);
  assert.equal(result.budget.transferBytes, 115);
  assert.equal(result.budget.encodedBodyBytes, 95);
  assert.equal(result.budget.resourceCount, 4);
  assert.equal(result.budget.withinTransferBudget, true);
  assert.equal(result.budget.withinEncodedBodyBudget, false);
  assert.equal(result.budget.withinResourceCountBudget, true);
  assert.deepEqual(
    result.stages[2].resources.map(({ name, firstObservedAt }) => ({
      name,
      firstObservedAt,
    })),
    [{ name: "/battle.js?hash=one", firstObservedAt: "battle" }],
  );
  assert.equal(result.largestColdResources[0].name, "/index.js");
});

test("keeps cache-visible body bytes separate from transferred bytes", () => {
  const result = summarizeResourceGraph([
    {
      id: "title",
      resources: [resource("/cached.js", 0, 25)],
    },
  ]);

  assert.equal(result.transferBytes, 0);
  assert.equal(result.encodedBodyBytes, 25);
  assert.equal(result.stages[0].withinBudget, null);
});

test("derives observed-transfer headroom from payload and request budgets", () => {
  assert.equal(
    derivedTransferBudgetBytes(COLD_RESOURCE_STAGE_BUDGETS.title),
    15_600,
  );
  assert.equal(
    derivedTransferBudgetBytes(COLD_RESOURCE_STAGE_BUDGETS.creation),
    89_200,
  );
});
