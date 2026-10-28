import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const diagnosticResult = (status, reason, targetProcessIds) => ({
  status,
  diagnosticOnly: true,
  source: "Windows Performance Counters",
  targetProcessIds,
  reliable: false,
  reason,
  engineUtilization: null,
  processMemory: null,
});

const rounded = (value, digits = 2) =>
  Number(value.toFixed(digits));

const average = (values) =>
  values.length > 0
    ? values.reduce((total, value) => total + value, 0) /
      values.length
    : 0;

const finiteNonNegative = (value) =>
  Number.isFinite(value) && value >= 0;

export const summarizeWindowsGpuSamples = (payload) => {
  if (payload?.status !== "raw") {
    return diagnosticResult(
      payload?.status === "unavailable"
        ? "unavailable"
        : "unavailable",
      payload?.reason ??
        "The Windows GPU counter sampler returned malformed data.",
      payload?.targetProcessIds ?? [],
    );
  }

  const samples = Array.isArray(payload.samples)
    ? payload.samples
    : [];
  const validSamples = samples.filter(
    (sample) =>
      Array.isArray(sample.engines) &&
      finiteNonNegative(sample.dedicatedBytes) &&
      finiteNonNegative(sample.sharedBytes) &&
      (sample.engines.length > 0 ||
        Number(sample.memoryInstanceCount) > 0),
  );
  if (validSamples.length === 0) {
    return diagnosticResult(
      "unavailable",
      "Windows returned no valid GPU counter samples for the Chromium GPU process.",
      payload.targetProcessIds ?? [],
    );
  }

  // Rate counters need an initial observation. A lone memory sample
  // remains useful, but a lone engine sample cannot establish a rate.
  const measuredSamples =
    validSamples.length > 1 ? validSamples.slice(1) : [];
  const memoryCandidateSamples =
    measuredSamples.length > 0
      ? measuredSamples
      : validSamples;
  const engineSnapshots = measuredSamples
    .map((sample) => {
      const percentages = sample.engines
        .map(({ percent }) => percent)
        .filter(finiteNonNegative);
      return {
        aggregatePercent: percentages.reduce(
          (total, value) => total + value,
          0,
        ),
        busiestEnginePercent:
          percentages.length > 0
            ? Math.max(...percentages)
            : 0,
        engineCount: percentages.length,
      };
    })
    .filter(({ engineCount }) => engineCount > 0);
  const aggregatePercentages = engineSnapshots.map(
    ({ aggregatePercent }) => aggregatePercent,
  );
  const busiestPercentages = engineSnapshots.map(
    ({ busiestEnginePercent }) => busiestEnginePercent,
  );
  const memorySamples = memoryCandidateSamples.filter(
    (sample) => Number(sample.memoryInstanceCount) > 0,
  );
  const dedicatedBytes = memorySamples.map(
    (sample) => sample.dedicatedBytes,
  );
  const sharedBytes = memorySamples.map(
    (sample) => sample.sharedBytes,
  );
  const counterWindowDurationMs =
    Math.max(0, validSamples.length - 1) *
    Number(payload.sampleIntervalSeconds ?? 0) *
    1000;
  const missingComponents = [];
  if (engineSnapshots.length === 0) {
    missingComponents.push("engine utilization");
  }
  if (memorySamples.length === 0) {
    missingComponents.push("process memory");
  }
  const requestedSamples = Number(payload.requestedSamples ?? 0);
  const missingSampleCount = Math.max(
    0,
    requestedSamples - validSamples.length,
  );
  if (missingSampleCount > 0) {
    missingComponents.push(
      `${missingSampleCount} process-keyed counter sample${missingSampleCount === 1 ? "" : "s"}`,
    );
  }
  const engineUtilization =
    engineSnapshots.length === 0
      ? null
      : {
          unit: "percentage points",
          averageAggregatePercent: rounded(
            average(aggregatePercentages),
          ),
          peakAggregatePercent: rounded(
            Math.max(...aggregatePercentages),
          ),
          averageBusiestEnginePercent: rounded(
            average(busiestPercentages),
          ),
          peakSingleEnginePercent: rounded(
            Math.max(...busiestPercentages),
          ),
          maximumObservedEngineCount: Math.max(
            ...engineSnapshots.map(
              ({ engineCount }) => engineCount,
            ),
          ),
          interpretation:
            "Aggregate values sum independent GPU engines and may exceed 100; busiest-engine values remain on a 0–100 scale.",
        };
  const processMemory =
    memorySamples.length === 0
      ? null
      : {
          unit: "bytes",
          minimumDedicatedBytes: Math.round(
            Math.min(...dedicatedBytes),
          ),
          averageDedicatedBytes: Math.round(
            average(dedicatedBytes),
          ),
          peakDedicatedBytes: Math.round(
            Math.max(...dedicatedBytes),
          ),
          dedicatedRangeBytes: Math.round(
            Math.max(...dedicatedBytes) -
              Math.min(...dedicatedBytes),
          ),
          firstDedicatedBytes: Math.round(dedicatedBytes[0]),
          lastDedicatedBytes: Math.round(
            dedicatedBytes.at(-1),
          ),
          dedicatedWindowDeltaBytes: Math.round(
            dedicatedBytes.at(-1) - dedicatedBytes[0],
          ),
          minimumSharedBytes: Math.round(
            Math.min(...sharedBytes),
          ),
          averageSharedBytes: Math.round(
            average(sharedBytes),
          ),
          peakSharedBytes: Math.round(
            Math.max(...sharedBytes),
          ),
          sharedRangeBytes: Math.round(
            Math.max(...sharedBytes) -
              Math.min(...sharedBytes),
          ),
          firstSharedBytes: Math.round(sharedBytes[0]),
          lastSharedBytes: Math.round(sharedBytes.at(-1)),
          sharedWindowDeltaBytes: Math.round(
            sharedBytes.at(-1) - sharedBytes[0],
          ),
          interpretation:
            "Range and window delta are residency-churn proxies, not allocation counts; caches and eviction can move them without new application objects.",
        };

  return {
    status:
      missingComponents.length === 0 ? "available" : "partial",
    diagnosticOnly: true,
    source: "Windows Performance Counters",
    targetProcessIds: payload.targetProcessIds ?? [],
    reliable: missingComponents.length === 0,
    reason:
      missingComponents.length > 0
        ? `Windows returned incomplete Chromium GPU-process diagnostics: missing ${missingComponents.join(", ")}.`
        : null,
    sampling: {
      intervalSeconds: payload.sampleIntervalSeconds,
      requestedSamples: payload.requestedSamples,
      observedCounterSets: samples.length,
      matchedProcessSamples: validSamples.length,
      measuredSamples: measuredSamples.length,
      discardedWarmupSamples:
        validSamples.length > 1 ? 1 : 0,
      counterWindowDurationMs,
      relationToWorkload:
        "The fixed counter window starts immediately before the representative workload and may extend beyond it.",
    },
    engineUtilization,
    processMemory,
  };
};

