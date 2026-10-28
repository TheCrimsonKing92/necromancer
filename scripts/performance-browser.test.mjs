import assert from "node:assert/strict";
import test from "node:test";
import {
  describePerformanceBrowser,
  hardwareCohortRejection,
  scopeGraphicsCohortToBrowser,
  scopePerformanceCohortToCpu,
  selectPerformanceBrowser,
} from "./performance-browser.mjs";

const select = (arguments_, hardwareGpuRequested = false) =>
  selectPerformanceBrowser({
    arguments_,
    hardwareGpuRequested,
    playwrightExecutablePath: "C:\\playwright\\chromium.exe",
    cwd: "C:\\repo",
  });

test("preserves the existing default and GPU launch selections", () => {
  assert.deepEqual(select([]), {
    source: "playwright-default",
    channel: null,
    executablePath: "C:\\playwright\\chromium.exe",
    launchOptions: {},
    cohortKey: "playwright-default",
  });
  assert.deepEqual(select([], true), {
    source: "channel",
    channel: "chromium",
    executablePath: null,
    launchOptions: { channel: "chromium" },
    cohortKey: "channel-chromium",
  });
});

test("separates CPU-throttled evidence from the desktop cohort", () => {
  const baseline = { id: "software:browser" };
  assert.equal(scopePerformanceCohortToCpu(baseline, 1), baseline);
  assert.deepEqual(scopePerformanceCohortToCpu(baseline, 4), {
    id: "software:browser:cpu-4x",
    cpuThrottleRate: 4,
  });
});

test("selects an installed channel or explicit executable", () => {
  assert.equal(select(["--browser-channel=chrome"], true).channel, "chrome");
  const executable = select([
    "--browser-executable=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ]);
  assert.equal(executable.source, "executable");
  assert.equal(executable.cohortKey, "executable-chrome.exe");
  assert.match(executable.executablePath, /Google\\Chrome/u);
});

test("rejects ambiguous browser selection", () => {
  assert.throws(
    () =>
      select([
        "--browser-channel=chrome",
        "--browser-executable=chrome.exe",
      ]),
    /either --browser-channel or --browser-executable/u,
  );
});

test("records browser identity in a distinct graphics cohort", () => {
  const identity = describePerformanceBrowser({
    selection: select(["--browser-channel=chrome"], true),
    browserVersion: "152.0.1.2",
    protocolVersion: { product: "Chrome/152.0.1.2" },
  });
  const cohort = scopeGraphicsCohortToBrowser(
    { id: "hardware-gpu:hardware:device", browserChannel: "chromium" },
    identity,
  );
  assert.match(cohort.id, /:channel-chrome$/u);
  assert.equal(cohort.browserProduct, "Chrome/152.0.1.2");
  assert.equal(cohort.browserChannel, "chrome");
});

test("rejects software and unknown renderers from hardware cohorts", () => {
  assert.equal(
    hardwareCohortRejection({
      hardwareGpuRequested: true,
      graphicsMetadata: {
        renderingClass: "software",
        backend: { renderer: "SwiftShader" },
      },
    }).includes("SwiftShader"),
    true,
  );
  assert.equal(
    hardwareCohortRejection({
      hardwareGpuRequested: true,
      graphicsMetadata: { renderingClass: "hardware", backend: {} },
    }),
    null,
  );
});
