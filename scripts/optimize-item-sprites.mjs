import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const sprites = [
  {
    file: "weapons.png",
    width: 512,
    height: 512,
  },
  {
    file: "armor.png",
    width: 768,
    height: 512,
  },
  {
    file: "charms-and-supplies.png",
    width: 1024,
    height: 512,
  },
  {
    file: "field-tools.png",
    width: 512,
    height: 512,
    cells: [
      "hooked-knife.png",
      "mortuary-mallet.png",
      "warding-awl.png",
      "burial-hood.png",
    ],
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  for (const sprite of sprites) {
    const path = resolve(
      root,
      "public",
      "assets",
      "items",
      sprite.file,
    );
    if (sprite.cells) {
      const sources = await Promise.all(
        sprite.cells.map(async (file) => {
          const source = await readFile(
            resolve(root, "output", "item-art-sources", file),
          );
          return `data:image/png;base64,${source.toString("base64")}`;
        }),
      );
      const composed = await page.evaluate(
        async ({ sourceUrls, width, height }) => {
          const images = await Promise.all(
            sourceUrls.map(async (sourceUrl) => {
              const image = new Image();
              image.src = sourceUrl;
              await image.decode();
              return image;
            }),
          );
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { alpha: true });
          if (!context) throw new Error("Canvas 2D is unavailable.");
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          images.forEach((image, index) => {
            const cellWidth = width / 2;
            const cellHeight = height / 2;
            context.drawImage(
              image,
              (index % 2) * cellWidth,
              Math.floor(index / 2) * cellHeight,
              cellWidth,
              cellHeight,
            );
          });
          return canvas.toDataURL("image/png");
        },
        {
          sourceUrls: sources,
          width: sprite.width,
          height: sprite.height,
        },
      );
      const output = Buffer.from(
        composed.slice(composed.indexOf(",") + 1),
        "base64",
      );
      await writeFile(path, output);
      console.log(
        `${sprite.file}: composed ${sprite.cells.length} sources -> ${output.byteLength} bytes (${sprite.width}x${sprite.height})`,
      );
      continue;
    }
    const source = await readFile(path);
    const dataUrl = `data:image/png;base64,${source.toString("base64")}`;
    const resized = await page.evaluate(
      async ({ sourceUrl, width, height }) => {
        const image = new Image();
        image.src = sourceUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: true });
        if (!context) throw new Error("Canvas 2D is unavailable.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL("image/png");
      },
      {
        sourceUrl: dataUrl,
        width: sprite.width,
        height: sprite.height,
      },
    );
    const optimized = Buffer.from(
      resized.slice(resized.indexOf(",") + 1),
      "base64",
    );
    await writeFile(path, optimized);
    console.log(
      `${sprite.file}: ${source.byteLength} -> ${optimized.byteLength} bytes (${sprite.width}x${sprite.height})`,
    );
  }
} finally {
  await browser.close();
}
