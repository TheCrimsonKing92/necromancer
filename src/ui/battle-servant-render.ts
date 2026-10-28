import {
  allWounds,
  bodyConditionPercentage,
} from "../game/anatomy";
import {
  getServantCommandUnavailableReason,
  servantDirectionRequiredFor,
} from "../game/practices/bonebinder/battle";
import {
  calledCounselPreviewFor,
  getCalledCounselUnavailableReason,
  servantCommandServiceFor,
} from "../game/practices/bonebinder/advancement-battle";
import { bonebinderDoctrineFor } from "../game/practices/bonebinder/advancement-state";
import { SERVANT_SERVICE_PURPOSES } from "../game/practices/bonebinder/compact";
import { bonebinderStateFor } from "../game/practices/bonebinder/practice-state";
import type { ServantCommandId } from "../game/practices/bonebinder/types";
import { resolveServantWorldContext } from "../game/practices/bonebinder/world-context";
import type { GameState } from "../game/types";
import { WORLD_ACTORS } from "../game/world/actors";
import { escapeHtml } from "./html";

const SERVANT_COMMAND_COPY: Record<
  Exclude<ServantCommandId, "await" | "counsel" | "labor">,
  { label: string; detail: string }
> = {
  guard: {
    label: "Guard",
    detail:
      "The servant holds close and raises your Ward to 2 if it has fallen below it.",
  },
  interpose: {
    label: "Interpose",
    detail:
      "The servant takes this round’s enemy attacks in your place while it can still stand.",
  },
  harry: {
    label: "Harry",
    detail:
      "The servant makes one ordinary physical attack against the selected enemy.",
  },
  withdraw: {
    label: "Withdraw",
    detail:
      "Take the servant out of this battle without discarding its condition.",
  },
};

const BATTLE_COMMANDS = [
  "guard",
  "interpose",
  "harry",
  "withdraw",
] as const;

export const servantDirectionRequired = (state: GameState): boolean =>
  Boolean(state.run && servantDirectionRequiredFor(state.run));

const renderCommandChoices = (
  state: GameState,
  selectedTargetId: string | undefined,
): string => {
  const run = state.run!;
  const servant = bonebinderStateFor(run)!.servant!;
  const doctrine = bonebinderDoctrineFor(run.player.advancements);
  return `
    <div class="servant-command-grid">
      ${BATTLE_COMMANDS.map((commandId) => {
        const unavailable = getServantCommandUnavailableReason(
          state,
          commandId,
          commandId === "harry" ? selectedTargetId : undefined,
        );
        const copy = SERVANT_COMMAND_COPY[commandId];
        const service = servantCommandServiceFor(run, commandId);
        const serviceCopy = service.outcome === "matching"
          ? "Within the service · 0 Spirit. "
          : service.outcome === "exceptional"
            ? `Exception · ${service.spiritCost} Spirit. `
            : "";
        return `
          <button
            class="servant-command"
            type="button"
            data-action="servant-command"
            data-command-id="${commandId}"
            aria-pressed="${servant.command.current.id === commandId}"
            ${unavailable ? "disabled" : ""}
          >
            <span>${copy.label}</span>
            <small>${escapeHtml(unavailable ?? `${serviceCopy}${copy.detail}`)}</small>
          </button>
        `;
      }).join("")}
      ${doctrine === "called-counsel" ? (() => {
        const unavailable = getCalledCounselUnavailableReason(
          state,
          selectedTargetId,
        );
        const preview = calledCounselPreviewFor(state);
        return `
          <button
            class="servant-command servant-command--counsel"
            type="button"
            data-action="called-counsel"
            aria-pressed="${servant.command.current.id === "counsel"}"
            ${unavailable ? "disabled" : ""}
          >
            <span>Call a remembered motion${preview ? ` · ${escapeHtml(preview.label)}` : ""}</span>
            <small>${escapeHtml(unavailable ?? `Called Counsel · No Spirit. ${preview?.effect ?? "One retained motion returns."} This is a one-round direction.`)}</small>
          </button>
        `;
      })() : ""}
    </div>
  `;
};

