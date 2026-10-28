import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { preview } from "vite";
import { prepareRepresentativeStatsPage } from "./performance-local-mutations.mjs";
import { compareStatsConstructionVariants } from "./performance-stats-construction-experiment.mjs";

const root = resolve(import.meta.dirname, "..");
const outputArgument = process.argv.find((argument) =>
  argument.startsWith("--output="),
);
const output = outputArgument
  ? resolve(outputArgument.slice("--output=".length))
  : resolve(root, "output", "stats-construction-experiment.json");

await mkdir(resolve(output, ".."), { recursive: true });
const server = await preview({
  root,
  preview: { host: "127.0.0.1", port: 0 },
});
const targetUrl =
  server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
if (!targetUrl) throw new Error("Vite did not expose a preview URL.");

let browser;
try {
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const report = await compareStatsConstructionVariants({
    context,
    samples: 5,
    iterations: 24,
    preparePage: (page) =>
      prepareRepresentativeStatsPage(page, targetUrl),
  });
  await context.close();
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Stats construction recommendation: ${report.assessment.recommendation}`);
  console.log(`Report: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
