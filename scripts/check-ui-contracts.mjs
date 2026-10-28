import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { preview } from "vite";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "output", "ui-contracts");
let server;
let browser;

const afterPaint = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

const OPTIONAL_SURFACE_RESOURCES = Object.freeze({
  stats: Object.freeze({
    renderer: /^stats-render(?:-[^.]+)?\.js$/,
    stylesheet: /^stats-surface(?:-[^.]+)?\.css$/,
  }),
  inventory: Object.freeze({
    renderer: /^inventory-render(?:-[^.]+)?\.js$/,
    stylesheet: /^inventory-surface(?:-[^.]+)?\.css$/,
  }),
  journal: Object.freeze({
    renderer: /^journal-render(?:-[^.]+)?\.js$/,
    stylesheet: /^journal-surface(?:-[^.]+)?\.css$/,
  }),
});
const BONEBINDER_PACK_RESOURCE =
  /^bonebinder-pack(?:-[^.]+)?\.js$/;
const PLAYABLE_RUNTIME_RESOURCE =
  /^(?:playable-runtime|app|engine|combat-state|journal|items|encounters)(?:-[^.]+)?\.js$/;

const resourceBasename = (resourceUrl) => {
  const pathname = new URL(resourceUrl).pathname;
  return decodeURIComponent(pathname.slice(pathname.lastIndexOf("/") + 1));
};

const optionalSurfaceForResource = (resourceName) =>
  Object.entries(OPTIONAL_SURFACE_RESOURCES).find(
    ([, expected]) =>
      expected.renderer.test(resourceName) ||
      expected.stylesheet.test(resourceName),
  )?.[0];

const readOptionalSurfaceResources = async (page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map(({ name }) => name)
      .filter((name) => /\.(?:css|js)(?:$|\?)/.test(name)),
  );

const describeResources = (resources) =>
  resources.length > 0
    ? resources.map(resourceBasename).sort().join(", ")
    : "(none)";

const bonebinderPackResources = async (page) =>
  (await readOptionalSurfaceResources(page)).filter((url) =>
    BONEBINDER_PACK_RESOURCE.test(resourceBasename(url)),
  );

const assertBonebinderPackPresence = async (
  page,
  expected,
  label,
) => {
  const resources = await bonebinderPackResources(page);
  assert.equal(
    resources.length > 0,
    expected,
    `${label}: expected Bonebinder executable pack to be ${expected ? "loaded" : "absent"}; found ${describeResources(resources)}.`,
  );
};

const assertColdOptionalSurfaceResources = async ({
  page,
  surface,
  open,
  ready,
}) => {
  const before = await readOptionalSurfaceResources(page);
  const optionalBefore = before.filter((url) =>
    optionalSurfaceForResource(resourceBasename(url)),
  );
  assert.deepEqual(
    optionalBefore,
    [],
    `Cold ${surface} setup loaded optional assets before the surface opened: ${describeResources(optionalBefore)}`,
  );

  await open();
  await ready();
  await page.waitForLoadState("networkidle");
  await afterPaint(page);

  const after = await readOptionalSurfaceResources(page);
  const newlyLoaded = after.filter((url) => !before.includes(url));
  const optionalLoaded = newlyLoaded.filter((url) =>
    optionalSurfaceForResource(resourceBasename(url)),
  );
  const ownedNames = optionalLoaded
    .filter(
      (url) => optionalSurfaceForResource(resourceBasename(url)) === surface,
    )
    .map(resourceBasename);
  const siblingNames = optionalLoaded
    .filter(
      (url) => optionalSurfaceForResource(resourceBasename(url)) !== surface,
    )
    .map(resourceBasename);
  const expected = OPTIONAL_SURFACE_RESOURCES[surface];

  assert.ok(
    ownedNames.some((name) => expected.renderer.test(name)),
    `Cold ${surface} did not fetch its renderer. New resources: ${describeResources(newlyLoaded)}`,
  );
  assert.ok(
    ownedNames.some((name) => expected.stylesheet.test(name)),
    `Cold ${surface} did not fetch its stylesheet. New resources: ${describeResources(newlyLoaded)}`,
  );
  assert.deepEqual(
    siblingNames,
    [],
    `Cold ${surface} fetched sibling optional assets: ${siblingNames.sort().join(", ")}. New resources: ${describeResources(newlyLoaded)}`,
  );
};

