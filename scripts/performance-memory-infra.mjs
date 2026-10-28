const MEMORY_INFRA_CATEGORY = "disabled-by-default-memory-infra";
const DEFAULT_TRACE_SETTLE_MS = 250;
const DEFAULT_ALLOCATOR_ENTRY_LIMIT = 16;

const wait = (durationMs) =>
  durationMs > 0
    ? new Promise((resolve) => setTimeout(resolve, durationMs))
    : Promise.resolve();

const normalizeGuid = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^0x/u, "")
    .replace(/^0+/u, "") || "0";

const scalarBytes = (scalar) => {
  const value = scalar?.value ?? scalar;
  if (Number.isFinite(value)) return value;
  if (typeof value !== "string" || !/^(?:0x)?[0-9a-f]+$/iu.test(value)) {
    return null;
  }
  const parsed = Number.parseInt(value.replace(/^0x/iu, ""), 16);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const counter = (values, basis) => {
  const available = values.filter(Number.isFinite);
  return available.length > 0
    ? {
        available: true,
        bytes: available.reduce((total, value) => total + value, 0),
        processCount: available.length,
        basis,
        reason: null,
      }
    : {
        available: false,
        bytes: null,
        processCount: 0,
        basis,
        reason: "Chromium did not expose this counter in the memory dump.",
      };
};

const allocatorSize = (allocators, names) => {
  const normalized = new Map(
    Object.entries(allocators ?? {}).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  );
  for (const name of names) {
    const allocator = normalized.get(name.toLowerCase());
    const size = scalarBytes(allocator?.attrs?.size);
    if (Number.isFinite(size)) return size;
  }
  return null;
};

const allocatorParentName = (name, allocatorNames) => {
  let separator = name.lastIndexOf("/");
  while (separator > 0) {
    const candidate = name.slice(0, separator);
    if (allocatorNames.has(candidate.toLowerCase())) return candidate;
    separator = candidate.lastIndexOf("/");
  }
  return null;
};

/**
 * Expose the largest allocator nodes without implying that nested or aliased
 * nodes are additive. The bounded list is diagnostic ownership evidence, not
 * another total-memory counter.
 */
export const summarizeAllocatorOwnership = (
  allocators,
  { limit = DEFAULT_ALLOCATOR_ENTRY_LIMIT } = {},
) => {
  const entries = Object.entries(allocators ?? {}).flatMap(
    ([name, allocator]) => {
      const sizeBytes = scalarBytes(allocator?.attrs?.size);
      return Number.isFinite(sizeBytes) && sizeBytes > 0
        ? [{ name, sizeBytes }]
        : [];
    },
  );
  const allocatorNames = new Set(
    entries.map(({ name }) => name.toLowerCase()),
  );
  const sorted = entries
    .map(({ name, sizeBytes }) => ({
      name,
      parentName: allocatorParentName(name, allocatorNames),
      depth: name.split("/").length - 1,
      sizeBytes,
    }))
    .sort(
      (left, right) =>
        right.sizeBytes - left.sizeBytes ||
        left.name.localeCompare(right.name),
    );

  return {
    available: sorted.length > 0,
    entryCount: sorted.length,
    reportedEntryCount: Math.min(sorted.length, limit),
    truncated: sorted.length > limit,
    entries: sorted.slice(0, limit),
    interpretation:
      "Allocator nodes may be nested, aliased, or share ownership; do not sum them.",
  };
};

const processTypeMap = (sample) =>
  new Map(
    (sample?.processes ?? []).map(({ id, type }) => [
      id,
      String(type ?? "unknown").toLowerCase(),
    ]),
  );

const eventDumpGuid = (event) =>
  event?.id ??
  event?.id2?.global ??
  event?.id2?.local ??
  event?.args?.dump_guid ??
  event?.args?.dumpGuid ??
  null;

export const diagnoseChromiumMemoryTrace = (trace) => {
  const events = Array.isArray(trace?.traceEvents) ? trace.traceEvents : [];
  const processDumpEvents = events.filter((event) => event?.args?.dumps);
  const phases = {};
  const memoryEvents = [];
  for (const event of events) {
    const phase = String(event?.ph ?? "missing");
    phases[phase] = (phases[phase] ?? 0) + 1;
    if (
      event?.args?.dumps ||
      /memory|periodic_interval|explicitly_triggered/u.test(
        String(event?.name ?? "").toLowerCase(),
      )
    ) {
      if (memoryEvents.length < 12) {
        memoryEvents.push({
          name: event?.name ?? null,
          phase: event?.ph ?? null,
          category: event?.cat ?? null,
          pid: event?.pid ?? null,
          dumpGuid: eventDumpGuid(event),
          argumentKeys: Object.keys(event?.args ?? {}),
          hasDumps: Boolean(event?.args?.dumps),
        });
      }
    }
  }
  return {
    topLevelKeys: Object.keys(trace ?? {}),
    eventCount: events.length,
    phases,
    processDumpEventCount: processDumpEvents.length,
    processDumpEvents: processDumpEvents.slice(0, 8).map((event) => ({
      name: event?.name ?? null,
      phase: event?.ph ?? null,
      pid: event?.pid ?? null,
      id: event?.id ?? null,
      id2: event?.id2 ?? null,
      dumpGuid: eventDumpGuid(event),
      dumpKeys: Object.keys(event?.args?.dumps ?? {}),
    })),
    memoryEvents,
  };
};

const unavailableSnapshot = (reason, details = {}) => ({
  available: false,
  reason,
  dumpGuid: details.dumpGuid ?? null,
  traceDataLoss: details.traceDataLoss ?? null,
  traceDiagnostics: details.traceDiagnostics ?? null,
  processCount: 0,
  counters: {
    residentSetBytes: counter([], "process-total"),
    peakResidentSetBytes: counter([], "process-total"),
    gpuOwnerSizeBytes: counter([], "gpu-process allocator size"),
    skiaGpuResourcesBytes: counter([], "allocator size"),
    gpuMemoryBufferBytes: counter([], "allocator size"),
    skiaBytes: counter([], "allocator size"),
  },
  processes: [],
});

/**
 * Parse a single explicit Chromium MemoryInfra dump. Allocator counters are
 * reported independently and must not be summed: GPU, Skia, and GPU memory
 * buffer dumps can describe shared or nested ownership of the same bytes.
 */
export const summarizeChromiumMemoryTrace = ({
  trace,
  dumpGuid,
  processSample,
  traceDataLoss = false,
}) => {
  const events = Array.isArray(trace?.traceEvents) ? trace.traceEvents : [];
  const wantedGuid = normalizeGuid(dumpGuid);
  const processDumpEvents = events.filter(
    (event) =>
      event?.ph === "v" && event.args?.dumps,
  );
  const matchingDumps = processDumpEvents.filter(
    (event) => normalizeGuid(eventDumpGuid(event)) === wantedGuid,
  );
  // Current Chrome JSON traces can serialize every process dump with the
  // sentinel ID 0x0 even though Tracing.requestMemoryDump returns a nonzero
  // GUID. This capture contains exactly one requested dump, so the complete
  // zero-ID cohort is the requested snapshot rather than unrelated data.
  const zeroGuidFallback =
    matchingDumps.length === 0 &&
    processDumpEvents.length > 0 &&
    processDumpEvents.every(
      (event) => normalizeGuid(eventDumpGuid(event)) === "0",
    );
  const dumps = zeroGuidFallback ? processDumpEvents : matchingDumps;
  if (dumps.length === 0) {
    return unavailableSnapshot(
      "The trace contained no process dumps for the requested memory dump.",
      {
        dumpGuid,
        traceDataLoss,
        traceDiagnostics: diagnoseChromiumMemoryTrace(trace),
      },
    );
  }

  const types = processTypeMap(processSample);
  const dumpsByProcess = new Map();
  for (const event of dumps) {
    const previous = dumpsByProcess.get(event.pid) ?? {
      totals: {},
      allocators: {},
    };
    const processDump = event.args.dumps;
    dumpsByProcess.set(event.pid, {
      totals: { ...previous.totals, ...(processDump.process_totals ?? {}) },
      allocators: {
        ...previous.allocators,
        ...(processDump.allocators ?? {}),
      },
    });
  }
  const processes = [...dumpsByProcess.entries()].map(([pid, dump]) => {
    const type = types.get(pid) ?? "unknown";
    return {
      id: pid,
      type,
      residentSetBytes: scalarBytes(dump.totals.resident_set_bytes),
      peakResidentSetBytes: scalarBytes(dump.totals.peak_resident_set_bytes),
      gpuOwnerSizeBytes: type.includes("gpu")
        ? allocatorSize(dump.allocators, ["gpu"])
        : null,
      skiaGpuResourcesBytes: allocatorSize(dump.allocators, [
        "skia/gpu_resources",
      ]),
      gpuMemoryBufferBytes: allocatorSize(dump.allocators, [
        "gpu_memory_buffer",
        "gpu/gpu_memory_buffer",
      ]),
      skiaBytes: allocatorSize(dump.allocators, ["skia"]),
      allocatorOwnership: type.includes("gpu")
        ? summarizeAllocatorOwnership(dump.allocators)
        : null,
    };
  });

  return {
    available: true,
    reason: traceDataLoss
      ? "Chromium reported trace data loss; exposed counters are diagnostic only."
      : null,
    dumpGuid,
    dumpIdentity: zeroGuidFallback
      ? "single-request-zero-id-fallback"
      : "request-guid",
    traceDataLoss,
    processCount: processes.length,
    counters: {
      residentSetBytes: counter(
        processes.map(({ residentSetBytes }) => residentSetBytes),
        "process-total",
      ),
      peakResidentSetBytes: counter(
        processes.map(({ peakResidentSetBytes }) => peakResidentSetBytes),
        "process-total",
      ),
      gpuOwnerSizeBytes: counter(
        processes.map(({ gpuOwnerSizeBytes }) => gpuOwnerSizeBytes),
        "gpu-process allocator size",
      ),
      skiaGpuResourcesBytes: counter(
        processes.map(
          ({ skiaGpuResourcesBytes }) => skiaGpuResourcesBytes,
        ),
        "allocator size",
      ),
      gpuMemoryBufferBytes: counter(
        processes.map(
          ({ gpuMemoryBufferBytes }) => gpuMemoryBufferBytes,
        ),
        "allocator size",
      ),
      skiaBytes: counter(
        processes.map(({ skiaBytes }) => skiaBytes),
        "allocator size",
      ),
    },
    processes,
  };
};

const readTraceStream = async (session, handle) => {
  let traceJson = "";
  try {
    for (;;) {
      const chunk = await session.send("IO.read", { handle });
      traceJson += chunk.data ?? "";
      if (chunk.eof) break;
    }
  } finally {
    await session.send("IO.close", { handle }).catch(() => {});
  }
  return JSON.parse(traceJson);
};

const listenForTracingComplete = (session, timeoutMs) => {
  let timeout;
  let onComplete;
  const cancel = () => {
    clearTimeout(timeout);
    session.off?.("Tracing.tracingComplete", onComplete);
  };
  const promise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      cancel();
      reject(new Error("Chromium did not finish the memory trace in time."));
    }, timeoutMs);
    onComplete = (event) => {
      cancel();
      resolve(event);
    };
    session.on("Tracing.tracingComplete", onComplete);
  });
  return { promise, cancel };
};

