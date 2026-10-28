import { escapeHtml } from "./html";

export interface KnowledgeDisclosure {
  id: string;
  label: string;
  value?: string;
  description: string;
  detail?: string;
  compact?: boolean;
}

export const renderKnowledgeDisclosure = ({
  id,
  label,
  value,
  description,
  detail,
  compact = false,
}: KnowledgeDisclosure): string => `
  <div class="knowledge-disclosure ${compact ? "knowledge-disclosure--compact" : ""}">
    <button
      class="knowledge-disclosure__trigger"
      type="button"
      data-action="toggle-knowledge"
      aria-expanded="false"
      aria-controls="${escapeHtml(id)}"
      aria-describedby="${escapeHtml(id)}"
    >
      <span class="knowledge-disclosure__label">${escapeHtml(label)}</span>
      ${value === undefined ? "" : `<strong>${escapeHtml(value)}</strong>`}
      <span class="knowledge-disclosure__mark" aria-hidden="true">?</span>
    </button>
    <span class="knowledge-disclosure__panel" id="${escapeHtml(id)}" role="note">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(description)}</span>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </span>
  </div>
`;

export const renderCompactKnowledgeLink = ({
  id,
  label,
  value,
  description,
}: Pick<
  KnowledgeDisclosure,
  "id" | "label" | "value" | "description"
>): string => `
  <button
    class="compact-knowledge-link"
    type="button"
    data-action="open-stats"
    data-knowledge-id="${escapeHtml(id)}"
    data-description="${escapeHtml(description)}"
    aria-label="${escapeHtml(`${label}${value === undefined ? "" : ` ${value}`}. ${description} Open Stats for more detail.`)}"
  >
    <span>${escapeHtml(label)}</span>
    ${value === undefined ? "" : `<strong>${escapeHtml(value)}</strong>`}
    <i aria-hidden="true">?</i>
  </button>
`;
