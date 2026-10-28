import type {
  TacticalSceneAction,
  TacticalSceneEvent,
  TacticalSceneProjection,
  TacticalScenePrototype,
  TacticalSceneSubject,
  TacticalSceneTransition,
} from "../../tactical-scene";

export type ConduitPhase = "arrival" | "terms" | "brace" | "resolved";
export type ConduitOutcome =
  | "passage-granted"
  | "neutral-work"
  | "ordinary-loss"
  | "strike-during-brace"
  | "abandoned";

export interface SiegeConduitState {
  readonly phase: ConduitPhase;
  readonly evacuation: 0 | 1 | 2;
  readonly shoring: 0 | 1 | 2;
  readonly treatmentReady: boolean;
  readonly loadPathKnown: boolean;
  readonly reeveConcealment: "unknown" | "proved";
  readonly coalitionPlan: "unknown" | "known" | "disclosed";
  readonly keptArch: boolean;
  readonly terms: "unheard" | "full" | "neutral";
  readonly sovereignCondition: "sound" | "strained" | "wounded";
  readonly outcome: ConduitOutcome | null;
  readonly events: readonly TacticalSceneEvent[];
}

const event = (
  id: string,
  eyebrow: string,
  title: string,
  detail: string,
  result?: string,
): TacticalSceneEvent => ({ id, eyebrow, title, detail, result });

const initialState = (): SiegeConduitState => ({
  phase: "arrival",
  evacuation: 0,
  shoring: 0,
  treatmentReady: false,
  loadPathKnown: false,
  reeveConcealment: "unknown",
  coalitionPlan: "unknown",
  keptArch: false,
  terms: "unheard",
  sovereignCondition: "sound",
  outcome: null,
  events: [],
});

const withEvent = (
  state: SiegeConduitState,
  next: Omit<Partial<SiegeConduitState>, "events">,
  nextEvent: TacticalSceneEvent,
): TacticalSceneTransition<SiegeConduitState> => ({
  state: { ...state, ...next, events: [...state.events, nextEvent] },
  event: nextEvent,
});

const unavailable = (reason: string): TacticalSceneAction["availability"] => ({
  state: "unavailable",
  reason,
});
const available: TacticalSceneAction["availability"] = { state: "available" };

const action = (
  id: string,
  subjectId: string,
  label: string,
  lead: string,
  kind: TacticalSceneAction["kind"],
  availability: TacticalSceneAction["availability"] = available,
  stakes?: string,
): TacticalSceneAction => ({
  id,
  subjectId,
  label,
  lead,
  kind,
  availability,
  stakes,
  activation: { kind: "prototype-transition" },
});

const canPrepare = (state: SiegeConduitState): boolean =>
  state.phase === "arrival" || state.phase === "terms";

