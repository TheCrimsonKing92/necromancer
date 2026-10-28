import {
  createStoryApproachIndex,
  type StoryApproachDefinition,
  type StoryApproachCatalog,
  type StoryApproachReadContext,
  type StoryPreparationSummaryEntry,
} from "../../../story-approaches";
import type { RunState } from "../../../types";
import { itemCount } from "../../../items";
import { fireRoadStateFor, type FireRoadPreparationId } from "./state";
import { fireRoadOperatingRoom } from "./state";

export const FIRE_ROAD_APPROACH_RESOLUTIONS = {
  firebreak: { kind: "mundane-check", skill: "survival", difficulty: 5 },
  "smoke-station": { kind: "mundane-check", skill: "medicine" },
  "open-wells": { kind: "mundane-check", skill: "persuasion", difficulty: 5 },
  "secure-carts": { kind: "mundane-check", skill: "barter" },
  "dead-keeper": { kind: "certain" },
  "servant-labor": { kind: "certain" },
  "rendered-lane": { kind: "certain" },
  "kept-bridge": { kind: "certain" },
  "host-need": { kind: "mundane-check", skill: "perception", difficulty: 5 },
  "witnessed-offer": { kind: "mundane-check", skill: "barter", difficulty: 5 },
} as const satisfies Record<FireRoadPreparationId, StoryApproachDefinition["resolution"]>;

export const FIRE_ROAD_APPROACH_TEMPO: Record<
  FireRoadPreparationId,
  NonNullable<StoryApproachDefinition["tempo"]>
> = {
  firebreak: { cost: 1, relief: { success: 2 }, label: "Takes time · success buys more", detail: "The attempt advances the fire. A sound black line checks it long enough to create another opening." },
  "smoke-station": { cost: 1, relief: { success: 1 }, label: "Takes time · success preserves room", detail: "The station takes time to establish. If it holds, fewer rescue hands are lost to smoke." },
  "open-wells": { cost: 1, relief: { success: 1 }, label: "Takes time · success preserves room", detail: "The dispute consumes time. Open water can keep the eastern roofs and rescue lanes viable." },
  "secure-carts": { cost: 1, relief: { success: 1 }, label: "Takes time · success preserves room", detail: "Finding teams advances the fire. A settled hire moves later work faster." },
  "dead-keeper": { cost: 1, relief: {}, label: "Takes time", detail: "Hosting the keeper occupies one opening, though its warning strengthens the rescue." },
  "servant-labor": { cost: 0, relief: {}, label: "Works in parallel", detail: "The servant clears burning timber from the wagon lane while you remain free to act elsewhere." },
  "rendered-lane": { cost: 1, relief: { certain: 2 }, label: "Takes time · the cold lane buys more", detail: "The rendering advances the fire elsewhere, but holds this passage long enough to create another opening." },
  "kept-bridge": { cost: 1, relief: {}, label: "Takes time", detail: "The mark occupies one opening, though the held bridge strengthens the rescue." },
  "host-need": { cost: 1, relief: {}, label: "Takes time", detail: "Reading the host occupies one opening while the fire and evacuation continue." },
  "witnessed-offer": { cost: 1, relief: {}, label: "Takes time", detail: "Assembling a lawful offer occupies one opening while the fire and evacuation continue." },
};

