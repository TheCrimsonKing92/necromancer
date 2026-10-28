import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createServer } from "vite";
import {
  WORST_CASE_WITNESS_COUNT,
  createWorstCaseFixtureMatrix,
} from "./performance-worst-case-fixtures.mjs";
import {
  createRealInteractionSoakPlan,
  runRealInteractionNavigationSoak,
} from "./performance-worst-case-browser.mjs";

const loadProductionContracts = async () => {
  const server = await createServer({
    root: resolve(import.meta.dirname, ".."),
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const [{ createCharacter }, { isResumableState }] = await Promise.all([
      server.ssrLoadModule("/src/game/engine.ts"),
      server.ssrLoadModule("/src/game/persistence/validation.ts"),
    ]);
    return {
      envelope: {
        schemaVersion: 4,
        savedAt: "2026-08-03T00:00:00.000Z",
        state: createCharacter("Scale Witness", "medium", "other").state,
      },
      isResumableState,
    };
  } finally {
    await server.close();
  }
};

test("builds deterministic worst-case fixtures accepted by v4 validation", async () => {
  const { envelope, isResumableState } = await loadProductionContracts();
  const first = createWorstCaseFixtureMatrix(envelope);
  const second = createWorstCaseFixtureMatrix(envelope);

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(
    first.map(({ id }) => id),
    ["battle-witness", "inventory-shop", "journal-world", "stats-tree"],
  );
  for (const fixture of first) {
    assert.equal(
      isResumableState(fixture.envelope.state),
      true,
      `${fixture.id} should remain a readable v4 state`,
    );
  }
});

test("covers maximum authored Witness retention and schema-supported breadth", async () => {
  const { envelope } = await loadProductionContracts();
  const fixtures = createWorstCaseFixtureMatrix(envelope);
  const battle = fixtures.find(({ id }) => id === "battle-witness");
  const inventory = fixtures.find(({ id }) => id === "inventory-shop");
  const journal = fixtures.find(({ id }) => id === "journal-world");
  const stats = fixtures.find(({ id }) => id === "stats-tree");

  assert.equal(battle.envelope.state.run.battle.log.length, WORST_CASE_WITNESS_COUNT);
  assert.ok(
    battle.envelope.state.run.battle.log.every(({ text }) => text.length > 900),
  );
  assert.equal(battle.envelope.state.run.battle.enemies.length, 3);
  assert.equal(battle.envelope.state.run.battle.allies.length, 3);
  assert.ok(
    battle.envelope.state.run.battle.enemies.every(
      ({ statuses }) => statuses.length === 4,
    ),
  );
  assert.equal(
    Object.values(inventory.envelope.state.run.player.inventory).length,
    21,
  );
  assert.equal(inventory.envelope.state.storyId, "saint-orra-aftermath");
  assert.equal(inventory.envelope.state.run.battlesWon, 2);
  assert.equal(journal.envelope.state.run.world.evidence.length, 96);
  assert.equal(journal.envelope.state.run.world.beliefs.length, 96);
  assert.equal(journal.envelope.state.run.world.provenance.length, 48);
  assert.equal(stats.envelope.state.run.player.level, 10);
  assert.equal(stats.manifest.campaignRouteSoak.supported, false);
  assert.match(stats.manifest.combatActionSoak.reason, /authoritative/u);
});

test("plans 500-1000 real reversible interactions without inventing transitions", () => {
  const plan = createRealInteractionSoakPlan({ interactionCount: 600 });
  assert.equal(plan.cycleCount, 300);
  assert.equal(plan.cycles.length, 300);
  assert.deepEqual(
    new Set(plan.cycles.map(({ surface }) => surface)),
    new Set(["stats", "inventory", "journal"]),
  );
  assert.ok(
    plan.cycles.every(({ interactions }) =>
      interactions.join(",") === "open,close",
    ),
  );
  assert.equal(plan.unsupportedDimensions.domainTransitions.supported, false);
  assert.throws(
    () => createRealInteractionSoakPlan({ interactionCount: 499 }),
    /500 through 1000/u,
  );
  assert.throws(
    () => createRealInteractionSoakPlan({ interactionCount: 501 }),
    /even integer/u,
  );
});

test("executes every planned public open/close interaction", async () => {
  let clicks = 0;
  const page = {
    evaluate: async (callback) =>
      callback.toString().includes("nodeCount")
        ? { nodeCount: 100, documentCount: 1, usedJsHeapBytes: null }
        : null,
    locator: () => ({
      click: async () => {
        clicks += 1;
      },
      waitFor: async () => {},
    }),
  };
  const report = await runRealInteractionNavigationSoak({
    page,
    plan: createRealInteractionSoakPlan({ interactionCount: 500 }),
  });

  assert.equal(clicks, 500);
  assert.equal(report.interactionCount, 500);
  assert.equal(report.cycleCount, 250);
  assert.equal(report.finalNodeDelta, 0);
  assert.equal(report.finalDocumentDelta, 0);
  assert.deepEqual(report.surfaceCycles, {
    stats: 84,
    inventory: 83,
    journal: 83,
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(report.surfaceDurations).map(([surface, summary]) => [
        surface,
        summary.count,
      ]),
    ),
    report.surfaceCycles,
  );
});