/**
 * Capture one browser-wide explicit MemoryInfra snapshot. The trace is kept
 * deliberately narrow; heap-allocation sampling and general timeline events
 * are not enabled. Callers must not run another CDP trace concurrently.
 */
export const captureChromiumMemorySnapshot = async ({
  session,
  processSample,
  timeoutMs = 20_000,
  traceSettleMs = DEFAULT_TRACE_SETTLE_MS,
}) => {
  let tracingStarted = false;
  let completionListener = null;
  try {
    await session.send("Tracing.start", {
      transferMode: "ReturnAsStream",
      streamFormat: "json",
      streamCompression: "none",
      tracingBackend: "chrome",
      categories: `-*,${MEMORY_INFRA_CATEGORY}`,
      options: "record-as-much-as-possible",
    });
    tracingStarted = true;
    completionListener = listenForTracingComplete(session, timeoutMs);
    // Tracing.start acknowledges the browser endpoint before its configuration
    // has necessarily propagated to every child process. Requesting a global
    // dump immediately can succeed while producing no process dumps.
    await wait(traceSettleMs);
    const dump = await session.send("Tracing.requestMemoryDump", {
      deterministic: false,
      levelOfDetail: "detailed",
    });
    await session.send("Tracing.end");
    tracingStarted = false;
    const completion = await completionListener.promise;
    if (!dump.success) {
      return unavailableSnapshot(
        "Chromium rejected the explicit memory dump request.",
        {
          dumpGuid: dump.dumpGuid,
          traceDataLoss: completion.dataLossOccurred ?? null,
        },
      );
    }
    if (!completion.stream) {
      return unavailableSnapshot(
        "Chromium completed tracing without returning a trace stream.",
        {
          dumpGuid: dump.dumpGuid,
          traceDataLoss: completion.dataLossOccurred ?? null,
        },
      );
    }
    const trace = await readTraceStream(session, completion.stream);
    return summarizeChromiumMemoryTrace({
      trace,
      dumpGuid: dump.dumpGuid,
      processSample,
      traceDataLoss: completion.dataLossOccurred ?? false,
    });
  } catch (error) {
    completionListener?.cancel();
    if (tracingStarted) {
      await session.send("Tracing.end").catch(() => {});
    }
    return unavailableSnapshot(
      `Chromium MemoryInfra snapshot was unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
