const encoder = new TextEncoder();

export const SCALE_SAVE_TARGETS = Object.freeze({
  "100kb": 100 * 1024,
  "250kb": 250 * 1024,
  "500kb": 500 * 1024,
  "1mb": 1024 * 1024,
});

export const SCALE_RECORD_KINDS = Object.freeze([
  "campaign",
  "world",
  "journal",
  "inventory",
  "history",
]);

export const DEFAULT_SCALE_BUDGET = Object.freeze({
  maximumOperationP95Ms: 2,
  maximumTotalP95Ms: 10,
});

const DEFAULT_SEED = 0x6d616c64;
const PADDING_PREFIX = "perf-scale:padding:";
const RECORD_RESERVE_BYTES = 1_024;

export const utf8ByteLength = (value) => encoder.encode(value).byteLength;

const cloneValue = (value) => {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const createGenerator = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  };
};

const token = (next, length = 10) => {
  let result = "";
  while (result.length < length) {
    result += next().toString(36).padStart(7, "0");
  }
  return result.slice(0, length);
};

const SCALE_RECORD_FIELDS = Object.freeze({
  campaign: ({ region, subject, provenance }) => [
    `route=${region}`,
    `objective=${subject}`,
    `visit=${provenance}`,
  ],
  world: ({ region, subject, provenance }) => [
    `actor=${subject}`,
    `fact=${region}`,
    `evidence=${provenance}`,
  ],
  journal: ({ region, subject, provenance }) => [
    `entry=${subject}`,
    `disclosure=${region}`,
    `source=${provenance}`,
  ],
  inventory: ({ region, subject, provenance }) => [
    `item=${subject}`,
    `market=${region}`,
    `provenance=${provenance}`,
  ],
  history: ({ region, subject, provenance }) => [
    `encounter=${region}`,
    `choice=${subject}`,
    `outcome=${provenance}`,
  ],
});

const scaleRecord = (kind, index, next) => {
  const sequence = String(index).padStart(6, "0");
  const region = token(next, 12);
  const subject = token(next, 16);
  const provenance = token(next, 20);
  const observation = Array.from(
    { length: 12 },
    () => token(next, 12),
  ).join("-");

  return [
    "perf-scale",
    kind,
    sequence,
    ...SCALE_RECORD_FIELDS[kind]({ region, subject, provenance }),
    `observation=${observation}`,
    `seed=${next().toString(16).padStart(8, "0")}`,
  ].join(":");
};

const requireBaseEnvelope = (baseEnvelope) => {
  if (
    !baseEnvelope ||
    typeof baseEnvelope !== "object" ||
    baseEnvelope.schemaVersion !== 4 ||
    !baseEnvelope.state?.run ||
    !Array.isArray(baseEnvelope.state.run.flags)
  ) {
    throw new TypeError(
      "Scale fixtures require a resumable v4 envelope with run.flags.",
    );
  }
};

const appendPadding = (flags, currentBytes, targetBytes) => {
  const separatorBytes = flags.length === 0 ? 0 : 1;
  const quotedPrefixBytes = utf8ByteLength(JSON.stringify(PADDING_PREFIX));
  const paddingLength =
    targetBytes - currentBytes - separatorBytes - quotedPrefixBytes;

  if (paddingLength < 0) {
    throw new RangeError(
      `Target leaves ${targetBytes - currentBytes} bytes, not enough for deterministic padding.`,
    );
  }
  flags.push(`${PADDING_PREFIX}${"x".repeat(paddingLength)}`);
};

/**
 * Expands a real, valid save envelope through inert string flags. Unknown flags
 * are an intentionally supported extension seam in the v4 schema, so these
 * fixtures remain readable without inventing future domain IDs or outcomes.
 */
export const createScalePersistenceFixture = (
  baseEnvelope,
  {
    targetBytes,
    targetId = null,
    seed = DEFAULT_SEED,
  } = {},
) => {
  requireBaseEnvelope(baseEnvelope);
  if (!Number.isInteger(targetBytes) || targetBytes <= 0) {
    throw new TypeError("targetBytes must be a positive integer.");
  }

  const envelope = cloneValue(baseEnvelope);
  const flags = envelope.state.run.flags;
  const baselineBytes = utf8ByteLength(JSON.stringify(envelope));
  if (baselineBytes + PADDING_PREFIX.length + 3 > targetBytes) {
    throw new RangeError(
      `Base envelope is ${baselineBytes} bytes and cannot fit the ${targetBytes}-byte target.`,
    );
  }

  const counts = Object.fromEntries(
    SCALE_RECORD_KINDS.map((kind) => [kind, 0]),
  );
  const originalFlagCount = flags.length;
  const next = createGenerator(seed);
  let currentBytes = baselineBytes;
  let index = 0;

  while (targetBytes - currentBytes > RECORD_RESERVE_BYTES) {
    const kind = SCALE_RECORD_KINDS[index % SCALE_RECORD_KINDS.length];
    const record = scaleRecord(kind, index, next);
    const recordBytes =
      utf8ByteLength(JSON.stringify(record)) + (flags.length === 0 ? 0 : 1);
    if (targetBytes - currentBytes - recordBytes < 128) break;
    flags.push(record);
    currentBytes += recordBytes;
    counts[kind] += 1;
    index += 1;
  }

  appendPadding(flags, currentBytes, targetBytes);
  const serialized = JSON.stringify(envelope);
  const serializedBytes = utf8ByteLength(serialized);
  if (serializedBytes !== targetBytes) {
    throw new Error(
      `Scale fixture sizing drifted: expected ${targetBytes}, received ${serializedBytes}.`,
    );
  }

  return {
    id: targetId ?? `${targetBytes}-bytes`,
    seed: seed >>> 0,
    envelope,
    serialized,
    manifest: {
      targetBytes,
      serializedBytes,
      baselineBytes,
      originalFlagCount,
      scaleFlagCount: flags.length - originalFlagCount,
      records: counts,
    },
  };
};

