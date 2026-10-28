import {
  FIRE_ROAD_BRIDGE,
  FIRE_ROAD_BRACE,
  FIRE_ROAD_GRAIN_WAGONS,
  FIRE_ROAD_HOUND_MAX_HEALTH,
  fireFrontPercentForTurn,
  fireRoadActionsFor,
  fireRoadCrossingState,
  fireRoadMovementFor,
  type FireRoadActionState,
} from "../../../game/development-prototypes/fire-road/road-under-ash";
import type { FireRoadPositionId } from "../../../game/development-prototypes/fire-road/road-under-ash-navigation";
import { escapeHtml } from "../../html";
import {
  actionProofGlyph,
  renderActionProofFigure,
  type ActionProofFigureTone,
} from "../action-proof-art";
import {
  renderActionProofTarget,
  renderActionProofTargetingPanel,
} from "../action-proof-targeting-render";
import { ROAD_UNDER_ASH_SCENE_ART, fireRoadSceneAnchor, fireRoadSceneAnchorStyle } from "./road-under-ash-art";

const positionStyle = (position: FireRoadPositionId): string => {
  return fireRoadSceneAnchorStyle(position);
};

const movementStyle = (position: FireRoadPositionId): string => {
  const { ground } = fireRoadSceneAnchor(position);
  const zone = ground === "bridge" ? [8, 5] : ground === "wild" ? [11, 7] : [10, 6];
  return `${positionStyle(position)};--move-width:${zone[0]};--move-height:${zone[1]};--move-angle:-8deg`;
};

const figure = (
  position: FireRoadPositionId | null,
  id: string,
  label: string,
  tone: ActionProofFigureTone,
  detail?: string,
  offset = 0,
  health?: { readonly current: number; readonly max: number },
  targetControls = "",
  className = "",
  conversationId?: string,
  subjectId?: string,
): string => position
  ? `<span class="action-stage__position road-under-ash__figure-position ${className}" style="${positionStyle(position)}">${renderActionProofFigure({ id, label, tone, detail, offset, health, conversationId, subjectId })}${targetControls}${id === "hound" ? `<span class="action-stage__intent action-stage__intent--west" aria-label="The ash hound is hunting the nearest living body">Hunting</span>` : ""}</span>`
  : "";

const renderMovement = (state: FireRoadActionState): string => fireRoadMovementFor(state)
  .map(({ id, label, destinationLabel, location, exchanges }) => `<span class="action-stage__position" style="${movementStyle(location)}"><button class="action-stage__move action-stage__move--zone" type="button" data-action="move-action-proof" data-destination-id="${escapeHtml(id)}" data-move-label="${escapeHtml(`${destinationLabel} · ${exchanges} exchange`)}" aria-label="${escapeHtml(`${label}. ${exchanges} exchange.`)}"><span class="sr-only">${escapeHtml(`${label}. ${exchanges} exchange.`)}</span></button></span>`)
  .join("");

type FireRoadAction = ReturnType<typeof fireRoadActionsFor>[number];
type FireRoadMovement = ReturnType<typeof fireRoadMovementFor>[number];

const renderContextMovement = ({ id, label, exchanges }: FireRoadMovement): string => `<button
  class="road-under-ash__context-action"
  type="button"
  data-action="move-action-proof"
  data-destination-id="${escapeHtml(id)}"
  aria-label="${escapeHtml(`${label}. ${exchanges} exchange.`)}">
  <span class="road-under-ash__context-glyph" aria-hidden="true">➜</span>
  <span><strong>${escapeHtml(label)}</strong><small>${exchanges} exchange</small></span>
</button>`;

const actionTiming = (action: FireRoadAction): string => action.advancesTime
  ? "Uses this exchange"
  : action.id === "depart" ? "Ends the scene" : "No time passes";

const renderContextAction = (action: FireRoadAction): string => `<button
  class="road-under-ash__context-action"
  type="button"
  data-action="${action.targets?.length ? "select-action-proof" : "act-action-proof"}"
  data-action-proof-id="${escapeHtml(action.id)}"
  data-action-label="${escapeHtml(action.label)}"
  data-action-detail="${escapeHtml(action.detail)}"
  ${action.targets?.length ? 'aria-pressed="false"' : ""}>
  <span class="road-under-ash__context-glyph" aria-hidden="true">${actionProofGlyph(action.id)}</span>
  <span><strong>${escapeHtml(action.label)}</strong><small>${escapeHtml(actionTiming(action))}</small></span>
</button>`;

