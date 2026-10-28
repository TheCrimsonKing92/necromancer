import assert from "node:assert/strict";
import test from "node:test";
import {
  startPageResourceCoverage,
  summarizeResourceCoverage,
} from "./performance-resource-coverage.mjs";

test("summarizes merged JS and CSS ranges without retaining source text", () => {
  const summary = summarizeResourceCoverage({
    javascript: [
      {
        url: "http://127.0.0.1/app.js",
        text: "0123456789",
        ranges: [
          { start: 0, end: 3 },
          { start: 2, end: 5 },
          { start: 9, end: 20 },
        ],
      },
      {
        url: "chrome-extension://ignored/script.js",
        text: "1234",
        ranges: [{ start: 0, end: 4 }],
      },
    ],
    css: [
      {
        url: "http://127.0.0.1/app.css",
        text: "12345678",
        ranges: [{ start: 1, end: 5 }],
      },
    ],
    includeUrl: (url) => url.startsWith("http://127.0.0.1"),
  });

  assert.deepEqual(summary.javascript.resources[0], {
    url: "http://127.0.0.1/app.js",
    sourceCharacters: 10,
    usedCharacters: 6,
    unusedCharacters: 4,
    utilization: 0.6,
    usedRangeCount: 2,
  });
  assert.equal(summary.css.utilization, 0.5);
  assert.equal(summary.javascript.measurableResourceCount, 1);
  assert.equal(summary.javascript.unavailableResourceCount, 0);
  assert.equal("text" in summary.javascript.resources[0], false);
});

test("keeps coverage entries without source text explicit", () => {
  const summary = summarizeResourceCoverage({
    css: [{ url: "http://127.0.0.1/missing.css", ranges: [] }],
  });
  assert.equal(summary.css.resourceCount, 1);
  assert.equal(summary.css.measurableResourceCount, 0);
  assert.equal(summary.css.unavailableResourceCount, 1);
  assert.equal(summary.css.utilization, null);
  assert.equal(summary.css.resources[0].available, false);
});

test("coverage controller is opt-in and stops both collectors", async () => {
  const calls = [];
  const page = {
    coverage: {
      startJSCoverage: async (options) => calls.push(["start-js", options]),
      startCSSCoverage: async (options) => calls.push(["start-css", options]),
      stopJSCoverage: async () => {
        calls.push(["stop-js"]);
        return [
          {
            url: "app.js",
            source: "1234",
            functions: [
              {
                ranges: [
                  { count: 1, startOffset: 0, endOffset: 2 },
                  { count: 0, startOffset: 2, endOffset: 4 },
                ],
              },
            ],
          },
        ];
      },
      stopCSSCoverage: async () => {
        calls.push(["stop-css"]);
        return [];
      },
    },
  };

  const disabled = await startPageResourceCoverage(page);
  assert.equal(disabled.status, "disabled");
  assert.deepEqual(calls, []);

  const controller = await startPageResourceCoverage(page, { enabled: true });
  const result = await controller.stop();
  assert.equal(result.javascript.usedCharacters, 2);
  assert.equal(result.javascript.utilization, 0.5);
  assert.deepEqual(calls, [
    [
      "start-js",
      { resetOnNavigation: false, reportAnonymousScripts: false },
    ],
    ["start-css", { resetOnNavigation: false }],
    ["stop-js"],
    ["stop-css"],
  ]);
  await assert.rejects(controller.stop(), /already been stopped/u);
});
