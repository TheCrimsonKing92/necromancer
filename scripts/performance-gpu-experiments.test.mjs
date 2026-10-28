import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildGpuExperimentPhases,
  selectGpuExperimentPhases,
} from "./performance-gpu-experiments.mjs";

const styleRule = (css, selector) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = css.match(
    new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`, "u"),
  );
  assert.ok(match, `Expected ${selector} in base styles.`);
  return match[1];
};

const buildHarness = () => {
  const calls = [];
  const page = {
    addInitScript: async (_install, css) => calls.push(["css", css]),
    context: () => ({
      newCDPSession: async () => ({
        send: async (method, parameters) =>
          calls.push(["cdp", method, parameters]),
      }),
    }),
    emulateMedia: async (media) => calls.push(["media", media]),
    evaluate: async () => calls.push(["evaluate"]),
    locator: (selector) => ({
      click: async () => calls.push(["click", selector]),
      waitFor: async (options) => calls.push(["wait", selector, options]),
    }),
    route: async (pattern) => calls.push(["route", pattern]),
    setViewportSize: async (viewport) => calls.push(["viewport", viewport]),
    waitForTimeout: async (duration) => calls.push(["timeout", duration]),
  };
  const prepareBattle = async () => calls.push(["prepare", "battle"]);
  const prepareStory = async () => calls.push(["prepare", "story"]);
  const measureTargetPaintCadence = async () => ({ samples: 1 });
  const phases = buildGpuExperimentPhases({
    prepareBattle,
    prepareStory,
    measureTargetPaintCadence,
  });
  return { calls, page, phases };
};

test("adds paired GPU experiments without changing established ids", () => {
  const { phases } = buildHarness();
  const ids = phases.map(({ id }) => id);
  const establishedIds = [
    "stats-idle",
    "stats-open-motion",
    "stats-no-shadow",
    "stats-offscreen-containment",
    "inventory-idle",
    "inventory-no-art",
    "inventory-offscreen-containment",
    "battle-static-dossier",
    "targeting-no-enemy-containment",
    "targeting-no-action-containment",
    "defeated-filter",
    "defeated-no-filter",
  ];

  assert.deepEqual(
    ids.filter((id) => establishedIds.includes(id)),
    establishedIds,
  );
  assert.deepEqual(
    ids.filter((id) => id.startsWith("battle-attribution-")),
    [
      "battle-attribution-idle",
      "battle-attribution-static-dossier",
      "battle-attribution-no-viewport-texture",
      "battle-attribution-flat-major-gradients",
      "battle-attribution-flat-body",
      "battle-attribution-flat-dossier",
      "battle-attribution-bounded-atmosphere",
      "battle-attribution-viewport-1024x711",
      "battle-attribution-viewport-1920x1333",
      "battle-attribution-dpr-2",
    ],
  );
  assert.equal(new Set(ids).size, ids.length);
  const establishedComparisons = {
    "stats-open-motion": "stats-idle",
    "stats-no-shadow": "stats-idle",
    "stats-offscreen-containment": "stats-idle",
    "inventory-no-art": "inventory-idle",
    "inventory-offscreen-containment": "inventory-idle",
    "battle-static-dossier": "battle-idle",
    "targeting-no-enemy-containment": "targeting",
    "targeting-no-action-containment": "targeting",
    "defeated-no-filter": "defeated-filter",
  };
  for (const [id, baselineId] of Object.entries(establishedComparisons)) {
    assert.equal(
      phases.find((phase) => phase.id === id)?.comparisonBaselineId,
      baselineId,
    );
  }
  for (const id of ids.filter(
    (id) =>
      id.startsWith("battle-attribution-") &&
      id !== "battle-attribution-idle",
  )) {
    assert.equal(
      phases.find((phase) => phase.id === id)?.comparisonBaselineId,
      "battle-attribution-idle",
    );
  }
});

test("an exact experiment filter retains its comparison baseline", () => {
  const { phases } = buildHarness();
  assert.deepEqual(
    selectGpuExperimentPhases(phases, "battle-attribution-flat-body").map(
      ({ id }) => id,
    ),
    ["battle-attribution-idle", "battle-attribution-flat-body"],
  );
});

test("installs isolated battle CSS before rendering the battle", async () => {
  const { calls, page, phases } = buildHarness();
  const texturePhase = phases.find(
    ({ id }) => id === "battle-attribution-no-viewport-texture",
  );

  await texturePhase.prepare(page, "http://example.test");

  assert.equal(calls[0][0], "css");
  assert.match(calls[0][1], /body::before/u);
  assert.match(calls[0][1], /content: none !important/u);
  assert.deepEqual(calls[1], ["prepare", "battle"]);

  calls.length = 0;
  const gradientPhase = phases.find(
    ({ id }) => id === "battle-attribution-flat-major-gradients",
  );
  await gradientPhase.prepare(page, "http://example.test");

  assert.equal(calls[0][0], "css");
  assert.match(calls[0][1], /body \{ background: #090a09/u);
  assert.match(calls[0][1], /\.dossier \{ background: #141613/u);
  assert.deepEqual(calls[1], ["prepare", "battle"]);
});

test("applies viewport and DPR attribution before rendering the battle", async () => {
  const { calls, page, phases } = buildHarness();
  const viewportPhase = phases.find(
    ({ id }) => id === "battle-attribution-viewport-1024x711",
  );

  await viewportPhase.prepare(page, "http://example.test");
  assert.deepEqual(calls, [
    ["viewport", { width: 1024, height: 711 }],
    ["prepare", "battle"],
  ]);

  calls.length = 0;
  const dprPhase = phases.find(
    ({ id }) => id === "battle-attribution-dpr-2",
  );
  await dprPhase.prepare(page, "http://example.test");

  assert.equal(calls[0][0], "cdp");
  assert.equal(calls[0][1], "Emulation.setDeviceMetricsOverride");
  assert.deepEqual(calls[0][2], {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 2,
    mobile: false,
    screenWidth: 1440,
    screenHeight: 1000,
  });
  assert.deepEqual(calls[1], ["prepare", "battle"]);
});

test("keeps production body atmosphere on a bounded surface", async () => {
  const css = await readFile(
    new URL("../src/styles/base.css", import.meta.url),
    "utf8",
  );
  const body = styleRule(css, "body");
  const texture = styleRule(css, "body::before");
  const atmosphere = styleRule(css, "body::after");

  assert.match(body, /background:\s*#090a09\s*;/u);
  assert.doesNotMatch(body, /gradient\(/u);
  assert.match(texture, /position:\s*fixed\s*;/u);
  assert.equal(texture.match(/repeating-linear-gradient\(/gu)?.length, 2);
  assert.match(atmosphere, /position:\s*fixed\s*;/u);
  assert.match(atmosphere, /height:\s*min\(34rem,\s*65vh\)\s*;/u);
  assert.doesNotMatch(atmosphere, /\binset\s*:/u);
  assert.equal(atmosphere.match(/radial-gradient\(/gu)?.length, 2);
});

test("installs Stats experiment CSS before preparing its story surface", async () => {
  const { calls, page, phases } = buildHarness();
  await phases
    .find(({ id }) => id === "stats-offscreen-containment")
    .prepare(page, "http://example.test");

  assert.equal(calls[0][0], "css");
  assert.match(calls[0][1], /content-visibility: auto/u);
  assert.deepEqual(calls[1], ["prepare", "story"]);
  assert.ok(
    calls.some(
      (call) =>
        call[0] === "click" &&
        call[1] === "[data-stats-control]",
    ),
  );
});

test("warms Stats before measuring bounded entrance motion cycles", async () => {
  const { calls, page, phases } = buildHarness();
  const phase = phases.find(({ id }) => id === "stats-open-motion");

  await phase.prepare(page, "http://example.test");
  assert.deepEqual(calls[0], [
    "media",
    { reducedMotion: "no-preference" },
  ]);
  assert.equal(
    calls.filter(
      (call) =>
        call[0] === "click" &&
        call[1] === "[data-stats-control]",
    ).length,
    1,
  );
  assert.equal(
    calls.filter(
      (call) =>
        call[0] === "click" &&
        call[1] === '.stats-surface [data-action="close-stats"]',
    ).length,
    1,
  );

  calls.length = 0;
  assert.deepEqual(await phase.run(page), { cycles: 14 });
  assert.equal(
    calls.filter(
      (call) =>
        call[0] === "click" &&
        call[1] === "[data-stats-control]",
    ).length,
    14,
  );
  assert.equal(
    calls.filter(
      (call) =>
        call[0] === "click" &&
        call[1] === '.stats-surface [data-action="close-stats"]',
    ).length,
    14,
  );
  assert.equal(
    calls.filter((call) => call[0] === "timeout").length,
    28,
  );
});
