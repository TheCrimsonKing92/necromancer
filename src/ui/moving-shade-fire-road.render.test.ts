import { describe, expect, it } from "vitest";
import { chooseStoryChoice, dismissResultCard } from "../game/engine";
import { chooseStoryApproach } from "../game/engine/story-approach-transitions";
import { createMovingShadePrototypeState } from "../game/content-packs/development-loader";
import { renderApp } from "./render";
import { renderLoadedStoryApproachSurface } from "./story-approach-render-runtime";
import { fireRoadStateFor } from "../game/content-packs/integration/moving-shade-fire-road/state";
import "./development-proof-surface";
import "./story-approach-surface";

describe("Moving Shade Fire Road outcomes", () => {
  it("opens with a local appeal before presenting strategic commitments", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    const markup = renderApp(arrival, { hasSave: false });

    expect(markup).toContain("Sera Vale meets you at the western verge");
    expect(markup).toContain("Those are problems with hands enough");
    expect(markup).toContain("every black vane turned toward you");
    expect(markup).not.toContain("tell me what can still be carried out");
    expect(markup).toContain('data-choice-id="hear-appeal"');
    expect(markup).toContain('data-choice-id="ask-why-me"');
    expect(markup).toContain('data-choice-id="ask-high-shade"');
    expect(markup).toContain('data-choice-id="ask-grain-stakes"');
    expect(markup).not.toContain('data-choice-id="accept-ordinance"');
    expect(markup).not.toContain("Explore another approach");
  });

  it("lets the arrival conversation breathe without closing its other questions", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    const answered = chooseStoryChoice(arrival, "ask-why-me").state;
    const markup = renderApp(answered, { hasSave: false });

    expect(markup).toContain("Find where its terms can be made to fail.");
    expect(markup).toContain("no counsel on carts or bucket lines");
    expect(markup).toContain("bargained with, resisted, or denied its purchase");
    expect(markup).not.toContain('data-choice-id="ask-why-me"');
    expect(markup).toContain('data-choice-id="ask-high-shade"');
    expect(markup).toContain('data-choice-id="ask-grain-stakes"');
    expect(markup).toContain('data-choice-id="hear-appeal"');
  });

  it("features a refused counteroffer while preserving the remaining decisions", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    const state = chooseStoryChoice(arrival, "hear-appeal").state;
    state.run!.seed = 10_368;

    const refused = chooseStoryChoice(state, "counteroffer").state;
    const markup = renderApp(refused, { hasSave: false });

    expect(markup).toContain("The lesser term finds no shelter.");
    expect(markup).toContain("A grain wagon catches fire before the reply comes");
    expect(markup).toContain("One grain wagon is lost to the delay.");
    expect(markup).not.toContain('data-choice-id="counteroffer"');
    expect(markup).toContain('data-choice-id="accept-ordinance"');
    expect(markup).toContain('data-choice-id="ordinary-rescue"');
  });

  it("makes the array decision's immediate and strategic tradeoff legible", async () => {
    const arrival = await createMovingShadePrototypeState("medium");
    const state = chooseStoryChoice(arrival, "hear-appeal").state;
    const markup = renderApp(state, { hasSave: false });

    expect(markup).toContain("Commit every hand to the road");
    expect(markup).toContain("Leave the speaking array intact");
    expect(markup).toContain("Divert hands from the evacuation");
    expect(markup).toContain("Fewer people and wagons may cross");
  });

  it("presents preparation as a primary phase and explains the counteroffer footing", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    const state = chooseStoryChoice(arrival, "hear-appeal").state;
    const markup = renderApp(state, { hasSave: false });

    expect(markup).toContain("Prepare the evacuation");
    expect(markup).toContain("learn what might bend the God&#039;s terms");
    expect(markup.indexOf("Prepare the evacuation")).toBeLessThan(
      markup.indexOf("Accept the ordinance"),
    );
    expect(markup).toContain("No leverage yet makes the lesser term preferable");
    expect(markup).toContain("Weak footing · Poor prospect under present conditions");
    expect(markup).not.toMatch(/\d+% chance/);
    expect(markup).toContain("three black poles");
    expect(markup).toContain("I do not spend shelter upon the uncounted");
  });

  it("does not browse signature methods from other practices", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    const state = chooseStoryChoice(arrival, "hear-appeal").state;
    const markup = renderLoadedStoryApproachSurface(state, {
      open: true,
      axis: "objective",
      facetId: "move-people",
    });

    expect(markup).toContain("Send the servant into the smoke");
    expect(markup).not.toContain("Let the bell keeper finish the alarm");
    expect(markup).not.toContain("Spend grave-salt on a narrow lane");
    expect(markup).not.toContain("Keep the timber bridge joined");
    expect(markup).not.toContain("Not applicable here");
  });

  it("indexes each ordinary method under its resolving capability", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    const state = chooseStoryChoice(arrival, "hear-appeal").state;
    const barter = renderLoadedStoryApproachSurface(state, {
      open: true,
      axis: "capability",
      facetId: "barter",
    });
    const persuasion = renderLoadedStoryApproachSurface(state, {
      open: true,
      axis: "capability",
      facetId: "persuasion",
    });

    expect(barter).toContain("Secure carts and draft teams");
    expect(barter).toContain("Put authority behind a seasonal offer");
    expect(barter).not.toContain("Open the household wells");
    expect(persuasion).toContain("Open the household wells");
    expect(persuasion).not.toContain("Secure carts and draft teams");
    expect(persuasion).not.toContain("Put authority behind a seasonal offer");
  });

  it("authors a featured consequence for reading the host before retaining its benefit", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    let state = chooseStoryChoice(arrival, "hear-appeal").state;
    state = chooseStoryApproach(state, "moving-shade:read-host").state;

    expect(fireRoadStateFor(state.run!).preparationResults).toMatchObject({
      "host-need": expect.any(String),
    });

    const featured = renderLoadedStoryApproachSurface(state, {
      open: true,
      axis: "objective",
      featuredPreparationId: "host-need",
    });
    const settled = renderLoadedStoryApproachSurface(state, {
      open: true,
      axis: "objective",
    });

    expect(featured).toContain("data-preparation-outcome");
    expect(featured).toMatch(/The remount lines betray the ordinance|The host keeps its want behind ordered lines/);
    expect(featured).toMatch(/You gain bargaining leverage|No bargaining leverage was gained/);
    expect(settled).toContain("The host&#039;s supply need is known");
    expect(settled).toContain("Strengthens the seasonal counteroffer");
  });

  it("reports both what was saved and the resulting winter outlook", async () => {
    const arrival = await createMovingShadePrototypeState("summoner");
    let state = chooseStoryChoice(arrival, "hear-appeal").state;
    state.run!.seed = 10_368;
    state = chooseStoryChoice(state, "counteroffer").state;
    state = chooseStoryChoice(state, "ordinary-rescue").state;

    const markup = renderApp(state, { hasSave: false });

    expect(markup).toContain("7 of 18 households reached the road");
    expect(markup).toContain("3 of 12 grain wagons crossed");
    expect(markup).toContain("the eastern settlements must find another supply");
    expect(markup).not.toContain("Replay this practice");

    const developmentMarkup = renderApp(state, {
      hasSave: false,
      developmentTools: true,
      ephemeral: true,
      ephemeralJourneyComplete: true,
    });
    expect(developmentMarkup).toContain("Development proof complete");
    expect(developmentMarkup).toContain('data-action="restart-development-proof"');
    expect(developmentMarkup).toContain(">Choose another practice</button>");

    const dismissed = dismissResultCard(
      state,
      "story-choice",
      "ordinary-rescue",
    ).state;
    const dismissedMarkup = renderApp(dismissed, {
      hasSave: false,
      developmentTools: true,
      ephemeral: true,
      ephemeralJourneyComplete: true,
    });
    expect(dismissedMarkup).not.toContain("The road holds what hands can carry.");
    expect(dismissedMarkup).toContain("Replay this practice");
  });
});
