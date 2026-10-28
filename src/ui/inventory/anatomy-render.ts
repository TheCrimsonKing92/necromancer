import {
  BODY_PARTS,
  canBindWound,
  canWoundScar,
  scarsForPart,
  woundEffects,
} from "../../game/anatomy";
import {
  fieldDressingChance,
  skillRankLabel,
} from "../../game/character";
import {
  equippedArmorForPart,
  itemCount,
} from "../../game/items";
import type { Player } from "../../game/types";
import { escapeHtml } from "../html";
import { woundEffectLabels } from "../wound-presentation";

const percentage = (value: number, maximum: number): number => {
  if (maximum <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((value / maximum) * 100)),
  );
};

const renderAnatomy = (
  player: Player,
  readOnly = false,
): string => {
  const bindings = itemCount(player.inventory, "linen-binding");

  return `
    <div class="body-map">
      ${BODY_PARTS.map((definition) => {
        const part = player.body[definition.id];
        const wounds = part.wounds;
        const scars = scarsForPart(player, definition.id);
        const condition = percentage(
          part.condition,
          part.maxCondition,
        );
        const armor = equippedArmorForPart(player, definition.id);

        return `
          <article
            class="body-part body-part--${definition.id} ${wounds.length ? "is-wounded" : ""} ${scars.length ? "is-scarred" : ""} ${condition <= 35 ? "is-critical" : ""}"
          >
            <div class="body-part__heading">
              <div>
                <span>${escapeHtml(definition.shortLabel)}</span>
                <h3>${escapeHtml(definition.label)}</h3>
              </div>
              <strong>${part.condition} / ${part.maxCondition}</strong>
            </div>
            <div
              class="body-part__condition"
              role="progressbar"
              aria-label="${escapeHtml(definition.label)} condition"
              aria-valuemin="0"
              aria-valuemax="${part.maxCondition}"
              aria-valuenow="${part.condition}"
            >
              <span style="width: ${condition}%"></span>
            </div>
            <p class="body-part__armor">${armor > 0 ? `${armor} equipped armor` : "Unarmored"}</p>
            ${
              wounds.length
                ? `<ul class="wound-list">
                    ${wounds
                      .map((wound) => {
                        const effects = woundEffectLabels(wound);
                        const bindable = canBindWound(wound);
                        const dressingChance = fieldDressingChance(
                          player.attributes,
                          player.skills,
                          wound.severity,
                        );
                        const careState = wound.treated
                          ? bindable
                            ? "dressed"
                            : "stabilized by rest"
                          : bindable
                            ? wound.bleed > 0
                              ? `${wound.bleed} bleed / round`
                              : "needs dressing"
                            : "needs safe rest";
                        const recoverySteps =
                          woundEffects(wound).recoverySteps;
                        const recoveryOutcome = bindable
                          ? `${recoverySteps} ${recoverySteps === 1 ? "recovery" : "recoveries"} before closure;${canWoundScar(wound) ? " closure may scar" : ""}`
                          : `${recoverySteps} ${recoverySteps === 1 ? "recovery" : "recoveries"} before healing`;
                        return `
                          <li class="wound wound--${wound.severity} ${wound.treated ? "is-treated" : ""}">
                            <div>
                              <strong>${escapeHtml(wound.label)}</strong>
                              <span>${escapeHtml(wound.severity)} · ${careState}</span>
                              <small class="wound__effects">${
                                effects.length > 0
                                  ? escapeHtml(effects.join(" · "))
                                  : "No immediate combat penalty"
                              } · ${recoveryOutcome}</small>
                            </div>
                            ${
                              readOnly
                                ? `<span class="wound__terminal">Recorded at death</span>`
                                : wound.treated
                                  ? `<span class="wound__treated">${bindable ? "Dressed" : "Stabilized"}</span>`
                                  : bindable
                                    ? `<span class="wound__action">
                                        <button
                                          class="item-action"
                                          type="button"
                                          data-action="treat-wound"
                                          data-wound-id="${escapeHtml(wound.id)}"
                                          ${bindings > 0 ? "" : "disabled"}
                                        >
                                          Dress · ${dressingChance}%
                                        </button>
                                        <small>${bindings > 0 ? `Medicine ${player.skills.medicine} (${skillRankLabel(player.skills.medicine)}). Failure spends the binding.` : "Unavailable · No clean linen binding remains."}</small>
                                      </span>`
                                    : `<span class="wound__treated">Needs safe rest</span>`
                            }
                          </li>
                        `;
                      })
                      .join("")}
                  </ul>`
                : `<p class="body-part__sound">No recorded wound</p>`
            }
            ${
              scars.length
                ? `<ul class="scar-list">
                    ${scars
                      .map(
                        (scar) => `
                          <li class="scar">
                            <strong>${escapeHtml(scar.label)}</strong>
                            <span>${scar.conditionPenalty > 0 ? `−${scar.conditionPenalty} maximum condition` : "No condition lost · Grave Callus"}</span>
                          </li>
                        `,
                      )
                      .join("")}
                  </ul>`
                : ""
            }
          </article>
        `;
      }).join("")}
    </div>
  `;
};

export const renderAnatomySectionContents = (
  player: Player,
  readOnly: boolean,
): string => {
  const bindings = itemCount(player.inventory, "linen-binding");
  return `
      <div class="section-heading">
        <h2 id="anatomy-heading">Anatomical ledger</h2>
        <span>${readOnly ? "Final condition" : `${bindings} clean ${bindings === 1 ? "binding" : "bindings"}`}</span>
      </div>
      ${renderAnatomy(player, readOnly)}
  `;
};
