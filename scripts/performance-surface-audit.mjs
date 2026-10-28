export const auditPageSurfaces = (page) =>
  page.evaluate(async () => {
    const viewportArea = window.innerWidth * window.innerHeight;
    const deviceScale = window.devicePixelRatio || 1;
    const rasterReferences = [];
    const extractRasterUrls = (backgroundImage) =>
      [...backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/gu)].map(
        ([, source]) => new URL(source, window.location.href).href,
      );
    const records = [...document.querySelectorAll("*")].map(
      (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const area =
          Math.max(0, rect.width) * Math.max(0, rect.height);
        for (const source of extractRasterUrls(style.backgroundImage)) {
          rasterReferences.push({
            source,
            area,
            width: rect.width,
            height: rect.height,
            visible:
              rect.bottom > 0 &&
              rect.right > 0 &&
              rect.top < window.innerHeight &&
              rect.left < window.innerWidth,
          });
        }
        if (element instanceof HTMLImageElement) {
          const source = element.currentSrc || element.src;
          if (source) {
            rasterReferences.push({
              source: new URL(source, window.location.href).href,
              area,
              width: rect.width,
              height: rect.height,
              visible:
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < window.innerHeight &&
                rect.left < window.innerWidth,
            });
          }
        }
        return {
          element: `${element.tagName.toLowerCase()}${
            element.id ? `#${element.id}` : ""
          }${
            element.classList.length > 0
              ? `.${[...element.classList].join(".")}`
              : ""
          }`,
          area,
          width: rect.width,
          height: rect.height,
          position: style.position,
          backgroundImage: style.backgroundImage,
          filter: style.filter,
          boxShadow: style.boxShadow,
          contain: style.contain,
          transitionDuration: style.transitionDuration,
        };
      },
    );
    const summarize = (matching) => {
      const matches = records.filter(matching);
      return {
        count: matches.length,
        cssPixelArea: Math.round(
          matches.reduce(
            (total, record) => total + record.area,
            0,
          ),
        ),
      };
    };
    const rasterAssets = await Promise.all(
      [...new Set(rasterReferences.map(({ source }) => source))].map(
        async (source) => {
          const references = rasterReferences.filter(
            (reference) => reference.source === source,
          );
          const dimensions = await new Promise((done) => {
            const image = new Image();
            image.addEventListener(
              "load",
              () =>
                done({
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                }),
              { once: true },
            );
            image.addEventListener(
              "error",
              () => done({ width: 0, height: 0 }),
              { once: true },
            );
            image.src = source;
          });
          const timing = performance
            .getEntriesByName(source)
            .find((entry) => entry instanceof PerformanceResourceTiming);
          return {
            source,
            intrinsicWidth: dimensions.width,
            intrinsicHeight: dimensions.height,
            theoreticalIntrinsicRgbaBytes:
              dimensions.width * dimensions.height * 4,
            encodedBodyBytes:
              timing instanceof PerformanceResourceTiming
                ? timing.decodedBodySize
                : null,
            referenceCount: references.length,
            visibleReferenceCount: references.filter(
              ({ visible }) => visible,
            ).length,
            displayedCssPixelArea: Math.round(
              references.reduce(
                (total, reference) => total + reference.area,
                0,
              ),
            ),
            largestDisplayedWidth: Math.round(
              Math.max(0, ...references.map(({ width }) => width)),
            ),
            largestDisplayedHeight: Math.round(
              Math.max(0, ...references.map(({ height }) => height)),
            ),
          };
        },
      ),
    );

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        deviceScale,
        cssPixelArea: viewportArea,
        rgbaBytesAtDeviceScale: Math.round(
          viewportArea * deviceScale ** 2 * 4,
        ),
      },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        theoreticalFullRasterRgbaBytes: Math.round(
          document.documentElement.scrollWidth *
            document.documentElement.scrollHeight *
            deviceScale ** 2 *
            4,
        ),
      },
      elementCount: records.length,
      fixed: summarize(
        ({ position }) => position === "fixed",
      ),
      sticky: summarize(
        ({ position }) => position === "sticky",
      ),
      gradients: summarize(({ backgroundImage }) =>
        backgroundImage.includes("gradient("),
      ),
      filters: summarize(
        ({ filter }) => filter !== "none",
      ),
      shadows: summarize(
        ({ boxShadow }) => boxShadow !== "none",
      ),
      paintContainment: summarize(({ contain }) =>
        contain.split(" ").includes("paint"),
      ),
      transitions: summarize(
        ({ transitionDuration }) =>
          transitionDuration
            .split(",")
            .some((duration) => {
              const value = duration.trim();
              const milliseconds = value.endsWith("ms")
                ? Number.parseFloat(value)
                : Number.parseFloat(value) * 1000;
              return Number.isFinite(milliseconds) && milliseconds > 1;
            }),
      ),
      rasterAssets: {
        uniqueCount: rasterAssets.length,
        theoreticalIntrinsicRgbaBytes: rasterAssets.reduce(
          (total, asset) =>
            total + asset.theoreticalIntrinsicRgbaBytes,
          0,
        ),
        assets: rasterAssets,
        interpretation:
          "Intrinsic RGBA bytes are a source-pixel upper-bound, not a measured allocation. Chromium may downsample, tile, cache, share, or evict decoded resources.",
      },
      largestSurfaces: records
        .filter(({ area }) => area > 0)
        .sort((left, right) => right.area - left.area)
        .slice(0, 12)
        .map(
          ({
            element,
            area,
            width,
            height,
            position,
            backgroundImage,
            filter,
            boxShadow,
            contain,
          }) => ({
            element,
            cssPixelArea: Math.round(area),
            width: Math.round(width),
            height: Math.round(height),
            position,
            hasGradient: backgroundImage.includes("gradient("),
            hasFilter: filter !== "none",
            hasShadow: boxShadow !== "none",
            contain,
          }),
        ),
      interpretation:
        "Document and element areas are geometry diagnostics, not texture allocation totals; Chromium normally tiles and clips content instead of rasterizing every CSS pixel at once.",
    };
  });
