import { beforeAll, describe, expect, it } from "vitest";
import { createWound } from "../game/anatomy";
import {
  beginNewGame,
  chooseStoryChoice,
  createCharacter,
  openInventory,
  resolveServantBattleCommand,
} from "../game/engine";
import { addItem } from "../game/items";
import {
  beginDitchHandPractice,
  bonebinderStateFor,
} from "../game/practices/bonebinder";
import { setServantServicePurpose } from "../game/practices/bonebinder/advancement-transitions";
import { deployBonebinderServant } from "../game/practices/bonebinder/battle";
import {
  installDitchHandFixture,
  recognizeDitchHandFixture,
} from "../game/practices/bonebinder/fixture";
import { renderApp } from "./render";
import { ensureBonebinderSurface } from "./bonebinder-surface-loader";
import { ensureOptionalScreenSurface } from "./optional-screen-loader";

beforeAll(() => Promise.all([
  ensureBonebinderSurface(),
  ensureOptionalScreenSurface(),
]));

describe("persistent servant presentation", () => {
  it("offers the Bonebinder vertical slice in character creation", () => {
    const markup = renderApp(beginNewGame(), { hasSave: false });
    expect(markup).toContain("Bonebinder");
    expect(markup).toContain("One such servant");
    expect(markup).not.toContain("Ditch-Hand");
  });

  it("renders commands and known persistent context without a turn label", async () => {
    await ensureBonebinderSurface();
    let state = createCharacter(
      "Mara",
      "medium",
      "female",
      42,
    ).state;
    state = installDitchHandFixture(state).state;
    state = recognizeDitchHandFixture(state).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state = deployBonebinderServant(state).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("Direct Ditch-Hand");
    expect(markup).toContain('data-command-id="guard"');
    expect(markup).toContain('data-command-id="interpose"');
    expect(markup).toContain('data-command-id="harry"');
    expect(markup).toContain('data-command-id="withdraw"');
    expect(markup).toContain('<details class="servant-dossier">');
    expect(markup).toContain("Persistent corporeal servant");
    expect(markup).toContain("Mortuary record resolved");
    expect(markup).toContain("Known body evidence recorded");
    expect(markup).not.toContain("Choose your act");
    expect(markup.indexOf("Direct Ditch-Hand")).toBeLessThan(
      markup.indexOf("Witness"),
    );
    expect(markup).not.toContain("rounds remain");
    expect(markup).not.toContain("remainingTurns");

    state = resolveServantBattleCommand(
      state,
      "harry",
      state.run!.battle!.enemies[0]!.id,
    ).state;
    const directed = renderApp(state, { hasSave: false });
    expect(directed).toContain("Direction set");
    expect(directed).toContain("This order remains until changed");
    expect(directed).toContain("Change direction before acting");
    expect(directed).toContain("Choose your act");
    expect(directed.indexOf("Direct Ditch-Hand")).toBeLessThan(
      directed.indexOf("Choose your act"),
    );
    expect(
      resolveServantBattleCommand(state, "interpose").error,
    ).toBeUndefined();
  });

  it("makes material limits and non-field-repair wounds explicit in inventory", async () => {
    await ensureBonebinderSurface();
    let state = installDitchHandFixture(
      createCharacter("Mara", "medium", "female", 42).state,
    ).state;
    const servant = bonebinderStateFor(state.run!)!.servant!;
    servant.combatant.body.torso.condition -= 2;
    servant.combatant.body.head.wounds.push(
      createWound(
        "closed-servant-wound",
        "head",
        "serious",
        "fall",
        "Closed skull injury",
        "humanoid",
        "rest",
      ),
    );
    addItem(state.run!.player.inventory, "mortuary-tallow");
    state = openInventory(state).state;

    const markup = renderApp(state, { hasSave: false });
    expect(markup).toContain("Ditch-Hand · persistent servant");
    expect(markup).toContain('data-action="repair-servant-part"');
    expect(markup).toContain("Reinforce · tallow −1");
    expect(markup).toContain("Requires mortuary rest");
    expect(markup).toContain(
      "Repair history records materials; it is not",
    );
  });

  it("makes the servant discoverable from the header and leads inventory with its dossier", () => {
    const state = beginDitchHandPractice(
      createCharacter(
        "Mara",
        "summoner",
        "female",
        42,
      ).state,
    ).state;
    const story = renderApp(state, { hasSave: false });
    expect(story).toContain("Body, equipment &amp; Ditch-Hand");

    const inventory = renderApp(openInventory(state).state, {
      hasSave: false,
    });
    expect(inventory.indexOf("Ditch-Hand · persistent servant")).toBeLessThan(
      inventory.indexOf(">Equipment<"),
    );
  });

  it("shows a written service in inventory and command economics in battle", async () => {
    await ensureBonebinderSurface();
    let state = installDitchHandFixture(
      createCharacter("Mara", "summoner", "female", 42).state,
    ).state;
    state.run!.player.advancements.push("letter-of-service");
    state = setServantServicePurpose(state, "keep-custody").state;
    const inventory = renderApp(openInventory(state).state, {
      hasSave: false,
    });

    expect(inventory).toContain("Letter of Service");
    expect(inventory).toContain("Keep custody");
    expect(inventory).toContain('data-action="set-servant-service"');

    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state = deployBonebinderServant(state).state;
    const battle = renderApp(state, { hasSave: false });
    expect(battle).toContain("Within the service · 0 Spirit.");
    expect(battle).toContain("Doctrine</dt><dd>Keep custody · compact kept");
  });

  it("shows Called Counsel with the body’s available motions", async () => {
    await ensureBonebinderSurface();
    let state = installDitchHandFixture(
      createCharacter("Mara", "summoner", "female", 42).state,
    ).state;
    state.run!.player.advancements.push("called-counsel");
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state = deployBonebinderServant(state).state;
    const markup = renderApp(state, { hasSave: false });

    expect(markup).toContain('data-action="called-counsel"');
    expect(markup).toContain("Direction required before your act");
    expect(markup).toContain("Call a remembered motion ·");
    expect(markup).toContain("This is a one-round direction");
    expect(markup).toContain("Called Counsel · somatic memory");
  });
});
