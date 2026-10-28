import assert from "node:assert/strict";
import test from "node:test";
import {
  SCALE_RECORD_KINDS,
  SCALE_SAVE_TARGETS,
  assessPersistenceScaleReport,
  createLongSessionStressPlan,
  createMemoryStorage,
  createScalePersistenceFixture,
  createScalePersistenceMatrix,
  measurePersistenceWorkload,
  summarizePersistenceMeasurements,
  utf8ByteLength,
} from "./performance-scale-fixtures.mjs";

const baseEnvelope = () => ({
  schemaVersion: 4,
  savedAt: "2026-08-03T00:00:00.000Z",
  state: {
    schemaVersion: 4,
    screen: "story",
    storyId: "road",
    ending: null,
    inventoryReturnScreen: null,
    journalReturnScreen: null,
    run: {
      seed: 1234,
      flags: ["opening-complete"],
    },
  },
});

test("builds exact deterministic scale targets without mutating the save", () => {
  const base = baseEnvelope();
  const fixtures = createScalePersistenceMatrix(base);

  assert.equal(fixtures.length, Object.keys(SCALE_SAVE_TARGETS).length);
  fixtures.forEach((fixture) => {
    assert.equal(utf8ByteLength(fixture.serialized), fixture.manifest.targetBytes);
    assert.equal(fixture.manifest.serializedBytes, fixture.manifest.targetBytes);
    assert.ok(fixture.manifest.scaleFlagCount > 1);
    SCALE_RECORD_KINDS.forEach((kind) => {
      assert.ok(fixture.manifest.records[kind] > 0);
    });
  });
  assert.deepEqual(base, baseEnvelope());

  const repeated = createScalePersistenceFixture(base, {
    targetBytes: SCALE_SAVE_TARGETS["100kb"],
    seed: 77,
  });
  const same = createScalePersistenceFixture(base, {
    targetBytes: SCALE_SAVE_TARGETS["100kb"],
    seed: 77,
  });
  const different = createScalePersistenceFixture(base, {
    targetBytes: SCALE_SAVE_TARGETS["100kb"],
    seed: 78,
  });
  assert.equal(repeated.serialized, same.serialized);
  assert.notEqual(repeated.serialized, different.serialized);
});

test("rejects envelopes or targets that cannot preserve the v4 extension seam", () => {
  assert.throws(
    () => createScalePersistenceFixture({}, { targetBytes: 100_000 }),
    /resumable v4 envelope/,
  );
  assert.throws(
    () =>
      createScalePersistenceFixture(baseEnvelope(), {
        targetBytes: 10,
      }),
    /cannot fit/,
  );
});

test("creates a reproducible long-session transition and checkpoint plan", () => {
  const plan = createLongSessionStressPlan({
    transitionCount: 1_000,
    contentPackCount: 12,
    saveEvery: 20,
    seed: 91,
  });
  const repeated = createLongSessionStressPlan({
    transitionCount: 1_000,
    contentPackCount: 12,
    saveEvery: 20,
    seed: 91,
  });

  assert.deepEqual(plan, repeated);
  assert.equal(plan.transitions.length, 1_000);
  assert.equal(plan.checkpointCount, 50);
  assert.equal(new Set(plan.transitions.map(({ packId }) => packId)).size, 12);
  assert.notEqual(plan.transitions[0].seedBefore, plan.transitions[0].seedAfter);
});

test("measures and summarizes each synchronous persistence operation", () => {
  let now = 0;
  const samples = measurePersistenceWorkload(baseEnvelope(), {
    iterations: 3,
    storage: createMemoryStorage(),
    clock: () => {
      const current = now;
      now += 0.5;
      return current;
    },
  });
  const report = summarizePersistenceMeasurements(samples);

  assert.equal(samples.length, 3);
  assert.equal(report.sampleCount, 3);
  assert.equal(report.operations.structuredCloneMs.p95Ms, 0.5);
  assert.equal(report.operations.stringifyMs.p95Ms, 0.5);
  assert.equal(report.operations.totalMs.p95Ms, 2.5);
  assert.equal(assessPersistenceScaleReport(report).passed, true);

  const failed = assessPersistenceScaleReport(report, {
    maximumOperationP95Ms: 0.25,
    maximumTotalP95Ms: 2,
  });
  assert.equal(failed.passed, false);
  assert.ok(failed.operationFailures.includes("structuredCloneMs"));
  assert.equal(failed.totalWithinBudget, false);

  const empty = summarizePersistenceMeasurements([]);
  assert.equal(assessPersistenceScaleReport(empty).available, false);
  assert.equal(assessPersistenceScaleReport(empty).passed, false);
});