const createColdCharacterPage = async (browser, targetUrl, surface) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.locator('[data-action="start-new"]').click();
  await page.locator("#character-name").fill(`${surface} Delivery Contract`);
  await page.locator('input[name="sex"][value="other"]').check();
  await page.locator('input[name="tradition"][value="medium"]').check();
  await page.locator('#character-form button[type="submit"]').click();
  await page.locator(".game-layout").waitFor();
  await afterPaint(page);
  return { context, page };
};

const enterFirstBattle = async (
  page,
  targetUrl,
  tradition = "medium",
  beforeCharacterCreation,
) => {
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await beforeCharacterCreation?.(page);
  await page.locator('[data-action="start-new"]').click();
  await page.locator("#character-name").fill("Contract");
  await page.locator('input[name="sex"][value="other"]').check();
  await page.locator(`input[name="tradition"][value="${tradition}"]`).check();
  await page.locator('#character-form button[type="submit"]').click();
  await page.locator(".game-layout, .battle-page").first().waitFor();
  await afterPaint(page);

  for (let step = 0; step < 16; step += 1) {
    if (await page.locator(".battle-page").count()) return;
    const dismiss = page.locator(
      '[data-action="dismiss-result"]:not([disabled])',
    );
    if (await dismiss.count()) {
      await dismiss.first().click();
      await afterPaint(page);
      continue;
    }
    const choice = page.locator(
      '[data-action="choose-story"]:not([disabled])',
    );
    if (!(await choice.count())) break;
    await choice.first().click();
    await afterPaint(page);
  }

  assert.fail("The cold-load contract path did not reach its first battle.");
};

