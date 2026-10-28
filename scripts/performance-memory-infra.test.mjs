import assert from "node:assert/strict";
import test from "node:test";
import {
  captureChromiumMemorySnapshot,
  diagnoseChromiumMemoryTrace,
  summarizeAllocatorOwnership,
  summarizeChromiumMemoryTrace,
} from "./performance-memory-infra.mjs";

const memoryEvent = ({ id = "0x00a", pid, totals = {}, allocators = {} }) => ({
  ph: "v",
  id,
  pid,
  args: {
    dumps: {
      process_totals: totals,
      allocators,
    },
  },
});

const allocator = (hexBytes) => ({
  attrs: {
    size: { type: "scalar", units: "bytes", value: hexBytes },
  },
});

test("bounds allocator ownership without summing nested nodes", () => {
  const result = summarizeAllocatorOwnership(
    {
      gpu: allocator("100"),
      "gpu/shared_images": allocator("80"),
      "gpu/shared_images/owned": allocator("70"),
      skia: allocator("40"),
      empty: allocator("0"),
    },
    { limit: 3 },
  );

  assert.equal(result.available, true);
  assert.equal(result.entryCount, 4);
  assert.equal(result.reportedEntryCount, 3);
  assert.equal(result.truncated, true);
  assert.deepEqual(
    result.entries.map(({ name, parentName, sizeBytes }) => ({
      name,
      parentName,
      sizeBytes,
    })),
    [
      { name: "gpu", parentName: null, sizeBytes: 0x100 },
      {
        name: "gpu/shared_images",
        parentName: "gpu",
        sizeBytes: 0x80,
      },
      {
        name: "gpu/shared_images/owned",
        parentName: "gpu/shared_images",
        sizeBytes: 0x70,
      },
    ],
  );
  assert.match(result.interpretation, /do not sum/u);
});

test("attributes MemoryInfra totals and GPU/Skia allocator roots by process", () => {
  const result = summarizeChromiumMemoryTrace({
    dumpGuid: "a",
    processSample: {
      processes: [
        { id: 11, type: "browser" },
        { id: 12, type: "GPU" },
        { id: 13, type: "renderer" },
      ],
    },
    trace: {
      traceEvents: [
        memoryEvent({
          pid: 11,
          totals: {
            resident_set_bytes: "100",
            peak_resident_set_bytes: "120",
          },
        }),
        memoryEvent({
          pid: 12,
          totals: {
            resident_set_bytes: "200",
            peak_resident_set_bytes: "240",
          },
          allocators: {
            gpu: allocator("80"),
            "skia/gpu_resources": allocator("20"),
            gpu_memory_buffer: allocator("10"),
            skia: allocator("30"),
          },
        }),
        memoryEvent({
          pid: 13,
          totals: { resident_set_bytes: "300" },
          allocators: { "skia/gpu_resources": allocator("08") },
        }),
      ],
    },
  });

  assert.equal(result.available, true);
  assert.equal(result.processCount, 3);
  assert.equal(result.counters.residentSetBytes.bytes, 0x600);
  assert.equal(result.counters.peakResidentSetBytes.bytes, 0x360);
  assert.equal(result.counters.gpuOwnerSizeBytes.bytes, 0x80);
  assert.equal(result.counters.skiaGpuResourcesBytes.bytes, 0x28);
  assert.equal(result.counters.gpuMemoryBufferBytes.bytes, 0x10);
  assert.equal(result.counters.skiaBytes.bytes, 0x30);
  assert.equal(
    result.processes.find(({ id }) => id === 12).type,
    "gpu",
  );
});

test("keeps unsupported MemoryInfra counters explicit", () => {
  const result = summarizeChromiumMemoryTrace({
    dumpGuid: "a",
    processSample: { processes: [{ id: 11, type: "browser" }] },
    trace: {
      traceEvents: [
        memoryEvent({
          pid: 11,
          totals: { resident_set_bytes: "100" },
        }),
      ],
    },
    traceDataLoss: true,
  });

  assert.equal(result.available, true);
  assert.match(result.reason, /data loss/u);
  assert.equal(result.counters.residentSetBytes.available, true);
  assert.equal(result.counters.gpuOwnerSizeBytes.available, false);
  assert.equal(result.counters.gpuOwnerSizeBytes.bytes, null);
  assert.match(
    result.counters.gpuOwnerSizeBytes.reason,
    /did not expose/u,
  );
});

