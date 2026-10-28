import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { captureChromiumMemorySnapshot } from "./performance-memory-infra.mjs";
import { sampleChromiumProcesses } from "./performance-gpu.mjs";

const outputArgument = process.argv.find((argument) =>
  argument.startsWith("--output="),
);
const outputPath = outputArgument?.slice("--output=".length) || null;

const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.setContent(
    "<main style='min-height:2202px;background:#080a08;color:#eee'>MemoryInfra probe</main>",
  );
  const session = await browser.newBrowserCDPSession();
  const processSample = await sampleChromiumProcesses(session);
  const memoryInfra = await captureChromiumMemorySnapshot({
    session,
    processSample,
    traceSettleMs: 1_000,
  });
  const result = { processSample, memoryInfra };
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    await writeFile(outputPath, serialized, "utf8");
  }
  process.stdout.write(serialized);
  await context.close();
} finally {
  await browser.close();
}