export const createScalePersistenceMatrix = (
  baseEnvelope,
  targets = SCALE_SAVE_TARGETS,
  options = {},
) =>
  Object.entries(targets).map(([targetId, targetBytes]) =>
    createScalePersistenceFixture(baseEnvelope, {
      ...options,
      targetId,
      targetBytes,
    }),
  );

export const createLongSessionStressPlan = ({
  transitionCount = 1_000,
  seed = DEFAULT_SEED,
  contentPackCount = 16,
  saveEvery = 25,
} = {}) => {
  if (!Number.isInteger(transitionCount) || transitionCount < 1) {
    throw new TypeError("transitionCount must be a positive integer.");
  }
  if (!Number.isInteger(contentPackCount) || contentPackCount < 1) {
    throw new TypeError("contentPackCount must be a positive integer.");
  }
  if (!Number.isInteger(saveEvery) || saveEvery < 1) {
    throw new TypeError("saveEvery must be a positive integer.");
  }

  const next = createGenerator(seed);
  const surfaces = [null, "stats", "inventory", "journal"];
  const transitions = Array.from({ length: transitionCount }, (_, index) => {
    const seedBefore = next();
    const seedAfter = next();
    return {
      index,
      seedBefore,
      seedAfter,
      packId: `scale-pack-${index % contentPackCount}`,
      routeNodeId: `scale-node-${token(next, 10)}`,
      optionalSurface: index % 13 === 0
        ? surfaces[Math.floor(index / 13) % surfaces.length]
        : null,
      saveCheckpoint: (index + 1) % saveEvery === 0,
    };
  });

  return {
    seed: seed >>> 0,
    transitionCount,
    contentPackCount,
    saveEvery,
    transitions,
    checkpointCount: transitions.filter(({ saveCheckpoint }) => saveCheckpoint)
      .length,
  };
};

export const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

const percentile = (values, fraction) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
};

const distribution = (samples, field) => {
  const values = samples.map((sample) => sample[field]);
  if (values.length === 0) {
    return {
      minimumMs: null,
      medianMs: null,
      p95Ms: null,
      maximumMs: null,
    };
  }
  return {
    minimumMs: Math.min(...values),
    medianMs: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maximumMs: Math.max(...values),
  };
};

/** Runs only synchronous work, matching the current localStorage save path. */
export const measurePersistenceWorkload = (
  value,
  {
    iterations = 7,
    storage = createMemoryStorage(),
    storageKey = "necromancer:performance-scale",
    clock = () => globalThis.performance.now(),
  } = {},
) => {
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new TypeError("iterations must be a positive integer.");
  }

  const samples = [];
  try {
    for (let index = 0; index < iterations; index += 1) {
      const totalStart = clock();
      const cloneStart = totalStart;
      const cloned = cloneValue(value);
      const cloneEnd = clock();
      const serialized = JSON.stringify(cloned);
      const stringifyEnd = clock();
      storage.setItem(storageKey, serialized);
      const storageSetEnd = clock();
      const stored = storage.getItem(storageKey);
      const storageGetEnd = clock();
      const parsed = JSON.parse(stored);
      const parseEnd = clock();

      samples.push({
        index,
        bytes: utf8ByteLength(serialized),
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
    storage.removeItem(storageKey);
  }
  return samples;
};

const MEASUREMENT_FIELDS = Object.freeze([
  "structuredCloneMs",
  "stringifyMs",
  "storageSetMs",
  "storageGetMs",
  "parseMs",
  "totalMs",
]);

export const summarizePersistenceMeasurements = (samples) => ({
  sampleCount: samples.length,
  bytes: samples[0]?.bytes ?? null,
  operations: Object.fromEntries(
    MEASUREMENT_FIELDS.map((field) => [field, distribution(samples, field)]),
  ),
});

export const assessPersistenceScaleReport = (
  report,
  budget = DEFAULT_SCALE_BUDGET,
) => {
  const available = report.sampleCount > 0;
  const operationFailures = MEASUREMENT_FIELDS
    .filter((field) => field !== "totalMs")
    .filter(
      (field) =>
        report.operations[field].p95Ms === null ||
        report.operations[field].p95Ms > budget.maximumOperationP95Ms,
    );
  const totalWithinBudget =
    report.operations.totalMs.p95Ms !== null &&
    report.operations.totalMs.p95Ms <= budget.maximumTotalP95Ms;
  return {
    available,
    passed: available && operationFailures.length === 0 && totalWithinBudget,
    operationFailures,
    totalWithinBudget,
    budget,
  };
};

export const runScalePersistenceMatrix = (
  baseEnvelope,
  {
    targets = SCALE_SAVE_TARGETS,
    fixtureOptions = {},
    measurementOptions = {},
  } = {},
) =>
  createScalePersistenceMatrix(baseEnvelope, targets, fixtureOptions).map(
    (fixture) => {
      const measurements = measurePersistenceWorkload(
        fixture.envelope,
        measurementOptions,
      );
      const report = summarizePersistenceMeasurements(measurements);
      return {
        id: fixture.id,
        manifest: fixture.manifest,
        report,
        assessment: assessPersistenceScaleReport(report),
      };
    },
  );
