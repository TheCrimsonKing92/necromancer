import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGraphicsCohort,
  collectGraphicsMetadata,
  sampleChromiumProcesses,
  sampleGpuProcesses,
  summarizeChromiumProcessTreeCpu,
  summarizeGpuProcessCpu,
} from "./performance-gpu.mjs";

const sessionReturning = (method, value) => ({
  send: async (actualMethod) => {
    assert.equal(actualMethod, method);
    return value;
  },
});

const processSample = (processes, error = null) => ({
  capturedAt: "2026-07-26T00:00:00.000Z",
  processes,
  error,
});

test("classifies hardware and software rendering from CDP metadata", async () => {
  const hardware = await collectGraphicsMetadata(
    sessionReturning("SystemInfo.getInfo", {
      gpu: {
        devices: [
          {
            vendorId: 0x10de,
            deviceId: 0x2216,
            vendorString: "NVIDIA",
            deviceString: "NVIDIA GeForce RTX 3080",
            driverVendor: "NVIDIA",
            driverVersion: "1.2.3",
          },
        ],
        auxAttributes: {
          displayType: "ANGLE_D3D11",
          glRenderer: "ANGLE (NVIDIA, D3D11)",
        },
        featureStatus: { gpu_compositing: "enabled" },
        driverBugWorkarounds: [],
      },
    }),
    "151.0.0.0",
  );
  assert.equal(hardware.renderingClass, "hardware");
  assert.equal(hardware.backend.displayType, "ANGLE_D3D11");

  const software = await collectGraphicsMetadata(
    sessionReturning("SystemInfo.getInfo", {
      gpu: {
        devices: [
          {
            vendorId: 0x1414,
            deviceId: 0x8c,
            vendorString: "Microsoft",
            deviceString: "Microsoft Basic Render Driver",
            driverVendor: "Microsoft",
            driverVersion: "1.0",
          },
        ],
        auxAttributes: {},
        driverBugWorkarounds: [],
      },
    }),
    "151.0.0.0",
  );
  assert.equal(software.renderingClass, "software");
});

test("handles missing graphics and process protocol data", async () => {
  const metadata = await collectGraphicsMetadata(
    sessionReturning("SystemInfo.getInfo", {}),
    "151.0.0.0",
  );
  assert.equal(metadata.available, false);
  assert.equal(metadata.renderingClass, "unknown");

  const processes = await sampleGpuProcesses(
    sessionReturning("SystemInfo.getProcessInfo", {}),
  );
  assert.equal(processes.processes.length, 0);
  assert.match(processes.error, /no process list/u);
});

test("filters CDP process data to valid GPU processes", async () => {
  const sample = await sampleGpuProcesses(
    sessionReturning("SystemInfo.getProcessInfo", {
      processInfo: [
        { type: "browser", id: 1, cpuTime: 4 },
        { type: "GPU", id: 2, cpuTime: 3 },
        { type: "GPU", id: 3, cpuTime: Number.NaN },
      ],
    }),
  );
  assert.deepEqual(sample.processes, [
    {
      type: "GPU",
      id: 2,
      cpuTimeSeconds: 3,
    },
  ]);
});

test("samples and attributes the complete CDP-visible Chromium process set", async () => {
  const session = sessionReturning("SystemInfo.getProcessInfo", {
    processInfo: [
      { type: "browser", id: 1, cpuTime: 4 },
      { type: "renderer", id: 2, cpuTime: 2 },
      { type: "renderer", id: 3, cpuTime: 1 },
      { type: "GPU", id: 4, cpuTime: 3 },
      { type: null, id: 5, cpuTime: 1 },
    ],
  });
  const sample = await sampleChromiumProcesses(session);
  assert.deepEqual(
    sample.processes.map(({ id, type }) => ({ id, type })),
    [
      { id: 1, type: "browser" },
      { id: 2, type: "renderer" },
      { id: 3, type: "renderer" },
      { id: 4, type: "GPU" },
    ],
  );

  const summary = summarizeChromiumProcessTreeCpu(
    processSample([
      { id: 1, type: "browser", cpuTimeSeconds: 4 },
      { id: 2, type: "renderer", cpuTimeSeconds: 2 },
      { id: 3, type: "renderer", cpuTimeSeconds: 1 },
      { id: 4, type: "GPU", cpuTimeSeconds: 3 },
    ]),
    processSample([
      { id: 1, type: "browser", cpuTimeSeconds: 4.1 },
      { id: 2, type: "renderer", cpuTimeSeconds: 2.25 },
      { id: 3, type: "renderer", cpuTimeSeconds: 1.15 },
      { id: 4, type: "GPU", cpuTimeSeconds: 3.2 },
    ]),
    2_000,
  );
  assert.equal(summary.available, true);
  assert.equal(summary.reliable, true);
  assert.equal(summary.totalCpuMs, 700);
  assert.equal(summary.totalCpuMsPerSecond, 350);
  assert.deepEqual(summary.byType, {
    browser: { cpuMs: 100, cpuMsPerSecond: 50, processCount: 1 },
    renderer: { cpuMs: 400, cpuMsPerSecond: 200, processCount: 2 },
    gpu: { cpuMs: 200, cpuMsPerSecond: 100, processCount: 1 },
  });
});