const actionsFor = (state: SiegeConduitState): TacticalSceneAction[] => [
  action(
    "trace-load",
    "broken-span",
    "Mark where the span will break",
    "Read old mortar, fresh cracks, and the lean of the piers before sending workers underneath.",
    "prepare",
    !canPrepare(state) ? unavailable("The span is already under committed work.")
      : state.loadPathKnown ? unavailable("The masons have already marked the dangerous line.") : available,
  ),
  action(
    "raise-shoring",
    "access-gallery",
    "Shore the covered passage",
    "Wedge green timber beneath the passage roof so workers and evacuees keep one way under the span.",
    "prepare",
    !canPrepare(state) ? unavailable("The remaining shore cannot be altered during the brace.")
      : state.shoring >= 2 ? unavailable("The gallery carries all the safe timber it can take.") : available,
    "The crack widens while the shore is raised",
  ),
  action(
    "clear-houses",
    "lower-houses",
    "Clear the lower houses",
    "Assign carts, settle who guards unattended homes, and move the households nearest the failing pier.",
    "command",
    !canPrepare(state) ? unavailable("The masons have begun the final cut; no new house-line can be organized beneath them.")
      : state.evacuation >= 2 ? unavailable("Every reachable household is already in the evacuation order.") : available,
    "The crack widens while the houses are cleared",
  ),
  action(
    "establish-station",
    "mason-yard",
    "Establish a crush station",
    "Lay out splints, clean binding, and triage space for whichever plan fails bodily.",
    "prepare",
    !canPrepare(state) ? unavailable("The work parties have already committed.")
      : state.treatmentReady ? unavailable("The crush station is ready.") : available,
    "Consumes medical stores",
  ),
  action(
    "confront-reeve",
    "water-reeve",
    "Open Maelin Orr's record chest",
    "Set the old warnings beside the new cracks. If she delayed the repair, the town can take her timber now.",
    "negotiate",
    !canPrepare(state) ? unavailable("The hearing cannot be forced while the span is being held.")
      : !state.loadPathKnown ? unavailable("First establish what the old repairs concealed.")
        : state.reeveConcealment === "proved" ? unavailable("The concealment is already proved.") : available,
  ),
  action(
    "find-watchers",
    "coalition-watchers",
    "Find who is watching the Sovereign",
    "Look past the fleeing crowd for eyes fixed on plated joints rather than falling stone.",
    "observe",
    !canPrepare(state) ? unavailable("The watchers have either acted or dispersed.")
      : state.coalitionPlan !== "unknown" ? unavailable("The strike plan is already known.") : available,
  ),
  action(
    "keep-arch",
    "broken-span",
    "Keep one arch whole",
    "Grave Warden: name one arch as the work that must remain while the masons cut the adjoining stone away.",
    "ritual",
    !canPrepare(state) ? unavailable("The arch can no longer be marked before the committed work.")
      : state.keptArch ? unavailable("The named arch is already kept.")
        : !state.loadPathKnown ? unavailable("The Warden must first know which connected arch can be named honestly.") : available,
    "Costs Spirit · preserves one arch, not the whole conduit",
  ),
  action(
    "hear-terms",
    "campaign-marshal",
    "Make Halwen Sar state her price",
    "Put the column's passage and the ban on turning the repaired conduit into a wall before witnesses.",
    "negotiate",
    state.phase !== "arrival" ? unavailable("The terms have already been opened.") : available,
  ),
  action(
    "accept-passage",
    "siege-sovereign",
    "Grant passage and ask the brace",
    "Receive the Sovereign's bodily help and promise this road to Halwen's column.",
    "negotiate",
    state.phase !== "terms" ? unavailable("Halwen must state the army's price before the town can accept it.") : available,
  ),
  action(
    "counter-neutral",
    "campaign-marshal",
    "Offer passage for this rescue only",
    "Allow the Sovereign beneath the arch and the present column across the road, with no garrison and no claim beyond the day's work.",
    "negotiate",
    state.phase !== "terms" ? unavailable("Counterterms belong to the open negotiation.")
      : !(state.loadPathKnown && state.evacuation >= 1 && (state.shoring >= 1 || state.reeveConcealment === "proved"))
        ? unavailable("Mark the break, clear one line of houses, and secure either timber or proof against the reeve.") : available,
    "Creates a witnessed term other towns may invoke",
  ),
  action(
    "ordinary-work",
    "master-mason",
    "Let Toman bring the span down",
    "Refuse the army's price and trust the cleared houses, timber, and time already bought.",
    "command",
    state.phase !== "terms" ? unavailable("The town must hear the offered alternative first.") : available,
  ),
  action(
    "warn-sovereign",
    "coalition-watchers",
    "Disclose the strike and guard the brace",
    "Protect the rescue without swearing that the Sovereign's wider campaign is just.",
    "fight",
    state.phase !== "brace" ? unavailable("The Sovereign is not yet exposed beneath the span.")
      : state.coalitionPlan !== "known" ? unavailable("No specific strike is known to disclose.") : available,
  ),
  action(
    "aid-strike",
    "siege-sovereign",
    "Strike while it bears the span",
    "Drive iron between its plates while its limbs carry the stone. If it buckles, the conduit may come down with it.",
    "fight",
    state.phase !== "brace" ? unavailable("The Sovereign is not braced and exposed.")
      : state.coalitionPlan !== "known" ? unavailable("No coordinated strike point is known.") : available,
    "The Sovereign is exposed · the lower houses share the risk",
  ),
  action(
    "finish-brace",
    "broken-span",
    "Finish the evacuation and cut free",
    "Hold the agreed direction while masons dismantle the dangerous span in order.",
    "command",
    state.phase !== "brace" ? unavailable("No brace is carrying the span.") : available,
  ),
  action(
    "leave",
    "town-road",
    "Leave the town to decide",
    "Go. Toman keeps every preparation already made; Halwen and the hidden attackers keep their own intentions.",
    "move",
    state.phase === "resolved" ? unavailable("The conduit is already decided.") : available,
  ),
].filter(({ id }) => {
  if (id === "trace-load") return canPrepare(state) && !state.loadPathKnown;
  if (id === "raise-shoring") return canPrepare(state) && state.shoring < 2;
  if (id === "clear-houses") return canPrepare(state) && state.evacuation < 2;
  if (id === "establish-station") return canPrepare(state) && !state.treatmentReady;
  if (id === "confront-reeve") {
    return canPrepare(state) && state.loadPathKnown && state.reeveConcealment === "unknown";
  }
  if (id === "find-watchers") return canPrepare(state) && state.coalitionPlan === "unknown";
  if (id === "keep-arch") return canPrepare(state) && state.loadPathKnown && !state.keptArch;
  if (id === "hear-terms") return state.phase === "arrival";
  if (id === "accept-passage" || id === "counter-neutral" || id === "ordinary-work") {
    return state.phase === "terms";
  }
  if (id === "warn-sovereign" || id === "aid-strike") {
    return state.phase === "brace" && state.coalitionPlan === "known";
  }
  if (id === "finish-brace") return state.phase === "brace";
  return id === "leave" && state.phase !== "resolved";
});

