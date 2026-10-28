import type { GameState } from "../game/types";
import { renderNotice, renderSiteFooter } from "./app-chrome-render";
import { renderBattle } from "./battle-render";
import { renderEnding } from "./ending-render";
import { renderHome } from "./home-render";
import {
  renderLoadedInventory,
  renderLoadedJournal,
} from "./optional-screen-loader";
import type { RenderContext } from "./render-context";
import {
  renderCreation,
  renderHeader,
} from "./shell-render";
import { renderLoadedStatsSurface } from "./stats-surface-loader";
import { renderStory } from "./story-render";

export {
  battleTargetDescriptionUpdates,
  renderBattleActionGrid,
} from "./battle-render";
export type { RenderContext } from "./render-context";

const renderScreen = (
  state: GameState,
  context: RenderContext,
): string => {
  switch (state.screen) {
    case "home":
      return renderHome(context);
    case "creation":
      return renderCreation();
    case "story":
      return renderStory(
        state,
        context.storyApproachState,
        context.ephemeralJourneyComplete,
      );
    case "battle":
      return renderBattle(state, context);
    case "inventory":
      return renderLoadedInventory(state);
    case "journal":
      return renderLoadedJournal(state);
    case "ending":
      return renderEnding(state);
  }
};

export const renderApp = (
  state: GameState,
  context: RenderContext,
): string => `
  <div class="app-shell" data-screen="${state.screen}" ${state.run ? `data-tradition="${state.run.player.tradition}"` : ""}>
    ${renderHeader(state, context)}
    ${renderScreen(state, context)}
    ${renderLoadedStatsSurface(state, context)}
    ${renderSiteFooter(context.ephemeral)}
    ${renderNotice(context.message)}
  </div>
`;
