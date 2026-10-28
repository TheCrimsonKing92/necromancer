import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "output", "playwright-120hz", "repeated");
const requestedRuns = Number(
  process.argv.find((argument) => argument.startsWith("--runs="))?.split("=")[1] ?? 5,
);
const requireDelivery = process.argv.includes("--require-delivery");
if (!Number.isInteger(requestedRuns) || requestedRuns < 1 || requestedRuns > 30) {
  throw new Error("--runs must be an integer between 1 and 30.");
}

const runProbe = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [resolve(root, "scripts", "trace-high-refresh.mjs"), "--quiet"],
      { cwd: root, stdio: "ignore" },
    );
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({ code }));
  });

const percentile = (values, ratio) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? null;
};

const metricSummary = (reports, select, { higherIsBetter = false } = {}) => {
  const values = reports.map(select).filter(Number.isFinite);
  return {
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    worst:
      values.length > 0
        ? higherIsBetter
          ? Math.min(...values)
          : Math.max(...values)
        : null,
  };
};

const aggregateDelivery = (reports, workloadId) => {
  const frames = reports.map((report) => report.workloads[workloadId].frames);
  const samples = frames.reduce((total, frame) => total + frame.samples, 0);
  const missedFrames = frames.reduce(
    (total, frame) => total + frame.missedFrames,
    0,
  );
  return {
    samples,
    missedFrames,
    fullyDeliveredPercent: Number(
      ((samples / (samples + missedFrames)) * 100).toFixed(3),
    ),
  };
};

await mkdir(output, { recursive: true });
const reports = [];
for (let run = 1; run <= requestedRuns; run += 1) {
  const processResult = await runProbe();
  const report = JSON.parse(
    await readFile(
      resolve(root, "output", "playwright-120hz", "high-refresh-report.json"),
      "utf8",
    ),
  );
  reports.push(report);
  report.processExitCode = processResult.code;
  await writeFile(
    resolve(output, `run-${String(run).padStart(2, "0")}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (run < requestedRuns) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 3000));
  }
}

const cohortIds = [...new Set(reports.map((report) => report.cohort.id))];
const summary = {
  capturedAt: new Date().toISOString(),
  runs: requestedRuns,
  targetHz: 120,
  cohortIds,
  comparable: cohortIds.length === 1,
  environmentQualifiedRuns: reports.filter(
    (report) => report.assessment.environmentQualified,
  ).length,
  capabilityPassedRuns: reports.filter(
    (report) => report.assessment.capabilityPassed,
  ).length,
  cleanDeliveryRuns: reports.filter(
    (report) => report.assessment.deliveryPassed,
  ).length,
  baselineObservedHz: metricSummary(
    reports,
    (report) => report.baseline.estimatedHz,
  ),
  targeting: {
    frameP95Ms: metricSummary(
      reports,
      (report) => report.workloads.targeting.frames.p95Ms,
    ),
    frameP99Ms: metricSummary(
      reports,
      (report) => report.workloads.targeting.frames.p99Ms,
    ),
    worstFrameMs: metricSummary(
      reports,
      (report) => report.workloads.targeting.frames.worstMs,
    ),
    fullyDeliveredPercent: metricSummary(
      reports,
      (report) => report.workloads.targeting.frames.fullyDeliveredPercent,
      { higherIsBetter: true },
    ),
    aggregateDelivery: aggregateDelivery(reports, "targeting"),
  },
  compoundScroll: {
    frameP95Ms: metricSummary(
      reports,
      (report) => report.workloads.compoundScroll.frames.p95Ms,
    ),
    frameP99Ms: metricSummary(
      reports,
      (report) => report.workloads.compoundScroll.frames.p99Ms,
    ),
    worstFrameMs: metricSummary(
      reports,
      (report) => report.workloads.compoundScroll.frames.worstMs,
    ),
    fullyDeliveredPercent: metricSummary(
      reports,
      (report) => report.workloads.compoundScroll.frames.fullyDeliveredPercent,
      { higherIsBetter: true },
    ),
    aggregateDelivery: aggregateDelivery(reports, "compoundScroll"),
  },
};
summary.deliveryTargetMet = ["targeting", "compoundScroll"].every(
  (workloadId) =>
    summary[workloadId].aggregateDelivery.fullyDeliveredPercent >= 99.5,
);
await writeFile(
  resolve(output, "summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);
console.log(JSON.stringify(summary, null, 2));

if (!summary.comparable) {
  throw new Error("The repeated 120 Hz reports belong to different cohorts.");
}
if (summary.environmentQualifiedRuns !== requestedRuns) {
  throw new Error("Not every repeated run observed a 120 Hz-capable environment.");
}
if (summary.capabilityPassedRuns !== requestedRuns) {
  throw new Error(
    `${requestedRuns - summary.capabilityPassedRuns} of ${requestedRuns} repeated runs failed the application-work gate.`,
  );
}
for (const workloadId of requireDelivery
  ? ["targeting", "compoundScroll"]
  : []) {
  if (summary[workloadId].aggregateDelivery.fullyDeliveredPercent < 99.5) {
    throw new Error(
      `${workloadId} delivered ${summary[workloadId].aggregateDelivery.fullyDeliveredPercent}% of 120 Hz opportunities; at least 99.5% is required across the repeated cohort.`,
    );
  }
}
