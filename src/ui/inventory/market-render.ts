import {
  ITEMS,
  canCarry,
  canCarryAfterExchange,
  itemCount,
} from "../../game/items";
import {
  RELIQUARY_BUY_POLICY,
  RELIQUARY_SERVICES,
  RELIQUARY_STOCK,
  reliquaryBarterLabel,
  reliquaryListingAvailable,
  reliquaryServiceAvailable,
} from "../../game/reliquary-market";
import type { RunState } from "../../game/types";
import { escapeHtml } from "../html";
import {
  renderItemEffect,
  renderItemVisual,
} from "./item-render";

const renderStock = (run: RunState): string =>
  RELIQUARY_STOCK.map((listing) => {
    const { itemId, price } = listing;
    const item = ITEMS[itemId];
    const available = reliquaryListingAvailable(run, listing);
    const affordable = run.player.obols >= price;
    const room = canCarry(run.player, itemId);
    const disabledReason = !available
      ? "The broker has no second measure."
      : !affordable
        ? `Requires ${price} black obols.`
        : !room
          ? "Your pack cannot carry another measure."
          : "";
    const barter = listing.barter;
    const barterRoom = barter
      ? canCarryAfterExchange(
          run.player,
          itemId,
          barter.itemId,
          barter.quantity,
        )
      : room;
    const barterReason = !available
      ? "The broker has no second measure."
      : barter &&
          itemCount(run.player.inventory, barter.itemId) <
            barter.quantity
        ? `Requires ${barter.quantity} ${ITEMS[barter.itemId].name}.`
        : barter && run.player.obols < barter.obols
          ? `Requires ${barter.obols} additional black ${barter.obols === 1 ? "obol" : "obols"}.`
          : !barterRoom
            ? "Your pack cannot carry another measure."
            : "";

    return `
      <article class="shop-item">
        ${renderItemVisual(item.id, "shop")}
        <div>
          <span>${escapeHtml(item.kind)} · ${price} ${price === 1 ? "obol" : "obols"}${listing.limitPerTestament ? " · one available" : ""}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <small>${escapeHtml(renderItemEffect(item))}</small>
          ${disabledReason ? `<p class="shop-item__unavailable">Unavailable · ${escapeHtml(disabledReason)}</p>` : ""}
          ${barter && barterReason && barterReason !== disabledReason ? `<p class="shop-item__unavailable">Barter unavailable · ${escapeHtml(barterReason)}</p>` : ""}
        </div>
        <div class="shop-item__actions">
          <button
            class="item-action"
            type="button"
            data-action="buy-item"
            data-item-id="${item.id}"
            ${disabledReason ? "disabled" : ""}
          >
            Buy · ${price}
          </button>
          ${
            barter
              ? `<button
                  class="item-action item-action--barter"
                  type="button"
                  data-action="barter-item"
                  data-item-id="${item.id}"
                  ${barterReason ? "disabled" : ""}
                >
                  Trade · ${escapeHtml(reliquaryBarterLabel(ITEMS, barter))}
                </button>`
              : ""
          }
        </div>
      </article>
    `;
  }).join("");

const renderServices = (run: RunState): string =>
  RELIQUARY_SERVICES.map((service) => {
    const available = reliquaryServiceAvailable(run, service);
    const affordable = run.player.obols >= service.price;
    const hasRoom = run.player.ward < service.effect.wardCap;
    const disabledReason = !available
      ? "The spent graveglass cannot be worked twice."
      : !affordable
        ? `Requires ${service.price} black obols.`
        : !hasRoom
          ? `Your Ward already stands at ${service.effect.wardCap}.`
          : "";
    return `
      <article class="shop-item shop-item--service">
        <div>
          <span>Service · ${service.price} ${service.price === 1 ? "obol" : "obols"} · once</span>
          <h3>${escapeHtml(service.name)}</h3>
          <p>${escapeHtml(service.description)}</p>
          ${disabledReason ? `<p class="shop-item__unavailable">Unavailable · ${escapeHtml(disabledReason)}</p>` : ""}
        </div>
        <button
          class="item-action"
          type="button"
          data-action="buy-reliquary-service"
          data-service-id="${service.id}"
          ${disabledReason ? "disabled" : ""}
        >
          Prepare · ${service.price}
        </button>
      </article>
    `;
  }).join("");

export const renderReliquaryShopContents = (run: RunState): string => `
    <div class="section-heading">
      <div>
        <h2 id="shop-heading">The reliquary broker</h2>
        <p class="shop-intro">
          He tests each possession against a tooth of black glass, pays for what
          darkens the glass, and asks no tender question about provenance.
          ${escapeHtml(RELIQUARY_BUY_POLICY.description)} Limited work leaves his table once.
        </p>
      </div>
      <span>${run.player.obols} black ${run.player.obols === 1 ? "obol" : "obols"}</span>
    </div>
    <div class="shop-stock">
      ${renderStock(run)}
      ${renderServices(run)}
    </div>
`;
