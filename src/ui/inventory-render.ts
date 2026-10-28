import type { GameState } from "../game/types";
import { inventoryView } from "./inventory-fragments";
import { renderMissingState } from "./missing-state-render";

export const renderInventory = (state: GameState): string => {
  const view = inventoryView(state);
  if (!view) return renderMissingState();
  const { patch, readOnly, shopOpen } = view;
  return `
    <main class="inventory-page">
      <header class="inventory-heading">
        <div>
          <p class="eyebrow">${readOnly ? "Final" : "Possessions"} & anatomy${shopOpen ? " & exchange" : ""}</p>
          <h1 data-page-title tabindex="-1">${readOnly ? "What remained at death." : "Lay out the instruments."}</h1>
          <p>
            ${
              readOnly
                ? "The body and its possessions are preserved as they were when the testament ended. Nothing here can be used, treated, or rearranged."
                : `Armor turns physical blows only where it covers. Occult force
                   ignores it, while incorporeal forms shed half of physical damage.
                   Linen permits a Medicine attempt on open wounds and is spent
                   whether the dressing holds or fails,
                   while concussions and closed injuries require safe rest. Deeper
                   penalties remain until proper recovery. Weapon trauma
                   raises wound severity only when damage gets through.`
            }
          </p>
        </div>
        <button class="button button--secondary" type="button" data-action="close-inventory">
          Return to the testament
        </button>
      </header>

      <dl class="inventory-summary">${patch.summary}</dl>

      <div class="inventory-workbench ${shopOpen ? "inventory-workbench--with-shop" : ""}">
        ${patch.sections
          .map(
            (section) => `<section class="inventory-section inventory-section--${section.modifier}" aria-labelledby="${section.labelledBy}">${section.contents}</section>`,
          )
          .join("")}
      </div>
    </main>
  `;
};
