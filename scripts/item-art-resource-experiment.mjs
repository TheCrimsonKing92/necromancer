import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { runItemArtLoadingExperiment } from "./item-art-loading-experiment.mjs";
import { ITEM_ART_SOURCE_DEFINITIONS } from "./item-art-source-manifest.mjs";

const root = resolve(import.meta.dirname, "..");
const outputRoot = resolve(root, "output", "item-art-resource-experiment");
const candidateRoot = resolve(outputRoot, "candidates");
const publicRoot = resolve(root, "public");
const productionCandidateRoot = resolve(publicRoot, "assets", "items", "individual");

export const parseItemSpriteDefinitions = (source) => {
  const body = source.match(/export const ITEM_VISUALS\s*=\s*\{([\s\S]*?)\}\s*satisfies/u)?.[1];
  if (!body) throw new Error("ITEM_VISUALS was not found.");
  const entryPattern =
    /(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*sprite\("([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*"[^"]+")?\),?/gu;
  const definitions = [...body.matchAll(entryPattern)].map((match) => {
    const [, quotedId, identifierId, sourcePath, escapedAlt, columns, rows, column, row] = match;
    return {
      id: quotedId ?? identifierId,
      src: sourcePath,
      file: basename(sourcePath),
      alt: JSON.parse(`"${escapedAlt}"`),
      columns: Number(columns),
      rows: Number(rows),
      column: Number(column),
      row: Number(row),
    };
  });
  const declaredEntries =
    body.match(/^\s*(?:"[^"]+"|[A-Za-z_$][\w$]*)\s*:/gmu)?.length ?? 0;
  if (definitions.length !== declaredEntries || definitions.length === 0) {
    throw new Error("Every ITEM_VISUALS entry must call sprite(...) with literal arguments.");
  }
  return definitions;
};

const dataUrlBuffer = (dataUrl) =>
  Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");

const renderCandidates = async ({ page, definitions, spriteBuffers }) => {
  const spriteDataUrls = Object.fromEntries(
    [...spriteBuffers].map(([file, buffer]) => [
      file,
      `data:image/png;base64,${buffer.toString("base64")}`,
    ]),
  );
  const encoded = await page.evaluate(
    async ({ entries, sourceUrls }) => {
      const imageCache = new Map();
      const loadImage = async (file) => {
        if (imageCache.has(file)) return imageCache.get(file);
        const image = new Image();
        image.src = sourceUrls[file];
        await image.decode();
        imageCache.set(file, image);
        return image;
      };
      const results = [];
      for (const entry of entries) {
        const image = await loadImage(entry.file);
        const cellWidth = image.naturalWidth / entry.columns;
        const cellHeight = image.naturalHeight / entry.rows;
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d", { alpha: true });
        if (!context) throw new Error("Canvas 2D is unavailable.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
          image,
          entry.column * cellWidth,
          entry.row * cellHeight,
          cellWidth,
          cellHeight,
          0,
          0,
          256,
          256,
        );
        results.push({
          id: entry.id,
          png: canvas.toDataURL("image/png"),
          webp: canvas.toDataURL("image/webp", 0.86),
        });
      }
      return results;
    },
    { entries: definitions, sourceUrls: spriteDataUrls },
  );
  return encoded.map(({ id, png, webp }) => ({
    id,
    png: dataUrlBuffer(png),
    webp: dataUrlBuffer(webp),
  }));
};

export const runItemArtResourceExperiment = async ({
  browserType = chromium,
  publish = false,
} = {}) => {
  const definitions = ITEM_ART_SOURCE_DEFINITIONS;
  const spriteFiles = [...new Set(definitions.map(({ file }) => file))];
  const spriteBuffers = new Map(
    await Promise.all(
      spriteFiles.map(async (file) => [
        file,
        await readFile(resolve(publicRoot, "assets", "items", file)),
      ]),
    ),
  );

  await mkdir(candidateRoot, { recursive: true });
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const candidates = await renderCandidates({
      page,
      definitions,
      spriteBuffers,
    });
    await page.close();
    await Promise.all(
      candidates.flatMap(({ id, png, webp }) => [
        writeFile(resolve(candidateRoot, `${id}.png`), png),
        writeFile(resolve(candidateRoot, `${id}.webp`), webp),
      ]),
    );
    if (publish) {
      await mkdir(productionCandidateRoot, { recursive: true });
      await Promise.all(
        candidates.map(({ id, webp }) =>
          writeFile(resolve(productionCandidateRoot, `${id}.webp`), webp),
        ),
      );
    }
    const webpBuffers = new Map(
      candidates.map(({ id, webp }) => [id, webp]),
    );
    const loadingExperiment = await runItemArtLoadingExperiment({
      browser,
      definitions,
      spriteBuffers,
      webpBuffers,
    });
    const currentEncodedBytes = [...spriteBuffers.values()].reduce(
      (total, buffer) => total + buffer.byteLength,
      0,
    );
    const currentTheoreticalDecodedBytes = spriteFiles.reduce(
      (total, file) => {
        const definition = definitions.find((entry) => entry.file === file);
        return total + definition.columns * definition.rows * 256 * 256 * 4;
      },
      0,
    );
    const items = candidates.map(({ id, png, webp }) => ({
      id,
      pngEncodedBytes: png.byteLength,
      webpEncodedBytes: webp.byteLength,
      theoreticalDecodedBytes: 256 * 256 * 4,
    }));
    const report = {
      generatedAt: new Date().toISOString(),
      productionPresentationChanged: publish,
      publishedCandidateRoot: publish ? productionCandidateRoot : null,
      cell: { width: 256, height: 256, rgbaBytes: 256 * 256 * 4 },
      currentSprites: {
        files: await Promise.all(
          spriteFiles.map(async (file) => ({
            file,
            encodedBytes: (await stat(
              resolve(publicRoot, "assets", "items", file),
            )).size,
          })),
        ),
        encodedBytes: currentEncodedBytes,
        theoreticalDecodedBytes: currentTheoreticalDecodedBytes,
      },
      candidates: {
        itemCount: items.length,
        pngEncodedBytes: items.reduce(
          (total, item) => total + item.pngEncodedBytes,
          0,
        ),
        webpEncodedBytes: items.reduce(
          (total, item) => total + item.webpEncodedBytes,
          0,
        ),
        theoreticalDecodedBytes: items.reduce(
          (total, item) => total + item.theoreticalDecodedBytes,
          0,
        ),
        items,
      },
      loadingExperiment,
    };
    await writeFile(
      resolve(outputRoot, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    return report;
  } finally {
    await browser.close();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runItemArtResourceExperiment({
    publish: process.argv.includes("--publish"),
  });
  console.log(
    `Wrote ${report.candidates.itemCount} item candidates and the loading comparison to ${outputRoot}.`,
  );
}
