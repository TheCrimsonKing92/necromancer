import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const argument = (name) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .split(",")
    .filter(Boolean) ?? [];

const baselinePaths = argument("baseline");
const candidatePaths = argument("candidate");
if (baselinePaths.length === 0 || candidatePaths.length === 0) {
  throw new Error(
    "Pass comma-separated --baseline=<reports> and --candidate=<reports> paths.",
  );
}

const readReports = async (paths) =>
  Promise.all(
    paths.map(async (path) =>
      JSON.parse(await readFile(resolve(path), "utf8")),
    ),
  );

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const rounded = (value) => Number(value.toFixed(2));
const percentChange = (candidate, baseline) =>
  baseline === 0 ? null : rounded(((candidate - baseline) / baseline) * 100);

const valueAt = (scenario, path) =>
  path.reduce((value, key) => value[key], scenario);

const scenarioMedian = (reports, label, path) =>
  median(
    reports.map((report) => {
      const scenario = report.localMutations.scenarios.find(
        (candidate) => candidate.label === label,
      );
      if (!scenario) throw new Error(`Missing local scenario: ${label}`);
      return valueAt(scenario, path);
    }),
  );

const mutationChurn = (scenario) =>
  scenario.mutations.addedElements + scenario.mutations.removedElements;

const [baseline, candidate] = await Promise.all([
  readReports(baselinePaths),
  readReports(candidatePaths),
]);
const labels = baseline[0].localMutations.scenarios.map(({ label }) => label);

const scenarios = labels.map((label) => {
  const metrics = Object.fromEntries(
    [
      ["handlerMs", ["handlerMs"]],
      ["immediatePaintMs", ["immediatePaintMs"]],
      ["settledPaintMs", ["settledPaintMs"]],
      ["taskMs", ["mainThread", "taskMs"]],
      ["layoutMs", ["mainThread", "layoutMs"]],
      ["allocatedBytes", ["heap", "allocatedBeforeGcBytes"]],
      ["retainedBytes", ["heap", "retainedAfterGcBytes"]],
    ].map(([name, path]) => {
      const baselineValue = scenarioMedian(baseline, label, path);
      const candidateValue = scenarioMedian(candidate, label, path);
      return [
        name,
        {
          baseline: rounded(baselineValue),
          candidate: rounded(candidateValue),
          changePercent: percentChange(candidateValue, baselineValue),
        },
      ];
    }),
  );
  const baselineChurn = median(
    baseline.map((report) =>
      mutationChurn(
        report.localMutations.scenarios.find(
          (scenario) => scenario.label === label,
        ),
      ),
    ),
  );
  const candidateChurn = median(
    candidate.map((report) =>
      mutationChurn(
        report.localMutations.scenarios.find(
          (scenario) => scenario.label === label,
        ),
      ),
    ),
  );
  return {
    label,
    ...metrics,
    elementChurn: {
      baseline: baselineChurn,
      candidate: candidateChurn,
      changePercent: percentChange(candidateChurn, baselineChurn),
    },
    candidateContinuity: candidate.every((report) => {
      const scenario = report.localMutations.scenarios.find(
        (entry) => entry.label === label,
      );
      return Object.values(scenario.identityRetained).every(Boolean);
    }),
  };
});

const aggregate = (metric) => {
  const baselineValue = scenarios.reduce(
    (total, scenario) => total + scenario[metric].baseline,
    0,
  );
  const candidateValue = scenarios.reduce(
    (total, scenario) => total + scenario[metric].candidate,
    0,
  );
  return {
    baseline: rounded(baselineValue),
    candidate: rounded(candidateValue),
    changePercent: percentChange(candidateValue, baselineValue),
  };
};

const report = {
  sampleCount: {
    baseline: baseline.length,
    candidate: candidate.length,
  },
  pageTransferBytes: {
    baseline: median(baseline.map(({ page }) => page.transferBytes)),
    candidate: median(candidate.map(({ page }) => page.transferBytes)),
  },
  aggregateScenarioMedians: {
    immediatePaintMs: aggregate("immediatePaintMs"),
    settledPaintMs: aggregate("settledPaintMs"),
    taskMs: aggregate("taskMs"),
    layoutMs: aggregate("layoutMs"),
    allocatedBytes: aggregate("allocatedBytes"),
    retainedBytes: aggregate("retainedBytes"),
    elementChurn: aggregate("elementChurn"),
  },
  scenarios,
};

console.log(JSON.stringify(report, null, 2));
