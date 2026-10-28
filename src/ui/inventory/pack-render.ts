import {
  ITEMS,
} from "../../game/items";
import { reliquarySaleAvailability } from "../../game/reliquary-market";
import { inventoryItemUseAvailability } from "../../game/inventory-engine";
import type { ItemId, Player } from "../../game/types";
import { escapeHtml } from "../html";
import { inventoryQuantity } from "../player-presentation";
import { renderEquipOption } from "./equipment-render";
import {
  itemDistinctionClass,
  renderItemEffect,
  renderItemProvenance,
  renderItemVisual,
} from "./item-render";

const renderPackItem = (
  player: Player,
  itemId: ItemId,
  quantity: number,
  shopOpen: boolean,
  readOnly = false,
): string => {
  const item = ITEMS[itemId];
  const use = inventoryItemUseAvailability(player, itemId);
  const unavailableId = `item-use-unavailable-${itemId}`;
  const sale = shopOpen ? reliquarySaleAvailability(itemId) : null;
  const saleUnavailableId = `item-sale-unavailable-${itemId}`;

  return `
    <article class="pack-item${itemDistinctionClass(item)}">
      <div class="pack-item__overview">
        ${renderItemVisual(itemId, "pack")}
        <div class="pack-item__copy">
          <div class="pack-item__heading">
            <div>
              <span>${escapeHtml(item.kind)}</span>
              ${renderItemProvenance(item)}
              <h3>${escapeHtml(item.name)}</h3>
            </div>
            <strong aria-label="Quantity ${quantity}">×${quantity}</strong>
          </div>
          <p>${escapeHtml(item.description)}</p>
          <div class="pack-item__facts">
            <span>${escapeHtml(renderItemEffect(item))}</span>
            <span>${item.weight} weight each</span>
          </div>
        </div>
      </div>
      ${
        readOnly
          ? ""
          : `<div class="pack-item__actions">
              ${(item.allowedSlots ?? [])
                .map((slot) =>
                  renderEquipOption(player, item, slot),
                )
                .join("")}
              ${
                use
                  ? `<button
                      class="item-action"
                      type="button"
                      data-action="use-item"
                      data-item-id="${item.id}"
                      ${use.unavailableReason ? "disabled" : ""}
                      ${use.unavailableReason ? `aria-describedby="${unavailableId}"` : ""}
                    >
                      ${escapeHtml(use.label)}
                    </button>`
                  : ""
              }
              ${
                use?.unavailableReason
                  ? `<span class="item-action__unavailable" id="${unavailableId}">Unavailable · ${escapeHtml(use.unavailableReason)}</span>`
                  : ""
              }
              ${
                shopOpen
                  ? `<button
                      class="item-action item-action--sell"
                      type="button"
                      data-action="sell-item"
                      data-item-id="${item.id}"
                      ${sale?.accepted ? "" : "disabled"}
                      ${sale?.reason ? `aria-describedby="${saleUnavailableId}"` : ""}
                    >
                      ${sale?.accepted ? `Sell · ${item.sellValue} ${item.sellValue === 1 ? "obol" : "obols"}` : "No offer"}
                    </button>
                    ${sale?.reason ? `<span class="item-action__unavailable" id="${saleUnavailableId}">Unavailable · ${escapeHtml(sale.reason)}</span>` : ""}`
                  : ""
              }
            </div>`
      }
    </article>
  `;
};

export const renderPackContents = (
  player: Player,
  inventoryItems: [ItemId, number][],
  shopOpen: boolean,
  readOnly: boolean,
): string => {
  const quantity = inventoryQuantity(player);
  return `
      <div class="section-heading">
        <h2 id="pack-heading">Pack</h2>
        <span>${quantity} ${readOnly ? "remaining" : "carried"} ${quantity === 1 ? "piece" : "pieces"}</span>
      </div>
      <div class="pack-list">
        ${
          inventoryItems.length
            ? inventoryItems
                .map(([itemId, itemQuantity]) =>
                  renderPackItem(
                    player,
                    itemId,
                    itemQuantity,
                    shopOpen,
                    readOnly,
                  ),
                )
                .join("")
            : `<p class="inventory-empty">The pack is empty.</p>`
        }
      </div>
  `;
};
