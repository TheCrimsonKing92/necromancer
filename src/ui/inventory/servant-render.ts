import {
  BODY_PARTS,
  bodyConditionPercentage,
  getBodyPartLabel,
} from "../../game/anatomy";
import { itemCount } from "../../game/items";
import { bonebinderDoctrineFor } from "../../game/practices/bonebinder/advancement-state";
import { SERVANT_SERVICE_PURPOSES } from "../../game/practices/bonebinder/compact";
import { availableSomaticCounselActions } from "../../game/practices/bonebinder/counsel";
import { bonebinderStateFor } from "../../game/practices/bonebinder/practice-state";
import type { RunState } from "../../game/types";
import { escapeHtml } from "../html";

const renderBonebinderDoctrine = (
  run: RunState,
  readOnly: boolean,
): string => {
  const practice = bonebinderStateFor(run);
  const servant = practice?.servant;
  if (!practice || !servant) return "";
  const doctrine = bonebinderDoctrineFor(run.player.advancements);
  if (doctrine === "letter-of-service") {
    const compact = practice.advancement.compact;
    return `
      <div class="servant-doctrine">
        <header>
          <div>
            <span class="eyebrow">Letter of Service</span>
            <h3>${compact ? escapeHtml(SERVANT_SERVICE_PURPOSES[compact.purposeId].label) : "Service not yet written"}</h3>
          </div>
          <span>${compact?.status === "breached" ? "Compact breached" : compact ? "Compact kept" : "Choose at safety"}</span>
        </header>
        <p>Orders within the named service need no Spirit. An exception costs 1 Spirit; a contradiction must be broken openly.</p>
        <div class="servant-doctrine__choices" role="group" aria-label="Service purpose">
          ${Object.values(SERVANT_SERVICE_PURPOSES)
            .map(
              (purpose) => `
                <button
                  class="button button--secondary"
                  type="button"
                  data-action="set-servant-service"
                  data-purpose-id="${purpose.id}"
                  aria-pressed="${compact?.purposeId === purpose.id && compact.status === "kept"}"
                  ${readOnly || compact?.status === "breached" ? "disabled" : ""}
                >
                  <strong>${escapeHtml(purpose.label)}</strong>
                  <small>${escapeHtml(purpose.routeUse)}</small>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }
  if (doctrine === "called-counsel") {
    const motions = availableSomaticCounselActions(servant)
      .map(({ actionId }) => actionId.replaceAll("-", " "))
      .join(" · ");
    return `
      <div class="servant-doctrine">
        <header><div><span class="eyebrow">Called Counsel</span><h3>Work remembered by the body</h3></div></header>
        <p>${motions ? `Available motions: ${escapeHtml(motions)}.` : "No usable somatic memory remains in this body."} Counsel returns movement, not the dead person’s testimony.</p>
      </div>
    `;
  }
  return "";
};

export const renderBonebinderServantContents = (
  run: RunState,
  readOnly: boolean,
): string => {
  const servant = bonebinderStateFor(run)?.servant;
  if (!servant) return "";
  const tallow = itemCount(
    run.player.inventory,
    "mortuary-tallow",
  );
  const linen = itemCount(run.player.inventory, "linen-binding");
  return `
      <div class="section-heading">
        <h2 id="servant-repair-heading">${escapeHtml(servant.identity.useName)} · persistent servant</h2>
        <span>${servant.combatant.hp} / ${servant.combatant.maxHp} Health · ${bodyConditionPercentage(servant.combatant)}% body</span>
      </div>
      <p class="inventory-section__note">
        Mortuary tallow reinforces damaged structure and restores a little Health.
        Clean linen can stabilize open wounds, but closed or rest-bound injuries
        remain beyond field repair. Repair history records materials; it is not
        another Health pool.
      </p>
      ${renderBonebinderDoctrine(run, readOnly)}
      <div class="servant-repair-ledger">
        ${BODY_PARTS.map(({ id }) => {
          const part = servant.combatant.body[id];
          const missing = part.maxCondition - part.condition;
          return `
            <article class="servant-repair-part">
              <header>
                <strong>${escapeHtml(getBodyPartLabel(id, "humanoid"))}</strong>
                <span>${part.condition} / ${part.maxCondition} condition</span>
              </header>
              ${
                missing > 0
                  ? `<button
                      class="button button--secondary"
                      type="button"
                      data-action="repair-servant-part"
                      data-part-id="${id}"
                      ${readOnly || tallow < 1 ? "disabled" : ""}
                    >
                      ${tallow < 1 ? "Needs mortuary tallow" : "Reinforce · tallow −1"}
                    </button>`
                  : `<p>Structure holds.</p>`
              }
              ${part.wounds
                .map(
                  (wound) => `
                    <div class="servant-repair-wound">
                      <span>${escapeHtml(wound.label)} · ${wound.severity}</span>
                      ${
                        wound.treated
                          ? "<small>Stabilized</small>"
                          : wound.care !== "binding"
                            ? "<small>Requires mortuary rest</small>"
                            : `<button
                                class="button button--secondary"
                                type="button"
                                data-action="stabilize-servant-wound"
                                data-wound-id="${escapeHtml(wound.id)}"
                                ${readOnly || linen < 1 ? "disabled" : ""}
                              >
                                ${linen < 1 ? "Needs clean linen" : "Stabilize · linen −1"}
                              </button>`
                      }
                    </div>
                  `,
                )
                .join("")}
            </article>
          `;
        }).join("")}
      </div>
  `;
};
