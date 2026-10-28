import { beforeAll, describe, expect, it } from "vitest";
import {
  beginNewGame,
  chooseAdvancement,
  chooseStoryChoice,
  continueJourney,
  createCharacter,
  dismissResultCard,
  equipItem,
  openInventory,
  resolveBattleAction,
} from "../game/engine";
import { createWound } from "../game/anatomy";
import { STORY_SCENES } from "../game/content";
import { ROAD_EVENTS } from "../game/road-events";
import {
  battleTargetDescriptionUpdates,
  renderApp,
} from "./render";
import { ensureOptionalScreenSurface } from "./optional-screen-loader";
import { ensureEndingSurface } from "./ending-surface-loader";

beforeAll(() => Promise.all([
  ensureOptionalScreenSurface(),
  ensureEndingSurface(),
]));
import { ensureStatsSurface } from "./stats-surface-loader";

describe("HTML rendering", () => {
  it("requires male, female, or other during character creation", () => {
    const markup = renderApp(beginNewGame(), { hasSave: false });

    expect(markup).toContain('name="sex"');
    expect(markup).toContain('value="male"');
    expect(markup).toContain('value="female"');
    expect(markup).toContain('value="other"');
    expect(markup.match(/name="sex"/g)).toHaveLength(3);
    expect(markup.match(/name="sex"[\s\S]*?required/g)).toHaveLength(3);
  });

  it("presents Renderer while retaining the compatible legacy value", () => {
    const markup = renderApp(beginNewGame(), { hasSave: false });

    expect(markup).toContain("Renderer");
    expect(markup).toContain('value="thaumaturgist"');
    expect(markup).not.toContain(">Thaumaturgist<");
  });

  it("escapes character names before placing them in markup", () => {
    const state = createCharacter("<b>Mara</b>", "medium", 1).state;
    const markup = renderApp(state, { hasSave: false });

    expect(markup).toContain("&lt;b&gt;Mara&lt;/b&gt;");
    expect(markup).not.toContain("<b>Mara</b>");
  });

  it("renders equipment, carried items, and all six body regions", () => {
    const story = createCharacter("Mara", "thaumaturgist", 1).state;
    story.run!.player.inventory["black-tonic"] = 1;
    story.run!.player.hp -= 4;
    const state = openInventory(story).state;
    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("Anatomical ledger");
    expect(markup).toContain("Iron sickle");
    expect(markup).toContain("Clean linen binding");
    expect(markup).toContain("<dt>Health</dt><dd>20 / 24</dd>");
    expect(markup).toContain("<dt>Spirit</dt><dd>6 / 6</dd>");
    expect(markup).toContain("Drink · restore 4");
    expect(markup.match(/class="body-part /g)).toHaveLength(6);
    expect(markup).toContain("data-action=\"close-inventory\"");
  });

  it("renders a defeated character's body without treatment or item controls", () => {
    const defeated = createCharacter("Thade", "medium", 1).state;
    const player = defeated.run!.player;
    const wound = createWound(
      "last-wound",
      "rightLeg",
      "grievous",
      "borrowed grief",
    );
    player.body.rightLeg.wounds.push(wound);
    player.inventory["black-tonic"] = 1;
    player.inventory["hooked-knife"] = 1;
    player.hp = 0;
    defeated.screen = "ending";
    defeated.storyId = null;
    defeated.ending = "defeat";

    const state = openInventory(defeated).state;
    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("What remained at death.");
    expect(markup).toContain(
      "Nothing here can be used, treated, or rearranged.",
    );
    expect(markup).toContain("Recorded at death");
    expect(markup).not.toContain('data-action="use-item"');
    expect(markup).not.toContain('data-action="treat-wound"');
    expect(markup).not.toContain('data-action="equip-item"');
    expect(markup).not.toContain('data-action="unequip-item"');
    expect(markup).toContain('data-action="close-inventory"');
  });

  it("shows only the active practice's aftermath option", () => {
    const state = createCharacter("Mara", "summoner", 1).state;
    state.screen = "story";
    state.storyId = "road-aftermath";
    state.run!.player.inventory["hound-tooth"] = 2;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("Teach the hound a new master");
    expect(markup).toContain("Bonebinder practice");
    expect(markup).toContain("Optional action");
    expect(markup).toContain(
      "Follow the map to the hollow tollhouse",
    );
    expect(markup).not.toContain("Summoner only");
    expect(markup).not.toContain("Give Hollis your mouth");
    expect(markup).not.toContain("Bottle the hound’s grave-heat");
  });

  it("grounds a practice choice in the scene before presenting it", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.screen = "story";
    state.storyId = "road-aftermath";

    const before = renderApp(state, { hasSave: true });
    expect(before).toContain(
      "Hollis’s dead tongue moves around an unfinished word.",
    );
    expect(before).toContain("Give Hollis your mouth");

    const communed = chooseStoryChoice(
      state,
      "question-hollis",
    ).state;
    const after = renderApp(communed, { hasSave: true });
    expect(after).toContain("Hollis’s jaw has gone still.");
    expect(after).toContain("Hollis speaks with your teeth.");
    expect(after).toContain("2 Health surrendered");
    expect(after).toContain("Maximum Spirit +1");
    expect(after).toContain("3 Ward reserved for Saint Orra");
    expect(after).toContain('data-action="dismiss-result"');
    expect(after).not.toContain(
      "Hollis’s dead tongue twitches around an unfinished word.",
    );

    const dismissed = dismissResultCard(
      communed,
      "story-choice",
      "question-hollis",
    ).state;
    const cleared = renderApp(dismissed, { hasSave: true });
    expect(cleared).not.toContain("Hollis speaks with your teeth.");
    expect(dismissed.run?.player.maxSpirit).toBe(
      communed.run?.player.maxSpirit,
    );
  });

  it("previews how carried equipment changes combat and wounds", () => {
    const story = createCharacter(
      "Mara",
      "thaumaturgist",
      1,
    ).state;
    story.run!.player.inventory["hooked-knife"] = 1;
    const state = openInventory(story).state;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toMatch(
      /Weapon trauma\s+raises wound severity only when damage gets through\./,
    );
    expect(markup).toContain("Readied damage 3 → 4");
    expect(markup).toContain("Trauma 1 → 2");
    expect(markup).toContain(
      "Off-hand strike damage 0 → 2",
    );
    expect(markup).toContain("replaces Iron sickle");
  });

  it("presents competing charms as an explicit sidegrade", () => {
    const story = createCharacter("Mara", "medium", 1).state;
    story.run!.player.inventory["saint-bone-charm"] = 1;
    story.run!.player.inventory["debtor-tally"] = 1;
    let state = openInventory(story).state;
    state = equipItem(
      state,
      "saint-bone-charm",
      "charm",
    ).state;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("Debtor’s tally");
    expect(markup).toContain("Attack 4 → 5");
    expect(markup).toContain("Defense 3 → 2");
    expect(markup).toContain("replaces Saint-bone charm");
  });

  it("states exactly what each wound changes", () => {
    const story = createCharacter("Mara", "medium", 1).state;
    story.run!.player.body.rightArm.wounds.push(
      createWound(
        "arm-test",
        "rightArm",
        "serious",
        "a hooked knife",
      ),
    );
    story.run!.player.body.leftLeg.wounds.push(
      createWound(
        "leg-test",
        "leftLeg",
        "serious",
        "a raking bite",
      ),
    );
    story.run!.player.scars.push({
      id: "scar-arm",
      part: "rightArm",
      label: "Pale binding line",
      source: "an older wound",
      conditionPenalty: 1,
    });
    const state = openInventory(story).state;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("−1 Attack");
    expect(markup).toContain("−1 Defense");
    expect(markup).toContain("−10 points to flee chance");
    expect(markup).toContain(
      "Loses 1 Health each round until dressed",
    );
    expect(markup).toContain("Wound effects");
    expect(markup).toContain(
      "3 recoveries before the slowest injury resolves",
    );
    expect(markup).toContain("Pale binding line");
    expect(markup).toContain("−1 maximum condition");
    expect(markup).toContain("Dress · 60%");
    expect(markup).toContain(
      "Medicine 0 (Untrained). Failure spends the binding.",
    );
  });

  it("frames a wound without an immediate penalty as recovery, not danger", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.run!.player.body.torso.wounds.push(
      createWound(
        "minor-torso",
        "torso",
        "minor",
        "a glancing knife",
      ),
    );

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain('class="dossier__notice"');
    expect(markup).toContain("No immediate combat penalty");
    expect(markup).toContain(
      "2 recoveries before the slowest injury resolves; closed injuries heal with safe rest",
    );
    expect(markup).not.toContain('class="dossier__warning"');
  });

  it("opens the reliquary counter after Saint Orra", () => {
    const story = createCharacter("Mara", "medium", 1).state;
    story.run!.battlesWon = 2;
    story.storyId = "saint-orra-aftermath";
    story.run!.player.obols = 6;
    story.run!.player.inventory["hooked-knife"] = 1;
    const state = openInventory(story).state;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("The reliquary broker");
    expect(markup).toContain("6 black obols");
    expect(markup).toContain('data-action="sell-item"');
    expect(markup).toContain("Sell · 6 obols");
    expect(markup).toContain('data-action="buy-item"');
    expect(markup).toContain("Buy · 6");
  });

  it("keeps story open while exposing a persistent discipline surface", async () => {
    await ensureStatsSurface();
    const state = createCharacter("Mara", "medium", 1).state;
    state.run!.player.level = 2;
    state.run!.player.xp = 25;

    const offer = renderApp(state, { hasSave: true });
    expect(offer).toContain('data-action="open-stats"');
    expect(offer).toContain("1 unspent discipline point");
    expect(offer).toContain('data-choice-id="attune"');

    const tree = renderApp(state, {
      hasSave: true,
      statsOpen: true,
      selectedAdvancementId: "two-way-passage",
    });
    expect(tree).toContain("Stats &amp; disciplines");
    expect(tree).toContain("Level II");
    expect(tree).toContain("Body &amp; equipment");
    expect(tree).toContain('data-action="open-journal"');
    expect(tree).toContain("Medium practice");
    expect(tree).toContain("The body");
    expect(tree).toContain("Necromancy");
    expect(tree).toContain("Mundane training");
    expect(tree).toContain("Two-way Passage");

    const characterPane = renderApp(state, {
      hasSave: true,
      statsOpen: true,
      statsPane: "character",
    });
    expect(characterPane).toContain('data-stats-pane="character"');
    expect(characterPane).toContain("Present condition");
    expect(characterPane).toContain("Mundane skills");
    expect(characterPane).not.toContain("advancement-workspace");
    expect(tree).toContain("Echoing Passage");
    expect(tree).toContain("Requires level 3.");
    expect(tree).toContain("Hardened Vessel");
    expect(tree).toContain("Deepened Well");
    expect(tree).toContain("Spirit Lash draws 2 Ward instead of 1.");
    expect(tree).toContain('data-action="confirm-advancement"');
    expect(tree).toContain(
      'data-action="select-advancement"',
    );
    expect(tree).toContain('aria-pressed="true"');
    expect(tree).toContain('aria-label="Prerequisite path"');
    expect(tree).toContain("This choice is permanent");
    expect(tree).not.toContain(
      'data-action="choose-advancement"',
    );

    const chosen = chooseAdvancement(
      state,
      "two-way-passage",
    ).state;
    const result = renderApp(chosen, {
      hasSave: true,
      statsOpen: true,
      selectedAdvancementId: "two-way-passage",
    });
    expect(result).toContain("Discipline claimed");
    expect(result).toContain(
      "The passage through you opens both ways.",
    );
    expect(result).toContain('data-choice-id="attune"');
    expect(result).toContain("Disciplines");

    const dismissed = dismissResultCard(
      chosen,
      "advancement",
      "two-way-passage",
    ).state;
    const cleared = renderApp(dismissed, {
      hasSave: true,
      statsOpen: true,
    });
    expect(cleared).not.toContain("Discipline claimed");
    expect(cleared).toContain("Two-way Passage");
  });

  it("attributes modified combat actions to learned disciplines", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state.run!.player.level = 2;
    state.run!.player.xp = 25;
    state = chooseAdvancement(
      state,
      "two-way-passage",
    ).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toMatch(
      /combat-action__sources[^>]*>[\s\S]*?Two-way Passage/,
    );
    expect(markup).toContain("draw 2 Ward from the crossing");
  });

  it("describes Strike through the readied weapons instead of telling the player to commit one", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state.run!.player.equipment.offHand = "hooked-knife";

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain(
      "Drive the ritual knife at one enemy for 2 base physical damage.",
    );
    expect(markup).toContain(
      "Hollis’s hooked knife follows from the off hand for +2, bringing the strike to 4.",
    );
    expect(markup).not.toContain("Commit Ritual knife");
  });

  it("keeps hidden outcomes out of narrative choice descriptions", () => {
    const choiceCopy = Object.values(STORY_SCENES)
      .flatMap((scene) =>
        typeof scene.choices === "function" ? [] : scene.choices,
      )
      .concat(
        Object.values(ROAD_EVENTS).flatMap(
          (event) => event.choices,
        ),
      )
      .map((choice) => choice.detail)
      .join(" ");

    expect(choiceCopy).not.toMatch(
      /Every enemy begins wounded|\+1 maximum Spirit|Begin the encounter with 6 Ward|serious, bleeding wound/,
    );
  });

  it("marks optional bargains whose cost is not fully knowable in advance", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.screen = "story";
    state.storyId = "road-aftermath";

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toMatch(
      /data-choice-id="read-ledger"[\s\S]*?Uncertain risk/,
    );
    expect(markup).toContain(
      "Ward-names sometimes notice who turns them.",
    );
    expect(markup).not.toContain(
      "You begin Exposed 1 for 2 rounds",
    );

    state.storyId = "saint-orra-aftermath";
    const aftermath = renderApp(state, { hasSave: true });
    expect(aftermath).toMatch(
      /data-choice-id="dress-saint-wounds"[\s\S]*?Tradeoff/,
    );
  });

  it("makes the ward-name's opening match whether its risk actually occurs", () => {
    const markedStart = createCharacter("Mara", "medium", 1).state;
    markedStart.screen = "story";
    markedStart.storyId = "road-aftermath";
    markedStart.run!.seed = 1;
    const marked = chooseStoryChoice(
      markedStart,
      "read-ledger",
    ).state;
    const markedMarkup = renderApp(marked, { hasSave: true });

    expect(markedMarkup).toContain("one pale eye");
    expect(markedMarkup).toContain("It looks your way");
    expect(markedMarkup).toContain(
      "you begin Exposed 1 for 2 rounds",
    );

    const passedStart = createCharacter(
      "Mara",
      "medium",
      12_345,
    ).state;
    passedStart.screen = "story";
    passedStart.storyId = "road-aftermath";
    passedStart.run!.seed = 12_345;
    const passed = chooseStoryChoice(
      passedStart,
      "read-ledger",
    ).state;
    const passedMarkup = renderApp(passed, { hasSave: true });

    expect(passedMarkup).toContain("considers looking back");
    expect(passedMarkup).toContain("passes over you");
    expect(passedMarkup).not.toContain("one pale eye");
    expect(passedMarkup).not.toContain("you begin Exposed");
  });

  it("reserves linen controls for open wounds and sends concussions to rest", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.run!.player.body.head.wounds.push(
      createWound(
        "closed-head-injury",
        "head",
        "serious",
        "a fall on stone",
      ),
    );

    const markup = renderApp(openInventory(state).state, {
      hasSave: true,
    });

    expect(markup).toContain("Concussion");
    expect(markup).toContain("needs safe rest");
    expect(markup).toContain("Needs safe rest");
    expect(markup).toContain("3 recoveries before healing");
    expect(markup).not.toContain("closure may scar");
    expect(markup).not.toMatch(
      /data-wound-id="closed-head-injury"[\s\S]*?>\s*Dress\s*</,
    );
  });

  it("renders friendly and neutral road interludes as full scenes without a battle frame", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "mourning-caravan";

    const friendly = renderApp(state, { hasSave: true });
    expect(friendly).toContain("A Mourning Caravan");
    expect(friendly).toContain("Sit for one bowl");
    expect(friendly).toContain("Leave them their fire");
    expect(friendly).not.toContain("Choose an enemy");

    state.run!.roadEvent = "hedge-surgeon";
    const neutral = renderApp(state, { hasSave: true });
    expect(neutral).toContain("The Barber’s Awning");
    expect(neutral).toContain("linen will not mend a damaged brain");
    expect(neutral).toContain(
      "Ask what he keeps for occult exhaustion",
    );
    expect(neutral).toContain("Persuasion");
    expect(neutral).toContain("Keep your relics");
  });

  it("keeps Iven's failed cordial bargain consistent from title through departure", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "hedge-surgeon";
    state.run!.flags.push(
      "story-choice:road-interlude:bargain-for-vigil-cordial",
      "iven-cordial-result:failure:30:43:0",
    );

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("The case remains shut.");
    expect(markup).toContain(
      "Persuasion check · 30% chance · rolled 43: failure",
    );
    expect(markup).toContain(
      "Leave Iven and his locked case beneath the awning",
    );
    expect(markup).not.toContain("A brown vial changes hands.");
    expect(markup).not.toContain("Leave the empty brown vial");
  });

  it("reports a road delay without revealing how unseen opposition will use it", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "ditch-burial";

    const helped = chooseStoryChoice(
      state,
      "help-ditch-burial",
    ).state;
    const markup = renderApp(helped, { hasSave: true });

    expect(markup).toContain("5 experience gained");
    expect(markup).toContain("Clean linen +1");
    expect(markup).toContain("Time surrendered on the road");
    expect(markup).toContain("Return to the road");
    expect(markup).toContain(
      "Take the gravediggers’ thanks and follow the names north.",
    );
    expect(markup).toContain(
      "The coffin rests level beside a new-cut grave.",
    );
    expect(markup).not.toContain(
      "Leave the gravediggers their rope",
    );
    expect(markup).not.toContain(
      "trying to lift a rain-swollen coffin",
    );
    expect(markup).not.toContain("final opposition");
    expect(markup).not.toContain("gains 2 Ward");
  });

  it("removes settled scene choices while retaining the result and onward route", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "disputed-bundle";
    state = chooseStoryChoice(state, "inspect-disputed-bundle").state;
    state = chooseStoryChoice(state, "release-bundle-to-broker").state;

    const markup = renderApp(state, { hasSave: true });
    expect(markup).toContain("Oren Vask sets the sealed bundle");
    expect(markup).toContain("Custody transferred");
    expect(markup).toContain("Leave the two records behind");
    expect(markup).not.toContain('data-choice-id="inspect-disputed-bundle"');
    expect(markup).not.toContain('data-choice-id="leave-bundle-with-burial-crew"');
    expect(markup).not.toContain('data-choice-id="release-bundle-to-broker"');
  });

  it("keeps Health as the life counter and advertises the rebalanced Spirit Lash", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("3 base occult damage");
    expect(markup).toContain('aria-label="Health"');
    expect(markup).not.toContain('aria-label="Vitality"');
    expect(markup).toContain(
      "Vitality 4. Constitution and recovery.",
    );
    expect(markup).toContain("Mundane skills");
    expect(markup).toContain(
      "Medicine 0 · Untrained. Diagnosing injury",
    );
    expect(markup).not.toContain("title=");
    expect(markup).toContain("Current hit chance:");
    expect(markup).toContain('class="battle-summary"');
    expect(markup).toContain("Current combat condition");
    expect(markup).toContain("data-log-id=");
    expect(markup).not.toContain('<ol aria-live="polite"');
  });

  it("computes target-dependent action text without rebuilding the action grid", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    const [first, second] = state.run!.battle!.enemies;
    second!.defense += 4;

    const firstChances = battleTargetDescriptionUpdates(
      state,
      first!.id,
    );
    const secondChances = battleTargetDescriptionUpdates(
      state,
      second!.id,
    );

    expect(firstChances.length).toBeGreaterThan(0);
    expect(firstChances).not.toEqual(secondChances);
    expect(
      firstChances.every(({ hitChance }) => hitChance > 0),
    ).toBe(true);
  });

  it("shows the next enemy actions and spells out timed effects", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state.run!.battle!.round = 3;
    state.run!.player.statuses = [
      { id: "burning", potency: 2, turns: 2 },
    ];
    state.run!.battle!.enemies[0]!.statuses = [
      { id: "exposed", potency: 1, turns: 1 },
    ];

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("Next action");
    expect(markup).toContain("hooked knife");
    expect(markup).toContain(
      "Hollis turns the hook inward and waits for you to commit.",
    );
    expect(markup).toContain(
      "Physical attack · High wound risk",
    );
    expect(markup).toContain(
      "Burning 2 · lose 2 Health when the exchange closes · 2 rounds remain",
    );
    expect(markup).toContain(
      "Exposed 1 · −1 Defense and Evasion · 1 round remains",
    );
  });

  it("removes completed interactions without removing the onward route", () => {
    const state = createCharacter("Mara", "summoner", 1).state;
    state.screen = "story";
    state.storyId = "road-aftermath";
    state.run!.player.inventory["hound-tooth"] = 1;
    state.run!.flags.push(
      "story-choice:road-aftermath:bind-hound",
    );

    const markup = renderApp(state, { hasSave: true });

    expect(markup).not.toContain('data-choice-id="bind-hound"');
    expect(markup).toMatch(
      /data-choice-id="leave-aftermath"[\s\S]*?Follow the map/,
    );
  });

  it("carries the decisive combat narration onto the ending", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state.run!.battle!.enemies[0]!.hp = 1;
    state.run!.battle!.enemies[1]!.hp = 0;
    state = resolveBattleAction(
      state,
      "strike",
      "road-reeve",
    ).state;
    const decisiveEntry = [...state.run!.battle!.log].reverse().find(
      (entry) => entry.tone === "player",
    );

    const markup = renderApp(state, { hasSave: true });

    expect(state.screen).toBe("ending");
    expect(decisiveEntry).toBeDefined();
    expect(markup).toContain("Final exchange");
    expect(markup).toContain("How it ended");
    expect(markup).toContain(decisiveEntry!.text);
    expect(markup).toContain("The road is yours.");
  });

  it("continues after the first two victories and closes after the wake", () => {
    const state = createCharacter("Mara", "medium", 1).state;
    state.screen = "ending";
    state.storyId = null;
    state.ending = "victory";
    state.run!.battlesWon = 1;

    const interlude = renderApp(state, { hasSave: true });
    expect(interlude).toContain("data-action=\"continue-journey\"");
    expect(interlude).toContain("Take the road to the tollhouse");

    state.run!.battlesWon = 2;
    state.run!.player.level = 3;
    state.run!.player.xp = 60;
    state.run!.player.advancements = [
      "two-way-passage",
      "echoing-passage",
    ];
    const saintInterlude = renderApp(state, {
      hasSave: true,
    });
    expect(saintInterlude).toContain(
      "Every stolen name escapes at once.",
    );
    expect(saintInterlude).toContain(
      "Follow the names into the rain",
    );

    state.run!.battlesWon = 3;
    const finale = renderApp(state, { hasSave: true });
    expect(finale).toContain("Opening testament complete");
    expect(finale).toContain(
      "The Black Mile releases its breath.",
    );
    expect(finale).not.toContain("data-action=\"continue-journey\"");
  });

  it("uses the completed encounter rather than a stale victory counter", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state.run!.battle!.encounterId = "saint-orra";
    state.run!.battle!.outcome = "victory";
    state.run!.battlesWon = 1;
    state.screen = "ending";
    state.ending = "victory";

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("Every stolen name escapes at once.");
    expect(markup).not.toContain("Hollis Vane will collect no more tolls");
    expect(continueJourney(state).state.storyId).toBe(
      "saint-orra-aftermath",
    );
  });

  it("uses the selected wake’s prose in its scene and battle frame", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state.storyId = "black-mile-wake";
    state.run!.wakeVariant = "name-thieves";

    const scene = renderApp(state, { hasSave: true });
    expect(scene).toContain("Black Mile · The Name Market");
    expect(scene).toContain("Two mouths for every name");
    expect(scene).toContain("hooked stylus");
    expect(scene).not.toContain("A widow woven from weather");

    state = chooseStoryChoice(
      state,
      "wake-guarded",
    ).state;
    const battle = renderApp(state, { hasSave: true });
    expect(battle).toContain(
      "Keep your name behind your teeth.",
    );
    expect(battle).toContain("The Redactor");
    expect(battle).toContain("Cantor Without Tongue");

    state.screen = "ending";
    state.ending = "victory";
    state.run!.battlesWon = 3;
    state.run!.battle!.outcome = "victory";
    const ending = renderApp(state, { hasSave: true });
    expect(ending).toContain(
      "Your name survives its editors.",
    );
    expect(ending).toContain(
      "The Redactor’s last correction",
    );
  });

  it("tracks every concurrent shade instead of only the first", () => {
    let state = createCharacter("Mara", "summoner", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    state = resolveBattleAction(state, "raise-shade").state;
    const bound = state.run!.battle!.allies[0]!;
    state.run!.battle!.allies.push({
      ...structuredClone(bound),
      id: "ash-shade",
      name: "Ash-hound shade",
      lifetime: {
        kind: "temporary",
        remainingTurns: 2,
      },
    });

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain("Bound shade · 2 rounds remain");
    expect(markup).toContain(
      "Ash-hound shade · 2 rounds remain",
    );
    expect(markup.match(/class="ally-note"/g)).toHaveLength(2);
  });

  it("shows Ward still held by an enemy", () => {
    let state = createCharacter("Mara", "medium", 1).state;
    state = chooseStoryChoice(state, "attune").state;
    state = chooseStoryChoice(state, "open-ground").state;
    const enemy = state.run!.battle!.enemies[0]!;
    enemy.ward = 4;

    const markup = renderApp(state, { hasSave: true });

    expect(markup).toContain(
      `${enemy.hp} / ${enemy.maxHp} Health · 4 Ward`,
    );
  });
});
