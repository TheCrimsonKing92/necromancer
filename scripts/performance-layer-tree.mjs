const rounded = (value, digits = 2) =>
  Number(value.toFixed(digits));

export const summarizeLayerTree = (
  layers,
  compositingReasons = new Map(),
) => {
  if (!Array.isArray(layers) || layers.length === 0) {
    return {
      available: false,
      reason: "Chromium did not expose a compositing layer tree.",
    };
  }

  const visibleLayers = layers.filter((layer) => !layer.invisible);
  const contentLayers = visibleLayers.filter(
    (layer) => layer.drawsContent,
  );
  const reasonCounts = {};

  for (const layer of visibleLayers) {
    for (const reason of compositingReasons.get(layer.layerId) ?? []) {
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    }
  }

  const contentAreaCssPixels = contentLayers.reduce(
    (total, layer) =>
      total +
      Math.max(0, Number(layer.width) || 0) *
        Math.max(0, Number(layer.height) || 0),
    0,
  );

  return {
    available: true,
    layerCount: layers.length,
    visibleLayerCount: visibleLayers.length,
    contentLayerCount: contentLayers.length,
    stickyLayerCount: visibleLayers.filter(
      (layer) => layer.stickyPositionConstraint,
    ).length,
    mainThreadScrollRectCount: visibleLayers.reduce(
      (total, layer) => total + (layer.scrollRects?.length ?? 0),
      0,
    ),
    cumulativePaintCount: visibleLayers.reduce(
      (total, layer) => total + (Number(layer.paintCount) || 0),
      0,
    ),
    contentAreaCssPixels: rounded(contentAreaCssPixels, 0),
    approximateRgbaBytesAtDeviceScale1: rounded(
      contentAreaCssPixels * 4,
      0,
    ),
    compositingReasons: reasonCounts,
    interpretation:
      "Area is a CSS-pixel upper-bound proxy, not allocated GPU memory; Chromium tiles, clips, caches, and scales layer content independently.",
  };
};

export const createLayerTreeObserver = async (session) => {
  let layers = null;
  let available = true;
  let reason = null;
  const onChange = (event) => {
    if (Array.isArray(event.layers)) layers = event.layers;
  };

  session.on("LayerTree.layerTreeDidChange", onChange);
  try {
    await session.send("DOM.enable");
    await session.send("Page.enable");
    await session.send("LayerTree.enable");
  } catch (error) {
    available = false;
    reason =
      error instanceof Error
        ? error.message
        : "LayerTree.enable failed.";
  }

  return {
    snapshot: async () => {
      if (!available) {
        return { available: false, reason };
      }
      if (!layers) {
        return summarizeLayerTree(null);
      }

      const reasons = new Map();
      await Promise.all(
        layers.map(async ({ layerId }) => {
          try {
            const result = await session.send(
              "LayerTree.compositingReasons",
              { layerId },
            );
            reasons.set(layerId, result.compositingReasonIds ?? []);
          } catch {
            reasons.set(layerId, []);
          }
        }),
      );
      return summarizeLayerTree(layers, reasons);
    },
    stop: async () => {
      session.off("LayerTree.layerTreeDidChange", onChange);
      if (available) {
        await session.send("LayerTree.disable").catch(() => {});
        await session.send("Page.disable").catch(() => {});
        await session.send("DOM.disable").catch(() => {});
      }
    },
  };
};