const renderAbility = (action: FireRoadAction): string => {
  const unavailable = !action.available;
  const context = unavailable ? action.reason ?? "Unavailable here." : action.detail;
  return `<button
    class="road-under-ash__ability"
    type="button"
    data-action="${action.targets?.length ? "select-action-proof" : "act-action-proof"}"
    data-action-proof-id="${escapeHtml(action.id)}"
    data-action-label="${escapeHtml(action.label)}"
    data-action-detail="${escapeHtml(action.detail)}"
    ${action.targets?.length ? 'aria-pressed="false"' : ""}
    ${unavailable ? "disabled" : ""}
    aria-label="${escapeHtml(`${action.label}. ${context} ${actionTiming(action)}.`)}">
    <span aria-hidden="true">${actionProofGlyph(action.id)}</span>
    <strong>${escapeHtml(action.label)}</strong>
    <span class="road-under-ash__ability-detail" role="tooltip">${escapeHtml(context)} <small>${escapeHtml(actionTiming(action))}</small></span>
  </button>`;
};

const renderSubjectPanel = ({
  id,
  eyebrow,
  title,
  body,
  actions,
  extra = "",
}: {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly actions: readonly FireRoadAction[];
  readonly extra?: string;
}): string => `<aside
  class="road-under-ash__subject-panel"
  id="action-proof-subject-${escapeHtml(id)}"
  data-action-proof-subject-panel="${escapeHtml(id)}"
  data-subject-announcement="${escapeHtml(`${title}. ${body}`)}"
  aria-labelledby="action-proof-subject-${escapeHtml(id)}-title"
  hidden>
  <button class="road-under-ash__subject-close" type="button" data-action="close-action-proof-subject" aria-label="Close ${escapeHtml(title)}">×</button>
  <p class="eyebrow">${escapeHtml(eyebrow)}</p>
  <h2 id="action-proof-subject-${escapeHtml(id)}-title">${escapeHtml(title)}</h2>
  <p>${escapeHtml(body)}</p>
  ${extra}
  ${actions.length ? `<div class="road-under-ash__context-actions">${actions.map(renderContextAction).join("")}</div>` : ""}
</aside>`;

const renderDirectionControl = (count: number): string => count > 0 ? `<div class="road-under-ash__context-actions"><button
  class="road-under-ash__context-action"
  type="button"
  data-action="select-action-proof"
  data-action-proof-id="direct-ditch-hand"
  data-action-label="Direct Ditch-Hand"
  data-action-detail="Choose the person, threat, or structure that should receive its weight."
  aria-pressed="false">
  <span class="road-under-ash__context-glyph" aria-hidden="true">◆</span>
  <span><strong>Give Ditch-Hand a direction</strong><small>${count} possible assignment${count === 1 ? "" : "s"}</small></span>
</button></div>` : "";

const renderDirectionTarget = (
  action: FireRoadAction,
  position: FireRoadPositionId,
  targetId: string,
  label: string,
): string => `<span class="action-stage__position" style="${positionStyle(position)}">${renderActionProofTarget("direct-ditch-hand", {
  id: targetId,
  label,
  detail: action.detail,
}, 0, 0, action.id)}</span>`;

const CROSSING_COPY = {
  "moving-to-wreck": "Moving toward the wreck",
  "blocked-by-wreck": "Held at the broken wagon",
  "crossing-at-risk": "Crossing without a brace",
  "crossing-under-brace": "Crossing under Ditch-Hand's brace",
  complete: "The living are west of the fire",
} as const;

const woundCopy = (state: FireRoadActionState): string => {
  if (!state.playerWounds.length) return "You leave unwounded.";
  const wounds = state.playerWounds.map((wound) => wound === "hound-bite" ? "an ash-hound bite" : "a resin burn");
  return `You leave with ${wounds.join(" and ")}. Treatment and recovery would continue beyond this scene.`;
};

