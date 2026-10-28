const EXPERIMENT_ORIGIN = "https://item-art-experiment.invalid";

const contentTypeFor = (pathname) =>
  pathname.endsWith(".webp") ? "image/webp" : "image/png";

const escaped = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const experimentMarkup = (definitions, mode) => `<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; }
  .item { min-height: 1400px; padding: 16px; }
  .art { display: block; width: 256px; height: 256px; }
</style>
${definitions
  .map((definition) => {
    const label = escaped(definition.id);
    if (mode === "sprites") {
      const x =
        definition.columns === 1
          ? 0
          : (definition.column / (definition.columns - 1)) * 100;
      const y =
        definition.rows === 1
          ? 0
          : (definition.row / (definition.rows - 1)) * 100;
      return `<article class="item" data-item="${label}"><span class="art" aria-label="${label}" style="background-image:url('${EXPERIMENT_ORIGIN}/sprites/${escaped(definition.file)}');background-position:${x}% ${y}%;background-repeat:no-repeat;background-size:${definition.columns * 100}% ${definition.rows * 100}%"></span></article>`;
    }
    return `<article class="item" data-item="${label}"><img class="art" alt="${label}" loading="lazy" decoding="async" src="${EXPERIMENT_ORIGIN}/candidates/${label}.webp" width="256" height="256"></article>`;
  })
  .join("\n")}`;

const waitForRequestSettle = async (page) => {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    const loadedImages = [...document.images].filter((image) => image.complete);
    await Promise.all(
      loadedImages.map((image) => image.decode().catch(() => undefined)),
    );
  });
};

const captureScenario = async ({
  browser,
  definitions,
  resources,
  mode,
  scrollAll,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const requests = [];
  await page.route(`${EXPERIMENT_ORIGIN}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = resources.get(pathname);
    if (!body) {
      await route.fulfill({ status: 404, body: "missing experiment asset" });
      return;
    }
    requests.push({ pathname, encodedBytes: body.byteLength });
    await route.fulfill({
      status: 200,
      contentType: contentTypeFor(pathname),
      body,
      headers: { "cache-control": "no-store" },
    });
  });
  try {
    await page.setContent(experimentMarkup(definitions, mode));
    await waitForRequestSettle(page);
    const initialRequests = [...requests];
    if (scrollAll) {
      const cards = page.locator(".item");
      for (let index = 0; index < (await cards.count()); index += 1) {
        const card = cards.nth(index);
        await card.scrollIntoViewIfNeeded();
        await card.locator("img").evaluate(async (image) => {
          if (!image.complete) {
            await new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            });
          }
          await image.decode().catch(() => undefined);
        });
      }
    }
    return {
      initial: summarizeItemArtRequests({ definitions, mode, requests: initialRequests }),
      afterFullScroll: summarizeItemArtRequests({ definitions, mode, requests }),
    };
  } finally {
    await context.close();
  }
};

export const summarizeItemArtRequests = ({ definitions, mode, requests }) => {
  const unique = new Map(
    requests.map((request) => [request.pathname, request.encodedBytes]),
  );
  const decodedBytes =
    mode === "sprites"
      ? [...unique.keys()].reduce((total, pathname) => {
          const file = pathname.split("/").at(-1);
          const definition = definitions.find((entry) => entry.file === file);
          return (
            total +
            (definition
              ? definition.columns * definition.rows * 256 * 256 * 4
              : 0)
          );
        }, 0)
      : unique.size * 256 * 256 * 4;
  return {
    requestCount: requests.length,
    uniqueRequestCount: unique.size,
    encodedBytes: [...unique.values()].reduce((total, bytes) => total + bytes, 0),
    theoreticalDecodedBytes: decodedBytes,
    requestedPaths: [...unique.keys()].sort(),
  };
};

export const runItemArtLoadingExperiment = async ({
  browser,
  definitions,
  spriteBuffers,
  webpBuffers,
}) => {
  const resources = new Map();
  for (const [file, body] of spriteBuffers) {
    resources.set(`/sprites/${file}`, body);
  }
  for (const [itemId, body] of webpBuffers) {
    resources.set(`/candidates/${itemId}.webp`, body);
  }

  return {
    status: "available",
    currentCssSprites: await captureScenario({
      browser,
      definitions,
      resources,
      mode: "sprites",
      scrollAll: false,
    }),
    lazyCandidateImages: await captureScenario({
      browser,
      definitions,
      resources,
      mode: "lazy-images",
      scrollAll: true,
    }),
    memoryCounters: {
      status: "unsupported",
      reason:
        "Playwright cannot attribute native decoded-image or GPU texture residency per resource; theoretical RGBA residency is reported instead.",
    },
  };
};
