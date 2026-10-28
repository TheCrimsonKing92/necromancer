import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { summarizeItemArtRequests } from "./item-art-loading-experiment.mjs";
import { parseItemSpriteDefinitions } from "./item-art-resource-experiment.mjs";
import { ITEM_ART_SOURCE_DEFINITIONS } from "./item-art-source-manifest.mjs";

const root = resolve(import.meta.dirname, "..");

test("parses production-style sprite definitions from TypeScript", () => {
  const definitions = parseItemSpriteDefinitions(`
    export const ITEM_VISUALS = {
      "ritual-knife": sprite("/assets/items/weapons.png", "A knife.", 2, 2, 0, 0),
      hood: sprite("/assets/items/tools.png", "A hood.", 2, 2, 1, 1, "3 / 4"),
    } satisfies Record<string, unknown>;
  `);
  assert.deepEqual(definitions, [
    {
      id: "ritual-knife",
      src: "/assets/items/weapons.png",
      file: "weapons.png",
      alt: "A knife.",
      columns: 2,
      rows: 2,
      column: 0,
      row: 0,
    },
    {
      id: "hood",
      src: "/assets/items/tools.png",
      file: "tools.png",
      alt: "A hood.",
      columns: 2,
      rows: 2,
      column: 1,
      row: 1,
    },
  ]);
});

test("reports unique encoded requests and theoretical decoded residency", () => {
  const definitions = [
    { id: "one", file: "sheet.png", columns: 2, rows: 2 },
    { id: "two", file: "sheet.png", columns: 2, rows: 2 },
  ];
  const sprites = summarizeItemArtRequests({
    definitions,
    mode: "sprites",
    requests: [
      { pathname: "/sprites/sheet.png", encodedBytes: 100 },
      { pathname: "/sprites/sheet.png", encodedBytes: 100 },
    ],
  });
  assert.equal(sprites.requestCount, 2);
  assert.equal(sprites.uniqueRequestCount, 1);
  assert.equal(sprites.encodedBytes, 100);
  assert.equal(sprites.theoreticalDecodedBytes, 4 * 256 * 256 * 4);

  const lazy = summarizeItemArtRequests({
    definitions,
    mode: "lazy-images",
    requests: [{ pathname: "/candidates/one.webp", encodedBytes: 30 }],
  });
  assert.equal(lazy.theoreticalDecodedBytes, 256 * 256 * 4);
});

test("ships one production WebP for every source-manifest item", async () => {
  const visualSource = await readFile(
    resolve(root, "src", "game", "item-visuals.ts"),
    "utf8",
  );
  for (const { id } of ITEM_ART_SOURCE_DEFINITIONS) {
    const relativeUrl = `/assets/items/individual/${id}.webp`;
    assert.match(visualSource, new RegExp(relativeUrl.replaceAll("/", "\\/"), "u"));
    const metadata = await stat(
      resolve(root, "public", "assets", "items", "individual", `${id}.webp`),
    );
    assert.ok(metadata.size > 0);
  }
});
