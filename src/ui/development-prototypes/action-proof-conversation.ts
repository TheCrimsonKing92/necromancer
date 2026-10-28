import { escapeHtml } from "../html";

export interface ActionProofConversationPortrait {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly position?: string;
}

export interface ActionProofConversationChoice {
  readonly id: string;
  readonly label: string;
  readonly nextBeatId?: string;
  readonly closes?: boolean;
}

export interface ActionProofConversationBeat {
  readonly id: string;
  readonly speakerId: string;
  readonly speakerLabel: string;
  readonly speakerRole: string;
  readonly text: string;
  readonly portrait: ActionProofConversationPortrait;
  readonly choices: readonly ActionProofConversationChoice[];
}

export interface ActionProofConversation {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly initialBeatId: string;
  readonly beats: readonly ActionProofConversationBeat[];
}

export interface ActionProofConversationState {
  readonly conversationId: string;
  readonly beatId: string;
}

export const validateActionProofConversation = (
  conversation: ActionProofConversation,
): readonly string[] => {
  const errors: string[] = [];
  const beats = new Map(conversation.beats.map((beat) => [beat.id, beat]));
  if (!beats.has(conversation.initialBeatId)) errors.push(`${conversation.id}: initial beat does not exist.`);
  for (const beat of conversation.beats) {
    if (!beat.text.trim() || !beat.speakerLabel.trim() || !beat.portrait.src) {
      errors.push(`${conversation.id}/${beat.id}: speaker, text, and portrait are required.`);
    }
    const choices = new Set<string>();
    for (const choice of beat.choices) {
      if (choices.has(choice.id)) errors.push(`${conversation.id}/${beat.id}: duplicate choice ${choice.id}.`);
      choices.add(choice.id);
      if ((choice.nextBeatId ? 1 : 0) + (choice.closes ? 1 : 0) !== 1) {
        errors.push(`${conversation.id}/${beat.id}/${choice.id}: choose exactly one destination.`);
      }
      if (choice.nextBeatId && !beats.has(choice.nextBeatId)) {
        errors.push(`${conversation.id}/${beat.id}/${choice.id}: next beat does not exist.`);
      }
    }
  }
  return errors;
};

export const openActionProofConversation = (
  conversation: ActionProofConversation,
): ActionProofConversationState => ({
  conversationId: conversation.id,
  beatId: conversation.initialBeatId,
});

export const advanceActionProofConversation = (
  conversation: ActionProofConversation,
  state: ActionProofConversationState,
  choiceId: string,
): ActionProofConversationState | undefined => {
  if (state.conversationId !== conversation.id) return state;
  const beat = conversation.beats.find(({ id }) => id === state.beatId);
  const choice = beat?.choices.find(({ id }) => id === choiceId);
  if (!choice || choice.closes) return undefined;
  return { conversationId: conversation.id, beatId: choice.nextBeatId! };
};

export const renderActionProofConversation = (
  conversation: ActionProofConversation,
  state: ActionProofConversationState,
): string => {
  const beat = conversation.beats.find(({ id }) => id === state.beatId)
    ?? conversation.beats.find(({ id }) => id === conversation.initialBeatId);
  if (!beat) return "";
  const portraitStyle = beat.portrait.position
    ? ` style="object-position:${escapeHtml(beat.portrait.position)}"`
    : "";
  return `<section class="action-conversation" role="dialog" aria-modal="true" aria-labelledby="action-conversation-title" data-action-proof-conversation data-conversation-id="${escapeHtml(conversation.id)}" data-conversation-beat-id="${escapeHtml(beat.id)}">
    <div class="action-conversation__portrait" aria-hidden="true">
      <img src="${escapeHtml(beat.portrait.src)}" width="${beat.portrait.width}" height="${beat.portrait.height}" alt="" decoding="async"${portraitStyle}>
    </div>
    <div class="action-conversation__exchange">
      <p class="eyebrow">${escapeHtml(conversation.eyebrow)}</p>
      <h2 id="action-conversation-title" tabindex="-1">${escapeHtml(conversation.title)}</h2>
      <blockquote>
        <p>${escapeHtml(beat.text)}</p>
        <footer><strong>${escapeHtml(beat.speakerLabel)}</strong><span>${escapeHtml(beat.speakerRole)}</span></footer>
      </blockquote>
      <nav class="action-conversation__choices" aria-label="Responses">
        ${beat.choices.map((choice) => `<button type="button" data-action="choose-action-proof-conversation" data-conversation-choice-id="${escapeHtml(choice.id)}">${escapeHtml(choice.label)}</button>`).join("")}
      </nav>
    </div>
    <button class="action-conversation__close" type="button" data-action="close-action-proof-conversation" aria-label="Close conversation">×</button>
  </section>`;
};

