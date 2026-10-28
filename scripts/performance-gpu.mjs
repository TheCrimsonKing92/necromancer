const softwareRendererMarkers = [
  "swiftshader",
  "swangle",
  "llvmpipe",
  "software rasterizer",
  "basic render driver",
  "microsoft warp",
];

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const findAttribute = (attributes, names) => {
  const entries = Object.entries(attributes ?? {});
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return normalizeText(
    entries.find(([key]) => wanted.has(key.toLowerCase()))?.[1],
  );
};

const classifyRenderer = (gpu) => {
  const primaryDevice = gpu.devices?.[0];
  const auxAttributes = gpu.auxAttributes ?? {};
  const renderer = findAttribute(auxAttributes, [
    "glRenderer",
    "renderer",
  ]);
  const implementation = findAttribute(auxAttributes, [
    "glImplementationParts",
    "glImplementation",
  ]);
  const searchable = [
    renderer,
    implementation,
    primaryDevice?.deviceString,
    primaryDevice?.vendorString,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    softwareRendererMarkers.some((marker) =>
      searchable.includes(marker),
    )
  ) {
    return "software";
  }

  if (
    primaryDevice &&
    (primaryDevice.vendorId !== 0 ||
      primaryDevice.deviceId !== 0) &&
    normalizeText(primaryDevice.deviceString)
  ) {
    return "hardware";
  }

  return "unknown";
};

const deviceSummary = (device) => ({
  vendorId: device.vendorId,
  deviceId: device.deviceId,
  subSysId: device.subSysId ?? null,
  revision: device.revision ?? null,
  vendor: normalizeText(device.vendorString),
  device: normalizeText(device.deviceString),
  driverVendor: normalizeText(device.driverVendor),
  driverVersion: normalizeText(device.driverVersion),
});

const safeCdpSend = async (session, method) => {
  try {
    return { value: await session.send(method), error: null };
  } catch (error) {
    return {
      value: null,
      error:
        error instanceof Error ? error.message : String(error),
    };
  }
};

export const collectGraphicsMetadata = async (
  session,
  browserVersion,
) => {
  const { value, error } = await safeCdpSend(
    session,
    "SystemInfo.getInfo",
  );
  if (!value?.gpu) {
    return {
      available: false,
      error:
        error ??
        "SystemInfo.getInfo returned no GPU information.",
      browserVersion,
      renderingClass: "unknown",
      devices: [],
      backend: {},
      featureStatus: {},
    };
  }

  const { gpu } = value;
  const attributes = gpu.auxAttributes ?? {};
  return {
    available: true,
    error: null,
    browserVersion,
    renderingClass: classifyRenderer(gpu),
    devices: (gpu.devices ?? []).map(deviceSummary),
    backend: {
      renderer: findAttribute(attributes, [
        "glRenderer",
        "renderer",
      ]),
      vendor: findAttribute(attributes, ["glVendor", "vendor"]),
      version: findAttribute(attributes, [
        "glVersion",
        "version",
      ]),
      implementation: findAttribute(attributes, [
        "glImplementationParts",
        "glImplementation",
      ]),
      displayType: findAttribute(attributes, ["displayType"]),
    },
    featureStatus: gpu.featureStatus ?? {},
    driverBugWorkarounds: gpu.driverBugWorkarounds ?? [],
  };
};

export const sampleChromiumProcesses = async (session) => {
  const { value, error } = await safeCdpSend(
    session,
    "SystemInfo.getProcessInfo",
  );
  if (!value) {
    return {
      capturedAt: new Date().toISOString(),
      processes: [],
      error,
    };
  }

  if (!Array.isArray(value.processInfo)) {
    return {
      capturedAt: new Date().toISOString(),
      processes: [],
      error:
        "SystemInfo.getProcessInfo returned no process list.",
    };
  }

  return {
    capturedAt: new Date().toISOString(),
    processes: value.processInfo
      .filter(
        ({ type, id, cpuTime }) =>
          typeof type === "string" &&
          Number.isFinite(id) &&
          Number.isFinite(cpuTime),
      )
      .map(({ id, type, cpuTime }) => ({
        id,
        type,
        cpuTimeSeconds: cpuTime,
      })),
    error: null,
  };
};

export const gpuProcessSampleFrom = (sample) => ({
  ...sample,
  processes: sample.processes.filter(({ type }) =>
    type.toLowerCase().includes("gpu"),
  ),
});

export const sampleGpuProcesses = async (session) =>
  gpuProcessSampleFrom(await sampleChromiumProcesses(session));

const processTypeKey = (type) =>
  normalizeText(type).toLowerCase() || "unknown";