const legacyCopy = (state: FireRoadActionState): string => {
  const householdsLost = 6 - state.householdsSafe;
  const grainAbandoned = FIRE_ROAD_GRAIN_WAGONS - state.grainSaved - state.grainBurned;
  const relationship = householdsLost === 0
    ? "Sera Vale saw you bring every household through. Her trust would survive the road."
    : `Sera Vale brought ${state.householdsSafe} households through and lost ${householdsLost}. She would remember both your help and its limits.`;
  const winter = state.grainSaved === FIRE_ROAD_GRAIN_WAGONS
    ? "All three grain wagons survived; the four eastern settlements keep their winter allotments."
    : state.grainSaved > 0
      ? `${state.grainSaved} grain wagon${state.grainSaved === 1 ? "" : "s"} survived; ${state.grainBurned} burned and ${grainAbandoned} remained east of the crossing. The settlements face a winter shortage.`
      : `No grain crossed behind the households; ${state.grainBurned} wagonload${state.grainBurned === 1 ? "" : "s"} burned and ${grainAbandoned} remained east. The settlements must find another winter supply.`;
  const evidence = state.hostCollarRecovered
    ? "The hound's marked collar gives you a quartermaster's sign and a trail toward the foreign host."
    : "The hound's keeper remains unknown; no evidence leaves the road with you.";
  return `<section class="road-under-ash__legacy" aria-labelledby="road-under-ash-legacy-title">
    <p class="eyebrow">WHAT A TESTAMENT WOULD KEEP</p>
    <h2 id="road-under-ash-legacy-title">The road does not end here.</h2>
    <ul><li>${escapeHtml(relationship)}</li><li>${escapeHtml(winter)}</li><li>${escapeHtml(woundCopy(state))}</li><li>${escapeHtml(evidence)}</li></ul>
  </section>`;
};

const finalCopy = (state: FireRoadActionState): string => state.outcome === "saved"
  ? `<strong>The western road receives the living.</strong><p>${state.householdsSafe} households crossed. ${state.grainSaved ? `${state.grainSaved} grain wagon${state.grainSaved === 1 ? "" : "s"} followed.` : "No grain wagon followed."} You chose when to leave and what else to risk carrying out.</p>${legacyCopy(state)}`
  : state.householdsSafe > 0
    ? `<strong>The living reach the western road without you.</strong><p>${state.householdsSafe} households crossed before fire or fang spent your last Health.</p>${legacyCopy(state)}`
    : `<strong>Smoke keeps what the road could not carry.</strong><p>No household reached safety. The proof ends here.</p>${legacyCopy(state)}`;