const subject = (
  id: string,
  label: string,
  kind: TacticalSceneSubject["kind"],
  tone: TacticalSceneSubject["tone"],
  status: string,
  description: string,
  x: number,
  y: number,
  depth: 0 | 1 | 2 | 3,
  glyph: string,
  actionIds: readonly string[],
  visualState?: string,
): TacticalSceneSubject => ({
  id, label, kind, tone, status, description,
  placement: { x, y, depth }, glyph, actionIds, visualState,
});

const subjectsFor = (state: SiegeConduitState): TacticalSceneSubject[] => [
  subject("lower-houses", "Lower houses", "site", state.evacuation >= 2 ? "secured" : "danger", state.evacuation === 2 ? "Every reachable household is on the road" : state.evacuation === 1 ? "The first house-line is moving" : "Households remain beneath the first fall", "Carts jam the lower lane. Some householders will not leave until someone records who holds their keys and goods.", 18, 67, 2, "⌂", ["clear-houses"], `evacuation-${state.evacuation}`),
  subject("mason-yard", "Mason yard", "resource", state.treatmentReady ? "secured" : "neutral", state.treatmentReady ? "Crush station ready" : "Tools, timber, no triage", "Toman's yard holds splints, rope, wedges, and the last uncommitted beams. It can serve the stonework or the wounded.", 36, 78, 3, "╫", ["establish-station"], state.treatmentReady ? "station-ready" : "yard-open"),
  subject("access-gallery", "Covered passage", "site", state.shoring >= 2 ? "secured" : "strained", state.shoring === 2 ? "Timber set from end to end" : state.shoring === 1 ? "One shore raised" : "Roof taking the span's weight", "The covered maintenance stair is the safest way beneath the conduit—until its low roof gives way.", 48, 59, 2, "▰", ["raise-shoring"], `shoring-${state.shoring}`),
  subject("broken-span", "The cracked conduit", "hazard", state.phase === "resolved" ? "strained" : "danger", state.loadPathKnown ? "Masons' danger marks cross the second pier" : "Water running; fresh mortar splitting", "The old stone channel carries the town's water above the roofs. One pier has shifted far enough to open a hand-wide crack.", 51, 34, 1, "≋", ["trace-load", "keep-arch", "finish-brace"], `${state.phase}-${state.loadPathKnown ? "marked" : "unread"}-${state.keptArch ? "kept" : "open"}`),
  subject("water-reeve", "Maelin Orr, water reeve", "actor", state.reeveConcealment === "proved" ? "strained" : "neutral", state.reeveConcealment === "proved" ? "Her deferred repair is public" : "Her record chest remains locked", "Maelin wants the conduit and her office to survive the same morning. The two aims may no longer fit together.", 29, 45, 1, "R", ["confront-reeve"], state.reeveConcealment),
  subject("master-mason", "Toman Rusk, master mason", "actor", "ally", "Directing the crews beneath the span", "Toman knows how to bring the failing stone down in pieces. He will not pretend that water, houses, and workers can all be kept without help.", 39, 63, 2, "M", ["ordinary-work"]),
  subject("campaign-marshal", "Marshal Halwen Sar", "actor", "strained", state.terms === "unheard" ? "Waiting to state the army's price" : state.terms === "neutral" ? "One-day passage witnessed" : "Present-column passage promised", "Halwen means to save the town in a way every watcher will remember when her army reaches the next gate.", 75, 50, 1, "⚑", ["hear-terms", "counter-neutral"], state.terms),
  subject("coalition-watchers", state.coalitionPlan === "unknown" ? "Watchers in the crowd" : "The concealed coalition", "force", state.coalitionPlan === "unknown" ? "neutral" : "danger", state.coalitionPlan === "unknown" ? "Several faces follow the plated body" : state.coalitionPlan === "known" ? "Waiting for the Sovereign to kneel" : "Their strike has been exposed", state.coalitionPlan === "unknown" ? "Amid the evacuation, several strangers attend more closely to the Sovereign than to the breaking stone. Their purpose is not yet known." : "They believe a wound dealt here may spare towns farther along the army's road. The people beneath this conduit are not their first concern.", 79, 22, 0, "⌁", ["find-watchers", "warn-sovereign"], state.coalitionPlan),
  subject("siege-sovereign", "The Siege Sovereign", "actor", state.phase === "brace" ? "strained" : "occult", state.phase === "brace" ? `${state.sovereignCondition}; the span rests across its shoulders` : `${state.sovereignCondition}; waiting beneath the eastern arch`, "Four plated limbs carry its long mineral body. A breathing chamber along its throat shapes deliberate mortal speech. It can feel a load only where its own body meets the stone.", 67, 35, 1, "S", ["accept-passage", "aid-strike"], `${state.phase}-${state.sovereignCondition}`),
  subject("town-road", "Town road", "site", state.terms === "full" ? "danger" : "neutral", state.terms === "full" ? "Promised to Halwen's column" : "The promise remains unsettled", "The only dry approach carries evacuees now and may carry the foreign army next.", 72, 77, 3, "↗", ["leave"], state.terms),
];

