import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const productionRoot = resolve(
  root,
  "public",
  "assets",
  "items",
  "individual",
);

const dataUrlBuffer = (dataUrl) =>
  Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");

export const publishGeneratedItemArt = async ({
  id,
  sourcePath,
  browserType = chromium,
}) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error(`Invalid item id: ${id}`);
  }
  const source = await readFile(resolve(sourcePath));
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const encoded = await page.evaluate(
      async (sourceUrl) => {
        const image = new Image();
        image.src = sourceUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d", { alpha: true });
        if (!context) throw new Error("Canvas 2D is unavailable.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, 256, 256);
        return canvas.toDataURL("image/webp", 0.86);
      },
      `data:image/png;base64,${source.toString("base64")}`,
    );
    await page.close();
    const destination = resolve(productionRoot, `${id}.webp`);
    await writeFile(destination, dataUrlBuffer(encoded), { flag: "wx" });
    return destination;
  } finally {
    await browser.close();
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [, , id, sourcePath] = process.argv;
  if (!id || !sourcePath) {
    throw new Error(
      "Usage: node scripts/publish-generated-item-art.mjs <item-id> <source.png>",
    );
  }
  console.log(await publishGeneratedItemArt({ id, sourcePath }));
}
