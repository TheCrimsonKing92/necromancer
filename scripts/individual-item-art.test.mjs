import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const ids = [
  "vigil-cordial",
  "carrier-harness",
  "grave-copper",
  "orra-crozier",
];

test("new production item studies are decodable 256px WebP files", async () => {
  const sources = await Promise.all(
    ids.map(async (id) => ({
      id,
      url: `data:image/webp;base64,${(
        await readFile(
          resolve(
            root,
            "public",
            "assets",
            "items",
            "individual",
            `${id}.webp`,
          ),
        )
      ).toString("base64")}`,
    })),
  );
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const dimensions = await page.evaluate(async (entries) =>
      Promise.all(
        entries.map(async ({ id, url }) => {
          const image = new Image();
          image.src = url;
          await image.decode();
          return { id, width: image.naturalWidth, height: image.naturalHeight };
        }),
      ), sources);
    assert.deepEqual(
      dimensions,
      ids.map((id) => ({ id, width: 256, height: 256 })),
    );
  } finally {
    await browser.close();
  }
});
