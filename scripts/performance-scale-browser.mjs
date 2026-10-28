import {
  DEFAULT_SCALE_BUDGET,
  SCALE_SAVE_TARGETS,
  assessPersistenceScaleReport,
  createScalePersistenceMatrix,
  summarizePersistenceMeasurements,
  utf8ByteLength,
} from "./performance-scale-fixtures.mjs";

const DEFAULT_SAVE_KEY = "necromancer:save:v4";
const DEFAULT_SCALE_STORAGE_KEY = "necromancer:performance-scale";
const errorMessage = (error) =>
  error instanceof Error ? error.message : String(error);

const SURFACE_CONTRACTS = Object.freeze({
  stats: {
    open: "[data-stats-control]",
    opened: "[data-stats-surface]",
    close: "[data-stats-control]",
  },
  inventory: {
    open: '[data-action="open-inventory"]',
    opened: ".inventory-page",
    close: '[data-action="close-inventory"]',
  },
  journal: {
    open: '[data-action="open-journal"]',
    opened: ".journal-page",
    close: '[data-action="close-journal"]',
  },
});

const afterPaint = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

const browserSnapshot = (page) =>
  page.evaluate(() => ({
    nodeCount: document.querySelectorAll("*").length,
    usedJsHeapBytes: Number.isFinite(performance.memory?.usedJSHeapSize)
      ? performance.memory.usedJSHeapSize
      : null,
  }));

const readSave = (page, saveKey) =>
  page.evaluate((key) => localStorage.getItem(key), saveKey);

const measureFixturePhase = (page, fixture, { iterations, storageKey }) =>
  page.evaluate(
    async ({ envelope, iterations: phaseIterations, phaseStorageKey }) => {
      const encoder = new TextEncoder();
      const byteLength = (value) => encoder.encode(value).byteLength;
      const prior = localStorage.getItem(phaseStorageKey);
      const samples = [];

      try {
        for (let index = 0; index < phaseIterations; index += 1) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          const totalStart = performance.now();
          const cloneStart = totalStart;
          const cloned = structuredClone(envelope);
          const cloneEnd = performance.now();
          const serialized = JSON.stringify(cloned);
          const stringifyEnd = performance.now();
          localStorage.setItem(phaseStorageKey, serialized);
          const storageSetEnd = performance.now();
          const stored = localStorage.getItem(phaseStorageKey);
          const storageGetEnd = performance.now();
          const parsed = JSON.parse(stored);
          const parseEnd = performance.now();

          samples.push({
            index,
            bytes: byteLength(serialized),
            structuredCloneMs: cloneEnd - cloneStart,
            stringifyMs: stringifyEnd - cloneEnd,
            storageSetMs: storageSetEnd - stringifyEnd,
            storageGetMs: storageGetEnd - storageSetEnd,
            parseMs: parseEnd - storageGetEnd,
            totalMs: parseEnd - totalStart,
            schemaVersion: parsed?.schemaVersion ?? null,
          });
        }
      } finally {
        if (prior === null) localStorage.removeItem(phaseStorageKey);
        else localStorage.setItem(phaseStorageKey, prior);
      }
      return samples;
    },
    {
      envelope: fixture.envelope,
      iterations,
      phaseStorageKey: `${storageKey}:${fixture.id}`,
    },
  );

const unsupportedPersistenceReport = (reason, saveKey) => ({
  supported: false,
  reason,
  saveKey,
  phases: [],
  overall: { passed: false, phaseCount: 0, failedPhaseIds: [] },
});

/**
 * Reads the application's real save, expands it in Node, and sends one target
 * at a time to the browser. Fixture payloads never enter the returned report.
 */
export const captureScalePersistenceBrowser = async ({
  page,
  saveKey = DEFAULT_SAVE_KEY,
  storageKey = DEFAULT_SCALE_STORAGE_KEY,
  targets = SCALE_SAVE_TARGETS,
  iterations = 7,
  fixtureOptions = {},
  budget = DEFAULT_SCALE_BUDGET,
} = {}) => {
  if (!page?.evaluate) {
    throw new TypeError("A Playwright page is required.");
  }
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new TypeError("iterations must be a positive integer.");
  }

  const rawSave = await readSave(page, saveKey);
  if (!rawSave) {
    return unsupportedPersistenceReport(
      `No resumable save was found at ${saveKey}. Produce a real v4 save before the scale phase.`,
      saveKey,
    );
  }

  let envelope;
  try {
    envelope = JSON.parse(rawSave);
  } catch {
    return unsupportedPersistenceReport(
      `The value at ${saveKey} is not valid JSON.`,
      saveKey,
    );
  }

  let fixtures;
  try {
    fixtures = createScalePersistenceMatrix(envelope, targets, fixtureOptions);
  } catch (error) {
    return unsupportedPersistenceReport(
      `The value at ${saveKey} is not a usable v4 scale baseline: ${errorMessage(error)}`,
      saveKey,
    );
  }
  if (fixtures.length === 0) {
    return unsupportedPersistenceReport(
      "The scale target matrix is empty.",
      saveKey,
    );
  }

  const phases = [];
  for (const fixture of fixtures) {
    try {
      const samples = await measureFixturePhase(page, fixture, {
        iterations,
        storageKey,
      });
      const report = summarizePersistenceMeasurements(samples);
      const integrity = {
        exactBytes: samples.every(
          ({ bytes }) => bytes === fixture.manifest.targetBytes,
        ),
        consistentBytes:
          new Set(samples.map(({ bytes }) => bytes)).size === 1,
        schemaVersionPreserved: samples.every(
          ({ schemaVersion }) => schemaVersion === envelope.schemaVersion,
        ),
      };
      const timingAssessment = assessPersistenceScaleReport(report, budget);
      phases.push({
        id: fixture.id,
        manifest: fixture.manifest,
        report,
        integrity,
        assessment: {
          ...timingAssessment,
          passed:
            timingAssessment.passed &&
            integrity.exactBytes &&
            integrity.consistentBytes &&
            integrity.schemaVersionPreserved,
        },
      });
    } catch (error) {
      phases.push({
        id: fixture.id,
        manifest: fixture.manifest,
        report: null,
        assessment: { available: false, passed: false },
        reason: errorMessage(error),
      });
    }
    await afterPaint(page);
  }

  const failedPhaseIds = phases
    .filter(({ assessment }) => !assessment.passed)
    .map(({ id }) => id);
  return {
    supported: true,
    saveKey,
    baselineBytes: utf8ByteLength(rawSave),
    iterations,
    phases,
    overall: {
      passed: failedPhaseIds.length === 0,
      phaseCount: phases.length,
      failedPhaseIds,
    },
  };
};