export const renderServantCommands = (
  state: GameState,
  selectedTargetId: string | undefined,
): string => {
  const run = state.run;
  const servant = run ? bonebinderStateFor(run)?.servant : null;
  if (!run?.battle || !servant) return "";
  const deployed = run.battle.allies.some(
    (ally) =>
      ally.lifetime.kind === "persistent" &&
      ally.lifetime.servantId === servant.identity.id,
  );
  if (!deployed) return "";
  const doctrine = bonebinderDoctrineFor(run.player.advancements);
  const compact = bonebinderStateFor(run)?.advancement.compact;
  const command = servant.command.current;
  const required = servantDirectionRequired(state);
  const issuedThisRound = command.issuedAtReference?.startsWith(
    `battle:${run.battle.encounterId}:round-${run.battle.round}`,
  );
  const counselCopy = command.id === "counsel"
    ? calledCounselPreviewFor(state)
    : null;
  const ordinaryCopy = command.id !== "await" &&
    command.id !== "counsel" && command.id !== "labor"
      ? SERVANT_COMMAND_COPY[command.id]
      : null;
  const target = command.id === "harry"
    ? run.battle.enemies.find((enemy) => enemy.id === command.targetReference)
    : null;
  const commandLabel = command.id === "counsel"
    ? `Called Counsel${counselCopy ? ` · ${counselCopy.label}` : ""}`
    : ordinaryCopy
      ? `${ordinaryCopy.label}${target ? ` · ${target.name}` : ""}`
      : "No direction";
  const commandDetail = command.id === "counsel"
    ? `${counselCopy?.effect ?? "One retained motion returns."} Counsel must be called again next round.`
    : ordinaryCopy
      ? `${ordinaryCopy.detail} This order remains until changed.`
      : "Choose what the servant will do before taking your own act.";
  return `
    <section class="servant-command-section" aria-labelledby="servant-command-heading">
      <div class="section-heading">
        <h2 id="servant-command-heading">Direct ${escapeHtml(servant.identity.useName)}</h2>
        <span>${doctrine === "letter-of-service" && compact ? `${escapeHtml(SERVANT_SERVICE_PURPOSES[compact.purposeId].label)} · ` : ""}${required ? "Direction required before your act" : "Your act is ready"}</span>
      </div>
      ${required
        ? renderCommandChoices(state, selectedTargetId)
        : `<div class="combat-reaction servant-direction-summary">
            <p class="combat-reaction__eyebrow">${issuedThisRound ? "Direction set" : "Standing direction"}</p>
            <h3>${escapeHtml(commandLabel)}</h3>
            <p>${escapeHtml(commandDetail)}</p>
          </div>
          <details class="servant-direction-change">
            <summary>Change direction before acting</summary>
            ${renderCommandChoices(state, selectedTargetId)}
          </details>`}
    </section>
  `;
};

export const renderPersistentServantDossier = (
  state: GameState,
): string => {
  const run = state.run;
  const servant = run ? bonebinderStateFor(run)?.servant : null;
  if (!run || !servant) return "";
  const context = resolveServantWorldContext(servant, run.world);
  const wounds = allWounds(servant.combatant);
  const bodyIdentity =
    servant.identity.bodyIdentity.knownName ??
    (servant.identity.bodyIdentity.status === "unidentified"
      ? "Unidentified remains"
      : "Partially identified remains");
  const custodian = context.currentCustodianId
    ? WORLD_ACTORS[context.currentCustodianId].name
    : "No current custodian recorded";
  const active = run.battle?.allies.some(
    (ally) =>
      ally.lifetime.kind === "persistent" &&
      ally.lifetime.servantId === servant.identity.id,
  );
  const practice = bonebinderStateFor(run)!;
  const doctrine = bonebinderDoctrineFor(run.player.advancements);
  const compact = practice.advancement.compact;
  const doctrineText = doctrine === "letter-of-service"
    ? compact
      ? `${SERVANT_SERVICE_PURPOSES[compact.purposeId].label} · compact ${compact.status}`
      : "Letter of Service · not yet written"
    : doctrine === "called-counsel"
      ? "Called Counsel · somatic memory"
      : "No compact doctrine learned";
  return `
    <details class="servant-dossier">
      <summary>
        <span>
          <strong>${escapeHtml(servant.identity.useName)}</strong>
          <small>${active ? "In the line" : "Withdrawn"} · Persistent corporeal servant</small>
        </span>
        <span>${servant.combatant.hp} / ${servant.combatant.maxHp} Health</span>
      </summary>
      <dl>
        <div><dt>Body identity</dt><dd>${escapeHtml(bodyIdentity)}</dd></div>
        <div><dt>Body condition</dt><dd>${bodyConditionPercentage(servant.combatant)}%</dd></div>
        <div><dt>Wounds</dt><dd>${wounds.length}</dd></div>
        <div><dt>Provenance</dt><dd>${context.provenance ? "Mortuary record resolved" : "Record unresolved"}</dd></div>
        <div><dt>Custody</dt><dd>${escapeHtml(custodian)}</dd></div>
        <div><dt>Recognition</dt><dd>${context.recognitionEvidence.length > 0 ? "Known body evidence recorded" : "No recognition evidence recorded"}</dd></div>
        <div><dt>Doctrine</dt><dd>${escapeHtml(doctrineText)}</dd></div>
      </dl>
    </details>
  `;
};
