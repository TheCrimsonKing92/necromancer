import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");

test("direct-play visual rigs remain lazy, semantic, and reduced-motion safe", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      hasTouch: true,
    });
    const requested = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    assert.equal(
      requested.some((url) => url.includes("direct-play-cast-v1.png") || url.includes("visual-rig-motion.css")),
      false,
      "The title must not fetch direct-play rig assets or motion styles.",
    );

    await page.locator('[data-action="start-action-prototype"][data-prototype-id="fire-road-under-ash"]').click();
    await page.locator('[data-visual-rig-id="quadruped-hound"]').waitFor();
    await page.waitForLoadState("networkidle");

    const contract = await page.evaluate(() => {
      const hound = document.querySelector('[data-visual-rig-id="quadruped-hound"]');
      const figure = hound?.closest('[role="img"]');
      const rigs = [...document.querySelectorAll("[data-visual-rig-id]")];
      return {
        houndName: figure?.getAttribute("aria-label"),
        houndPose: hound?.getAttribute("data-visual-pose-id"),
        houndAnimation: hound ? getComputedStyle(hound).animationName : null,
        allNamed: rigs.every((rig) => Boolean(rig.closest('[role="img"], button[aria-label]')?.getAttribute("aria-label"))),
        perFigureControls: rigs.some((rig) => rig.matches("button, [tabindex]")),
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    assert.match(contract.houndName ?? "", /^Ash hound, /u);
    assert.equal(contract.houndPose, "hound-rest");
    assert.equal(contract.houndAnimation, "none");
    assert.equal(contract.allNamed, true);
    assert.equal(contract.perFigureControls, false, "Visual layers must not create a second control system.");
    assert.equal(contract.pageOverflows, false);
    assert.equal(
      requested.some((url) => url.includes("direct-play-cast-v1.png")),
      true,
      "The painted cast fallback should load with its owning proof.",
    );
    assert.equal(
      requested.some((url) => url.includes("visual-rig-motion.css")),
      true,
      "Finite rig motion styles should load only with their owning proof.",
    );
  } finally {
    await browser?.close();
    await server.close();
  }
});