export const renderFireRoadUnderAsh = (state: FireRoadActionState): string => {
  const latest = state.turn > 0 ? state.events.at(-1) : undefined;
  const movements = fireRoadMovementFor(state);
  const movementTo = (position: FireRoadPositionId): FireRoadMovement | undefined =>
    movements.find(({ location }) => location === position);
  const actions = fireRoadActionsFor(state).filter(({ id }) => !id.startsWith("move:"));
  const action = (id: string): FireRoadAction | undefined => actions.find((candidate) => candidate.id === id);
  const availableAction = (id: string): FireRoadAction[] => {
    const candidate = action(id);
    return candidate?.available ? [candidate] : [];
  };
  const availableActions = actions.filter(({ available }) => available);
  const targetedActions = availableActions.filter(({ targets }) => targets?.length);
  const houndTargets = targetedActions.flatMap((action) => action.targets?.filter(({ id }) => id === "hound").map((target) => renderActionProofTarget(action.id, target)) ?? []);
  const crossing = fireRoadCrossingState(state);
  const abilities = [action("wait"), ...(state.hound ? [action("strike"), action("spirit-lash")] : []), ...availableAction("depart")]
    .filter((candidate): candidate is FireRoadAction => Boolean(candidate));
  const directionTargets = [
    ...availableAction("order:follow").map((candidate) => renderDirectionTarget(candidate, state.player, "follow-player", "Return to your side")),
    ...availableAction("order:brace").map((candidate) => renderDirectionTarget(candidate, FIRE_ROAD_BRACE, "brace-bridge", "Brace the bridge")),
    ...(state.hound ? availableAction("order:harry").map((candidate) => renderDirectionTarget(candidate, state.hound!, "harry-hound", "Harry the ash hound")) : []),
  ];
  const subjectPanels = [
    state.obstruction > 0 ? renderSubjectPanel({
      id: "broken-wagon",
      eyebrow: "OBSTRUCTION",
      title: "The broken grain wagon",
      body: fireRoadCrossingState(state) === "blocked-by-wreck"
        ? `${state.obstruction} measures of wreckage hold Sera's line at the bridge.`
        : `${state.obstruction} measures of wreckage still narrow the bridge lane.`,
      actions: availableAction("clear-obstruction"),
      extra: movementTo(FIRE_ROAD_BRIDGE) ? `<div class="road-under-ash__context-actions">${renderContextMovement(movementTo(FIRE_ROAD_BRIDGE)!)}</div>` : "",
    }) : "",
    state.ditchHand ? renderSubjectPanel({
      id: "ditch-hand",
      eyebrow: "BOUND SERVANT",
      title: "Ditch-Hand",
      body: state.servantOrder === "brace"
        ? "It holds the bridge shoulder until you give another direction."
        : state.servantOrder === "harry" ? "It keeps the ash hound occupied until recalled." : "It keeps close and waits for a place to put its weight.",
      actions: [],
      extra: `${movementTo("bridge-approach") ? `<div class="road-under-ash__context-actions">${renderContextMovement(movementTo("bridge-approach")!)}</div>` : ""}${renderDirectionControl(directionTargets.length)}`,
    }) : "",
    state.roadDead ? renderSubjectPanel({
      id: "road-dead",
      eyebrow: "USABLE REMAINS",
      title: "The dead carter",
      body: action("raise-road-dead")?.available
        ? "His limbs are broken in places, but the wagon-work remains in them."
        : action("raise-road-dead")?.reason ?? "Nothing in him answers now.",
      actions: [...availableAction("raise-road-dead"), ...availableAction("clear-obstruction")],
      extra: movementTo(FIRE_ROAD_BRIDGE)
        ? `<div class="road-under-ash__context-actions">${renderContextMovement(movementTo(FIRE_ROAD_BRIDGE)!)}</div>`
        : movementTo(state.roadDead) ? `<div class="road-under-ash__context-actions">${renderContextMovement(movementTo(state.roadDead)!)}</div>` : "",
    }) : "",
    state.raisedLaborer ? renderSubjectPanel({
      id: "raised-carter",
      eyebrow: "RAISED LABOR",
      title: "The carter at work",
      body: state.obstruction > 0 ? "It drags at the wreck each exchange without waiting for another order." : "The lane is open. Its remaining strength can still be spent on the grain.",
      actions: availableAction("claim-grain"),
    }) : "",
    state.houndRemains ? renderSubjectPanel({
      id: "hound-remains",
      eyebrow: "ENEMY REMAINS",
      title: "The cindered hound",
      body: state.hostCollarRecovered ? "The black collar is gone. Only burned hide and old ash remain." : action("recover-collar")?.available ? "A black collar lies tight beneath the burned mane." : action("recover-collar")?.reason ?? "The body offers nothing more.",
      actions: availableAction("recover-collar"),
    }) : "",
  ].join("");
  return `<article class="action-stage road-under-ash" data-action-proof-scene aria-labelledby="road-under-ash-title">
    <section class="action-stage__frame road-under-ash__frame" aria-label="The eastern road, its people, dangers, and available acts">
      <div class="action-stage__world" data-action-proof-world>
      <picture>
        <source media="(max-width: 36rem)" srcset="${ROAD_UNDER_ASH_SCENE_ART.mobile.src}">
        <img class="action-stage__backdrop road-under-ash__backdrop" src="${ROAD_UNDER_ASH_SCENE_ART.desktop.src}" width="${ROAD_UNDER_ASH_SCENE_ART.desktop.width}" height="${ROAD_UNDER_ASH_SCENE_ART.desktop.height}" alt="" decoding="async">
      </picture>
      <span class="action-stage__veil" aria-hidden="true"></span>
      <span class="road-under-ash__fire-front" style="--fire-edge:${fireFrontPercentForTurn(state.turn)}%" aria-hidden="true"></span>
      <header class="action-stage__hud">
        <div>
          <p class="eyebrow">FIRE ROAD DIRECT-PLAY PROOF · NONCANONICAL</p>
          <h1 id="road-under-ash-title" data-page-title tabindex="-1">The road under ash</h1>
          <p class="action-stage__summary">Six smoke-struck households wait behind a broken wagon. Move through the locality, put Ditch-Hand where weight matters, and decide what use the road-dead will serve.</p>
        </div>
        <div>
          <ul class="action-stage__meters" aria-label="Necromancer condition">
            <li class="action-stage__meter">R${state.turn}</li><li class="action-stage__meter">Health ${state.playerHealth}/14</li><li class="action-stage__meter">Spirit ${state.spirit}/4</li>${state.playerWounds.length ? `<li class="action-stage__meter action-stage__stake--danger">${state.playerWounds.length} wound${state.playerWounds.length === 1 ? "" : "s"}</li>` : ""}<li class="action-stage__meter">Ditch-Hand: ${escapeHtml(state.servantOrder)}</li>
          </ul>
          <ul class="action-stage__stakes" aria-label="The road's condition">
            <li class="action-stage__stake action-stage__stake--danger">${state.householdsRemaining} exposed</li><li class="action-stage__stake">${state.householdsSafe} safe</li><li class="action-stage__stake">${state.obstruction} wreckage</li><li class="action-stage__stake">${state.grainSaved} grain saved</li><li class="action-stage__stake action-stage__stake--danger">${state.grainBurned} grain burned</li>
          </ul>
          <details class="action-stage__history">
            <summary>Witness · ${state.events.length} ${state.events.length === 1 ? "entry" : "entries"}</summary>
            <ol>${state.events.map(({ title, detail }) => `<li><strong>${escapeHtml(title)}</strong> ${escapeHtml(detail)}</li>`).join("")}</ol>
          </details>
        </div>
      </header>
      ${state.obstruction > 0 ? `<button class="road-under-ash__wreck road-under-ash__subject" type="button" style="${positionStyle(FIRE_ROAD_BRIDGE)};--wreckage:${state.obstruction}" data-action="select-action-proof-subject" data-action-proof-subject-id="broken-wagon" aria-expanded="false" aria-controls="action-proof-subject-broken-wagon" aria-label="Examine the broken grain wagon. ${state.obstruction} measures of wreckage remain."><img src="/assets/scenes/fire-road-wreck-v1-768.png" width="768" height="512" alt="" decoding="async"><span>Broken grain wagon</span></button>` : ""}
      ${renderMovement(state)}
      ${figure(state.player, "necromancer", "Necromancer", "player", `${state.playerHealth} Health`, -.85)}
      ${figure(state.ditchHand, "ditch-hand", "Ditch-Hand", "ally", state.servantOrder, .5, undefined, "", "", undefined, "ditch-hand")}
      ${figure(state.sera, "sera", "Sera Vale", "ally", "leading the crossing", -.48, undefined, "", "", "sera-arrival")}
      ${state.householdsRemaining > 0 ? figure(state.households, "households", "Households", "neutral", `${state.householdsRemaining} remain · ${CROSSING_COPY[crossing]}`, .48) : ""}
      ${figure(state.hound, "hound", "Ash hound", "danger", undefined, 0, state.hound ? { current: state.houndHealth, max: FIRE_ROAD_HOUND_MAX_HEALTH } : undefined, houndTargets.join(""))}
      ${figure(state.houndRemains, "hound-remains", "Cindered hound", "occult", state.hostCollarRecovered ? "collar taken" : "black collar remains", 0, undefined, "", "road-under-ash__hound-remains", undefined, "hound-remains")}
      ${figure(state.roadDead, "road-dead", "Road-dead", "occult", "dead carter", .58, undefined, "", "", undefined, "road-dead")}
      ${figure(state.raisedLaborer, "raised-carter", "Raised carter", "occult", state.grainClaimed ? "hauling grain" : "dragging wreckage", .58, undefined, "", "", undefined, "raised-carter")}
      ${directionTargets.join("")}
      ${subjectPanels}
      ${latest ? `<p class="action-stage__latest" data-result-title tabindex="-1"><strong>${escapeHtml(latest.title)}</strong> ${escapeHtml(latest.detail)}</p>` : ""}
      ${renderActionProofTargetingPanel()}
      ${state.outcome === "active"
        ? `<nav class="road-under-ash__abilities" aria-label="Your immediate actions">${abilities.map(renderAbility).join("")}</nav>`
        : `<div class="action-stage__ending" data-result-title tabindex="-1">${finalCopy(state)}</div>`}
      </div>
      <div class="action-stage__conversation-host" data-action-proof-conversation-host></div>
    </section>
  </article>`;
};