export const correlateGpuProcessContinuity = (
  diagnostics,
  gpuProcessCpu,
) => {
  if (
    !["available", "partial"].includes(diagnostics.status) ||
    gpuProcessCpu.reliable
  ) {
    return diagnostics;
  }

  return {
    ...diagnostics,
    reliable: false,
    reason: [
      diagnostics.reason,
      "The Chromium GPU process changed or reset its CPU counter during the diagnostic window.",
    ]
      .filter(Boolean)
      .join(" "),
  };
};

const parseSamplerOutput = (stdout, targetProcessIds) => {
  const candidate = stdout
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (!candidate) {
    return diagnosticResult(
      "unavailable",
      "The Windows GPU counter sampler produced no output.",
      targetProcessIds,
    );
  }

  try {
    return summarizeWindowsGpuSamples(JSON.parse(candidate));
  } catch {
    return diagnosticResult(
      "unavailable",
      "The Windows GPU counter sampler produced malformed JSON.",
      targetProcessIds,
    );
  }
};

export const startWindowsGpuDiagnostics = ({
  enabled,
  targetProcessIds = [],
  platform = process.platform,
  sampleIntervalSeconds = 1,
  sampleCount = 4,
}) => {
  const normalizedProcessIds = [
    ...new Set(
      targetProcessIds.filter(
        (id) => Number.isInteger(id) && id > 0,
      ),
    ),
  ];
  if (!enabled) {
    return Promise.resolve(
      diagnosticResult(
        "disabled",
        "Windows hardware counters run only in the explicit GPU cohort.",
        normalizedProcessIds,
      ),
    );
  }
  if (platform !== "win32") {
    return Promise.resolve(
      diagnosticResult(
        "unsupported",
        "Windows GPU performance counters are unavailable on this platform.",
        normalizedProcessIds,
      ),
    );
  }
  if (normalizedProcessIds.length === 0) {
    return Promise.resolve(
      diagnosticResult(
        "unavailable",
        "Chromium exposed no GPU process to key the Windows counters.",
        normalizedProcessIds,
      ),
    );
  }

  const windowsRoot =
    process.env.SystemRoot ?? String.raw`C:\Windows`;
  const powershellPath = join(
    windowsRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const samplerPath = resolve(
    import.meta.dirname,
    "sample-windows-gpu.ps1",
  );

  return new Promise((done) => {
    const child = spawn(
      powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        samplerPath,
        "-TargetProcessIds",
        normalizedProcessIds.join(","),
        "-SampleIntervalSeconds",
        String(sampleIntervalSeconds),
        "-SampleCount",
        String(sampleCount),
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      done(result);
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(
        diagnosticResult(
          "unavailable",
          "The Windows GPU counter sampler timed out.",
          normalizedProcessIds,
        ),
      );
    // Counter enumeration can briefly stall behind a saturated GPU process.
    // Leave enough process-startup margin that a valid four-sample window is
    // not discarded merely because the workload itself is intentionally hot.
    }, (sampleIntervalSeconds * sampleCount + 12) * 1000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish(
        diagnosticResult(
          "unavailable",
          `The Windows GPU counter sampler could not start: ${error.message}`,
          normalizedProcessIds,
        ),
      );
    });
    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        finish(
          diagnosticResult(
            "unavailable",
            `The Windows GPU counter sampler exited with code ${exitCode}: ${stderr.trim() || "no error text"}`,
            normalizedProcessIds,
          ),
        );
        return;
      }
      finish(
        parseSamplerOutput(stdout, normalizedProcessIds),
      );
    });
  });
};
