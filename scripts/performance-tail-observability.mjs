const DEFAULT_MAX_ENTRIES = 200;
const DEFAULT_EVENT_DURATION_THRESHOLD_MS = 16;

const round = (value) =>
  Number.isFinite(value) ? Number(value.toFixed(3)) : null;

const percentile = (values, quantile) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return round(sorted[index]);
};

const summarizeDurations = (values) => ({
  count: values.length,
  totalMs: round(values.reduce((total, value) => total + value, 0)),
  maximumMs: values.length === 0 ? null : round(Math.max(...values)),
  p50Ms: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  p99Ms: percentile(values, 0.99),
});

const installInPage = ({
  observeLongAnimationFrames,
  observeEventTiming,
  eventDurationThresholdMs,
  maxEntries,
}) => {
  const STORE_KEY = "__necromancerPerformanceTailObservations";
  if (globalThis[STORE_KEY]) return;

  const supportedEntryTypes = globalThis.PerformanceObserver?.supportedEntryTypes;
  const supports = (entryType) =>
    Array.isArray(supportedEntryTypes) && supportedEntryTypes.includes(entryType);
  const store = {
    longAnimationFrames: [],
    events: [],
    observed: { longAnimationFrames: 0, events: 0 },
    dropped: { longAnimationFrames: 0, events: 0 },
    support: {
      longAnimationFrames: supports("long-animation-frame"),
      eventTiming: supports("event"),
    },
  };
  globalThis[STORE_KEY] = store;

  const append = (collectionName, entry) => {
    const collection = store[collectionName];
    store.observed[collectionName] += 1;
    if (collection.length === maxEntries) {
      collection.shift();
      store.dropped[collectionName] += 1;
    }
    collection.push(entry);
  };

  if (observeLongAnimationFrames && store.support.longAnimationFrames) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        append("longAnimationFrames", {
          startTime: entry.startTime,
          duration: entry.duration,
          blockingDuration: entry.blockingDuration,
          renderStart: entry.renderStart,
          styleAndLayoutStart: entry.styleAndLayoutStart,
          firstUIEventTimestamp: entry.firstUIEventTimestamp,
          scripts: Array.from(entry.scripts ?? [], (script) => ({
            name: script.name ?? null,
            sourceURL: script.sourceURL ?? null,
            sourceFunctionName: script.sourceFunctionName ?? null,
            sourceCharPosition: script.sourceCharPosition ?? null,
            invoker: script.invoker ?? null,
            invokerType: script.invokerType ?? null,
            windowAttribution: script.windowAttribution ?? null,
            executionStartTime: script.executionStartTime,
            duration: script.duration,
            pauseDuration: script.pauseDuration,
            forcedStyleAndLayoutDuration: script.forcedStyleAndLayoutDuration,
          })),
        });
      }
    });
    observer.observe({ type: "long-animation-frame", buffered: true });
  }

  if (observeEventTiming && store.support.eventTiming) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const target = entry.target;
        append("events", {
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          interactionId: entry.interactionId ?? 0,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
          cancelable: entry.cancelable,
          target: target
            ? {
                tagName: target.tagName?.toLowerCase() ?? null,
                id: target.id || null,
                role: target.getAttribute?.("role") ?? null,
                action: target.dataset?.action ?? null,
              }
            : null,
        });
      }
    });
    observer.observe({
      type: "event",
      buffered: true,
      durationThreshold: eventDurationThresholdMs,
    });
  }
};

const observationConfiguration = (options = {}) => ({
  observeLongAnimationFrames: options.observeLongAnimationFrames !== false,
  observeEventTiming: options.observeEventTiming !== false,
  eventDurationThresholdMs:
    Number.isFinite(options.eventDurationThresholdMs) &&
    options.eventDurationThresholdMs >= 16
      ? options.eventDurationThresholdMs
      : DEFAULT_EVENT_DURATION_THRESHOLD_MS,
  maxEntries:
    Number.isInteger(options.maxEntries) && options.maxEntries > 0
      ? options.maxEntries
      : DEFAULT_MAX_ENTRIES,
});

export const installPerformanceTailObservers = async (page, options = {}) => {
  const configuration = observationConfiguration(options);
  await page.addInitScript(installInPage, configuration);
  await page.evaluate(installInPage, configuration);
  return configuration;
};

