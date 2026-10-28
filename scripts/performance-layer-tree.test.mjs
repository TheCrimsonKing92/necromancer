import assert from "node:assert/strict";
import test from "node:test";
import { summarizeLayerTree } from "./performance-layer-tree.mjs";

test("summarizes visible content layers without claiming allocation size", () => {
  const reasons = new Map([
    ["root", ["root"]],
    ["sticky", ["stickyPosition"]],
  ]);
  const result = summarizeLayerTree(
    [
      {
        layerId: "root",
        width: 100,
        height: 50,
        paintCount: 2,
        drawsContent: true,
        invisible: false,
        scrollRects: [],
      },
      {
        layerId: "sticky",
        width: 20,
        height: 10,
        paintCount: 1,
        drawsContent: true,
        invisible: false,
        scrollRects: [{ type: "repaintsOnScroll" }],
        stickyPositionConstraint: {},
      },
      {
        layerId: "hidden",
        width: 1_000,
        height: 1_000,
        paintCount: 9,
        drawsContent: true,
        invisible: true,
      },
    ],
    reasons,
  );

  assert.equal(result.available, true);
  assert.equal(result.visibleLayerCount, 2);
  assert.equal(result.contentLayerCount, 2);
  assert.equal(result.stickyLayerCount, 1);
  assert.equal(result.mainThreadScrollRectCount, 1);
  assert.equal(result.cumulativePaintCount, 3);
  assert.equal(result.contentAreaCssPixels, 5_200);
  assert.equal(result.approximateRgbaBytesAtDeviceScale1, 20_800);
  assert.deepEqual(result.compositingReasons, {
    root: 1,
    stickyPosition: 1,
  });
});

test("reports an unavailable layer tree", () => {
  assert.equal(summarizeLayerTree([]).available, false);
});
