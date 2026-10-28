import type { TacticalSceneSubject } from "../game/tactical-scene";
import { escapeHtml } from "./html";

const NEW_COURSES_DESCRIPTION = "New choices are available here.";

const hasUnseenAttention = (
  subject: TacticalSceneSubject,
  seenAttentionKeys?: ReadonlySet<string>,
): boolean => Boolean(
  subject.attention && !seenAttentionKeys?.has(subject.attention.key),
);

export const tacticalSubjectAccessibleLabel = (
  subject: TacticalSceneSubject,
  seenAttentionKeys?: ReadonlySet<string>,
): string => `${subject.label}: ${subject.status}${hasUnseenAttention(subject, seenAttentionKeys)
  ? `. ${NEW_COURSES_DESCRIPTION}`
  : ""}`;

export const tacticalSubjectAttentionAttribute = (
  subject: TacticalSceneSubject,
  seenAttentionKeys?: ReadonlySet<string>,
): string => {
  const attention = subject.attention;
  return attention && hasUnseenAttention(subject, seenAttentionKeys)
    ? ` data-tactical-attention="${escapeHtml(attention.kind)}"`
    : "";
};

export const renderTacticalSubjectAttention = (
  subject: TacticalSceneSubject,
  seenAttentionKeys?: ReadonlySet<string>,
): string => hasUnseenAttention(subject, seenAttentionKeys)
  ? '<span class="tactical-subject-attention" aria-hidden="true"></span>'
  : "";