export const FIRE_ROAD_APPROACH_CATALOG: StoryApproachCatalog = {
  invitation: {
    eyebrow: "Before choosing terms",
    title: "Prepare the evacuation",
    detail: "Sera still holds the town's final choice. Before she makes it, you can help the road, call on your practice, or learn what might bend the God's terms.",
    actionLabel: "Browse every approach",
  },
  objectives: [
    { id: "slow-fire", label: "Slow the fire" },
    { id: "move-people", label: "Move the town" },
    { id: "treat-smoke", label: "Treat the smoke-struck" },
    { id: "change-terms", label: "Change the offered terms" },
  ],
  capabilities: [
    { id: "survival", label: "Survival" },
    { id: "medicine", label: "Medicine" },
    { id: "barter", label: "Barter" },
    { id: "persuasion", label: "Persuasion" },
    { id: "perception", label: "Perception" },
    { id: "command-dead-initiative", label: "Bound servant" },
    { id: "host-dead-initiative", label: "Dead guest" },
    { id: "render-death-altered-matter", label: "Rendered matter" },
    { id: "item:grave-salt", label: "Grave salt" },
    { id: "stabilize-body-continuity", label: "Grave seal" },
  ],
  targets: [
    { id: "scrub-line", label: "The scrub line" },
    { id: "smoke-struck", label: "The smoke-struck" },
    { id: "household-wells", label: "The household wells" },
    { id: "east-road", label: "The eastern road" },
    { id: "timber-bridge", label: "The timber bridge" },
    { id: "dead-bell-keeper", label: "The dead bell keeper" },
    { id: "foreign-host", label: "The foreign host" },
    { id: "town-officers", label: "The town officers" },
  ],
  approaches: [
    { id: "moving-shade:cut-firebreak", label: "Cut the eastern firebreak", lead: "Open the marked strip of scrub to bare earth.", detail: "Read the wind along Sera's eastern line, then put spades, wet hides, and living hands between the flame and the road.", objectives: ["slow-fire"], capabilities: ["survival"], targets: ["scrub-line"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:cut-firebreak", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS.firebreak, tempo: FIRE_ROAD_APPROACH_TEMPO.firebreak },
    { id: "moving-shade:smoke-station", label: "Establish a smoke station", lead: "Make clean air the first stop on the eastern road.", detail: "Set clean cloth, water, and a place where the smoke-struck can be sorted before the carts depart.", objectives: ["treat-smoke", "move-people"], capabilities: ["medicine"], targets: ["smoke-struck"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:smoke-station", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["smoke-station"], tempo: FIRE_ROAD_APPROACH_TEMPO["smoke-station"], knownImmediateCost: "Consumes one clean linen binding." },
    { id: "moving-shade:open-wells", label: "Open the household wells", lead: "Put the locked water into Sera's bucket lines.", detail: "Call the grain factor before the gathered households and make him defend locked wells while their roofs burn.", objectives: ["slow-fire", "change-terms"], capabilities: ["persuasion"], targets: ["household-wells"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:open-wells", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["open-wells"], tempo: FIRE_ROAD_APPROACH_TEMPO["open-wells"] },
    { id: "moving-shade:secure-carts", label: "Secure carts and draft teams", lead: "Put wheels beneath the households still inside.", detail: "Pay the waiting teamsters now so fewer people make the eastern road on foot.", objectives: ["move-people"], capabilities: ["barter"], targets: ["east-road"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:secure-carts", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["secure-carts"], tempo: FIRE_ROAD_APPROACH_TEMPO["secure-carts"], knownImmediateCost: "Costs 2 obols." },
    { id: "moving-shade:host-keeper", label: "Let the bell keeper finish the alarm", lead: "Let one unfinished warning find its last hearers.", detail: "Host the dead keeper long enough to recover the last route and the household the unfinished bell meant to warn.", objectives: ["move-people"], capabilities: ["host-dead-initiative"], targets: ["dead-bell-keeper"], timing: "observation", repeatability: "once", transitionId: "moving-shade:host-keeper", prominence: "practice", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["dead-keeper"], tempo: FIRE_ROAD_APPROACH_TEMPO["dead-keeper"], knownImmediateCost: "Costs 1 Spirit and 1 Health." },
    { id: "moving-shade:send-servant", label: "Send the servant into the smoke", lead: "Send dead labor where living breath fails.", detail: "Order the prepared body to drag burning timber from the wagon lane while you work elsewhere.", objectives: ["slow-fire", "move-people"], capabilities: ["command-dead-initiative"], targets: ["scrub-line", "east-road"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:send-servant", prominence: "practice", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["servant-labor"], tempo: FIRE_ROAD_APPROACH_TEMPO["servant-labor"] },
    { id: "moving-shade:render-lane", label: "Spend grave-salt on a narrow lane", lead: "Hold one passage colder than the fire.", detail: "Work grave-salt between the road stones until flame bends from one wagon-wide passage.", objectives: ["move-people", "slow-fire"], capabilities: ["render-death-altered-matter", "item:grave-salt"], capabilityMode: "combined", targets: ["east-road"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:render-lane", prominence: "practice", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["rendered-lane"], tempo: FIRE_ROAD_APPROACH_TEMPO["rendered-lane"], knownImmediateCost: "Consumes one measure of grave salt." },
    { id: "moving-shade:keep-bridge", label: "Keep the timber bridge joined", lead: "Bind every pegged joint into one crossing.", detail: "Lay a continuity mark across the deck so burning rails may fail without taking the joined timbers beneath them.", objectives: ["move-people"], capabilities: ["stabilize-body-continuity"], targets: ["timber-bridge"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:keep-bridge", prominence: "practice", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["kept-bridge"], tempo: FIRE_ROAD_APPROACH_TEMPO["kept-bridge"], knownImmediateCost: "Costs 1 Spirit." },
    { id: "moving-shade:read-host", label: "Read what the foreign host needs", lead: "Find the want concealed beneath the ordinance.", detail: "Count its water skins, remounts, and supply carts. Learn what the army needs from this road badly enough to accept a bounded term.", objectives: ["change-terms"], capabilities: ["perception"], targets: ["foreign-host"], timing: "observation", repeatability: "once", transitionId: "moving-shade:read-host", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["host-need"], tempo: FIRE_ROAD_APPROACH_TEMPO["host-need"] },
    { id: "moving-shade:witness-offer", label: "Put authority behind a seasonal offer", lead: "Bind the town's officers to the same terms.", detail: "Have Sera, the grain factor, and the household elders agree before witnesses to one season of passage and provisions—and no more.", objectives: ["change-terms"], capabilities: ["barter"], targets: ["town-officers"], timing: "preparation", repeatability: "once", transitionId: "moving-shade:witness-offer", resolution: FIRE_ROAD_APPROACH_RESOLUTIONS["witnessed-offer"], tempo: FIRE_ROAD_APPROACH_TEMPO["witnessed-offer"] },
  ],
};

export const FIRE_ROAD_APPROACH_INDEX = createStoryApproachIndex(
  FIRE_ROAD_APPROACH_CATALOG.approaches,
);

const PREPARATION_PRESENTATION: Record<
  FireRoadPreparationId,
  {
    secured: string;
    uncertain: string;
    detail: string;
    securedOutcome: StoryPreparationSummaryEntry["outcome"];
    uncertainOutcome: StoryPreparationSummaryEntry["outcome"];
  }
> = {
  firebreak: {
    secured: "A black line cuts the scrub",
    uncertain: "The firebreak holds only in places",
    detail: "More households and grain can cross",
    securedOutcome: { eyebrow: "THE SCRUB GIVES GROUND", title: "Black earth divides the fire.", body: "Brush hooks, wet hides, and spades open a raw seam across the resin scrub. When the wind leans east, the first flame reaches the cut and falls inward upon its own ash.", result: "The black line gives more households and grain wagons time to reach the road." },
    uncertainOutcome: { eyebrow: "THE FIREBREAK FALTERS", title: "The black line breaks in three places.", body: "The ground is opened, but roots and resin carry flame beneath the hurried cut. Sera posts beaters where the fire is most likely to cross.", result: "The beaters can hold one breach long enough for more carts to pass." },
  },
  "smoke-station": {
    secured: "The smoke station is working",
    uncertain: "The smoke station lacks order",
    detail: "More households can cross",
    securedOutcome: { eyebrow: "CLEAN CLOTH UNDER SMOKE", title: "The smoke-struck find clean air.", body: "Boiled linen passes from hand to blackened hand. Those who can still walk carry water; those who cannot are laid where the road reeve can count them before the carts depart.", result: "Fewer carriers fall to smoke, and more households can reach the road." },
    uncertainOutcome: { eyebrow: "TOO MANY NEED BREATH", title: "The station fills before it is ready.", body: "The linen is spent well, but coughing bodies arrive faster than anyone can sort them. A narrow order survives the confusion.", result: "Some of the smoke-struck can still be sorted and carried east." },
  },
  "open-wells": {
    secured: "The household wells stand open",
    uncertain: "The well locks remain disputed",
    detail: "More can cross · strengthens the seasonal offer",
    securedOutcome: { eyebrow: "THE WELL CLAIM YIELDS", title: "Water changes hands before the fire can take it.", body: "‘Name every jar you mean to save before you name another roof,’ Sera tells the grain factor. With the gathered householders watching, he gives her the keys. Bucket lines form from the wells to the eastern roofs and road troughs.", result: "Water reaches the roofs and road troughs; Sera's authority over the rescue is now public." },
    uncertainOutcome: { eyebrow: "THE CLAIM HOLDS", title: "The locks outlast the argument.", body: "‘My charge is winter,’ the grain factor says, and keeps the keys. Two household wells are forced before Sera ends the quarrel and sends every remaining hand back toward the fire.", result: "Two bucket lines begin, but the quarrel gives Sera no leverage over the foreign terms." },
  },
  "secure-carts": {
    secured: "Carts wait on the eastern road",
    uncertain: "Too few teams take the hire",
    detail: "More households can cross",
    securedOutcome: { eyebrow: "WHEELS ON THE EASTERN ROAD", title: "The teamsters take coin and turn back toward the smoke.", body: "Harness bells vanish west beneath the shouting. Empty carts return against the fleeing crowd and begin taking those who could not have walked the whole road.", result: "The returning carts carry people who could not have reached the road on foot." },
    uncertainOutcome: { eyebrow: "THE HIRE FALLS SHORT", title: "Coin finds fewer reins than promised.", body: "Two teams arrive and the rest remain somewhere beyond the smoke. The carts are loaded before anyone can argue the count.", result: "Two cartloads of people who could not walk can still be carried east." },
  },
  "dead-keeper": {
    secured: "The last alarm reached the eastern lanes",
    uncertain: "The keeper's last route remains broken",
    detail: "One overlooked household can be found",
    securedOutcome: { eyebrow: "THE LAST BELL", title: "A dead warning reaches the living.", body: "The keeper borrows your mouth only long enough to name a lane, a cellar, and the household that never heard the final bell. Sera sends runners before the voice leaves you.", result: "Sera's runners can now reach the household missed by the living alarm." },
    uncertainOutcome: { eyebrow: "THE LAST BELL", title: "The warning returns without every name.", body: "Smoke and death have broken the keeper's memory into places without order. One lane can still be found among them.", result: "Sera can send a runner down the one lane the keeper remembers." },
  },
  "servant-labor": {
    secured: "A prepared body labors in the smoke",
    uncertain: "The servant's allotted work falls short",
    detail: "Clears the wagon lane without taking your time",
    securedOutcome: { eyebrow: "DEAD LABOR, NARROWLY BOUND", title: "The smoke takes no breath from Ditch-Hand.", body: "The servant enters where living carriers turn blind and hauls burning timber clear of the wagon lane. Tallow darkens along its seams, but the assigned work holds.", result: "The wagon lane is clearer; the servant loses 2 Health while your own opportunity remains." },
    uncertainOutcome: { eyebrow: "THE BINDING STRAINS", title: "The body reaches the smoke and no farther.", body: "Heat loosens every prepared seam. The servant clears what it can before its joints seize.", result: "One obstruction leaves the wagon lane before the servant stops." },
  },
  "rendered-lane": {
    secured: "One lane holds cold",
    uncertain: "The rendered lane fails under the heat",
    detail: "More households and grain can cross",
    securedOutcome: { eyebrow: "GRAVE-SALT UNDER FLAME", title: "One narrow lane refuses the heat.", body: "The rendered salt whitens, runs, and sets again between the stones. Fire bends from the passage as carts enter it axle to axle.", result: "A wagon-wide lane remains passable; one grave salt was consumed." },
    uncertainOutcome: { eyebrow: "THE RENDERING THINS", title: "Cold survives only in patches.", body: "The salt spends itself unevenly. Drivers learn the white stones quickly and keep their wheels upon them.", result: "Careful drivers can still follow the cold stones through the heat." },
  },
  "kept-bridge": {
    secured: "The timber bridge remains joined",
    uncertain: "The bridge's continuity is failing",
    detail: "More households and grain can cross",
    securedOutcome: { eyebrow: "THE CROSSING REMEMBERS", title: "The bridge remains whole beneath the fire.", body: "The continuity mark holds every pegged joint as part of one deck. Burning rails fall away, but the sealed timbers bear each wagon across.", result: "The deck can bear the loaded wagons; 1 Spirit was spent." },
    uncertainOutcome: { eyebrow: "THE CROSSING STRAINS", title: "The bridge comes apart by degrees.", body: "The mark holds at the center and frays toward either bank. Sera sends the heaviest wagons first.", result: "The heaviest grain wagons can cross before the outer joints fail." },
  },
  "host-need": {
    secured: "The host's supply need is known",
    uncertain: "The host conceals what it needs",
    detail: "Strengthens the seasonal counteroffer",
    securedOutcome: { eyebrow: "THE HOST CANNOT HIDE ITS HUNGER", title: "The remount lines betray the ordinance.", body: "Fresh horses stand too few among the foreign host, and its water carts arrive nearly dry. This army needs passage and provision before it needs another subject town.", result: "You gain bargaining leverage for the seasonal counteroffer." },
    uncertainOutcome: { eyebrow: "BRONZE AND CANVAS", title: "The host keeps its want behind ordered lines.", body: "Every wagon is screened and every remount moved before it can be counted twice. The ordinance reveals nothing it did not mean to show.", result: "No bargaining leverage was gained." },
  },
  "witnessed-offer": {
    secured: "The seasonal offer bears witnesses",
    uncertain: "The town officers will not bind one offer",
    detail: "Strengthens the seasonal counteroffer",
    securedOutcome: { eyebrow: "A LESSER TERM TAKES FORM", title: "The town agrees to one season.", body: "‘One season,’ Sera says. The grain factor makes her name the provisions; two household elders make her name what the host will never receive. Before the foreign vanes, all four repeat one term: passage and provision until winter, with neither quartering right nor subject oath beyond it.", result: "You gain bargaining leverage for the seasonal counteroffer." },
    uncertainOutcome: { eyebrow: "THE TOWN DIVIDES", title: "No common term survives the witnesses.", body: "Sera names one season. The grain factor refuses provisions until his winter charge is protected; one elder permits passage but no quarters, and the other will promise neither. They face the foreign vanes without a common term.", result: "No bargaining leverage was gained." },
  },
};

export const fireRoadApproachContext = (run: RunState): StoryApproachReadContext => {
  const state = fireRoadStateFor(run);
  const closed = (id: FireRoadPreparationId) => state.preparations.includes(id);
  const noRoom = fireRoadOperatingRoom(state) === 0;
  const expired = { state: "opportunity-closed" as const, reason: "The fire has closed the remaining preparation window." };
  const tradition = run.player.tradition;
  return { availability: {
    "moving-shade:cut-firebreak": closed("firebreak") ? { state: "opportunity-closed", reason: "The black line has already been cut." } : noRoom ? expired : { state: "available" },
    "moving-shade:smoke-station": closed("smoke-station") ? { state: "opportunity-closed", reason: "The smoke station is already working." } : noRoom ? expired : itemCount(run.player.inventory, "linen-binding") < 1 ? { state: "needs-preparation", reason: "Requires one clean linen binding." } : { state: "available" },
    "moving-shade:open-wells": closed("open-wells") ? { state: "opportunity-closed", reason: "The well claim has already been settled for this evacuation." } : noRoom ? expired : { state: "available" },
    "moving-shade:secure-carts": closed("secure-carts") ? { state: "opportunity-closed", reason: "Every available team has already been committed." } : noRoom ? expired : run.player.obols < 2 ? { state: "needs-preparation", reason: "The teamsters require 2 obols." } : { state: "available" },
    "moving-shade:host-keeper": closed("dead-keeper") ? { state: "opportunity-closed", reason: "The keeper's last alarm has reached the eastern lanes." } : noRoom ? expired : tradition !== "medium" ? { state: "inapplicable", reason: "Your practice cannot host the keeper's unfinished initiative." } : run.player.spirit < 1 || run.player.hp < 2 ? { state: "needs-preparation", reason: "Requires 1 Spirit and enough Health to bear the guest." } : { state: "available" },
    "moving-shade:send-servant": closed("servant-labor") ? { state: "opportunity-closed", reason: "The servant already bears its allotted work." } : noRoom ? expired : tradition !== "summoner" ? { state: "inapplicable", reason: "This course requires a prepared servant." } : run.practiceStates?.bonebinder?.servant ? { state: "available" } : { state: "needs-preparation", reason: "No standing servant is present." },
    "moving-shade:render-lane": closed("rendered-lane") ? { state: "opportunity-closed", reason: "One grave-salted lane already holds." } : noRoom ? expired : tradition !== "thaumaturgist" ? { state: "inapplicable", reason: "Your practice does not render death-altered matter." } : itemCount(run.player.inventory, "grave-salt") < 1 ? { state: "needs-preparation", reason: "Requires one measure of prepared grave salt." } : { state: "available" },
    "moving-shade:keep-bridge": closed("kept-bridge") ? { state: "opportunity-closed", reason: "The bridge is already held under one continuity." } : noRoom ? expired : tradition !== "grave-warden" ? { state: "inapplicable", reason: "Your practice cannot keep the bridge's continuity." } : run.player.spirit < 1 ? { state: "needs-preparation", reason: "Requires 1 Spirit." } : { state: "available" },
    "moving-shade:read-host": closed("host-need") ? { state: "opportunity-closed", reason: "The host's immediate need has already been read." } : noRoom ? expired : { state: "available" },
    "moving-shade:witness-offer": closed("witnessed-offer") ? { state: "opportunity-closed", reason: "The seasonal offer already bears the town's authority." } : noRoom ? expired : { state: "available" },
  } };
};

export const fireRoadPreparationSummary = (run: RunState): StoryPreparationSummaryEntry[] => {
  const state = fireRoadStateFor(run);
  const prepared = state.preparations.map((id) => {
    const result = state.preparationResults[id] ?? "certain";
    const uncertain = result === "failure";
    const presentation = PREPARATION_PRESENTATION[id];
    const tempo = FIRE_ROAD_APPROACH_TEMPO[id];
    const netRoom = (tempo.relief[result] ?? 0) - tempo.cost;
    const tempoDetail = netRoom > 0
      ? "Bought more room to act"
      : netRoom === 0
        ? tempo.cost === 0 ? "Worked in parallel" : "Preserved room to act"
        : "The scene advanced";
    const baseOutcome = uncertain
      ? presentation.uncertainOutcome
      : presentation.securedOutcome;
    const outcomeTempo = netRoom > 0
      ? "The work buys another opening to act."
      : netRoom === 0
        ? tempo.cost === 0
          ? "It happens in parallel; your own opening remains."
          : "The result preserves the town's room to act."
        : "The fire advances while the work is done.";
    return {
      id,
      label: uncertain ? presentation.uncertain : presentation.secured,
      detail: `${presentation.detail} · ${tempoDetail}`,
      outcome: baseOutcome
        ? { ...baseOutcome, result: `${baseOutcome.result} ${outcomeTempo}` }
        : undefined,
      tone: uncertain ? "uncertain" as const : "secured" as const,
    };
  });
  return state.counterofferAttempted && state.counterofferAccepted === false
    ? [...prepared, { id: "counteroffer-delay", label: "The refusal cost one grain wagon", tone: "uncertain" }]
    : prepared;
};

export const fireRoadApproachStatus = (run: RunState) => {
  const room = fireRoadOperatingRoom(fireRoadStateFor(run));
  if (room === 0) return {
    eyebrow: "The preparation window has closed",
    title: "No preparation remains.",
    detail: "The remaining hands must now carry out the town's chosen course.",
    tone: "closed" as const,
  };
  if (room === 1) return {
    eyebrow: "The fire's margin",
    title: "One substantial attempt remains.",
    detail: "Work that checks the fire may widen the margin; other work will bring the town to its decision.",
    tone: "strained" as const,
  };
  return {
    eyebrow: "The fire's margin",
    title: room >= 4 ? "The fire has yielded ground." : "Several courses remain open.",
    detail: "Substantial actions advance the scene. Work that checks the fire can hold or widen the margin.",
    tone: "steady" as const,
  };
};