try {
  await mkdir(output, { recursive: true });
  server = await preview({
    root,
    preview: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      open: false,
    },
  });
  const targetUrl =
    server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
  assert.ok(targetUrl, "Vite did not expose a preview URL.");

  browser = await chromium.launch({ headless: true });

  const titlePage = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await titlePage.goto(targetUrl, { waitUntil: "networkidle" });
  assert.equal(
    await titlePage.locator('[data-runtime="bootstrap"]').count(),
    1,
    "The cold title must be owned by the lean bootstrap.",
  );
  const titleResources = await titlePage.evaluate(() =>
    performance.getEntriesByType("resource").map(({ name }) => name),
  );
  assert.equal(
    titleResources.some((name) =>
      /(?:ominous3-calm|atmosphere-dark)-loop\.ogg(?:$|\?)/u.test(name),
    ),
    false,
    "The cold title must not fetch background music before explicit opt-in.",
  );
  const eagerPlayableRuntime = titleResources
    .map(resourceBasename)
    .filter((name) => PLAYABLE_RUNTIME_RESOURCE.test(name));
  assert.deepEqual(
    eagerPlayableRuntime,
    [],
    `The cold title admitted playable-runtime assets: ${eagerPlayableRuntime.join(", ")}`,
  );
  const musicControl = titlePage.locator("[data-music-control]");
  assert.equal(await musicControl.getAttribute("aria-pressed"), "false");
  await musicControl.click();
  assert.equal(await musicControl.getAttribute("aria-pressed"), "true");
  const musicState = await titlePage.evaluate(() => {
    const audio = document.querySelector("audio");
    return audio instanceof HTMLAudioElement
      ? { src: audio.currentSrc || audio.src, loop: audio.loop, volume: audio.volume }
      : null;
  });
  assert.ok(
    musicState && /ominous3-calm-loop-[^.]+\.ogg$/u.test(musicState.src),
    `Music opt-in must create the owned cue, found: ${JSON.stringify(musicState)}`,
  );
  assert.equal(musicState.loop, false);
  assert.equal(musicState.volume, 0.22);
  await titlePage.evaluate(() => {
    document.querySelector("audio")?.dispatchEvent(new Event("ended"));
  });
  await titlePage.waitForFunction(() =>
    /atmosphere-dark-loop-[^.]+\.ogg$/u.test(
      document.querySelector("audio")?.src ?? "",
    ),
  );
  await titlePage.evaluate(() => {
    document.querySelector("audio")?.dispatchEvent(new Event("error"));
  });
  await titlePage.waitForFunction(() =>
    /ominous3-calm-loop-[^.]+\.ogg$/u.test(
      document.querySelector("audio")?.src ?? "",
    ),
  );
  assert.equal(
    await titlePage.locator("audio").count(),
    1,
    "Cue completion and recovery must reuse one media element.",
  );
  assert.equal(
    await titlePage.evaluate(() => localStorage.getItem("necro:music:v1")),
    "on",
    "Music opt-in must persist independently from campaign state.",
  );
  await musicControl.click();
  assert.equal(await musicControl.getAttribute("aria-pressed"), "false");
  assert.equal(
    await titlePage.evaluate(() => localStorage.getItem("necro:music:v1")),
    "off",
  );

  const portraitTitlePage = await browser.newPage({
    viewport: { width: 320, height: 720 },
    reducedMotion: "reduce",
  });
  await portraitTitlePage.goto(targetUrl, { waitUntil: "networkidle" });
  const portraitTitleLayout = await portraitTitlePage.evaluate(() => {
    const hero = document.querySelector(".home__hero");
    const title = document.querySelector(".home h1");
    if (!(hero instanceof HTMLElement) || !(title instanceof HTMLElement)) {
      return null;
    }
    const heroBounds = hero.getBoundingClientRect();
    const titleBounds = title.getBoundingClientRect();
    const heroStyle = getComputedStyle(hero);
    return {
      contentLeft: heroBounds.left + Number.parseFloat(heroStyle.paddingLeft),
      contentRight: heroBounds.right - Number.parseFloat(heroStyle.paddingRight),
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      titleLeft: titleBounds.left,
      titleRight: titleBounds.right,
    };
  });
  assert.ok(portraitTitleLayout, "The portrait title contract requires the home hero.");
  assert.ok(
    portraitTitleLayout.titleLeft >= portraitTitleLayout.contentLeft - 0.5 &&
      portraitTitleLayout.titleRight <= portraitTitleLayout.contentRight + 0.5,
    `The title must remain inside the portrait hero content box: ${JSON.stringify(portraitTitleLayout)}`,
  );
  assert.ok(
    portraitTitleLayout.scrollWidth <= portraitTitleLayout.viewportWidth,
    `The portrait title must not create horizontal overflow: ${JSON.stringify(portraitTitleLayout)}`,
  );
  await portraitTitlePage.close();

  await titlePage.locator('[data-action="start-new"]').click();
  await titlePage.locator("#character-name").waitFor();
  const admittedResources = await titlePage.evaluate(() =>
    performance.getEntriesByType("resource").map(({ name }) => name),
  );
  assert.ok(
    admittedResources
      .map(resourceBasename)
      .some((name) => /^playable-runtime(?:-[^.]+)?\.js$/u.test(name)),
    "Starting a testament must admit the playable application runtime.",
  );
  await titlePage.locator("#character-name").fill("Chronicle Contract");
  await titlePage.locator('input[name="sex"][value="other"]').check();
  await titlePage.locator('input[name="tradition"][value="medium"]').check();
  await titlePage.locator('#character-form button[type="submit"]').click();
  await titlePage.locator(".game-layout").waitFor();
  const chronicleSavedRaw = await titlePage.evaluate(() =>
    localStorage.getItem("necromancer:save:v4"),
  );
  assert.ok(chronicleSavedRaw, "Character creation must produce a campaign save.");
  await titlePage.close();

  const chronicleContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await chronicleContext.addInitScript((saved) => {
    localStorage.setItem("necromancer:save:v4", saved);
  }, chronicleSavedRaw);
  const chroniclePage = await chronicleContext.newPage();
  await chroniclePage.goto(targetUrl, { waitUntil: "networkidle" });
  const chronicleResourcesBefore = await readOptionalSurfaceResources(
    chroniclePage,
  );
  assert.equal(
    chronicleResourcesBefore.some((url) =>
      /^chronicle-surface(?:-[^.]+)?\.(?:css|js)$/u.test(
        resourceBasename(url),
      ),
    ),
    false,
    "The cold title must not fetch Chronicle assets before the player opens it.",
  );
  await chroniclePage.locator('[data-action="open-chronicle"]').click();
  await chroniclePage.locator(".chronicle-page").waitFor();
  await chroniclePage.waitForLoadState("networkidle");
  await afterPaint(chroniclePage);
  const chronicleResourcesAfter = await readOptionalSurfaceResources(
    chroniclePage,
  );
  const chronicleResourceNames = chronicleResourcesAfter
    .filter((url) => !chronicleResourcesBefore.includes(url))
    .map(resourceBasename);
  assert.ok(
    chronicleResourceNames.some((name) =>
      /^chronicle-surface(?:-[^.]+)?\.js$/u.test(name),
    ),
    `Opening Chronicle did not fetch its renderer: ${chronicleResourceNames.join(", ")}`,
  );
  assert.ok(
    chronicleResourceNames.some((name) =>
      /^chronicle-surface(?:-[^.]+)?\.css$/u.test(name),
    ),
    `Opening Chronicle did not fetch its stylesheet: ${chronicleResourceNames.join(", ")}`,
  );
  assert.deepEqual(
    chronicleResourcesAfter
      .map(resourceBasename)
      .filter((name) => PLAYABLE_RUNTIME_RESOURCE.test(name)),
    [],
    "Opening the read-only Chronicle must not admit the playable runtime.",
  );
  assert.equal(
    await chroniclePage.locator(".journal-page").count(),
    0,
    "The Chronicle must not render the active character's Journal.",
  );
  await chroniclePage.locator('[data-action="close-chronicle"]').focus();
  await chroniclePage.locator('[data-action="close-chronicle"]').press("Enter");
  await chroniclePage.locator(".home").waitFor();
  assert.equal(
    await chroniclePage.locator("[data-page-title]").evaluate(
      (heading) => heading === document.activeElement,
    ),
    true,
    "Closing Chronicle must restore page focus to the title.",
  );
  const chronicleCdp = await chronicleContext.newCDPSession(chroniclePage);
  await chroniclePage.locator('[data-action="open-chronicle"]').click();
  await chroniclePage.locator(".chronicle-page").waitFor();
  await chroniclePage.locator('[data-action="close-chronicle"]').click();
  await chroniclePage.locator(".home").waitFor();
  await afterPaint(chroniclePage);
  await chronicleCdp.send("HeapProfiler.collectGarbage");
  const chronicleDomBaseline = await chronicleCdp.send(
    "Memory.getDOMCounters",
  );
  for (let cycle = 0; cycle < 12; cycle += 1) {
    await chroniclePage.locator('[data-action="open-chronicle"]').click();
    await chroniclePage.locator(".chronicle-page").waitFor();
    await chroniclePage.locator('[data-action="close-chronicle"]').click();
    await chroniclePage.locator(".home").waitFor();
  }
  await afterPaint(chroniclePage);
  await chronicleCdp.send("HeapProfiler.collectGarbage");
  const chronicleDomAfter = await chronicleCdp.send("Memory.getDOMCounters");
  assert.deepEqual(
    {
      documents: chronicleDomAfter.documents,
      nodes: chronicleDomAfter.nodes,
    },
    {
      documents: chronicleDomBaseline.documents,
      nodes: chronicleDomBaseline.nodes,
    },
    "Repeated Chronicle open/close cycles must release their documents and nodes.",
  );
  await chronicleContext.close();

  for (const surface of Object.keys(OPTIONAL_SURFACE_RESOURCES)) {
    const { context, page: coldSurfacePage } = await createColdCharacterPage(
      browser,
      targetUrl,
      surface,
    );
    const contracts = {
      stats: {
        open: () => coldSurfacePage.locator("[data-stats-control]").click(),
        ready: () =>
          coldSurfacePage.locator("[data-stats-surface]").waitFor(),
      },
      inventory: {
        open: () =>
          coldSurfacePage.locator('[data-action="open-inventory"]').click(),
        ready: () => coldSurfacePage.locator(".inventory-page").waitFor(),
      },
      journal: {
        open: () =>
          coldSurfacePage.locator('[data-action="open-journal"]').click(),
        ready: () => coldSurfacePage.locator(".journal-page").waitFor(),
      },
    };
    await assertColdOptionalSurfaceResources({
      page: coldSurfacePage,
      surface,
      ...contracts[surface],
    });
    await context.close();
  }

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await enterFirstBattle(page, targetUrl);
  await assertBonebinderPackPresence(
    page,
    false,
    "Cold Medium battle path",
  );

  const rendererPage = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await enterFirstBattle(rendererPage, targetUrl, "thaumaturgist");
  await assertBonebinderPackPresence(
    rendererPage,
    false,
    "Cold Renderer battle path",
  );
  await rendererPage.close();

  const optionalStylesLoaded = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .some((entry) => entry.name.includes("optional-surfaces")),
  );
  assert.equal(
    optionalStylesLoaded,
    false,
    "The cold battle path unexpectedly loaded optional surface styles.",
  );

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await afterPaint(page);
  const hotMotionContract = await page.evaluate(() => {
    const enemy = document.querySelector(".enemy-card");
    const meter = document.querySelector(".meter__fill");
    if (!enemy || !meter) return null;
    const enemyStyle = getComputedStyle(enemy);
    const enemyOverlay = getComputedStyle(enemy, "::after");
    const meterStyle = getComputedStyle(meter);
    return {
      enemyTransitionDuration: enemyStyle.transitionDuration,
      enemyOverlayTransitionDuration: enemyOverlay.transitionDuration,
      meterTransitionProperty: meterStyle.transitionProperty,
      meterWidth: meterStyle.width,
      meterTransform: meterStyle.transform,
    };
  });
  assert.ok(hotMotionContract, "The battle must expose target and meter motion.");
  assert.equal(
    hotMotionContract.enemyTransitionDuration,
    "0s",
    "Target cards must not animate paint-heavy properties on the card itself.",
  );
  assert.equal(
    hotMotionContract.enemyOverlayTransitionDuration,
    "0s",
    "High-frequency target commitment must update immediately rather than accumulate animations.",
  );
  assert.equal(
    hotMotionContract.meterTransitionProperty,
    "transform",
    "Resource meters must animate transform rather than layout width.",
  );
  assert.notEqual(
    hotMotionContract.meterTransform,
    "none",
    "Resource meters must express their fill through a transform.",
  );

  const links = page.locator(".compact-knowledge-link");
  assert.equal(
    await links.count(),
    12,
    "The dossier should expose six attributes and six mundane skills.",
  );
  const first = links.first();
  const styles = await first.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor,
      borderTopWidth: computed.borderTopWidth,
      display: computed.display,
      gridTemplateColumns: computed.gridTemplateColumns,
    };
  });
  assert.equal(styles.display, "grid");
  assert.notEqual(styles.gridTemplateColumns, "none");
  assert.equal(styles.backgroundColor, "rgba(0, 0, 0, 0)");
  assert.equal(styles.borderTopWidth, "0px");
  const geometryFailures = await links.evaluateAll((elements) =>
    elements.flatMap((element, index) => {
      const children = [...element.children].map((child) =>
        child.getBoundingClientRect(),
      );
      const overlaps = children.some((first, firstIndex) =>
        children.some(
          (second, secondIndex) =>
            secondIndex > firstIndex &&
            first.left < second.right &&
            first.right > second.left &&
            first.top < second.bottom &&
            first.bottom > second.top,
        ),
      );
      return element.scrollWidth > element.clientWidth + 1 || overlaps
        ? [index]
        : [];
    }),
  );
  assert.deepEqual(
    geometryFailures,
    [],
    "Compact dossier labels, values, and help marks must not overlap or overflow.",
  );

  const description = await first.getAttribute("data-description");
  const accessibleName = await first.getAttribute("aria-label");
  assert.ok(description, "A compact stat must carry explanatory text.");
  assert.ok(
    accessibleName?.includes(description),
    "The explanation must be available to assistive technology.",
  );

  await first.hover();
  await page.waitForFunction(() => {
    const element = document.querySelector(".compact-knowledge-link");
    return (
      element && getComputedStyle(element, "::after").visibility === "visible"
    );
  });

  await page.mouse.move(0, 0);
  await first.focus();
  await page.waitForFunction(() => {
    const element = document.querySelector(".compact-knowledge-link:focus");
    return (
      element && getComputedStyle(element, "::after").visibility === "visible"
    );
  });

  const bonebinderPage = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await enterFirstBattle(
    bonebinderPage,
    targetUrl,
    "summoner",
    (coldBonebinderPage) =>
      assertBonebinderPackPresence(
        coldBonebinderPage,
        false,
        "Before Bonebinder selection",
      ),
  );
  await assertBonebinderPackPresence(
    bonebinderPage,
    true,
    "Bonebinder battle path",
  );
  const bonebinderResourcesBeforeCommand = await bonebinderPage.evaluate(() =>
    performance.getEntriesByType("resource").map(({ name }) => name),
  );
  await bonebinderPage.evaluate(() => {
    window.__battleLocalContract = {
      shell: document.querySelector(".app-shell"),
      enemies: document.querySelector(".enemy-section"),
      dossier: document.querySelector(".dossier"),
    };
  });
  await bonebinderPage.locator('[data-command-id="guard"]').click();
  await afterPaint(bonebinderPage);
  assert.deepEqual(
    await bonebinderPage.evaluate(
      (knownResources) =>
        performance
          .getEntriesByType("resource")
          .map(({ name }) => name)
          .filter((name) => !knownResources.includes(name)),
      bonebinderResourcesBeforeCommand,
    ),
    [],
    "Interactive Bonebinder commands must load with their rendered surface, not after the first click.",
  );
  assert.deepEqual(
    await bonebinderPage.evaluate(() => {
      const contract = window.__battleLocalContract;
      return {
        shell: contract.shell === document.querySelector(".app-shell"),
        enemies: contract.enemies === document.querySelector(".enemy-section"),
        dossier: contract.dossier === document.querySelector(".dossier"),
      };
    }),
    { shell: true, enemies: true, dossier: true },
    "Choosing a servant direction must not replace unrelated battle surfaces.",
  );
  await bonebinderPage.locator('[data-action="battle-action"][data-action-id="strike"]').click();
  await afterPaint(bonebinderPage);
  await bonebinderPage.locator(".servant-direction-change > summary").click();
  await bonebinderPage.locator('[data-command-id="harry"]').click();
  await afterPaint(bonebinderPage);
  assert.equal(
    await bonebinderPage.locator('[data-command-id="harry"]').getAttribute("aria-pressed"),
    "true",
    "A standing servant direction must be replaceable before the player's act.",
  );
  assert.match(
    await bonebinderPage.locator(".servant-direction-summary h3").innerText(),
    /^Harry/,
    "The targeted battle patch must display the replacement direction.",
  );
  await bonebinderPage.close();

  const localMutationPage = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await localMutationPage.goto(targetUrl, { waitUntil: "networkidle" });
  await localMutationPage.locator('[data-action="start-new"]').click();
  await localMutationPage.locator("#character-name").fill("Local Contract");
  await localMutationPage.locator('input[name="sex"][value="other"]').check();
  await localMutationPage.locator('input[name="tradition"][value="medium"]').check();
  await localMutationPage.locator('#character-form button[type="submit"]').click();
  await localMutationPage.locator(".game-layout").waitFor();
  await localMutationPage
    .locator('[data-action="choose-story"][data-choice-id="burial-cut"]')
    .click();
  await afterPaint(localMutationPage);
  await localMutationPage.evaluate(() => {
    window.__storyContract = {
      shell: document.querySelector(".app-shell"),
      panel: document.querySelector(".story-panel"),
      dossier: document.querySelector(".dossier"),
    };
  });
  const optionalChoice = localMutationPage
    .locator('[data-action="choose-story"]')
    .filter({ hasText: "Optional action" })
    .first();
  assert.equal(
    await optionalChoice.count(),
    1,
    "The opening contract scene should expose an in-scene interaction.",
  );
  await optionalChoice.click();
  await afterPaint(localMutationPage);
  assert.deepEqual(
    await localMutationPage.evaluate(() => {
      const contract = window.__storyContract;
      return {
        shell: contract.shell === document.querySelector(".app-shell"),
        panel: contract.panel === document.querySelector(".story-panel"),
        dossier: contract.dossier === document.querySelector(".dossier"),
      };
    }),
    { shell: true, panel: true, dossier: true },
    "An in-scene choice must patch the story surface instead of replacing it.",
  );
  await localMutationPage.locator("[data-result-title]").waitFor();
  await localMutationPage
    .locator('[data-story-outcome-slot] [data-action="dismiss-result"]')
    .click();
  await afterPaint(localMutationPage);
  assert.equal(
    await localMutationPage.locator("[data-result-title]").count(),
    0,
    "Dismissing a story result must clear only the outcome slot.",
  );

  await localMutationPage.locator('[data-action="open-inventory"]').click();
  await localMutationPage.locator(".inventory-page").waitFor();
  await localMutationPage.evaluate(() => {
    window.__inventoryContract = {
      page: document.querySelector(".inventory-page"),
      equipment: document.querySelector(".inventory-section--equipment"),
      anatomy: document.querySelector(".inventory-section--anatomy"),
    };
  });
  await localMutationPage
    .locator('.inventory-section--equipment [data-action="unequip-item"]')
    .first()
    .click();
  await afterPaint(localMutationPage);
  assert.deepEqual(
    await localMutationPage.evaluate(() => {
      const contract = window.__inventoryContract;
      return {
        page: contract.page === document.querySelector(".inventory-page"),
        equipment:
          contract.equipment ===
          document.querySelector(".inventory-section--equipment"),
        anatomy:
          contract.anatomy ===
          document.querySelector(".inventory-section--anatomy"),
      };
    }),
    { page: true, equipment: true, anatomy: true },
    "Inventory mutations must preserve the page and keyed workbench sections.",
  );
  assert.match(
    await localMutationPage.locator(".notice").innerText(),
    /^Unequipped /,
    "A successful local mutation must update its notice without a full render.",
  );
  await localMutationPage.close();

  const advancementPage = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await advancementPage.goto(targetUrl, { waitUntil: "networkidle" });
  await advancementPage.locator('[data-action="start-new"]').click();
  await advancementPage.locator("#character-name").fill("Advancement Contract");
  await advancementPage.locator('input[name="sex"][value="other"]').check();
  await advancementPage.locator('input[name="tradition"][value="medium"]').check();
  await advancementPage.locator('#character-form button[type="submit"]').click();
  await advancementPage.locator(".game-layout").waitFor();
  await advancementPage.evaluate(() => {
    const key = "necromancer:save:v4";
    const saved = localStorage.getItem(key);
    if (!saved) throw new Error("Character creation did not produce a save.");
    const envelope = JSON.parse(saved);
    envelope.state.run.player.level = 2;
    envelope.state.run.player.xp = 25;
    localStorage.setItem(key, JSON.stringify(envelope));
  });
  await advancementPage.reload({ waitUntil: "networkidle" });
  await advancementPage.locator('[data-action="continue"]').click();
  await advancementPage.locator(".game-layout").waitFor();
  await advancementPage.evaluate(() => {
    window.__statsContract = {
      shell: document.querySelector(".app-shell"),
      screen: document.querySelector(".game-layout"),
    };
  });
  await advancementPage.locator("[data-stats-control]").click();
  await advancementPage.locator("[data-stats-surface]").waitFor();
  assert.deepEqual(
    await advancementPage.evaluate(() => {
      const contract = window.__statsContract;
      return {
        shell: contract.shell === document.querySelector(".app-shell"),
        screen: contract.screen === document.querySelector(".game-layout"),
      };
    }),
    { shell: true, screen: true },
    "Opening Stats must preserve the underlying application and screen.",
  );
  await advancementPage.evaluate(() => {
    window.__statsContract.stats = document.querySelector("[data-stats-surface]");
  });
  await advancementPage.locator('[data-stats-pane-id="character"]').click();
  await advancementPage.locator('[data-stats-pane="character"]').waitFor();
  assert.deepEqual(
    await advancementPage.evaluate(() => ({
      sameSurface:
        window.__statsContract.stats ===
        document.querySelector("[data-stats-surface]"),
      hasCharacterStats: Boolean(
        document.querySelector("[data-stats-pane=\"character\"]"),
      ),
      hasTree: Boolean(document.querySelector(".advancement-workspace")),
    })),
    { sameSurface: true, hasCharacterStats: true, hasTree: false },
    "Switching to Character must patch only the Stats pane.",
  );
  await advancementPage.locator('[data-stats-pane-id="character"]').press("ArrowRight");
  await advancementPage.locator(".advancement-workspace").waitFor();

  const availableDiscipline = advancementPage
    .locator(".advancement-choice--available")
    .first();
  const advancementId = await availableDiscipline.getAttribute(
    "data-advancement-id",
  );
  assert.ok(advancementId, "A level-two player should have a discipline to claim.");
  await availableDiscipline.click();
  await advancementPage.evaluate(() => {
    window.__advancementContract = {
      shell: document.querySelector(".app-shell"),
      stats: document.querySelector("[data-stats-surface]"),
      panel: document.querySelector(".advancement-panel"),
    };
  });
  await advancementPage.locator('[data-action="confirm-advancement"]').click();
  await afterPaint(advancementPage);

  assert.deepEqual(
    await advancementPage.evaluate(() => {
      const contract = window.__advancementContract;
      return {
        shell: contract.shell === document.querySelector(".app-shell"),
        stats: contract.stats === document.querySelector("[data-stats-surface]"),
        panel: contract.panel === document.querySelector(".advancement-panel"),
      };
    }),
    { shell: true, stats: true, panel: true },
    "Claiming a discipline must patch the open Stats surface instead of replacing it.",
  );
  await advancementPage.locator("[data-stats-result-title]").waitFor();
  assert.match(
    await advancementPage.locator("[data-advancement-points]").innerText(),
    /^0 unspent$/i,
    "The targeted patch must update the available discipline points.",
  );
  assert.equal(
    await advancementPage
      .locator(
        `.advancement-choice--learned[data-advancement-id="${advancementId}"]`,
      )
      .count(),
    1,
    "The claimed node must become learned without rebuilding the tree.",
  );
  assert.equal(
    await advancementPage.locator("[data-stats-points-badge]").count(),
    0,
    "The header must remove its unspent-point badge after the claim.",
  );
  await advancementPage
    .locator('[data-advancement-result-slot] [data-action="dismiss-result"]')
    .click();
  await afterPaint(advancementPage);
  assert.equal(
    await advancementPage.locator("[data-stats-result-title]").count(),
    0,
    "Dismissing a discipline result must clear only its result slot.",
  );
  await advancementPage.locator("[data-stats-control]").click();
  await afterPaint(advancementPage);
  assert.deepEqual(
    await advancementPage.evaluate(() => {
      const contract = window.__statsContract;
      return {
        shell: contract.shell === document.querySelector(".app-shell"),
        screen: contract.screen === document.querySelector(".game-layout"),
        statsClosed: document.querySelector("[data-stats-surface]") === null,
      };
    }),
    { shell: true, screen: true, statsClosed: true },
    "Closing Stats must remove only the Stats surface.",
  );
  await advancementPage.close();

  console.log(
    "UI contracts passed: the cold title admits no playable runtime; Chronicle remains a read-only lazy title surface; cold optional surfaces load only their owned assets; the Bonebinder executable pack is isolated to Bonebinder admission; cold dossier layout, local story and inventory mutations, Stats continuity, servant direction replacement, and targeted discipline claims are intact.",
  );
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  await page?.screenshot({
    path: resolve(output, "dossier-contract-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await browser?.close();
  await server?.close();
}
