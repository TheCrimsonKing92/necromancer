import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const productionRoot = resolve(root, "public", "assets", "scenes");

const dataUrlBuffer = (dataUrl) =>
  Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");

export const publishGeneratedSceneArt = async ({
  id,
  sourcePath,
  width = 1280,
  height = 720,
  browserType = chromium,
}) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error(`Invalid scene id: ${id}`);
  }
  const source = await readFile(resolve(sourcePath));
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const encoded = await page.evaluate(
      async ({ sourceUrl, width, height }) => {
        const image = new Image();
        image.src = sourceUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas 2D is unavailable.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL("image/webp", 0.82);
      },
      {
        sourceUrl: `data:image/png;base64,${source.toString("base64")}`,
        width,
        height,
      },
    );
    await mkdir(productionRoot, { recursive: true });
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
      "Usage: node scripts/publish-generated-scene-art.mjs <scene-id> <source.png>",
    );
  }
  console.log(await publishGeneratedSceneArt({ id, sourcePath }));
}