const project = (state: SiegeConduitState): TacticalSceneProjection => {
  const actions = actionsFor(state);
  const visibleActionIds = new Set(actions.map(({ id }) => id));
  const subjects = subjectsFor(state).map((entry) => ({
    ...entry,
    actionIds: entry.actionIds.filter((id) => visibleActionIds.has(id)),
  }));
  const safeGroups = Math.min(4, state.evacuation * 2 + state.shoring + (state.keptArch ? 1 : 0));
  return {
    id: "siege-sovereign:failing-conduit",
    eyebrow: "SIEGE SOVEREIGN PROOF · NONCANONICAL",
    title: state.phase === "resolved" ? "Water runs through the chosen cost." : "The failing conduit",
    summary: "The conduit is failing above the lower houses. Toman can sacrifice stone to save people; Halwen offers the Sovereign's body beneath the break and asks the road in return.",
    phase: state.phase,
    background: {
      key: `failing-conduit-${state.phase}`,
      alt: "Fixed isometric view of an elevated stone conduit over an unwalled town, with lower houses, mason yard, town road, a foreign army, and the approaching Siege Sovereign.",
    },
    subjects,
    actions,
    connections: [
      { id: "water-load", from: "broken-span", to: "access-gallery", label: state.shoring >= 2 ? "Timber holds the covered passage" : "The failing pier bears upon the passage roof", state: state.shoring >= 2 ? "secured" : "threatened" },
      { id: "evacuation-route", from: "lower-houses", to: "town-road", label: state.evacuation >= 2 ? "The lower houses have the road" : "Evacuees and the foreign column need the same road", state: state.evacuation >= 2 ? "secured" : "threatened" },
      { id: "brace-reach", from: "siege-sovereign", to: "broken-span", label: state.phase === "brace" ? "The span rests on the Sovereign's body" : "The Sovereign must stand beneath the break", state: state.phase === "brace" ? "secured" : state.phase === "resolved" ? "blocked" : "open" },
      { id: "strike-line", from: "coalition-watchers", to: "siege-sovereign", label: state.coalitionPlan === "known" ? "Hidden iron waits for a carrying joint" : state.coalitionPlan === "disclosed" ? "The ambush has been named" : "Some watchers study the plated joints", state: state.coalitionPlan === "known" ? "threatened" : state.coalitionPlan === "disclosed" ? "blocked" : "open" },
    ],
    measures: [
      { id: "evacuation", label: "Lower house-lines cleared", value: `${state.evacuation} of 2`, tone: state.evacuation >= 2 ? "secured" : "danger" },
      { id: "shoring", label: "Passage shores raised", value: `${state.shoring} of 2`, tone: state.shoring >= 2 ? "secured" : "strained" },
      { id: "reach", label: "House-lines with a way clear", value: `${safeGroups} / 4`, tone: safeGroups >= 4 ? "secured" : "strained" },
      { id: "sovereign", label: "Sovereign body", value: state.sovereignCondition, tone: state.sovereignCondition === "wounded" ? "danger" : state.sovereignCondition === "strained" ? "strained" : "occult" },
    ],
    events: state.events,
    resolved: state.phase === "resolved",
  };
};