const unavailableProcessTreeSummary = ({
  windowMs,
  reason,
  processRestarted = false,
  cpuCounterReset = false,
}) => ({
  available: false,
  reliable: false,
  windowMs,
  totalCpuMs: null,
  totalCpuMsPerSecond: null,
  matchedProcessCount: 0,
  measuredProcessCount: 0,
  processRestarted,
  cpuCounterReset,
  byType: {},
  reason,
});

/**
 * Attribute cumulative Chromium CPU to the browser, renderer, GPU, utility,
 * and other process types exposed by SystemInfo.getProcessInfo. This is a
 * browser process-set summary rather than an operating-system ancestry walk:
 * CDP may omit crash handlers or platform helper processes that do not expose
 * a ProcessInfo record.
 */
export const summarizeChromiumProcessTreeCpu = (
  start,
  end,
  windowMs,
) => {
  const validWindow = Number.isFinite(windowMs) && windowMs > 0;
  const roundedWindowMs = validWindow
    ? Number(windowMs.toFixed(2))
    : 0;
  if (start.error || end.error) {
    return unavailableProcessTreeSummary({
      windowMs: roundedWindowMs,
      reason:
        start.error ??
        end.error ??
        "Chromium process information was unavailable.",
    });
  }

  const startById = new Map(
    start.processes.map((process) => [process.id, process]),
  );
  const endById = new Map(
    end.processes.map((process) => [process.id, process]),
  );
  const matchedIds = [...startById.keys()].filter((id) =>
    endById.has(id),
  );
  const startedIds = [...endById.keys()].filter(
    (id) => !startById.has(id),
  );
  const endedIds = [...startById.keys()].filter(
    (id) => !endById.has(id),
  );
  const processRestarted =
    startedIds.length > 0 || endedIds.length > 0;
  if (matchedIds.length === 0) {
    return unavailableProcessTreeSummary({
      windowMs: roundedWindowMs,
      processRestarted,
      reason:
        start.processes.length === 0 && end.processes.length === 0
          ? "Chromium exposed no browser processes in this cohort."
          : "The Chromium process set was replaced during the measurement window.",
    });
  }

  const resetIds = matchedIds.filter(
    (id) =>
      endById.get(id).cpuTimeSeconds <
      startById.get(id).cpuTimeSeconds,
  );
  const measuredIds = matchedIds.filter(
    (id) => !resetIds.includes(id),
  );
  const cpuCounterReset = resetIds.length > 0;
  if (measuredIds.length === 0) {
    return unavailableProcessTreeSummary({
      windowMs: roundedWindowMs,
      processRestarted,
      cpuCounterReset,
      reason:
        "Every matched Chromium CPU counter reset during the measurement window.",
    });
  }

  const byType = {};
  let totalCpuMs = 0;
  for (const id of measuredIds) {
    const before = startById.get(id);
    const after = endById.get(id);
    const cpuMs =
      (after.cpuTimeSeconds - before.cpuTimeSeconds) * 1000;
    const type = processTypeKey(after.type || before.type);
    const entry = byType[type] ?? {
      cpuMs: 0,
      cpuMsPerSecond: null,
      processCount: 0,
    };
    entry.cpuMs += cpuMs;
    entry.processCount += 1;
    byType[type] = entry;
    totalCpuMs += cpuMs;
  }
  for (const entry of Object.values(byType)) {
    entry.cpuMs = Number(entry.cpuMs.toFixed(2));
    entry.cpuMsPerSecond = validWindow
      ? Number(((entry.cpuMs / windowMs) * 1000).toFixed(2))
      : null;
  }

  const reliabilityProblems = [];
  if (processRestarted) {
    reliabilityProblems.push("a Chromium process started or ended");
  }
  if (cpuCounterReset) {
    reliabilityProblems.push("a Chromium CPU counter reset");
  }
  if (!validWindow) {
    reliabilityProblems.push("the measurement window was invalid");
  }

  return {
    available: true,
    reliable: reliabilityProblems.length === 0,
    windowMs: roundedWindowMs,
    totalCpuMs: Number(totalCpuMs.toFixed(2)),
    totalCpuMsPerSecond: validWindow
      ? Number(((totalCpuMs / windowMs) * 1000).toFixed(2))
      : null,
    matchedProcessCount: matchedIds.length,
    measuredProcessCount: measuredIds.length,
    processRestarted,
    cpuCounterReset,
    byType,
    reason:
      reliabilityProblems.length > 0
        ? `${reliabilityProblems.join(" and ")} during the window; the stable-process attribution is diagnostic only.`
        : null,
  };
};

