import {
  campaignPreparationsFor,
  knownFactsFor,
} from "../game/journal";
import type { GameState } from "../game/types";
import {
  journalWorldReadModelFor,
  type JournalWorldEntry,
} from "../game/world/read-model";
import { escapeHtml } from "./html";
import { renderMissingState } from "./missing-state-render";

const renderDisclosureEntries = (
  entries: JournalWorldEntry[],
): string =>
  entries
    .map(
      (entry) => `
        <details class="journal-disclosure">
          <summary>
            <span>${escapeHtml(entry.title)}</span>
            <span>${escapeHtml(entry.kind)}</span>
          </summary>
          <p>${escapeHtml(entry.summary)}</p>
        </details>
      `,
    )
    .join("");

const renderDisclosureSection = ({
  id,
  eyebrow,
  title,
  entries,
  empty,
}: {
  id: string;
  eyebrow: string;
  title: string;
  entries: JournalWorldEntry[];
  empty: string;
}): string => `
  <section class="journal-section" aria-labelledby="${id}">
    <div class="journal-section__heading">
      <div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2 id="${id}">${escapeHtml(title)}</h2>
      </div>
      <span>${entries.length} recorded</span>
    </div>
    ${
      entries.length > 0
        ? `<div class="journal-disclosures">${renderDisclosureEntries(entries)}</div>`
        : `<p class="journal-empty">${escapeHtml(empty)}</p>`
    }
  </section>
`;

export const renderJournal = (state: GameState): string => {
  const run = state.run;
  if (!run) return renderMissingState();

  const preparations = campaignPreparationsFor(run);
  const knownFacts = knownFactsFor(run);
  const world = journalWorldReadModelFor(run);
  const activeCount = preparations.filter(
    ({ status }) => status === "active",
  ).length;

  return `
    <main class="journal-page">
      <header class="journal-heading">
        <p class="eyebrow">The record you keep</p>
        <h1 data-page-title tabindex="-1">Journal</h1>
        <p>Preparations, witnessed deeds, and facts your character can name. What remains secret elsewhere is not written here.</p>
      </header>

      <section class="journal-section" aria-labelledby="journal-preparations">
        <div class="journal-section__heading">
          <div>
            <p class="eyebrow">Carried forward</p>
            <h2 id="journal-preparations">Campaign preparations</h2>
          </div>
          <span>${activeCount} active</span>
        </div>
        ${
          preparations.length > 0
            ? `<div class="journal-grid">
                ${preparations
                  .map(
                    (entry) => `
                      <article class="journal-entry ${entry.status === "spent" ? "journal-entry--spent" : ""}">
                        <div class="journal-entry__meta">
                          <span>${escapeHtml(entry.source)}</span>
                          <span>${entry.status}</span>
                        </div>
                        <h3>${escapeHtml(entry.name)}</h3>
                        <p>${escapeHtml(entry.description)}</p>
                      </article>
                    `,
                  )
                  .join("")}
              </div>`
            : `<p class="journal-empty">No preparation has been carried beyond its scene yet.</p>`
        }
      </section>

      <section class="journal-section" aria-labelledby="journal-known-facts">
        <div class="journal-section__heading">
          <div>
            <p class="eyebrow">What your character knows</p>
            <h2 id="journal-known-facts">Recorded facts</h2>
          </div>
          <span>${knownFacts.length} known</span>
        </div>
        ${
          knownFacts.length > 0
            ? `<div class="journal-grid">
                ${knownFacts
                  .map(
                    (fact) => `
                      <article class="journal-entry journal-entry--fact">
                        <div class="journal-entry__meta">
                          <span>Known fact</span>
                        </div>
                        <h3>${escapeHtml(fact.title)}</h3>
                        <p>${escapeHtml(fact.description)}</p>
                      </article>
                    `,
                  )
                  .join("")}
              </div>`
            : `<p class="journal-empty">No deed or discovery has been entered into the record.</p>`
        }
      </section>

      ${renderDisclosureSection({
        id: "journal-known-actors",
        eyebrow: "People in the record",
        title: "Known people and parties",
        entries: world.actors,
        empty: "No person or party has entered your account by name yet.",
      })}

      ${renderDisclosureSection({
        id: "journal-relationships",
        eyebrow: "Visible ties",
        title: "Relationships",
        entries: world.relationships,
        empty: "No relationship relevant to your journey has been recorded.",
      })}

      ${renderDisclosureSection({
        id: "journal-evidence-custody",
        eyebrow: "What can be accounted for",
        title: "Evidence, claims, and custody",
        entries: [...world.evidence, ...world.claims, ...world.custody],
        empty: "You have no evidence or custody record worth carrying forward.",
      })}

      ${renderDisclosureSection({
        id: "journal-active-concerns",
        eyebrow: "Still in motion",
        title: "Active concerns",
        entries: world.concerns,
        empty: "Nothing you know remains immediately unsettled.",
      })}
    </main>
  `;
};