const act = (state: SiegeConduitState, actionId: string): TacticalSceneTransition<SiegeConduitState> => {
  const chosen = actionsFor(state).find(({ id }) => id === actionId);
  if (!chosen) return { state, error: "That scene action does not exist." };
  if (chosen.availability.state === "unavailable") return { state, error: chosen.availability.reason };
  const commit = (
    next: Omit<Partial<SiegeConduitState>, "events">,
    nextEvent: TacticalSceneEvent,
  ) => withEvent(state, next, { ...nextEvent, subjectId: chosen.subjectId });
  switch (actionId) {
    case "trace-load": return commit({ loadPathKnown: true }, event("load-marked", "THE BREAK IS MARKED", "Chalk crosses the second pier.", "Old mortar powders beneath the hammer. Toman marks a line from the shifted pier to the covered passage and orders every idle worker out from under it.", "The masons know where the span will fall first."));
    case "raise-shoring": return commit({ shoring: Math.min(2, state.shoring + 1) as 1 | 2 }, event(`shore-${state.shoring + 1}`, "TIMBER TAKES WEIGHT", "The covered passage groans and remains open.", "Crews wedge green timber beneath the maintenance roof. Dust sifts down, but the next house-line can still pass under it.", "One more shore now stands beneath the passage; the timber will be lost if the conduit falls."));
    case "clear-houses": return commit({ evacuation: Math.min(2, state.evacuation + 1) as 1 | 2 }, event(`evacuation-${state.evacuation + 1}`, "THE LOWER ROAD MOVES", "Another line of houses empties.", "Carts turn beneath the conduit. Maelin's clerks take keys and names at the road so unattended homes do not become an argument at every threshold.", "More households will be clear when the span is cut."));
    case "establish-station": return commit({ treatmentReady: true }, event("station-ready", "CARE BEFORE COLLAPSE", "The mason yard becomes a place for the wounded.", "Splints, clean binding, and two cleared worktables wait beside the stone tools.", "Anyone brought out alive can be treated before the road takes them east."));
    case "confront-reeve": return commit({ reeveConcealment: "proved" }, event("reeve-proved", "THE CHEST IS OPENED", "Maelin's own seal lies beneath the warning.", "The mason's report names the settling pier and the repair levy Maelin postponed. ‘The levy fed the town through winter,’ she says. Toman holds out his hand. ‘Then open the yard before it buys funerals.’ Maelin gives him the keys.", "The crews receive the reeve's timber and carts."));
    case "find-watchers": return commit({ coalitionPlan: "known" }, event("strike-known", "A SECOND DANGER WAITS", "Three strangers watch the plated joints.", "They carry short iron made for the gap beneath a shoulder plate. They mean to strike when the Sovereign kneels under the conduit.", "You can warn the Sovereign, join the strike, or leave the attackers concealed."));
    case "keep-arch": return commit({ keptArch: true, shoring: Math.min(2, state.shoring + 1) as 1 | 2 }, event("arch-kept", "ONE ARCH KEEPS ITS NAME", "The masons may cut beside it without cutting through it.", "Your seal follows the arch Toman names, from pier foot to crown. The adjoining stone remains ordinary masonry and may still fall.", "One arch will remain joined through the dismantling."));
    case "hear-terms": return commit({ phase: "terms" }, event("terms-open", "HALWEN STATES THE PRICE", "Her column crosses after the last cart.", "‘The Sovereign bears the span. My present column receives this road when the last cart clears,’ Halwen says. ‘No garrison remains, and no military wall rises from the repair.’ Maelin, Toman, and the lower householders hear the same terms.", "The offered bargain is now open: accept it, counter it, or trust the ordinary work."));
    case "accept-passage": return commit({ phase: "brace", terms: "full", sovereignCondition: "strained" }, event("brace-full", "THE SOVEREIGN KNEELS", "Stone settles across plated shoulders.", `Its forelimbs spread beneath ${state.loadPathKnown ? "the marked break" : "the visible crack"}. Water trembles in the channel overhead while Halwen's banners wait behind the last household cart.`, "The masons can cut while the Sovereign carries the span; the present column is owed the road."));
    case "counter-neutral": return commit({ phase: "brace", terms: "neutral", sovereignCondition: "strained" }, event("brace-neutral", "ONE DAY, ONE ROAD", "Halwen accepts no garrison and no later claim.", "‘One crossing for this rescue,’ Toman says. Halwen looks to the waiting Sovereign, then answers before the town: ‘One day. One column. No claim after.’ The Sovereign steps beneath the marked pier.", "The masons can cut while the Sovereign carries the span; other towns may invoke the witnessed limit."));
    case "ordinary-work": return commit({ phase: "resolved", outcome: "ordinary-loss" }, event("ordinary-loss", "TOMAN MAKES THE CUT", "Timber holds long enough for iron to enter the crack.", "The crews dismantle against splitting mortar. Halwen's column receives no promise of the road.", `${state.evacuation + state.shoring + (state.keptArch ? 1 : 0) >= 4 ? "All reachable people escape, but part of the conduit is lost." : "People are wounded and the lower water reach is lost."}${state.treatmentReady ? " The crush station keeps injuries from becoming deaths." : ""}`));
    case "warn-sovereign": return commit({ coalitionPlan: "disclosed" }, event("brace-guarded", "THE HIDDEN IRON IS NAMED", "Halwen's guards close around the carrying limb.", "The three attackers abandon their place when Toman's crews point them out. The Sovereign keeps the stone while the masons return to the unfinished cut.", "The ambush is denied; the brace must still be finished."));
    case "aid-strike": return commit({ phase: "resolved", outcome: "strike-during-brace", sovereignCondition: "wounded" }, event("brace-struck", "IRON BETWEEN THE PLATES", "The carrying limb buckles.", "Your blow enters beneath a shoulder plate while the conduit rests upon it. The Sovereign bellows through its throat chamber; above, the marked pier drops the width of a hand.", `${state.evacuation + state.shoring + (state.keptArch ? 1 : 0) >= 4 ? "The town clears before the span is lost." : "The strike brings stone down among the final evacuees."}${state.treatmentReady ? " Prepared care limits the deaths." : ""}`));
    case "finish-brace": {
      if (state.coalitionPlan !== "disclosed") {
        return commit(
          { phase: "resolved", outcome: "strike-during-brace", sovereignCondition: "wounded" },
          event(
            "brace-ambushed",
            "IRON LEAVES THE CROWD",
            "A carrying limb buckles beneath the finished cut.",
            `As Toman's last wedge comes free, short iron enters beneath a shoulder plate. ${state.coalitionPlan === "known" ? "The strike you uncovered but did not prevent" : "The purpose hidden among the evacuees"} declares itself with the conduit still overhead.`,
            `${state.evacuation + state.shoring + (state.keptArch ? 1 : 0) >= 4 ? "The prepared routes carry the town clear before the wounded Sovereign drops the span." : "Stone falls among the final evacuees when the wounded Sovereign loses the load."}${state.treatmentReady ? " Prepared care limits the deaths." : ""}`,
          ),
        );
      }
      return commit({ phase: "resolved", outcome: state.terms === "neutral" ? "neutral-work" : "passage-granted" }, event("brace-finished", "THE CUT IS FINISHED", "The Sovereign rises after the last stone falls clear.", "Toman's masons free the dangerous span before the plated body withdraws from beneath it.", state.terms === "neutral" ? "Water survives under the witnessed one-day term." : "Water survives; the present column receives the town road."));
    }
    case "leave": return commit({ phase: "resolved", outcome: "abandoned" }, event("left-to-court", "THE CHOICE PASSES", "Maelin, Toman, and Halwen remain beneath the conduit.", `You leave them with the empty carts, the locked record chest, and ${state.coalitionPlan === "unknown" ? "strangers still watching the Sovereign's plated joints" : state.coalitionPlan === "known" ? "the concealed strike still waiting in the crowd" : "Halwen's guards watching the broken ambush"}.`, state.evacuation + state.shoring >= 3 ? "Toman's crews attempt the dismantling without the Sovereign." : "With too few houses cleared, Maelin accepts Halwen's full price."));
  }
  return { state, error: "That action has no transition." };
};

export const SIEGE_SOVEREIGN_FAILING_CONDUIT: TacticalScenePrototype<SiegeConduitState> = {
  id: "siege-sovereign:failing-conduit",
  createState: initialState,
  project,
  act,
};