test("marks whole-process attribution diagnostic when a process turns over", () => {
  const summary = summarizeChromiumProcessTreeCpu(
    processSample([
      { id: 1, type: "browser", cpuTimeSeconds: 1 },
      { id: 2, type: "renderer", cpuTimeSeconds: 1 },
    ]),
    processSample([
      { id: 1, type: "browser", cpuTimeSeconds: 1.1 },
      { id: 3, type: "renderer", cpuTimeSeconds: 0.1 },
    ]),
    1_000,
  );
  assert.equal(summary.available, true);
  assert.equal(summary.reliable, false);
  assert.equal(summary.processRestarted, true);
  assert.equal(summary.totalCpuMs, 100);
  assert.match(summary.reason, /diagnostic only/u);
});

test("summarizes a stable GPU-process CPU delta", () => {
  const summary = summarizeGpuProcessCpu(
    processSample([
      { id: 4, type: "GPU", cpuTimeSeconds: 1 },
    ]),
    processSample([
      { id: 4, type: "GPU", cpuTimeSeconds: 1.25 },
    ]),
    2_000,
  );
  assert.deepEqual(summary, {
    available: true,
    reliable: true,
    windowMs: 2000,
    cpuMs: 250,
    cpuMsPerSecond: 125,
    matchedProcessCount: 1,
    measuredProcessCount: 1,
    processRestarted: false,
    cpuCounterReset: false,
    reason: null,
  });
});

test("marks process replacement and CPU-counter reset unreliable", () => {
  const replacement = summarizeGpuProcessCpu(
    processSample([
      { id: 4, type: "GPU", cpuTimeSeconds: 1 },
    ]),
    processSample([
      { id: 4, type: "GPU", cpuTimeSeconds: 1.1 },
      { id: 5, type: "GPU", cpuTimeSeconds: 0.1 },
    ]),
    1_000,
  );
  assert.equal(replacement.available, true);
  assert.equal(replacement.reliable, false);
  assert.equal(replacement.processRestarted, true);
  assert.equal(replacement.cpuMs, 100);

  const reset = summarizeGpuProcessCpu(
    processSample([
      { id: 4, type: "GPU", cpuTimeSeconds: 2 },
    ]),
    processSample([
      { id: 4, type: "GPU", cpuTimeSeconds: 1 },
    ]),
    1_000,
  );
  assert.equal(reset.available, false);
  assert.equal(reset.cpuCounterReset, true);
  assert.equal(reset.cpuMs, null);
});

test("cohort identity separates backend, driver, and requested mode", () => {
  const metadata = {
    renderingClass: "hardware",
    devices: [
      {
        vendorId: 0x10de,
        deviceId: 0x2216,
        driverVersion: "1.2.3",
      },
    ],
    backend: { displayType: "ANGLE_D3D11" },
  };
  const hardware = buildGraphicsCohort({
    hardwareGpuRequested: true,
    browserVersion: "151.0.2.3",
    metadata,
  });
  const defaultMode = buildGraphicsCohort({
    hardwareGpuRequested: false,
    browserVersion: "151.0.2.3",
    metadata,
  });
  assert.notEqual(hardware.id, defaultMode.id);
  assert.match(hardware.id, /angle-d3d11:1.2.3/u);
  assert.equal(hardware.requestSatisfied, true);
  assert.equal(defaultMode.requestSatisfied, false);
});
