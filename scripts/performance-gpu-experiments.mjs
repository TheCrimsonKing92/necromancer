const installCssBeforeRender = (page, css) =>
  page.addInitScript((source) => {
    const install = () => {
      const style = document.createElement("style");
      style.dataset.performanceExperiment = "true";
      style.textContent = source;
      document.documentElement.append(style);
    };
    if (document.documentElement) install();
    else document.addEventListener("readystatechange", install, {
      once: true,
    });
  }, css);

const withCss = (prepare, css) => async (page, targetUrl) => {
  await installCssBeforeRender(page, css);
  await prepare(page, targetUrl);
};

const withViewport = (prepare, viewport) => async (page, targetUrl) => {
  await page.setViewportSize(viewport);
  await prepare(page, targetUrl);
};

const withDeviceScaleFactor =
  (prepare, { width, height, deviceScaleFactor }) =>
  async (page, targetUrl) => {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
    });
    await prepare(page, targetUrl);
  };

const markEnemiesDefeated = async (page) => {
  await page.evaluate(() => {
    for (const card of document.querySelectorAll(".enemy-card")) {
      card.classList.add("is-defeated");
    }
  });
};

const openStats = async (page) => {
  await page.locator("[data-stats-control]").click();
  await page.locator(".stats-surface").waitFor({ state: "visible" });
};

const closeStats = async (page) => {
  await page
    .locator('.stats-surface [data-action="close-stats"]')
    .click();
  await page.locator(".stats-surface").waitFor({ state: "detached" });
};

const measureStatsOpenMotion = async (page, cycles = 14) => {
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    await openStats(page);
    await page.waitForTimeout(220);
    await closeStats(page);
    await page.waitForTimeout(80);
  }
  return { cycles };
};

