import { renderNotice, renderSiteFooter } from "./app-chrome-render";
import { renderHome } from "./home-render";
import type { RenderContext } from "./render-context";

export const renderBootstrapApp = (context: RenderContext): string => `
  <div class="app-shell" data-screen="home" data-runtime="bootstrap">
    ${renderHome(context)}
    ${renderSiteFooter()}
    ${renderNotice(context.message)}
  </div>
`;
