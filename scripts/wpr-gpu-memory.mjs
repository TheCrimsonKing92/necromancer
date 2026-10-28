import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DXGKRNL_PROVIDER = "{802ec45a-1e99-4b83-9920-87c98277ba9d}";
const DEFAULT_XPERF =
  "C:\\Program Files (x86)\\Windows Kits\\10\\Windows Performance Toolkit\\xperf.exe";

const argumentValue = (name) => {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
};

const splitXperfCsv = (line) => line.split(",").map((value) => value.trim());

const numeric = (value) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePointer = (value) => value?.trim().toLowerCase() || "0x0";

const processFromLabel = (label) => {
  const match = label?.match(/^(.*?)\s*\(\s*(\d+)\s*\)$/);
  return match
    ? {
        name: match[1].trim().replace(/^"|"$/g, "").toLowerCase(),
        id: Number(match[2]),
      }
    : {
        name:
          label?.trim().replace(/^"|"$/g, "").toLowerCase() || "unknown",
        id: null,
      };
};

const rowObject = (headers, values) =>
  Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

const segmentKey = (adapter, segment) =>
  `${normalizePointer(adapter)}:${String(segment ?? "unknown")}`;

const allocationKey = (row) => {
  const adapter = normalizePointer(row.pDxgAdapter);
  const vidMmHandle = normalizePointer(row.hVidMmGlobalAlloc);
  const dxgHandle = normalizePointer(row.hDxgGlobalAlloc);
  return `${adapter}:${vidMmHandle !== "0x0" ? vidMmHandle : dxgHandle}`;
};

const allocationSegment = (row) =>
  numeric(row.dwWriteSegment) ??
  numeric(row.dwReadSegment) ??
  numeric(row.PreferredSegment);

const emptyByteClasses = () => ({
  dedicated: 0,
  shared: 0,
  unknown: 0,
  total: 0,
});

const addBytes = (target, kind, bytes) => {
  target[kind] += bytes;
  target.total += bytes;
};

const subtractBytes = (target, kind, bytes) => {
  target[kind] = Math.max(0, target[kind] - bytes);
  target.total = Math.max(0, target.total - bytes);
};

const cloneByteClasses = (value) => ({ ...value });

const maxByteClasses = (target, current) => {
  if (current.total > target.total) {
    Object.assign(target, current);
  }
};

const classForSegment = (segments, adapter, segment) => {
  const group = segments.get(segmentKey(adapter, segment))?.memorySegmentGroup;
  if (group === 0) return "dedicated";
  if (group === 1) return "shared";
  return "unknown";
};

const createProcessSummary = (id, name) => ({
  id,
  name,
  allocationStarts: 0,
  allocationStops: 0,
  duplicateStarts: 0,
  unmatchedStops: 0,
  currentBytes: emptyByteClasses(),
  peakBytes: emptyByteClasses(),
  lastNonZeroBytes: emptyByteClasses(),
});