test("accepts modern id2 dump identifiers and diagnoses missing dumps", () => {
  const event = memoryEvent({
    pid: 12,
    totals: { resident_set_bytes: "100" },
  });
  delete event.id;
  event.id2 = { global: "0x2a" };
  const trace = {
    traceEvents: [
      event,
      { ph: "I", name: "memory-pressure", args: { level: "none" } },
    ],
  };
  const result = summarizeChromiumMemoryTrace({
    trace,
    dumpGuid: "2a",
    processSample: { processes: [{ id: 12, type: "GPU" }] },
  });

  assert.equal(result.available, true);
  assert.equal(result.counters.residentSetBytes.bytes, 0x100);
  assert.deepEqual(diagnoseChromiumMemoryTrace({ traceEvents: [trace.traceEvents[1]] }), {
    topLevelKeys: ["traceEvents"],
    eventCount: 1,
    phases: { I: 1 },
    processDumpEventCount: 0,
    processDumpEvents: [],
    memoryEvents: [
      {
        name: "memory-pressure",
        phase: "I",
        category: null,
        pid: null,
        dumpGuid: null,
        argumentKeys: ["level"],
        hasDumps: false,
      },
    ],
  });
});

test("combines split process dumps when Chrome emits zero dump IDs", () => {
  const totals = memoryEvent({
    id: "0x0",
    pid: 12,
    totals: { resident_set_bytes: "100" },
  });
  const allocators = memoryEvent({
    id: "0x0",
    pid: 12,
    allocators: { gpu: allocator("80") },
  });
  const result = summarizeChromiumMemoryTrace({
    trace: { traceEvents: [totals, allocators] },
    dumpGuid: "2a",
    processSample: { processes: [{ id: 12, type: "GPU" }] },
  });

  assert.equal(result.available, true);
  assert.equal(result.processCount, 1);
  assert.equal(result.dumpIdentity, "single-request-zero-id-fallback");
  assert.equal(result.counters.residentSetBytes.bytes, 0x100);
  assert.equal(result.counters.gpuOwnerSizeBytes.bytes, 0x80);
});

test("captures a narrow explicit memory trace through CDP", async () => {
  const listeners = new Map();
  const calls = [];
  const trace = JSON.stringify({
    traceEvents: [
      memoryEvent({
        id: "0x2a",
        pid: 12,
        totals: { resident_set_bytes: "400" },
        allocators: { gpu: allocator("100") },
      }),
    ],
  });
  const session = {
    on(name, listener) {
      listeners.set(name, listener);
    },
    off(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    async send(method, parameters) {
      calls.push({ method, parameters });
      if (method === "Tracing.requestMemoryDump") {
        return { success: true, dumpGuid: "2a" };
      }
      if (method === "Tracing.end") {
        queueMicrotask(() =>
          listeners.get("Tracing.tracingComplete")?.({
            stream: "trace-stream",
            dataLossOccurred: false,
          }),
        );
        return {};
      }
      if (method === "IO.read") {
        return { data: trace, eof: true };
      }
      return {};
    },
  };

  const result = await captureChromiumMemorySnapshot({
    session,
    processSample: { processes: [{ id: 12, type: "GPU" }] },
    traceSettleMs: 0,
  });

  assert.equal(result.available, true);
  assert.equal(result.counters.residentSetBytes.bytes, 0x400);
  assert.equal(result.counters.gpuOwnerSizeBytes.bytes, 0x100);
  const start = calls.find(({ method }) => method === "Tracing.start");
  assert.match(start.parameters.categories, /disabled-by-default-memory-infra/u);
  assert.equal(start.parameters.tracingBackend, "chrome");
  assert.ok(calls.some(({ method }) => method === "IO.close"));
});
