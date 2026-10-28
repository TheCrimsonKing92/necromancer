import type { DevelopmentActionTarget } from "../../game/development-action-proof";
import { escapeHtml } from "../html";

export const renderActionProofTarget = (
  actionId: string,
  target: DevelopmentActionTarget,
  offset = 0,
  depth = 0,
  resolvedActionId?: string,
): string => `<button
  class="action-stage__target"
  type="button"
  hidden
  aria-pressed="false"
  data-action="select-action-proof-target"
  data-action-proof-id="${escapeHtml(actionId)}"
  ${resolvedActionId ? `data-resolved-action-id="${escapeHtml(resolvedActionId)}"` : ""}
  data-target-id="${escapeHtml(target.id)}"
  data-target-label="${escapeHtml(target.label)}"
  data-target-detail="${escapeHtml(target.detail)}"
  style="--figure-offset:${offset};--figure-depth:${depth}rem"
  aria-label="Target ${escapeHtml(target.label)}. ${escapeHtml(target.detail)}">
  <span aria-hidden="true"></span>
</button>`;

export const renderActionProofTargetingPanel = (): string => `<aside class="action-stage__targeting" data-action-proof-targeting hidden aria-live="polite" aria-label="Targeting">
  <button class="action-stage__targeting-cancel" type="button" data-action="cancel-action-proof-targeting">Cancel</button>
  <span class="action-stage__targeting-step">Choose a target</span>
  <strong data-action-proof-targeting-title></strong>
  <span data-action-proof-targeting-detail>Choose a marked enemy on the field.</span>
  <button class="action-stage__targeting-confirm" type="button" data-action="confirm-action-proof-target" hidden>Commit</button>
</aside>`;