export const analyzeXperfGpuMemoryLines = (
  lines,
  { targetProcessIds = [], targetProcessName = "chrome.exe" } = {},
) => {
  const headers = new Map();
  const segments = new Map();
  const allocationEvents = [];
  const eventCounts = {};

  for (const line of lines) {
    if (!line?.startsWith("Microsoft-Windows-DxgKrnl/")) continue;
    const values = splitXperfCsv(line);
    const eventName = values.shift();
    eventCounts[eventName] = (eventCounts[eventName] ?? 0) + 1;
    if (values[0] === "TimeStamp") {
      headers.set(eventName, values);
      continue;
    }
    const eventHeaders = headers.get(eventName);
    if (!eventHeaders) continue;
    const row = rowObject(eventHeaders, values);

    if (eventName.includes("/ReportSegment/")) {
      const segment = numeric(row.ulSegmentId);
      const memorySegmentGroup = numeric(row.MemorySegmentGroup);
      if (segment !== null && memorySegmentGroup !== null) {
        segments.set(segmentKey(row.pDxgAdapter, segment), {
          adapter: normalizePointer(row.pDxgAdapter),
          segment,
          memorySegmentGroup,
          sizeBytes: numeric(row.Size),
          commitLimitBytes: numeric(row.CommitLimit),
        });
      }
      continue;
    }

    if (!eventName.includes("/AdapterAllocation/")) continue;
    const processLabel = processFromLabel(row["Process Name ( PID)"]);
    const processId = numeric(row.hProcessId) ?? processLabel.id;
    const sizeBytes = numeric(row.allocSize);
    if (processId === null || sizeBytes === null) continue;
    allocationEvents.push({
      operation: eventName.endsWith("/win:Stop") ? "stop" : "start",
      timestamp: numeric(row.TimeStamp),
      processId,
      processName: processLabel.name,
      key: allocationKey(row),
      adapter: normalizePointer(row.pDxgAdapter),
      segment: allocationSegment(row),
      sizeBytes,
    });
  }

  const targetIds = new Set(targetProcessIds.map(Number));
  const hasExplicitTargets = targetIds.size > 0;
  const normalizedTargetName = targetProcessName.toLowerCase();
  const matchesTarget = (event) =>
    hasExplicitTargets
      ? targetIds.has(event.processId)
      : event.processName === normalizedTargetName;
  const liveAllocations = new Map();
  const processes = new Map();
  const aggregate = createProcessSummary(null, hasExplicitTargets ? "gpu-process" : normalizedTargetName);

  const summaryFor = (event) => {
    if (!processes.has(event.processId)) {
      processes.set(
        event.processId,
        createProcessSummary(event.processId, event.processName),
      );
    }
    return processes.get(event.processId);
  };
  const applyStart = (summary, event, memoryClass) => {
    summary.allocationStarts += 1;
    addBytes(summary.currentBytes, memoryClass, event.sizeBytes);
    maxByteClasses(summary.peakBytes, summary.currentBytes);
    summary.lastNonZeroBytes = cloneByteClasses(summary.currentBytes);
  };
  const removeAllocation = (summary, allocation, countStop = true) => {
    if (countStop) summary.allocationStops += 1;
    subtractBytes(
      summary.currentBytes,
      allocation.memoryClass,
      allocation.sizeBytes,
    );
    if (summary.currentBytes.total > 0) {
      summary.lastNonZeroBytes = cloneByteClasses(summary.currentBytes);
    }
  };

  for (const event of allocationEvents) {
    if (event.operation === "start") {
      if (!matchesTarget(event)) continue;
      const processSummary = summaryFor(event);
      const existing = liveAllocations.get(event.key);
      if (existing) {
        processSummary.duplicateStarts += 1;
        aggregate.duplicateStarts += 1;
        removeAllocation(processSummary, existing, false);
        removeAllocation(aggregate, existing, false);
      }
      const allocation = {
        ...event,
        memoryClass: classForSegment(
          segments,
          event.adapter,
          event.segment,
        ),
      };
      liveAllocations.set(event.key, allocation);
      applyStart(processSummary, event, allocation.memoryClass);
      applyStart(aggregate, event, allocation.memoryClass);
      continue;
    }

    const existing = liveAllocations.get(event.key);
    if (!existing) {
      if (matchesTarget(event)) {
        summaryFor(event).unmatchedStops += 1;
        aggregate.unmatchedStops += 1;
      }
      continue;
    }
    liveAllocations.delete(event.key);
    removeAllocation(summaryFor(existing), existing);
    removeAllocation(aggregate, existing);
  }

  return {
    schemaVersion: 1,
    measurement: {
      name: "DxgKrnl AdapterAllocation committed bytes",
      residency: false,
      description:
        "Unique live VidMm global allocations attributed to the selected Chrome GPU process. This is committed allocation evidence, not proof that every byte was resident simultaneously.",
    },
    target: {
      processIds: [...targetIds].sort((left, right) => left - right),
      processName: hasExplicitTargets ? null : normalizedTargetName,
      basis: hasExplicitTargets ? "Chromium SystemInfo GPU process IDs" : "process-name fallback",
    },
    segmentCount: segments.size,
    segments: [...segments.values()].sort(
      (left, right) => left.adapter.localeCompare(right.adapter) || left.segment - right.segment,
    ),
    allocationEventCount: allocationEvents.length,
    eventCounts,
    aggregate,
    processes: [...processes.values()].sort((left, right) => left.id - right.id),
    liveAllocationCountAtTraceEnd: liveAllocations.size,
  };
};

const gpuProcessIdsFromMetadata = async (metadataPath) => {
  if (!metadataPath) return [];
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const processes = metadata.processSample?.processes ?? [];
  return processes
    .filter(({ type }) => type?.toLowerCase().includes("gpu"))
    .map(({ id }) => id)
    .filter(Number.isFinite);
};

export const analyzeWprGpuMemory = async ({
  etlPath,
  outputPath,
  processMetadataPath = null,
  xperfPath = DEFAULT_XPERF,
}) => {
  const targetProcessIds = await gpuProcessIdsFromMetadata(processMetadataPath);
  const child = spawn(
    xperfPath,
    ["-i", etlPath, "-a", "dumper", "-provider", DXGKRNL_PROVIDER],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const lines = [];
  const stderr = [];
  const reader = createInterface({ input: child.stdout, crlfDelay: Infinity });
  reader.on("line", (line) => {
    if (
      line.startsWith("Microsoft-Windows-DxgKrnl/AdapterAllocation/") ||
      line.startsWith("Microsoft-Windows-DxgKrnl/ReportSegment/")
    ) {
      lines.push(line);
    }
  });
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  if (exitCode !== 0) {
    throw new Error(
      `xperf dumper failed with exit code ${exitCode}: ${stderr.join("").trim()}`,
    );
  }
  const result = {
    ...analyzeXperfGpuMemoryLines(lines, { targetProcessIds }),
    capturedAt: new Date().toISOString(),
    source: {
      etlPath: path.resolve(etlPath),
      processMetadataPath: processMetadataPath
        ? path.resolve(processMetadataPath)
        : null,
      xperfPath,
      retainedRelevantLineCount: lines.length,
    },
  };
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
};

if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/")}`) {
  const etlPath = argumentValue("etl");
  const outputPath = argumentValue("output");
  if (!etlPath || !outputPath) {
    throw new Error(
      "Usage: node scripts/wpr-gpu-memory.mjs --etl=<trace.etl> --output=<summary.json> [--process-metadata=<probe.json>]",
    );
  }
  const result = await analyzeWprGpuMemory({
    etlPath,
    outputPath,
    processMetadataPath: argumentValue("process-metadata") ?? null,
    xperfPath: argumentValue("xperf") ?? DEFAULT_XPERF,
  });
  process.stdout.write(
    `VidMm committed-allocation peak: ${result.aggregate.peakBytes.total} bytes\n`,
  );
}
