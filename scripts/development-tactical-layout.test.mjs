import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");

const afterPaint = (page) =>
  page.evaluate(
    () =>
      new Promise((resolvePaint) =>
        requestAnimationFrame(() => requestAnimationFrame(resolvePaint)),
      ),
  );

const waitForTurnSequence = (page) => page.waitForFunction(() =>
  !document.querySelector("[data-turn-sequence-active]"),
);

const closeArrivalConversation = async (page) => {
  const close = page.locator('[data-action="close-action-proof-conversation"]');
  await close.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
  if (await close.count()) {
    await close.click();
    await afterPaint(page);
  }
};

test("background music remains available inside every tactical proof", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });

    for (const prototypeId of ["fire-road", "siege-sovereign", "interdict"]) {
      const page = await browser.newPage();
      await page.goto(targetUrl, { waitUntil: "networkidle" });
      const launcher = prototypeId === "fire-road"
        ? '[data-action="start-fire-road-prototype"]'
        : `[data-action="start-tactical-prototype"][data-prototype-id="${prototypeId}"]`;
      await page
        .locator(launcher)
        .first()
        .click();
      assert.equal(
        await page.locator("[data-music-control]").count(),
        1,
        `${prototypeId} must retain the global music control.`,
      );
      await page.locator("[data-music-control]").click();
      assert.equal(
        await page.locator("[data-music-control]").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await page.locator("audio").count(), 1);
      await page.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("direct-play proofs keep the complete interaction inside one illustrated field", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });

    for (const [prototypeId, sceneAsset] of [
      ["siege-breach-yard", "siege-breach-yard-mobile-v2.jpg"],
      ["fire-road-under-ash", "fire-road-navigation-mobile-v4.webp"],
    ]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
        hasTouch: true,
      });
      await page.goto(targetUrl, { waitUntil: "networkidle" });
      await page.locator(`[data-action="start-action-prototype"][data-prototype-id="${prototypeId}"]`).click();
      if (prototypeId === "fire-road-under-ash") await closeArrivalConversation(page);
      await page.locator(".action-stage__frame").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await afterPaint(page);

      const layout = await page.evaluate(() => {
        const frame = document.querySelector(".action-stage__frame");
        const hud = document.querySelector(".action-stage__hud");
        const commands = document.querySelector(".action-stage__commands, .road-under-ash__abilities, .breach-yard__abilities");
        const latest = document.querySelector(".action-stage__latest");
        if (!(frame instanceof HTMLElement) || !(commands instanceof HTMLElement)) return null;
        const frameBounds = frame.getBoundingClientRect();
        const hudBounds = hud?.getBoundingClientRect();
        const commandBounds = commands.getBoundingClientRect();
        const latestBounds = latest?.getBoundingClientRect();
        const figures = [...frame.querySelectorAll(".action-stage__figure-art")].map((figure) => figure.getBoundingClientRect());
        const figureCenter = (id) => {
          const rig = frame.querySelector(`[data-visual-entity-id="${id}"]`);
          const figure = rig?.querySelector(".action-stage__figure-art");
          if (!(figure instanceof HTMLElement)) return null;
          const bounds = figure.getBoundingClientRect();
          return { x: bounds.left + (bounds.width / 2), y: bounds.top + (bounds.height / 2) };
        };
        const wagon = frame.querySelector(".road-under-ash__wreck");
        const wagonBounds = wagon?.getBoundingClientRect();
        return {
          background: getComputedStyle(frame.querySelector(".action-stage__backdrop")).getPropertyValue("object-fit"),
          commandContained: commandBounds.left >= frameBounds.left && commandBounds.right <= frameBounds.right && commandBounds.bottom <= frameBounds.bottom,
          figureCount: figures.length,
          figuresContained: figures.every((bounds) => bounds.left >= frameBounds.left && bounds.right <= frameBounds.right && bounds.top >= frameBounds.top && bounds.bottom <= frameBounds.bottom),
          figuresClearHud: hudBounds ? figures.every((bounds) => bounds.top >= hudBounds.bottom - 1) : false,
          figuresClearOutcome: latestBounds ? figures.every((bounds) => bounds.bottom <= latestBounds.top + 1 || bounds.top >= latestBounds.bottom - 1) : true,
          outcomeClearsCommands: latestBounds ? latestBounds.bottom <= commandBounds.top + 1 : true,
          pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          oldLowerSurface: Boolean(document.querySelector(".breach-yard__lower, .road-under-ash__lower")),
          fireRoad: frame.closest(".road-under-ash") ? {
            wagonWidth: wagonBounds?.width ?? 0,
            bridgeShoulderLabel: frame.textContent?.includes("Bridge shoulder") ?? false,
            offersOccupiedSouthMove: Boolean(frame.querySelector('[aria-label="Move south"]')),
            player: figureCenter("necromancer"),
            wagon: wagonBounds ? { x: wagonBounds.left + (wagonBounds.width / 2), y: wagonBounds.top + (wagonBounds.height / 2) } : null,
            sera: figureCenter("sera"),
            households: figureCenter("households"),
          } : null,
          siege: frame.closest(".breach-yard") ? {
            groundIsUnpainted: [...frame.querySelectorAll(".action-stage__ground")]
              .every((ground) => getComputedStyle(ground).opacity === "0"),
            mobilePlate: frame.querySelector(".action-stage__backdrop")?.currentSrc ?? "",
          } : null,
        };
      });

      assert.ok(layout, `${prototypeId} must expose a measurable direct-play field.`);
      assert.equal(layout.background, "cover", `${prototypeId} must keep its illustrated place visible.`);
      assert.ok(layout.figureCount >= 6, `${prototypeId} must represent its active cast visually.`);
      assert.equal(layout.commandContained, true, `${prototypeId} actions must remain inside the field.`);
      assert.equal(layout.figuresContained, true, `${prototypeId} figures must remain inside the field.`);
      assert.equal(layout.figuresClearHud, true, `${prototypeId} HUD must not cover figures.`);
      assert.equal(layout.figuresClearOutcome, true, `${prototypeId} outcome copy must not cover figures.`);
      assert.equal(layout.outcomeClearsCommands, true, `${prototypeId} outcome copy must not cover touch actions.`);
      assert.equal(layout.pageOverflows, false, `${prototypeId} must not create portrait page overflow.`);
      assert.equal(layout.oldLowerSurface, false, `${prototypeId} must not restore the legacy lower action list.`);
      if (layout.fireRoad) {
        const { player, wagon, sera, households } = layout.fireRoad;
        assert.ok(layout.fireRoad.wagonWidth >= 100, "Fire Road must visibly represent its blocking wagon.");
        assert.equal(layout.fireRoad.bridgeShoulderLabel, false, "Fire Road must not invent a floating bridge-shoulder label.");
        assert.equal(layout.fireRoad.offersOccupiedSouthMove, false, "Fire Road must not offer movement into Ditch-Hand's occupied ground.");
        assert.ok(player && wagon && sera && households, "Fire Road must expose every principal point on its represented route.");
        assert.ok(player.y > wagon.y && wagon.y > households.y, "The broken wagon must physically separate the player from the exposed households.");
        assert.ok(Math.abs(sera.y - wagon.y) < 70, "Sera must remain visibly committed to the wagon choke rather than an unrelated landmark.");
      }
      if (layout.siege) {
        assert.equal(layout.siege.groundIsUnpainted, true, "Siege movement must not paint permanent board-game rings over the yard.");
        assert.match(layout.siege.mobilePlate, /siege-breach-yard-mobile-v2\.jpg/u, "Portrait Siege must use its authored portrait plate rather than crop the landscape yard.");
      }
      assert.match(
        await page.locator(".action-stage__backdrop").evaluate((image) => image.currentSrc),
        new RegExp(sceneAsset.replace(".", "\\."), "u"),
      );
      await page.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("Fire Road introduces a represented character over the uninterrupted world", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });

    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, hasTouch: viewport.width < 500 });
      await page.goto(targetUrl, { waitUntil: "networkidle" });
      await page.locator('[data-action="start-action-prototype"][data-prototype-id="fire-road-under-ash"]').click();
      const conversation = page.locator("[data-action-proof-conversation]");
      await conversation.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await afterPaint(page);

      const presentation = await page.evaluate(() => {
        const dialog = document.querySelector("[data-action-proof-conversation]");
        const world = document.querySelector("[data-action-proof-world]");
        const portrait = document.querySelector(".action-conversation__portrait img");
        const frame = document.querySelector(".action-stage__frame");
        const choices = [...document.querySelectorAll(".action-conversation__choices button")];
        if (!(dialog instanceof HTMLElement) || !(world instanceof HTMLElement) || !(portrait instanceof HTMLImageElement) || !(frame instanceof HTMLElement)) return null;
        const dialogBounds = dialog.getBoundingClientRect();
        const frameBounds = frame.getBoundingClientRect();
        return {
          worldInert: world.inert,
          worldHidden: world.getAttribute("aria-hidden"),
          portraitSource: portrait.currentSrc,
          dialogContained: dialogBounds.left >= frameBounds.left && dialogBounds.right <= frameBounds.right && dialogBounds.top >= frameBounds.top && dialogBounds.bottom <= frameBounds.bottom,
          choicesContained: choices.every((choice) => {
            const bounds = choice.getBoundingClientRect();
            return bounds.left >= dialogBounds.left && bounds.right <= dialogBounds.right && bounds.top >= dialogBounds.top && bounds.bottom <= dialogBounds.bottom;
          }),
          pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          mobilePlate: document.querySelector(".road-under-ash__backdrop")?.currentSrc ?? "",
        };
      });

      assert.ok(presentation, "Fire Road must render its arrival conversation inside the scene.");
      assert.equal(presentation.worldInert, true, "Foreground dialogue must suspend interaction with the backgrounded world.");
      assert.equal(presentation.worldHidden, "true", "Foreground dialogue must expose one coherent accessible surface.");
      assert.match(presentation.portraitSource, /sera-vale-fire-road-v1\.webp/u, "Sera must be a represented person, not only quoted text.");
      assert.equal(presentation.dialogContained, true, "The conversation must remain within the represented scene.");
      assert.equal(presentation.choicesContained, true, "Every response must remain visible in the conversation frame.");
      assert.equal(presentation.pageOverflows, false, "The dialogue presentation must not create horizontal overflow.");
      if (viewport.width < 500) {
        assert.match(presentation.mobilePlate, /fire-road-navigation-mobile-v4\.webp/u, "Portrait Fire Road must use its authored portrait composition.");
      }

      await page.locator('[data-action="close-action-proof-conversation"]').click();
      assert.equal(await conversation.count(), 0, "Closing dialogue must reveal the same world rather than navigate away.");
      assert.equal(await page.locator("[data-action-proof-world]").evaluate((world) => world.inert), false);
      await page.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("direct-play uses the desktop viewport without losing secondary action context", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.locator('[data-action="start-action-prototype"][data-prototype-id="fire-road-under-ash"]').click();
    await closeArrivalConversation(page);
    await page.locator(".action-stage__frame").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await afterPaint(page);

    const firstCommand = page.locator(".road-under-ash__ability").first();
    const detail = firstCommand.locator(".road-under-ash__ability-detail");
    const before = await page.evaluate(() => {
      const frame = document.querySelector(".action-stage__frame");
      const figure = document.querySelector(".action-stage__figure-art");
      if (!(frame instanceof HTMLElement) || !(figure instanceof HTMLElement)) return null;
      const bounds = frame.getBoundingClientRect();
      const figureBounds = figure.getBoundingClientRect();
      return {
        widthRatio: bounds.width / window.innerWidth,
        bottom: bounds.bottom,
        viewportHeight: window.innerHeight,
        figureWidth: figureBounds.width,
      };
    });
    assert.ok(before, "Fire Road must expose a measurable desktop field.");
    assert.ok(before.widthRatio >= .94, "The direct-play field should use nearly the full desktop width.");
    assert.ok(before.bottom <= before.viewportHeight + 1, "The primary field should fit inside the initial desktop viewport.");
    assert.ok(before.figureWidth >= 90, "Desktop figures should remain large enough to read at a glance.");
    const detailText = await detail.textContent();
    assert.ok(detailText?.trim(), "Secondary action context must remain in the interaction contract.");
    assert.ok((await firstCommand.getAttribute("aria-label"))?.includes(detailText.trim()));
    const roundBeforeDiscovery = await page.locator(".action-stage__meter").first().textContent();
    await page.locator('[data-action-proof-subject-id="ditch-hand"]').click();
    assert.equal(await page.locator('[data-action-proof-subject-panel="ditch-hand"]').isVisible(), true, "Selecting a represented subject must reveal only its local affordances.");
    assert.equal(await page.locator(".action-stage__commands").count(), 0, "Fire Road must not restore the exhaustive authored-action strip.");
    assert.equal(await page.locator(".action-stage__meter").first().textContent(), roundBeforeDiscovery, "Looking at a represented subject must not spend an exchange.");
    await page.locator('[data-action="select-action-proof"][data-action-proof-id="direct-ditch-hand"]').click();
    assert.equal(await page.locator('[data-action="select-action-proof-target"][data-action-proof-id="direct-ditch-hand"]:visible').count(), 2, "Servant direction must become a choice of represented assignments, not another prose menu.");
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("direct-play movement is discovered on hover, focus, or a deliberate first touch", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });

    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await desktop.goto(targetUrl, { waitUntil: "networkidle" });
    await desktop.locator('[data-action="start-action-prototype"][data-prototype-id="fire-road-under-ash"]').click();
    await closeArrivalConversation(desktop);
    const desktopMove = desktop.locator('[data-action="move-action-proof"]').first();
    const destinationBounds = await desktopMove.boundingBox();
    assert.ok(destinationBounds && destinationBounds.width >= 80 && destinationBounds.height >= 44, "A physical destination needs a broad point-and-click hit region.");
    const destinationPosition = await desktopMove.evaluate((element) => {
      const position = element.closest(".action-stage__position");
      return position ? {
        x: position.style.getPropertyValue("--stage-x"),
        y: position.style.getPropertyValue("--stage-y"),
      } : null;
    });
    const resting = await desktopMove.evaluate((element) => ({
      marker: getComputedStyle(element, "::before").opacity,
      label: getComputedStyle(element, "::after").opacity,
    }));
    assert.deepEqual(resting, { marker: "0", label: "0" }, "Movement affordances must not paint persistent marks onto the physical scene.");
    const roundBeforeHover = await desktop.locator(".action-stage__meter").first().textContent();
    await desktopMove.hover();
    await desktop.waitForFunction((element) => Number.parseFloat(getComputedStyle(element, "::after").opacity) >= .8, await desktopMove.elementHandle());
    const hovered = await desktopMove.evaluate((element) => ({
      marker: Number.parseFloat(getComputedStyle(element, "::before").opacity),
      label: Number.parseFloat(getComputedStyle(element, "::after").opacity),
      copy: getComputedStyle(element, "::after").content,
    }));
    assert.ok(hovered.marker >= .8 && hovered.label >= .8, `Hover must reveal the destination: ${JSON.stringify(hovered)}`);
    assert.match(hovered.copy, /exchange/u);
    assert.equal(await desktop.locator(".action-stage__meter").first().textContent(), roundBeforeHover, "Discovering a route must not move the character.");
    await desktopMove.click();
    await desktop.waitForFunction(() => document
      .querySelector('[data-visual-entity-id="necromancer"]')
      ?.closest(".action-stage__figure")
      ?.getAttribute("data-spatial-motion") === "travel");
    const travelAnimation = await desktop.locator('[data-visual-entity-id="necromancer"]').evaluate((element) => {
      const figure = element.closest(".action-stage__figure");
      return Boolean(figure?.getAnimations().some(({ playState }) => playState === "running"));
    });
    assert.equal(travelAnimation, true, "A committed move must visibly traverse the selected ground instead of snapping into place.");
    const spatialTurns = await desktop.evaluate(() => Object.fromEntries(
      ["necromancer", "sera", "households", "hound"].map((id) => {
        const figure = document.querySelector(`[data-visual-entity-id="${id}"]`)?.closest(".action-stage__figure");
        return [id, figure?.getAttribute("data-spatial-turn") ?? null];
      }),
    ));
    assert.equal(spatialTurns.necromancer, "1", "The player's committed movement must resolve first.");
    assert.equal(spatialTurns.sera, spatialTurns.households, "Sera and the households must move as one coordinated turn.");
    assert.ok(Number(spatialTurns.sera) > Number(spatialTurns.necromancer), "The evacuation must follow the player's movement.");
    assert.ok(Number(spatialTurns.hound) > Number(spatialTurns.sera), "The enemy response must visibly follow the living characters' turns.");
    const roundDuringSequence = await desktop.locator(".action-stage__meter").first().textContent();
    await desktop.locator('[data-action="act-action-proof"]').first().evaluate((button) => button.click());
    assert.equal(
      await desktop.locator(".action-stage__meter").first().textContent(),
      roundDuringSequence,
      "A second command must not enter the exchange while its character turns are still resolving.",
    );
    const arrivedPosition = await desktop.locator('[data-visual-entity-id="necromancer"]').evaluate((element) => {
      const position = element.closest(".action-stage__position");
      return position ? {
        x: position.style.getPropertyValue("--stage-x"),
        y: position.style.getPropertyValue("--stage-y"),
      } : null;
    });
    assert.deepEqual(arrivedPosition, destinationPosition, "The character must arrive at the physical ground that was previewed.");
    await waitForTurnSequence(desktop);
    await desktop.close();

    const reduced = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await reduced.goto(targetUrl, { waitUntil: "networkidle" });
    await reduced.locator('[data-action="start-action-prototype"][data-prototype-id="fire-road-under-ash"]').click();
    await closeArrivalConversation(reduced);
    await reduced.locator('[data-action="move-action-proof"]').first().click();
    await afterPaint(reduced);
    assert.equal(await reduced.locator('[data-spatial-motion="travel"]').count(), 0, "Reduced motion must suppress spatial travel animation.");
    await reduced.close();

    const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await touch.goto(targetUrl, { waitUntil: "networkidle" });
    await touch.locator('[data-action="start-action-prototype"][data-prototype-id="fire-road-under-ash"]').click();
    await closeArrivalConversation(touch);
    const touchMove = touch.locator('[data-action="move-action-proof"]').first();
    const roundBeforeTouch = await touch.locator(".action-stage__meter").first().textContent();
    await touchMove.tap();
    assert.equal(await touchMove.evaluate((element) => element.classList.contains("is-previewed")), true, "The first touch must reveal rather than commit a hidden destination.");
    assert.equal(await touch.locator(".action-stage__meter").first().textContent(), roundBeforeTouch, "The first touch must not advance the scene.");
    await touchMove.tap();
    assert.notEqual(await touch.locator(".action-stage__meter").first().textContent(), roundBeforeTouch, "A second touch on the revealed destination must commit movement.");
    await waitForTurnSequence(touch);
    await touch.close();

    const siege = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await siege.goto(targetUrl, { waitUntil: "networkidle" });
    await siege.locator('[data-action="start-action-prototype"][data-prototype-id="siege-breach-yard"]').click();
    assert.equal(await siege.locator(".action-stage__commands").count(), 0, "Siege must not expose its complete action catalog as a textual strip.");
    const directionRound = await siege.locator(".action-stage__meter").first().textContent();
    await siege.locator('[data-action="select-action-proof"][data-action-proof-id="direct-servant"]').click();
    assert.ok(await siege.locator('[data-action="select-action-proof-target"][data-action-proof-id="direct-servant"]:visible').count() >= 5, "Servant direction must highlight represented people, threats, and work in the field.");
    assert.equal(await siege.locator(".action-stage__meter").first().textContent(), directionRound, "Choosing an ability must not advance the yard.");
    await siege.locator('[data-action="cancel-action-proof-targeting"]').click();
    const siegeMove = siege.locator('[data-action="move-action-proof"][data-destination-id="timber-stack"]');
    const siegeDestinationBounds = await siegeMove.boundingBox();
    assert.ok(siegeDestinationBounds && siegeDestinationBounds.width >= 80 && siegeDestinationBounds.height >= 44, "Siege destinations need the same broad point-and-click hit region.");
    assert.match((await siegeMove.textContent()) ?? "", /Timber stacks|Broken arch/u, "Siege movement must name a physical destination rather than a relative direction.");
    const siegeDestinationPosition = await siegeMove.evaluate((element) => {
      const position = element.closest(".action-stage__position");
      return position ? {
        x: position.style.getPropertyValue("--stage-x"),
        y: position.style.getPropertyValue("--stage-y"),
      } : null;
    });
    await siegeMove.click();
    const siegeArrivedPosition = await siege.locator('[data-visual-entity-id="player"]').evaluate((element) => {
      const position = element.closest(".action-stage__position");
      return position ? {
        x: position.style.getPropertyValue("--stage-x"),
        y: position.style.getPropertyValue("--stage-y"),
      } : null;
    });
    assert.deepEqual(siegeArrivedPosition, siegeDestinationPosition, "Siege movement must land on the physical place the player selected.");
    await waitForTurnSequence(siege);
    const roundBeforeCorpse = await siege.locator(".action-stage__meter").first().textContent();
    await siege.locator('[data-action-proof-subject-id="corpse"]').click();
    const corpsePanel = siege.locator('[data-action-proof-subject-panel="corpse"]');
    assert.equal(await corpsePanel.isVisible(), true, "The represented corpse must disclose its own local interactions.");
    assert.equal(await corpsePanel.locator('[data-action-proof-id="raise-scout"]').count(), 1, "Raising must be discovered at the corpse instead of listed beneath the field.");
    assert.match(await corpsePanel.innerText(), /Bonebinding · Willpower[\s\S]*PROSPECT[\s\S]*Assured[\s\S]*One exchange/u, "A discovered course must disclose capability, qualitative prospect, and time without an exact chance.");
    assert.equal(await siege.locator(".action-stage__meter").first().textContent(), roundBeforeCorpse, "Inspecting the corpse must be free even though acting on it spends an exchange.");
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("Fire Road ends in a portrait-safe record of costs that would outlast the scene", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.locator('[data-action="start-action-prototype"][data-prototype-id="fire-road-under-ash"]').click();
    await closeArrivalConversation(page);
    await page.locator('[data-action-proof-subject-id="ditch-hand"]').click();
    await page.locator('[data-action="select-action-proof"][data-action-proof-id="direct-ditch-hand"]').click();
    await page.locator('[data-action="select-action-proof-target"][data-resolved-action-id="order:brace"]').click();
    await page.locator('[data-action="confirm-action-proof-target"]').click();
    await waitForTurnSequence(page);
    await page.locator('[data-action-proof-subject-id="ditch-hand"]').click();
    await page.locator('[data-action-proof-subject-panel="ditch-hand"] [data-action="move-action-proof"]').click();
    await waitForTurnSequence(page);
    await page.locator('[data-action-proof-subject-id="road-dead"]').click();
    await page.locator('[data-action-proof-subject-panel="road-dead"] [data-action="move-action-proof"]').click();
    await waitForTurnSequence(page);
    for (let index = 0; index < 3; index += 1) {
      await page.locator('[data-action="select-action-proof"][data-action-proof-id="strike"]').click();
      await page.locator('[data-action="select-action-proof-target"][data-action-proof-id="strike"][data-target-id="hound"]').click();
      await page.locator('[data-action="confirm-action-proof-target"]').click();
      await waitForTurnSequence(page);
    }
    await page.locator('[data-action-proof-subject-id="hound-remains"]').click();
    await page.locator('[data-action-proof-id="recover-collar"]').click();
    await waitForTurnSequence(page);
    for (let index = 0; index < 3; index += 1) {
      await page.locator('[data-action-proof-subject-id="road-dead"]').click();
      await page.locator('[data-action-proof-subject-panel="road-dead"] [data-action-proof-id="clear-obstruction"]').click();
      await waitForTurnSequence(page);
    }
    await page.locator('[data-action-proof-subject-id="ditch-hand"]').click();
    await page.locator('[data-action-proof-subject-panel="ditch-hand"] [data-destination-id="bridge-approach"]').click();
    await waitForTurnSequence(page);
    await page.locator('.action-stage__move[data-destination-id="west-verge"]').click();
    await waitForTurnSequence(page);
    await page.locator('[data-action-proof-id="depart"]').click();

    const ending = page.locator(".action-stage__ending");
    await ending.waitFor();
    const copy = await ending.innerText();
    assert.match(copy, /WHAT A TESTAMENT WOULD KEEP/u);
    assert.match(copy, /winter supply/u);
    assert.match(copy, /quartermaster's sign/u);
    assert.match(copy, /ash-hound bite/u);
    const bounds = await ending.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport, `The aftermath must remain inside the portrait viewport: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.documentWidth, bounds.viewport, "The campaign-facing aftermath must not create horizontal overflow.");
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("direct-play combat selects an action and represented target without rerendering the field", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.locator('[data-action="start-action-prototype"][data-prototype-id="siege-breach-yard"]').click();
    const halwenFigure = page.locator('.action-stage__figure--health-disclosure:has([data-visual-entity-id="halwen"])');
    const halwenHealth = halwenFigure.locator('.action-stage__health--disclosure');
    assert.equal(await halwenFigure.getAttribute("aria-label"), "Examine Halwen Sar. Halwen Sar, 18 of 18 Health", "An ally exposes current and maximum Health semantically while remaining an inspectable subject.");
    assert.equal(Number.parseFloat(await halwenHealth.evaluate((element) => getComputedStyle(element).opacity)), 0, "Ally Health stays quiet until requested.");
    await halwenFigure.hover();
    await page.waitForTimeout(50);
    assert.ok(Number.parseFloat(await halwenHealth.evaluate((element) => getComputedStyle(element).opacity)) > 0.9, "Hovering an ally reveals Health.");
    await halwenFigure.focus();
    assert.ok(Number.parseFloat(await halwenHealth.evaluate((element) => getComputedStyle(element).opacity)) > 0.9, "Keyboard focus reveals the same Health information.");
    await page.locator('[data-action="move-action-proof"][data-destination-id="broken-arch"]').click();
    await page.locator('[data-action="move-action-proof"][data-destination-id="upper-walk"]').click();

    const frame = page.locator(".action-stage__frame");
    const frameIdentity = await frame.evaluate((element) => {
      element.dataset.selectionIdentity = "preserved";
      return element.dataset.selectionIdentity;
    });
    const roundBefore = await page.locator(".action-stage__meter").first().textContent();
    await page.locator('[data-action="select-action-proof"][data-action-proof-id="strike"]').click();

    assert.equal(await frame.getAttribute("data-selection-identity"), frameIdentity, "Selecting an action must patch locally, not replace the scene.");
    assert.equal(await page.locator(".action-stage__meter").first().textContent(), roundBefore, "Selecting an action must not advance time.");
    const targets = page.locator('[data-action="select-action-proof-target"]:visible');
    assert.equal(await targets.count(), 1);
    assert.equal(await page.locator('.action-stage__figure--danger [role="meter"][aria-label$="Health"]').count(), 2, "Every living enemy needs a persistent Health meter.");
    await targets.first().click();
    const confirm = page.locator('[data-action="confirm-action-proof-target"]:visible');
    assert.match(await confirm.textContent(), /Coalition bow/u);
    await confirm.click();
    assert.equal(await page.locator("[data-action-proof-targeting]:visible").count(), 0);
    assert.equal(await frame.getAttribute("data-selection-identity"), null, "Confirming the target must replace the field with authoritative state.");
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("Interdict subject selection does not resize or recrop its map", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl =
      server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page
      .locator('[data-action="start-tactical-prototype"][data-prototype-id="interdict"]')
      .click();

    const board = page.locator(".interdict-sluice__board");
    await board.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await afterPaint(page);
    const initial = await board.boundingBox();
    assert.ok(initial, "The Interdict board must have a measurable viewport.");

    for (const subjectId of ["field-severer", "old-sluice", "miller"]) {
      await page.locator(`[data-tactical-subject-id="${subjectId}"]`).click();
      await afterPaint(page);
      const selected = await board.boundingBox();
      assert.deepEqual(
        selected && { width: selected.width, height: selected.height },
        { width: initial.width, height: initial.height },
        `Selecting ${subjectId} must not resize or recrop the Interdict map.`,
      );
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("Interdict courses use a title-first hierarchy and separate terms", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.locator('[data-action="start-tactical-prototype"][data-prototype-id="interdict"]').click();
    await page.locator('[data-tactical-subject-id="miller"]').click();
    await page.locator('[data-tactical-action-id="open-miller-exchange"]').click();

    const paidCourse = page.locator('[data-tactical-action-id="buy-mill-stores"]');
    const presentation = await paidCourse.evaluate((element) => {
      const title = element.querySelector(".tactical-course__title");
      const method = element.querySelector("[data-course-method]");
      const prospect = element.querySelector("[data-course-prospect]");
      const cost = element.querySelector("[data-course-cost-kind]");
      return {
        titleDecoration: title ? getComputedStyle(title).textDecorationLine : null,
        order: [title, method, prospect, cost].map((node) =>
          node ? [...element.querySelectorAll("*")].indexOf(node) : -1),
      };
    });
    assert.equal(presentation.titleDecoration, "none");
    assert.ok(
      presentation.order.every((position, index, positions) =>
        position >= 0 && (index === 0 || position > positions[index - 1])),
      `Course title, method, prospect, and cost must appear in order: ${presentation.order}`,
    );
    assert.equal(
      await page.locator('[data-tactical-action-id="witness-miller-refusal"]').count(),
      0,
      "Undiscovered evidence courses must not leak through disabled controls.",
    );
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("Interdict course terms remain compact and nonoverlapping at portrait width", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.locator("[data-text-scale-control]").click();
    await page.locator("[data-text-scale-control]").click();
    await page.locator('[data-action="start-tactical-prototype"][data-prototype-id="interdict"]').click();
    await page.locator('[data-tactical-subject-id="miller"]').click();
    await page.locator('[data-tactical-action-id="open-miller-exchange"]').click();
    await page.evaluate(() => document.fonts.ready);
    await afterPaint(page);

    const layout = await page.locator(".tactical-course").evaluateAll((courses) => courses.map((course) => {
      const courseBounds = course.getBoundingClientRect();
      const terms = [...course.querySelectorAll(".tactical-course__term")].map((term) => {
        const bounds = term.getBoundingClientRect();
        const parts = [...term.children].map((part) => part.getBoundingClientRect());
        const overlaps = parts.some((first, index) => parts.slice(index + 1).some((second) =>
          first.right > second.left + 0.5 && second.right > first.left + 0.5 &&
          first.bottom > second.top + 0.5 && second.bottom > first.top + 0.5));
        return {
          overlaps,
          overflows: term.scrollWidth > term.clientWidth + 1,
          width: bounds.width,
          courseWidth: courseBounds.width,
        };
      });
      return { terms, overflows: course.scrollWidth > course.clientWidth + 1 };
    }));

    assert.equal(layout.some(({ overflows }) => overflows), false, "Portrait courses must not overflow horizontally.");
    assert.equal(
      layout.flatMap(({ terms }) => terms).some(({ overlaps, overflows }) => overlaps || overflows),
      false,
      `Portrait course terms must wrap without overlap: ${JSON.stringify(layout)}`,
    );
    const cost = page.locator('[data-course-cost-kind="resource"]');
    const costWidth = await cost.evaluate((element) => element.getBoundingClientRect().width);
    const courseWidth = await cost.locator("xpath=ancestor::button[contains(concat(' ', normalize-space(@class), ' '), ' tactical-course ')]").evaluate((element) => element.getBoundingClientRect().width);
    assert.ok(costWidth < courseWidth * 0.9, `The enlarged cost should remain visibly narrower than its course card: ${costWidth}/${courseWidth}.`);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("Interdict preserves a spatial, touch-usable map at portrait width", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl =
      server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      hasTouch: true,
    });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page
      .locator('[data-action="start-tactical-prototype"][data-prototype-id="interdict"]')
      .click();

    const viewport = page.locator(".interdict-sluice__board-viewport");
    const board = page.locator(".interdict-sluice__board");
    const inspector = page.locator(".interdict-sluice__inspector");
    await board.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await afterPaint(page);

    const layout = await page.evaluate(() => {
      const viewportElement = document.querySelector(
        ".interdict-sluice__board-viewport",
      );
      const boardElement = document.querySelector(".interdict-sluice__board");
      const inspectorElement = document.querySelector(
        ".interdict-sluice__inspector",
      );
      const subject = document.querySelector(".interdict-sluice__subject");
      if (
        !(viewportElement instanceof HTMLElement) ||
        !(boardElement instanceof HTMLElement) ||
        !(inspectorElement instanceof HTMLElement) ||
        !(subject instanceof HTMLElement)
      ) {
        return null;
      }
      const viewportBounds = viewportElement.getBoundingClientRect();
      const boardBounds = boardElement.getBoundingClientRect();
      const inspectorBounds = inspectorElement.getBoundingClientRect();
      const subjectBounds = subject.getBoundingClientRect();
      return {
        boardBackground: getComputedStyle(boardElement).backgroundImage,
        boardHeight: boardBounds.height,
        inspectorGap: inspectorBounds.top - viewportBounds.bottom,
        markerHeight: subjectBounds.height,
        markerWidth: subjectBounds.width,
        viewportClientWidth: viewportElement.clientWidth,
        viewportScrollWidth: viewportElement.scrollWidth,
      };
    });

    assert.ok(layout, "The portrait Interdict layout must be measurable.");
    assert.match(
      layout.boardBackground,
      /winter-sluice-isometric\.webp/u,
      "Portrait presentation must retain the illustrated map.",
    );
    assert.ok(
      layout.viewportScrollWidth > layout.viewportClientWidth,
      "Portrait presentation must expose the full spatial scene by horizontal survey.",
    );
    assert.ok(
      layout.boardHeight >= 400 && layout.boardHeight <= 500,
      `Portrait map must remain a bounded scene rather than a card column: ${layout.boardHeight}px.`,
    );
    assert.ok(
      layout.markerWidth >= 44 && layout.markerHeight >= 44,
      `Portrait map markers must remain touch-sized: ${layout.markerWidth}×${layout.markerHeight}px.`,
    );
    assert.ok(
      Math.abs(layout.inspectorGap) <= 1,
      `The active inspector must immediately follow the portrait map: ${layout.inspectorGap}px gap.`,
    );

    const initial = await board.boundingBox();
    await page.locator('[data-tactical-subject-id="field-severer"]').click();
    await afterPaint(page);
    const selected = await board.boundingBox();
    assert.deepEqual(
      selected && { width: selected.width, height: selected.height },
      initial && { width: initial.width, height: initial.height },
      "Portrait subject selection must not resize or replace the map.",
    );
    assert.ok(
      await viewport.evaluate((element) => element.scrollLeft > 0),
      "Selecting a distant portrait marker must bring its authored position into view.",
    );
    assert.equal(
      await inspector.locator("h2").innerText(),
      "Sivra An",
      "Portrait subject selection must update the adjacent inspector.",
    );
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("the persistent text control enlarges type without horizontal overflow", async () => {
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const targetUrl = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    assert.ok(targetUrl, "Vite did not expose a development URL.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    const control = page.locator("[data-text-scale-control]");
    const before = await page.locator(".eyebrow").first().evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    await control.click();
    await control.click();
    await afterPaint(page);

    const result = await page.evaluate(() => {
      const eyebrow = document.querySelector(".eyebrow");
      return {
        scale: document.documentElement.dataset.textScale,
        fontSize: eyebrow ? Number.parseFloat(getComputedStyle(eyebrow).fontSize) : 0,
        overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    assert.equal(result.scale, "largest");
    assert.ok(result.fontSize >= before * 1.45, "Largest must materially enlarge text.");
    assert.equal(result.overflows, false, "Largest must not create page-level horizontal scrolling.");

    await page.reload({ waitUntil: "networkidle" });
    assert.equal(
      await page.locator("html").getAttribute("data-text-scale"),
      "largest",
      "The reading preference must survive navigation and reload.",
    );
  } finally {
    await browser?.close();
    await server.close();
  }
});
