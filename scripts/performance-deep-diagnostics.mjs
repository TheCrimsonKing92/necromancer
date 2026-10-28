import {
  installPerformanceTailObservers,
  readPerformanceTailObservations,
  summarizePerformanceTailObservations,
  withCpuThrottling,
} from "./performance-tail-observability.mjs";
import { startPageResourceCoverage } from "./performance-resource-coverage.mjs";
import {
  captureScalePersistenceBrowser,
  runBoundedOptionalSurfaceSoak,
} from "./performance-scale-browser.mjs";
import { createLongSessionStressPlan } from "./performance-scale-fixtures.mjs";
import { captureWorstCaseBrowserMatrix } from "./performance-worst-case-browser.mjs";

const optionNumber = (arguments_, name, fallback) => {
  const prefix = `${name}=`;
  const matches = arguments_.filter((argument) => argument.startsWith(prefix));
  if (matches.length > 1) throw new Error(`${name} may be supplied only once.`);
  if (matches.length === 0) return fallback;
  const value = Number(matches[0].slice(prefix.length));
  if (!Number.isFinite(value)) throw new TypeError(`${name} requires a number.`);
  return value;
};

export const parsePerformanceDiagnosticOptions = (arguments_) => {
  const cpuThrottleRate = optionNumber(arguments_, "--cpu-throttle", 1);
  if (cpuThrottleRate < 1 || cpuThrottleRate > 100) {
    throw new RangeError("--cpu-throttle must be a number between 1 and 100.");
  }
  return {
    cpuThrottleRate,
    tailObservability: arguments_.includes("--tail-observability"),
    resourceCoverage: arguments_.includes("--coverage"),
    scalePersistence: arguments_.includes("--scale-persistence"),
    optionalSurfaceSoak: arguments_.includes("--surface-soak"),
    worstCase: arguments_.includes("--worst-case"),
  };
};

const disabled = (flag) => ({
  supported: false,
  reason: `Enable with ${flag}.`,
});

export const assessDeepPerformanceStress = (stress) => {
  const thresholds = {
    worstCaseP95CycleMs: 150,
    worstCaseRetainedHeapBytes: 750_000,
    worstCaseSecondHalfHeapBytes: 250_000,
  };
  const soak = stress?.worstCase?.soak;
  const retained = soak?.retained;
  const enabled = soak?.supported === true;
  return {
    thresholds,
    checks: {
      worstCaseInteractionP95:
        !enabled || soak.p95CycleMs <= thresholds.worstCaseP95CycleMs,
      worstCaseRetainedHeap:
        !enabled ||
        (retained?.heapDelta ?? Infinity) <=
          thresholds.worstCaseRetainedHeapBytes,
      worstCaseSecondHalfHeap:
        !enabled ||
        (retained?.secondHalfHeapDelta ?? Infinity) <=
          thresholds.worstCaseSecondHalfHeapBytes,
      worstCaseNoRetainedNodes:
        !enabled || (retained?.nodeDelta ?? Infinity) <= 0,
      worstCaseNoRetainedDocuments:
        !enabled || (retained?.documentDelta ?? Infinity) <= 0,
    },
  };
};

export const startPerformanceDeepDiagnostics = async ({
  page,
  targetUrl,
  options,
}) => {
  const tailConfiguration = options.tailObservability
    ? await installPerformanceTailObservers(page)
    : null;
  const coverage = await startPageResourceCoverage(page, {
    enabled: options.resourceCoverage,
    includeUrl: (url) => url.startsWith(targetUrl),
  });

  const readTail = async () =>
    options.tailObservability
      ? summarizePerformanceTailObservations(
          await readPerformanceTailObservations(page, { clear: true }),
        )
      : null;

  return {
    runRepresentative: (session, run) =>
      withCpuThrottling(session, options.cpuThrottleRate, run),
    captureRepresentative: async () => ({
      tail: await readTail(),
      resourceCoverage: await coverage.stop(),
    }),
    captureStress: async () => {
      const scalePersistence = options.scalePersistence
        ? await captureScalePersistenceBrowser({ page })
        : disabled("--scale-persistence");
      const optionalSurfaceSoak = options.optionalSurfaceSoak
        ? await runBoundedOptionalSurfaceSoak({
            page,
            plan: createLongSessionStressPlan(),
          })
        : disabled("--surface-soak");
      const tail = await readTail();
      const worstCase = options.worstCase
        ? await captureWorstCaseBrowserMatrix({ sourcePage: page, targetUrl })
        : disabled("--worst-case");
      const instrumentationTail = await readTail();
      return {
        scalePersistence,
        optionalSurfaceSoak,
        worstCase,
        tail,
        instrumentationTail: options.worstCase
          ? {
              diagnosticOnly: true,
              reason:
                "Includes explicit HeapProfiler garbage collections used by retained-state measurement; do not attribute its long frames to application interactions.",
              observations: instrumentationTail,
            }
          : null,
      };
    },
    configuration: {
      ...options,
      tailObserver: tailConfiguration,
    },
  };
};
