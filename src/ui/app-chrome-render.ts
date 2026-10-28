import { escapeHtml } from "./html";

export const renderSiteFooter = (ephemeral = false): string => `
  <footer class="site-footer">
    <span>Necromancer · Opening testament</span>
    <span>${ephemeral ? "Development proof · Progress is not saved" : "Autosaves locally · No account required"}</span>
  </footer>
`;

export const renderNotice = (message?: string): string => `
  <div class="notice ${message ? "notice--visible" : ""}" role="status" aria-live="polite">
    ${message ? escapeHtml(message) : ""}
  </div>
`;
