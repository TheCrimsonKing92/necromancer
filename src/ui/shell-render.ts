import { maximumHealthFromAttributes } from "../game/character";
import { availableDisciplinePoints } from "../game/advancements";
import { TRADITIONS } from "../game/content";
import { journalEntryCount } from "../game/journal-count";
import type { GameState } from "../game/types";
import { escapeHtml } from "./html";
import { inventoryQuantity } from "./player-presentation";
import type { RenderContext } from "./render-context";

const renderBrand = (compact = false): string => `
  <button class="brand ${compact ? "brand--compact" : ""}" type="button" data-action="go-home" aria-label="Return to title screen">
    <span class="brand__sigil" aria-hidden="true">N</span>
    <span class="brand__wordmark">Necromancer</span>
  </button>
`;

export const renderHeaderContents = (
  state: GameState,
  context: RenderContext,
): string => {
  const player = state.run?.player;
  const inventoryIsOpen = state.screen === "inventory";
  const journalIsOpen = state.screen === "journal";
  const underlyingScreen = inventoryIsOpen
    ? state.inventoryReturnScreen
    : journalIsOpen
      ? state.journalReturnScreen
      : state.screen;
  const canUseInventory =
    underlyingScreen === "story" || underlyingScreen === "ending";
  const canUseJournal =
    underlyingScreen === "story" ||
    underlyingScreen === "battle" ||
    underlyingScreen === "ending";
  const disciplinePoints = player
    ? availableDisciplinePoints(player)
    : 0;
  const servantName = state.run?.practiceStates?.bonebinder?.servant?.identity.useName;
  const inventoryLabel = servantName
    ? `Body, equipment &amp; ${escapeHtml(servantName)}`
    : "Body &amp; equipment";

  return `
      ${renderBrand(true)}
      <div class="header-tools">
        ${
          player
              ? `<button
                class="header-inventory header-stats ${disciplinePoints > 0 ? "header-stats--available" : ""}"
                type="button"
                data-stats-control
                data-action="${context.statsOpen ? "close-stats" : "open-stats"}"
                aria-expanded="${Boolean(context.statsOpen)}"
                aria-controls="stats-surface"
              >
                Stats
                ${disciplinePoints > 0 ? `<span data-stats-points-badge aria-label="${disciplinePoints} unspent discipline ${disciplinePoints === 1 ? "point" : "points"}">${disciplinePoints}</span>` : ""}
              </button>`
            : ""
        }
        ${
          player && inventoryIsOpen
            ? `<button
                class="header-inventory"
                type="button"
                data-action="close-inventory"
              >
                Return
              </button>`
            : ""
        }
        ${
          player && journalIsOpen && canUseInventory
            ? `<button
                class="header-inventory"
                type="button"
                data-action="journal-to-inventory"
              >
                ${inventoryLabel}
                <span>${inventoryQuantity(player)}</span>
              </button>`
            : ""
        }
        ${
          player && journalIsOpen
            ? `<button
                class="header-inventory"
                type="button"
                data-action="close-journal"
              >
                Return
              </button>`
            : ""
        }
        ${
          player &&
          !inventoryIsOpen &&
          !journalIsOpen &&
          canUseInventory
            ? `<button
                class="header-inventory"
                type="button"
                data-action="open-inventory"
              >
                ${inventoryLabel}
                <span>${inventoryQuantity(player)}</span>
              </button>`
            : ""
        }
        ${
          player && inventoryIsOpen && canUseJournal
            ? `<button
                class="header-inventory"
                type="button"
                data-action="inventory-to-journal"
              >
                Journal
                <span>${journalEntryCount(state.run!)}</span>
              </button>`
            : ""
        }
        ${
          player &&
          !inventoryIsOpen &&
          !journalIsOpen &&
          canUseJournal
            ? `<button
                class="header-inventory"
                type="button"
                data-action="open-journal"
              >
                Journal
                <span>${journalEntryCount(state.run!)}</span>
              </button>`
            : ""
        }
        ${
          player
            ? `<div class="header-character">
                <span>${escapeHtml(player.name)}</span>
                <span class="header-character__detail">Lv. ${player.level} ${escapeHtml(TRADITIONS[player.tradition].name)}</span>
              </div>`
            : `<span class="header-character__detail">A new testament</span>`
        }
      </div>
  `;
};

export const renderHeader = (
  state: GameState,
  context: RenderContext,
): string =>
  state.screen === "home"
    ? ""
    : `<header class="site-header">${renderHeaderContents(state, context)}</header>`;

export const renderCreation = (): string => `
  <main class="page page--creation">
    <section class="page-heading">
      <p class="eyebrow">An unsigned testament</p>
      <h1 data-page-title tabindex="-1">Name what answers.</h1>
      <p>
        A practice is where your education began—not where your story must end.
      </p>
    </section>

    <form class="creation-form" id="character-form">
      <div class="field">
        <label for="character-name">Your use-name</label>
        <p class="field__hint" id="name-hint">Two to twenty-four characters. Keep your true name elsewhere.</p>
        <input
          id="character-name"
          name="characterName"
          type="text"
          minlength="2"
          maxlength="24"
          autocomplete="off"
          aria-describedby="name-hint"
          required
        />
      </div>

      <fieldset class="sex-fieldset">
        <legend>Sex</legend>
        <p class="field__hint">This determines the pronouns written into your testament.</p>
        <div class="sex-grid">
          ${(["male", "female", "other"] as const)
            .map(
              (sex) => `
                <label class="sex-option">
                  <input
                    type="radio"
                    name="sex"
                    value="${sex}"
                    required
                  />
                  <span>${sex[0]!.toUpperCase()}${sex.slice(1)}</span>
                </label>
              `,
            )
            .join("")}
        </div>
      </fieldset>

      <fieldset class="tradition-fieldset">
        <legend>Choose a practice</legend>
        <div class="tradition-grid">
          ${Object.values(TRADITIONS)
            .map(
              (tradition, index) => `
                <label class="tradition-card">
                  <input
                    type="radio"
                    name="tradition"
                    value="${tradition.id}"
                    ${index === 0 ? "checked" : ""}
                  />
                  <span class="tradition-card__index">0${index + 1}</span>
                  <span class="tradition-card__name">${escapeHtml(tradition.name)}</span>
                  <span class="tradition-card__epithet">${escapeHtml(tradition.epithet)}</span>
                  <span class="tradition-card__description">${escapeHtml(tradition.description)}</span>
                  <span class="tradition-card__stats">
                    ${maximumHealthFromAttributes(tradition.startingAttributes)} Health ·
                    ${tradition.startingSpirit} Spirit
                  </span>
                </label>
              `,
            )
            .join("")}
        </div>
      </fieldset>

      <div class="form-actions">
        <button class="button button--primary" type="submit">
          Sign the testament
        </button>
        <button class="text-button" type="button" data-action="go-home">
          Return to title
        </button>
      </div>
    </form>
  </main>
`;
