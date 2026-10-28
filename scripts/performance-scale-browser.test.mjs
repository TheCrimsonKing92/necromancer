import assert from "node:assert/strict";
import test from "node:test";
import {
  captureScalePersistenceBrowser,
  selectOptionalSurfaceSoakSteps,
} from "./performance-scale-browser.mjs";
import { createLongSessionStressPlan } from "./performance-scale-fixtures.mjs";

const baseline = {
  schemaVersion: 4,
  savedAt: "2026-08-03T00:00:00.000Z",
  state: {
    schemaVersion: 4,
    run: { seed: 1, flags: ["real-save"] },
  },
};

const measuredSamples = (bytes, iterations) =>
  Array.from({ length: iterations }, (_, index) => ({
    index,
    bytes,
    structuredCloneMs: 0.5,
    stringifyMs: 0.6,
    storageSetMs: 0.2,
    storageGetMs: 0.1,
    parseMs: 0.4,
    totalMs: 1.8,
    schemaVersion: 4,
  }));

test("measures exact browser phases and returns no fixture payloads", async () => {
  const evaluations = [];
  const page = {
    evaluate: async (_callback, argument) => {
      evaluations.push(argument);
      if (typeof argument === "string") return JSON.stringify(baseline);
      if (argument?.envelope) {
        return measuredSamples(
          Buffer.byteLength(JSON.stringify(argument.envelope)),
          argument.iterations,
        );
      }
      return null;
    },
  };

  const result = await captureScalePersistenceBrowser({
    page,
    iterations: 3,
    targets: { "100kb": 100 * 1024, "250kb": 250 * 1024 },
  });

  assert.equal(result.supported, true);
  assert.equal(result.overall.passed, true);
  assert.equal(result.phases.length, 2);
  assert.equal(result.phases[0].manifest.serializedBytes, 100 * 1024);
  assert.equal(result.phases[1].report.sampleCount, 3);
  assert.deepEqual(result.phases[0].integrity, {
    exactBytes: true,
    consistentBytes: true,
    schemaVersionPreserved: true,
  });
  assert.equal(Object.hasOwn(result.phases[0], "envelope"), false);
  assert.equal(Object.hasOwn(result.phases[0], "serialized"), false);
  assert.equal(evaluations.filter((value) => value?.envelope).length, 2);
});

test("reports absent and malformed saves as unsupported", async () => {
  const absent = await captureScalePersistenceBrowser({
    page: { evaluate: async () => null },
  });
  assert.equal(absent.supported, false);
  assert.match(absent.reason, /No resumable save/u);

  const malformed = await captureScalePersistenceBrowser({
    page: { evaluate: async () => "not-json" },
  });
  assert.equal(malformed.supported, false);
  assert.match(malformed.reason, /not valid JSON/u);
});

test("selects a bounded real-surface soak without claiming route transitions", () => {
  const plan = createLongSessionStressPlan({
    transitionCount: 1_000,
    contentPackCount: 16,
    seed: 100,
  });
  const steps = selectOptionalSurfaceSoakSteps(plan, { maximumCycles: 12 });

  assert.equal(steps.length, 12);
  assert.deepEqual(
    new Set(steps.map(({ surface }) => surface)),
    new Set(["stats", "inventory", "journal"]),
  );
  assert.ok(steps.every(({ transitionIndex }) => transitionIndex < 1_000));
  assert.throws(
    () => selectOptionalSurfaceSoakSteps(plan, { maximumCycles: 101 }),
    /1 through 100/u,
  );
});