export const readPerformanceTailObservations = async (
  page,
  { clear = false } = {},
) =>
  page.evaluate((shouldClear) => {
    const key = "__necromancerPerformanceTailObservations";
    const store = globalThis[key];
    if (!store) {
      return {
        status: "not-installed",
        support: { longAnimationFrames: false, eventTiming: false },
        longAnimationFrames: [],
        events: [],
        observed: { longAnimationFrames: 0, events: 0 },
        dropped: { longAnimationFrames: 0, events: 0 },
      };
    }
    const result = {
      status: "available",
      support: { ...store.support },
      longAnimationFrames: store.longAnimationFrames.map((entry) => ({
        ...entry,
        scripts: entry.scripts.map((script) => ({ ...script })),
      })),
      events: store.events.map((entry) => ({
        ...entry,
        target: entry.target ? { ...entry.target } : null,
      })),
      observed: { ...store.observed },
      dropped: { ...store.dropped },
    };
    if (shouldClear) {
      store.longAnimationFrames.length = 0;
      store.events.length = 0;
      store.observed.longAnimationFrames = 0;
      store.observed.events = 0;
      store.dropped.longAnimationFrames = 0;
      store.dropped.events = 0;
    }
    return result;
  }, clear);

const scriptAttribution = (frames) => {
  const totals = new Map();
  for (const frame of frames) {
    for (const script of frame.scripts ?? []) {
      const identity = [
        script.sourceURL || "(inline or browser)",
        script.sourceFunctionName || script.name || "(anonymous)",
        script.invokerType || "unknown",
      ].join("|");
      const current = totals.get(identity) ?? {
        sourceURL: script.sourceURL || null,
        sourceFunctionName:
          script.sourceFunctionName || script.name || null,
        invokerType: script.invokerType || null,
        occurrences: 0,
        durationMs: 0,
        forcedStyleAndLayoutDurationMs: 0,
      };
      current.occurrences += 1;
      current.durationMs += script.duration ?? 0;
      current.forcedStyleAndLayoutDurationMs +=
        script.forcedStyleAndLayoutDuration ?? 0;
      totals.set(identity, current);
    }
  }
  return [...totals.values()]
    .map((entry) => ({
      ...entry,
      durationMs: round(entry.durationMs),
      forcedStyleAndLayoutDurationMs: round(
        entry.forcedStyleAndLayoutDurationMs,
      ),
    }))
    .sort(
      (left, right) =>
        right.forcedStyleAndLayoutDurationMs -
          left.forcedStyleAndLayoutDurationMs ||
        right.durationMs - left.durationMs,
    );
};

const eventGroups = (events) => {
  const groups = new Map();
  for (const entry of events) {
    const group = groups.get(entry.name) ?? [];
    group.push(entry.duration ?? 0);
    groups.set(entry.name, group);
  }
  return Object.fromEntries(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, durations]) => [name, summarizeDurations(durations)]),
  );
};

export const summarizePerformanceTailObservations = (observations) => {
  const frames = observations?.longAnimationFrames ?? [];
  const events = observations?.events ?? [];
  const inputDelays = events.map((entry) =>
    Math.max(0, (entry.processingStart ?? entry.startTime) - entry.startTime),
  );
  const processingDurations = events.map((entry) =>
    Math.max(0, (entry.processingEnd ?? 0) - (entry.processingStart ?? 0)),
  );
  const presentationDelays = events.map((entry) =>
    Math.max(
      0,
      (entry.duration ?? 0) -
        ((entry.processingEnd ?? entry.startTime) - entry.startTime),
    ),
  );

  return {
    status: observations?.status ?? "not-installed",
    support: observations?.support ?? {
      longAnimationFrames: false,
      eventTiming: false,
    },
    observed: observations?.observed ?? {
      longAnimationFrames: 0,
      events: 0,
    },
    dropped: observations?.dropped ?? {
      longAnimationFrames: 0,
      events: 0,
    },
    longAnimationFrames: {
      durations: summarizeDurations(frames.map(({ duration }) => duration)),
      blockingDurations: summarizeDurations(
        frames.map(({ blockingDuration }) => blockingDuration ?? 0),
      ),
      framesOver50Ms: frames.filter(({ duration }) => duration > 50).length,
      scriptAttribution: scriptAttribution(frames),
    },
    eventTiming: {
      durations: summarizeDurations(events.map(({ duration }) => duration)),
      inputDelays: summarizeDurations(inputDelays),
      processingDurations: summarizeDurations(processingDurations),
      presentationDelays: summarizeDurations(presentationDelays),
      byName: eventGroups(events),
    },
  };
};

export const setCpuThrottlingRate = async (session, rate = 1) => {
  if (!Number.isFinite(rate) || rate < 1 || rate > 100) {
    throw new RangeError("CPU throttling rate must be between 1 and 100.");
  }
  await session.send("Emulation.setCPUThrottlingRate", { rate });
  return { rate, throttled: rate > 1 };
};

export const withCpuThrottling = async (session, rate, run) => {
  await setCpuThrottlingRate(session, rate);
  try {
    return await run();
  } finally {
    if (rate !== 1) await setCpuThrottlingRate(session, 1);
  }
};
