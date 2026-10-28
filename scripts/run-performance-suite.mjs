import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { summarizeBenchmarkReports } from "./performance-benchmark-summary.mjs";

const root = resolve(import.meta.dirname, "..");
const runArgument = process.argv.find((argument) =>
  argument.startsWith("--runs="),
);
const requestedRuns = Number(runArgument?.slice("--runs=".length) ?? 5);
const runCount =
  Number.isInteger(requestedRuns) &&
  requestedRuns > 0 &&
  requestedRuns <= 100
    ? requestedRuns
    : 5;
const localMutationsRequested = process.argv.includes("--local-mutations");
const urlArgument = process.argv.find((argument) =>
  argument.startsWith("--url="),
);
const gpuExperimentsRequested =
  process.argv.includes("--gpu-experiments");
const gpuExperimentFilterArgument = process.argv.find((argument) =>
  argument.startsWith("--gpu-experiment-filter="),
);
const browserChannelArgument = process.argv.find((argument) =>
  argument.startsWith("--browser-channel="),
);
const browserExecutableArgument = process.argv.find((argument) =>
  argument.startsWith("--browser-executable="),
);
const resumeRootArgument = process.argv.find((argument) =>
  argument.startsWith("--resume-root="),
);
const diagnosticArguments = process.argv.filter(
  (argument) =>
    argument === "--tail-observability" ||
    argument === "--coverage" ||
    argument === "--scale-persistence" ||
    argument === "--surface-soak" ||
    argument === "--worst-case" ||
    argument.startsWith("--cpu-throttle="),
);
const stamp = new Date()
  .toISOString()
  .replaceAll(":", "-")
  .replaceAll(".", "-");
const outputRoot = resumeRootArgument
  ? resolve(resumeRootArgument.slice("--resume-root=".length))
  : resolve(
      root,
      "output",
      localMutationsRequested ? "playwright" : "playwright-gpu",
      "repeated",
      stamp,
    );

const runChild = (arguments_) =>
  new Promise((done, reject) => {
    const child = spawn(process.execPath, arguments_, {
      cwd: root,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      done(code ?? 1);
    });
  });

await mkdir(outputRoot, { recursive: true });
const reports = [];
const reportPaths = [];

for (let index = 0; index < runCount; index += 1) {
  const runOutput = resolve(
    outputRoot,
    `run-${String(index + 1).padStart(2, "0")}`,
  );
  const reportPath = resolve(runOutput, "performance-report.json");
  if (!resumeRootArgument) {
    const arguments_ = [
      resolve(root, "scripts", "trace-performance.mjs"),
      "--skip-trace",
      "--quiet",
      `--output=${runOutput}`,
    ];
    if (!localMutationsRequested) {
      arguments_.push("--gpu", "--gpu-phases");
    }
    if (gpuExperimentsRequested) {
      arguments_.push("--gpu-experiments");
    }
    if (gpuExperimentFilterArgument) {
      arguments_.push(gpuExperimentFilterArgument);
    }
    if (browserChannelArgument) arguments_.push(browserChannelArgument);
    if (browserExecutableArgument) arguments_.push(browserExecutableArgument);
    if (urlArgument) arguments_.push(urlArgument);
    arguments_.push(...diagnosticArguments);
    console.log(
      `${localMutationsRequested ? "Local mutation" : "GPU"} benchmark run ${index + 1}/${runCount}`,
    );
    const exitCode = await runChild(arguments_);
    if (exitCode !== 0 && !localMutationsRequested) {
      throw new Error(`Benchmark run exited with code ${exitCode}.`);
    }
    if (exitCode !== 0) {
      console.warn(
        `Local mutation run ${index + 1} exceeded a gate; retaining its completed report for distribution analysis.`,
      );
    }
  }
  reports.push(JSON.parse(await readFile(reportPath, "utf8")));
  reportPaths.push(reportPath);
}

const summary = {
  capturedAt: new Date().toISOString(),
  outputRoot,
  reportPaths,
  ...summarizeBenchmarkReports(reports),
};
const summaryPath = resolve(outputRoot, "performance-summary.json");
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ summaryPath, ...summary }, null, 2));