export const buildGpuExperimentPhases = ({
  prepareBattle,
  prepareStory,
  measureTargetPaintCadence,
}) => {
  const prepareInventory = async (page, targetUrl) => {
    await prepareStory(page, targetUrl);
    await page.locator('[data-action="open-inventory"]').click();
    await page.locator(".inventory-page").waitFor();
    await page.waitForTimeout(250);
  };
  const prepareInventoryWithoutArt = async (page, targetUrl) => {
    await page.route("**/assets/items/**", (route) => route.abort());
    await prepareInventory(page, targetUrl);
  };
  const prepareDefeatedCards = async (page, targetUrl) => {
    await prepareBattle(page, targetUrl);
    await markEnemiesDefeated(page);
  };
  const prepareStats = async (page, targetUrl) => {
    await prepareStory(page, targetUrl);
    await openStats(page);
    await page.waitForTimeout(250);
  };
  const prepareStatsMotion = async (page, targetUrl) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await prepareStats(page, targetUrl);
    await closeStats(page);
    await page.waitForTimeout(80);
  };

  return [
    {
      id: "stats-idle",
      prepare: prepareStats,
    },
    {
      id: "stats-open-motion",
      comparisonBaselineId: "stats-idle",
      prepare: prepareStatsMotion,
      run: (page) => measureStatsOpenMotion(page),
    },
    {
      id: "stats-no-shadow",
      comparisonBaselineId: "stats-idle",
      prepare: withCss(
        prepareStats,
        ".stats-surface { box-shadow: none !important; }",
      ),
    },
    {
      id: "stats-offscreen-containment",
      comparisonBaselineId: "stats-idle",
      prepare: withCss(
        prepareStats,
        `
          .stats-surface > .stats-section,
          .stats-surface > .advancement-panel {
            content-visibility: auto;
            contain-intrinsic-size: auto 20rem;
          }
        `,
      ),
    },
    {
      id: "inventory-idle",
      prepare: prepareInventory,
    },
    {
      id: "inventory-no-art",
      comparisonBaselineId: "inventory-idle",
      prepare: prepareInventoryWithoutArt,
    },
    {
      id: "inventory-offscreen-containment",
      comparisonBaselineId: "inventory-idle",
      prepare: withCss(
        prepareInventory,
        `
          .inventory-section--anatomy,
          .inventory-section--shop,
          .pack-item {
            content-visibility: auto;
            contain-intrinsic-size: auto 48rem;
          }
        `,
      ),
    },
    {
      id: "battle-static-dossier",
      comparisonBaselineId: "battle-idle",
      prepare: withCss(
        prepareBattle,
        ".dossier { position: static !important; }",
      ),
    },
    {
      id: "battle-attribution-idle",
      prepare: prepareBattle,
    },
    {
      id: "battle-attribution-static-dossier",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withCss(
        prepareBattle,
        ".dossier { position: static !important; }",
      ),
    },
    {
      id: "battle-attribution-no-viewport-texture",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withCss(
        prepareBattle,
        "body::before { content: none !important; background-image: none !important; }",
      ),
    },
    {
      id: "battle-attribution-flat-major-gradients",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withCss(
        prepareBattle,
        `
          body { background: #090a09 !important; }
          .dossier { background: #141613 !important; }
        `,
      ),
    },
    {
      id: "battle-attribution-flat-body",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withCss(
        prepareBattle,
        "body { background: #090a09 !important; }",
      ),
    },
    {
      id: "battle-attribution-flat-dossier",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withCss(
        prepareBattle,
        ".dossier { background: #141613 !important; }",
      ),
    },
    {
      id: "battle-attribution-bounded-atmosphere",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withCss(
        prepareBattle,
        `
          body { position: relative; background: #090a09 !important; }
          body::after {
            position: fixed;
            z-index: -2;
            top: 0;
            left: 0;
            width: 100%;
            height: min(34rem, 65vh);
            content: "";
            pointer-events: none;
            background:
              radial-gradient(circle at 12% 0, rgba(115, 61, 54, 0.16), transparent 34rem),
              radial-gradient(circle at 90% 10%, rgba(84, 100, 76, 0.1), transparent 30rem);
          }
        `,
      ),
    },
    {
      id: "battle-attribution-viewport-1024x711",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withViewport(prepareBattle, { width: 1024, height: 711 }),
    },
    {
      id: "battle-attribution-viewport-1920x1333",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withViewport(prepareBattle, { width: 1920, height: 1333 }),
    },
    {
      id: "battle-attribution-dpr-2",
      comparisonBaselineId: "battle-attribution-idle",
      prepare: withDeviceScaleFactor(prepareBattle, {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 2,
      }),
    },
    {
      id: "targeting-no-enemy-containment",
      comparisonBaselineId: "targeting",
      prepare: withCss(
        prepareBattle,
        ".enemy-grid { contain: none !important; }",
      ),
      run: (page) => measureTargetPaintCadence(page, 420),
    },
    {
      id: "targeting-no-action-containment",
      comparisonBaselineId: "targeting",
      prepare: withCss(
        prepareBattle,
        ".action-grid { contain: none !important; }",
      ),
      run: (page) => measureTargetPaintCadence(page, 420),
    },
    {
      id: "defeated-filter",
      prepare: prepareDefeatedCards,
    },
    {
      id: "defeated-no-filter",
      comparisonBaselineId: "defeated-filter",
      prepare: withCss(
        prepareDefeatedCards,
        ".enemy-card.is-defeated { filter: none !important; }",
      ),
    },
  ];
};

export const selectGpuExperimentPhases = (phases, filter) => {
  if (!filter) return phases;
  const byId = new Map(phases.map((phase) => [phase.id, phase]));
  const selectedIds = new Set(
    phases.filter(({ id }) => id.startsWith(filter)).map(({ id }) => id),
  );
  const pending = [...selectedIds];
  while (pending.length > 0) {
    const phase = byId.get(pending.pop());
    const baselineId = phase?.comparisonBaselineId;
    if (baselineId && !selectedIds.has(baselineId) && byId.has(baselineId)) {
      selectedIds.add(baselineId);
      pending.push(baselineId);
    }
  }
  return phases.filter(({ id }) => selectedIds.has(id));
};
