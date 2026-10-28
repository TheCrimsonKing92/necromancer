import type {
  ChronicleReadModel,
  ChronicleTestamentEntry,
} from "../game/chronicle";
import type { TestamentEndReason } from "../game/types";
import { renderSiteFooter } from "./app-chrome-render";
import { escapeHtml } from "./html";

const END_REASON_LABELS: Record<TestamentEndReason, string> = {
  death: "Died",
  completion: "Completed",
  withdrawal: "Withdrew",
  retirement: "Retired",
  yielding: "Yielded",
  disappearance: "Disappeared",
};

const renderTestament = (entry: ChronicleTestamentEntry): string => `
  <li class="chronicle-entry">
    <div class="chronicle-entry__number" aria-hidden="true">${String(entry.ordinal).padStart(2, "0")}</div>
    <div class="chronicle-entry__body">
      <p class="eyebrow">${escapeHtml(END_REASON_LABELS[entry.endReason])} Â· Level ${entry.level}</p>
      <h2>${escapeHtml(entry.useName)}</h2>
      <p>${escapeHtml(entry.practiceName)} Â· ${entry.experience} experience Â· ${entry.battlesWon} ${entry.battlesWon === 1 ? "battle" : "battles"} survived</p>
      <p class="chronicle-entry__closing">Final Health: ${entry.finalHealth} / ${entry.maximumHealth}${entry.hasSuccessor ? " Â· A successor followed" : ""}</p>
    </div>
  </li>
`;

export const renderChronicle = (
  chronicle: ChronicleReadModel | null,
): string => `
  <div class="app-shell" data-screen="chronicle" data-runtime="chronicle">
    <main class="chronicle-page">
      <header class="chronicle-heading">
        <div>
          <p class="eyebrow">Campaign record</p>
          <h1 data-page-title tabindex="-1">The Chronicle</h1>
          <p>
            Previous testaments are recorded here for you, not supplied to the
            living character. Their Journal still requires knowledge, accounts,
            or evidence found inside Maldirin.
          </p>
        </div>
        <button class="button button--secondary" type="button" data-action="close-chronicle">
          Return to title
        </button>
      </header>
      ${
        !chronicle || chronicle.testaments.length === 0
          ? `<p class="chronicle-empty">No testament in this campaign has closed.</p>`
          : `<ol class="chronicle-list">${chronicle.testaments.map(renderTestament).join("")}</ol>`
      }
      ${
        chronicle?.hasActiveTestament
          ? `<p class="chronicle-open-note">The current testament remains open and is not entered among the closed.</p>`
          : ""
      }
    </main>
    ${renderSiteFooter()}
  </div>
`;