export const summarizeGpuProcessCpu = (
  start,
  end,
  windowMs,
) => {
  const validWindow =
    Number.isFinite(windowMs) && windowMs > 0;
  const roundedWindowMs = validWindow
    ? Number(windowMs.toFixed(2))
    : 0;
  if (start.error || end.error) {
    return {
      available: false,
      reliable: false,
      windowMs: roundedWindowMs,
      cpuMs: null,
      cpuMsPerSecond: null,
      matchedProcessCount: 0,
      measuredProcessCount: 0,
      processRestarted: false,
      cpuCounterReset: false,
      reason:
        start.error ??
        end.error ??
        "GPU process information was unavailable.",
    };
  }

  const startById = new Map(
    start.processes.map((process) => [process.id, process]),
  );
  const endById = new Map(
    end.processes.map((process) => [process.id, process]),
  );
  const matchedIds = [...startById.keys()].filter((id) =>
    endById.has(id),
  );
  const startedIds = [...endById.keys()].filter(
    (id) => !startById.has(id),
  );
  const endedIds = [...startById.keys()].filter(
    (id) => !endById.has(id),
  );
  const processRestarted =
    startedIds.length > 0 || endedIds.length > 0;

  if (matchedIds.length === 0) {
    return {
      available: false,
      reliable: false,
      windowMs: roundedWindowMs,
      cpuMs: null,
      cpuMsPerSecond: null,
      matchedProcessCount: 0,
      measuredProcessCount: 0,
      processRestarted,
      cpuCounterReset: false,
      reason:
        start.processes.length === 0 &&
        end.processes.length === 0
          ? "Chromium exposed no GPU process in this cohort."
          : "The GPU process was absent or restarted during the measurement window.",
    };
  }

  const resetIds = matchedIds.filter(
    (id) =>
      endById.get(id).cpuTimeSeconds <
      startById.get(id).cpuTimeSeconds,
  );
  const measuredIds = matchedIds.filter(
    (id) => !resetIds.includes(id),
  );
  const cpuCounterReset = resetIds.length > 0;

  if (measuredIds.length === 0) {
    return {
      available: false,
      reliable: false,
      windowMs: roundedWindowMs,
      cpuMs: null,
      cpuMsPerSecond: null,
      matchedProcessCount: matchedIds.length,
      measuredProcessCount: 0,
      processRestarted,
      cpuCounterReset,
      reason:
        "The GPU process CPU counter reset during the measurement window.",
    };
  }

  const cpuMs = measuredIds.reduce((total, id) => {
    const before = startById.get(id).cpuTimeSeconds;
    const after = endById.get(id).cpuTimeSeconds;
    return total + (after - before) * 1000;
  }, 0);

  const reliabilityProblems = [];
  if (processRestarted) {
    reliabilityProblems.push(
      "a GPU process started or ended",
    );
  }
  if (cpuCounterReset) {
    reliabilityProblems.push("a GPU CPU counter reset");
  }
  if (!validWindow) {
    reliabilityProblems.push(
      "the measurement window was invalid",
    );
  }

  return {
    available: true,
    reliable: reliabilityProblems.length === 0,
    windowMs: roundedWindowMs,
    cpuMs: Number(cpuMs.toFixed(2)),
    cpuMsPerSecond:
      validWindow
        ? Number(((cpuMs / windowMs) * 1000).toFixed(2))
        : null,
    matchedProcessCount: matchedIds.length,
    measuredProcessCount: measuredIds.length,
    processRestarted,
    cpuCounterReset,
    reason:
      reliabilityProblems.length > 0
        ? `${reliabilityProblems.join(" and ")} during the window; the stable-process delta is diagnostic only.`
        : null,
  };
};

export const buildGraphicsCohort = ({
  hardwareGpuRequested,
  browserVersion,
  metadata,
}) => {
  const primaryDevice = metadata.devices[0];
  const deviceKey = primaryDevice
    ? `${primaryDevice.vendorId.toString(16)}-${primaryDevice.deviceId.toString(16)}`
    : "unknown-device";
  const versionKey =
    browserVersion.match(/\d+(?:\.\d+){0,3}/)?.[0] ??
    "unknown-version";
  const backendKey = (
    metadata.backend.displayType ||
    metadata.backend.implementation ||
    "unknown-backend"
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  const driverKey = (
    primaryDevice?.driverVersion || "unknown-driver"
  )
    .toLowerCase()
    .replace(/[^a-z0-9.]+/gu, "-");
  const mode = hardwareGpuRequested
    ? "hardware-gpu"
    : "software-baseline";
  const expectedRenderingClass = hardwareGpuRequested
    ? "hardware"
    : "software";

  return {
    id: [
      mode,
      metadata.renderingClass,
      deviceKey,
      backendKey,
      driverKey,
      versionKey,
    ].join(":"),
    requestedMode: mode,
    browserChannel: hardwareGpuRequested
      ? "chromium"
      : "playwright-default",
    browserVersion,
    observedRenderingClass: metadata.renderingClass,
    expectedRenderingClass,
    requestSatisfied:
      metadata.renderingClass === expectedRenderingClass,
    comparisonPolicy:
      "Compare trends only within the same cohort id. GPU diagnostics are not performance-budget gates.",
  };
};