export const selectOptionalSurfaceSoakSteps = (
  plan,
  { maximumCycles = 24 } = {},
) => {
  if (!Array.isArray(plan?.transitions)) {
    throw new TypeError("A long-session stress plan is required.");
  }
  if (
    !Number.isInteger(maximumCycles) ||
    maximumCycles < 1 ||
    maximumCycles > 100
  ) {
    throw new TypeError("maximumCycles must be an integer from 1 through 100.");
  }
  return plan.transitions
    .filter(({ optionalSurface }) =>
      Object.hasOwn(SURFACE_CONTRACTS, optionalSurface),
    )
    .slice(0, maximumCycles)
    .map(({ index, optionalSurface, packId }) => ({
      transitionIndex: index,
      surface: optionalSurface,
      packId,
    }));
};

const nearestRank = (values, fraction) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};

const soakSummary = (cycles, baseline, final) => ({
  cycleCount: cycles.length,
  medianCycleMs: nearestRank(cycles.map(({ durationMs }) => durationMs), 0.5),
  p95CycleMs: nearestRank(cycles.map(({ durationMs }) => durationMs), 0.95),
  maximumCycleMs: nearestRank(cycles.map(({ durationMs }) => durationMs), 1),
  finalNodeDelta: final.nodeCount - baseline.nodeCount,
  peakNodeDelta: Math.max(
    0,
    ...cycles.map(({ snapshot }) => snapshot.nodeCount - baseline.nodeCount),
  ),
  finalUsedJsHeapDelta:
    final.usedJsHeapBytes === null || baseline.usedJsHeapBytes === null
      ? null
      : final.usedJsHeapBytes - baseline.usedJsHeapBytes,
});

/**
 * Soaks only public optional-surface interactions. It explicitly does not claim
 * to execute the plan's synthetic route transitions or content-pack changes.
 */
export const runBoundedOptionalSurfaceSoak = async ({
  page,
  plan,
  maximumCycles = 24,
} = {}) => {
  if (!page?.locator || !page?.evaluate) {
    throw new TypeError("A Playwright page is required.");
  }
  const steps = selectOptionalSurfaceSoakSteps(plan, { maximumCycles });
  if (steps.length === 0) {
    return {
      supported: false,
      reason: "The supplied plan contains no supported optional-surface steps.",
      cycles: [],
      transitionExecution: {
        supported: false,
        reason: "Synthetic route transitions are not executed without a public app contract.",
      },
    };
  }

  const baseline = await browserSnapshot(page);
  const cycles = [];
  const skipped = [];
  for (const step of steps) {
    const contract = SURFACE_CONTRACTS[step.surface];
    const open = page.locator(contract.open);
    if ((await open.count()) === 0) {
      skipped.push({
        ...step,
        reason: `${step.surface} cannot open from the current public screen contract (${contract.open}).`,
      });
      continue;
    }

    const startedAt = globalThis.performance.now();
    await open.click();
    await page.locator(contract.opened).waitFor({ state: "attached" });
    await afterPaint(page);
    await page.locator(contract.close).click();
    await page.locator(contract.opened).waitFor({ state: "detached" });
    await afterPaint(page);
    cycles.push({
      ...step,
      durationMs: globalThis.performance.now() - startedAt,
      snapshot: await browserSnapshot(page),
    });
  }

  const final = await browserSnapshot(page);
  if (cycles.length === 0) {
    return {
      supported: false,
      reason: "None of the planned optional surfaces can open from the current public screen contract.",
      baseline,
      final,
      cycles,
      skipped,
      transitionExecution: {
        supported: false,
        reason: "Synthetic route transitions are not executed without a public app contract.",
      },
    };
  }
  return {
    supported: true,
    baseline,
    final,
    cycles,
    skipped,
    summary: soakSummary(cycles, baseline, final),
    transitionExecution: {
      supported: false,
      reason: "Synthetic route transitions and content-pack admission require a future public harness contract; this cohort measures only real optional-surface open/close behavior.",
    },
  };
};
