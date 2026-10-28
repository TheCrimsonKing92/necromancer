import type {
  TacticalSceneAction,
  TacticalSceneEvent,
  TacticalSceneTransition,
} from "../../tactical-scene";
import {
  copyWinterSluiceState,
  type WinterSluiceConsequences,
  type WinterSluiceOutcome,
  type WinterSluiceState,
  winterSluiceActionCompleted,
} from "./winter-sluice-state";
import {
  winterSluiceResolutionResult,
  winterSluiceWaterConsequences,
} from "./winter-sluice-consequences";
import {
  createWinterSluiceEvent,
  finishWinterSluiceAction,
} from "./winter-sluice-events";
import {
  millerCourseCosts,
  millerLaborPrice,
  millerShoringConsequence,
} from "./winter-sluice-miller-terms";
import { WINTER_SLUICE_WATER_HANDLERS } from "./winter-sluice-water-actions";

type ActionKind = TacticalSceneAction["kind"];

interface WinterSluiceActionDefinition {
  readonly id: string;
  readonly subjectId: string;
  readonly label: string;
  readonly lead: string;
  readonly kind: ActionKind;
  readonly resolution?: TacticalSceneAction["resolution"];
  readonly knownConsequences?: TacticalSceneAction["knownConsequences"];
  readonly stakes?: string;
}

const ACTIONS = [
  {
    id: "read-winter-water",
    subjectId: "river-presence",
    label: "Read the winter water",
    lead: "Follow broken ice and fallen reeds to learn where the first water will strike.",
    kind: "observe",
  },
  {
    id: "inspect-old-stone",
    subjectId: "old-sluice",
    label: "Test the mason's measure",
    lead: "Match his marked courses to the old stone, then sound the buried face where his figures no longer agree.",
    kind: "observe",
    resolution: { method: "Field evidence", prospect: "Assured" },
  },
  {
    id: "raise-timber-shoring",
    subjectId: "old-sluice",
    label: "Raise the timber shoring",
    lead: "Set every released beam, wedge, and available crew against the cracked face.",
    kind: "prepare",
  },
  {
    id: "close-buried-gate",
    subjectId: "old-sluice",
    label: "Close the buried stop gate",
    lead: "Use the hosted inspector's route, then send living workers to operate the gate against the upstream thaw.",
    kind: "command",
  },
  {
    id: "evacuate-lower-bank",
    subjectId: "lower-bank",
    label: "Prepare the lower bank",
    lead: "Assign the carts, settle who speaks for unattended homes, and give every household the road. A traced thaw shows which lanes must clear first.",
    kind: "command",
  },
  {
    id: "establish-treatment",
    subjectId: "lower-bank",
    label: "Establish flood treatment",
    lead: "Set clean bindings, warmed shelter, and trained hands above the bank; a traced thaw can place them more precisely.",
    kind: "prepare",
  },
  {
    id: "mark-burial-custody",
    subjectId: "burial-ground",
    label: "Move the threatened remains",
    lead: "Record each grave, then exhume the remains in the lowest row and carry them above the flood line. The burial ground itself will remain exposed.",
    kind: "prepare",
  },
  {
    id: "recover-mason-record",
    subjectId: "burial-ground",
    label: "Recover the mason's measure",
    lead: "Have the reeve open the tool chest kept beside the mason's grave. His field book can be carried to the wall without disturbing the dead.",
    kind: "observe",
    resolution: { method: "Ordinary investigation", prospect: "Assured" },
  },
  {
    id: "host-dead-inspector",
    subjectId: "burial-ground",
    label: "Admit the dead inspector",
    lead: "Medium: let the dead mason speak through you until he has shown the covered stair. Costs Spirit and bodily strain; he knew the old wall, not this thaw.",
    kind: "ritual",
    resolution: { method: "Medium", prospect: "Assured" },
    stakes: "Admit the dead mason, not the living wight",
  },
  {
    id: "open-miller-exchange",
    subjectId: "miller",
    label: "Confront the miller over his yard",
    lead: "Go to the locked yard and demand the beams and carts held behind it.",
    kind: "negotiate",
  },
  {
    id: "buy-mill-stores",
    subjectId: "miller",
    label: "Pay his price",
    lead: "Buy the beams, carts, and the mill crews' work for six obols. His foreman will take responsibility for the buried face.",
    kind: "negotiate",
    resolution: { method: "Fixed exchange", prospect: "Assured" },
    knownConsequences: [{
      kind: "world-state",
      label: "Miller and crews retained",
      detail: "When the shoring is raised, his foreman can brace the covered courses as well as the visible crack.",
    }],
  },
  {
    id: "invoke-flood-right",
    subjectId: "miller",
    label: "Stand witness to the flood right",
    lead: "With the wall's failure proved, stand beside the reeve while she takes the yard under old custom.",
    kind: "negotiate",
    resolution: { method: "Reeve's flood claim", prospect: "Assured" },
    knownConsequences: [
      {
        kind: "obligation",
        label: "Town owes compensation after the thaw",
        detail: "The obligation belongs to the town, but it survives this scene.",
      },
      {
        kind: "world-state",
        label: "Materials released without mill labor",
        detail: "Town crews can raise an emergency brace; the miller's foreman will not help them.",
      },
    ],
  },
  {
    id: "witness-miller-refusal",
    subjectId: "miller",
    label: "Put his refusal before witnesses",
    lead: "Put the proved crack and the dead mason's record before witnesses. If the evidence holds, he loses custody without payment.",
    kind: "negotiate",
    resolution: { method: "Public evidence", prospect: "Assured" },
    knownConsequences: [{
      kind: "world-state",
      label: "Materials seized; mill labor withdrawn",
      detail: "The proved concealment strips his custody, not his crews of their choice.",
    }],
  },
  {
    id: "retain-miller-crews",
    subjectId: "miller",
    label: "Retain the mill crews",
    lead: "Pay separately for the foreman's judgment and the practiced hands needed at the covered face.",
    kind: "negotiate",
    resolution: { method: "Wage agreement", prospect: "Assured" },
    knownConsequences: [{
      kind: "world-state",
      label: "Skilled shoring available",
      detail: "The foreman and mill crews will turn the released timber into a complete brace.",
    }],
  },
  {
    id: "inspect-counter-relation",
    subjectId: "aspect-instrument",
    label: "Examine the white frame",
    lead: "Trace where its four white bars take hold: water, millstone, miller, and Sivra's living body.",
    kind: "observe",
    stakes: "Reveals the limits of this one act—not a universal weakness",
  },
  {
    id: "move-millstone-anchor",
    subjectId: "mill-anchor",
    label: "Move the named millstone",
    lead: "Carry the stone beyond the water Sivra studied. Her promised act will miss; Rill will remain in irons.",
    kind: "move",
    stakes: "Denies Sivra one point of purchase · does not free the captive",
  },
  {
    id: "break-mortal-binding",
    subjectId: "mill-anchor",
    label: "Break the miller's irons",
    lead: "Free Rill without the white frame. The winter water will still test whatever protection the town has made.",
    kind: "fight",
    stakes: "Frees Rill without Sivra · denies the voice in the frame this judgment",
  },
  {
    id: "assume-two-day-delay",
    subjectId: "field-severer",
    label: "Assume two days of delay",
    lead: "Stand before the town as surety for both Rill and those below the sluice. Sivra grants two days while the crews work.",
    kind: "negotiate",
    stakes: "Two more days in the wheel · two days pass everywhere else",
  },
  {
    id: "let-severer-cut",
    subjectId: "field-severer",
    label: "Let Sivra open the irons now",
    lead: "Let the white frame speak through Sivra and free Rill. The town faces the old water with only the work already done.",
    kind: "ritual",
    stakes: "Lets the voice in the frame pass judgment here",
  },
  {
    id: "leave-sluice",
    subjectId: "field-severer",
    label: "Leave before the cut",
    lead: "Go. At noon Sivra will act unless something already done has stopped her; the town keeps every preparation you made.",
    kind: "move",
  },
] as const satisfies readonly WinterSluiceActionDefinition[];

export const WINTER_SLUICE_ACTION_IDS = ACTIONS.map(({ id }) => id);

const unavailableReason = (
  state: WinterSluiceState,
  actionId: string,
): string | null => {
  if (state.phase === "resolved") return "The winter sluice has resolved.";
  if (actionId === "raise-timber-shoring" && state.timberAccess !== "released") {
    return "The mill's timber and carts are still withheld.";
  }
  if (actionId === "close-buried-gate" && state.inspector !== "hosted") {
    return "The dead inspector has not shown the buried route; living workers cannot yet reach the gate.";
  }
  if (actionId === "inspect-old-stone" && state.masonRecord !== "recovered") {
    return "Recover the dead mason's written measure at the burial rise first.";
  }
  if (actionId === "buy-mill-stores" && state.readyObols < 6) {
    return "You do not have six ready obols to meet his price.";
  }
  if (actionId === "retain-miller-crews") {
    const price = millerLaborPrice(state);
    if (state.readyObols < price) {
      return `You do not have ${price} ready obols to retain the mill crews.`;
    }
  }
  if (actionId === "host-dead-inspector" && state.crack !== "proved") {
    return "Test the mason's written measure against the old stone first.";
  }
  if (
    (actionId === "move-millstone-anchor" || actionId === "break-mortal-binding") &&
    state.counterRelation === "untested"
  ) {
    return "You do not yet know where the white frame takes hold.";
  }
  if (
    actionId === "move-millstone-anchor" &&
    state.severance !== "announced"
  ) {
    return "Sivra's promised act has already been denied or overtaken.";
  }
  if (actionId === "assume-two-day-delay") {
    if (state.severance !== "announced") {
      return "There is no longer an intact announced severance to delay.";
    }
    if (state.crack !== "proved") {
      return "Sivra will not delay for a danger nobody has proved.";
    }
    if (state.timberAccess !== "released" && state.evacuation !== 2) {
      return "Name a credible work plan first: secure the timber or prepare the lower bank.";
    }
  }
  if (actionId === "let-severer-cut" && state.severance !== "announced") {
    return "This prepared severance no longer has every required participant aligned.";
  }
  return null;
};

export const winterSluiceActions = (
  state: WinterSluiceState,
): TacticalSceneAction[] => state.phase === "resolved"
  ? []
  : ACTIONS.filter((definition) => {
      if (winterSluiceActionCompleted(state, definition.id)) return false;
      const millerMethod = definition.id === "buy-mill-stores" ||
        definition.id === "invoke-flood-right" ||
        definition.id === "witness-miller-refusal";
      if (definition.id === "open-miller-exchange") {
        return state.timberAccess === "withheld" && state.millerExchange === "closed";
      }
      if (definition.id === "recover-mason-record") {
        return state.masonRecord === "unfound";
      }
      if (definition.id === "inspect-old-stone") {
        return state.masonRecord === "recovered" && state.crack === "unknown";
      }
      if (definition.id === "host-dead-inspector") {
        return state.crack === "proved" && state.inspector === "unfound";
      }
      if (definition.id === "close-buried-gate") {
        return state.stopGate === "located";
      }
      if (millerMethod) {
        return state.timberAccess === "withheld" &&
          state.millerExchange === "open" &&
          (definition.id !== "witness-miller-refusal" || state.crack === "proved") &&
          (definition.id !== "invoke-flood-right" || state.crack === "proved");
      }
      if (definition.id === "retain-miller-crews") {
        return state.timberAccess === "released" &&
          state.millerLabor === "withdrawn" &&
          state.shoring < 2;
      }
      if (definition.id === "raise-timber-shoring") return state.shoring < 2;
      return true;
    }).map((definition) => {
      const reason = unavailableReason(state, definition.id);
      const costs = millerCourseCosts(definition.id, state);
      const knownConsequences = definition.id === "raise-timber-shoring" && state.timberAccess === "released"
        ? [millerShoringConsequence(state)]
        : "knownConsequences" in definition ? definition.knownConsequences : undefined;
      return {
        ...definition,
        costs,
        knownConsequences,
        activation: { kind: "prototype-transition" },
        availability: reason
          ? { state: "unavailable", reason }
          : { state: "available" },
      };
    });

const eventFor = (
  state: WinterSluiceState,
  actionId: string,
  eyebrow: string,
  title: string,
  detail: string,
  result?: string,
): TacticalSceneEvent => createWinterSluiceEvent(
  state,
  actionId,
  ACTIONS.find(({ id }) => id === actionId)?.subjectId,
  eyebrow,
  title,
  detail,
  result,
);

const finishAction = finishWinterSluiceAction;

const resolveRelease = (
  state: WinterSluiceState,
  actionId: string,
  outcome: Extract<WinterSluiceOutcome, "claimant-cut" | "assumed-delay" | "independent-release">,
  eventCopy: { eyebrow: string; title: string; detail: string },
): TacticalSceneTransition<WinterSluiceState> => {
  const consequences = winterSluiceWaterConsequences(state);
  const completedByClaimant = outcome !== "independent-release";
  const next: WinterSluiceState = {
    ...state,
    phase: "resolved",
    binding: "released",
    severance: completedByClaimant ? "completed" : "superseded",
    instrument: completedByClaimant ? "spent" : state.instrument,
    inspector: state.inspector === "hosted" ? "at-rest" : state.inspector,
    outcome,
    consequences,
  };
  const event = eventFor(
    state,
    actionId,
    eventCopy.eyebrow,
    eventCopy.title,
    eventCopy.detail,
    `Rill-of-Reeds released · binding ended · ${winterSluiceResolutionResult(consequences)}`,
  );
  return finishAction(next, actionId, event);
};

type ActionHandler = (
  state: WinterSluiceState,
  actionId: string,
) => TacticalSceneTransition<WinterSluiceState>;

const simpleHandler = (
  change: (state: WinterSluiceState) => WinterSluiceState,
  eyebrow: string,
  title: string,
  detail: string,
  result: string,
): ActionHandler => (state, actionId) => {
  const next = change(copyWinterSluiceState(state));
  return finishAction(next, actionId, eventFor(
    state,
    actionId,
    eyebrow,
    title,
    detail,
    result,
  ));
};

const HANDLERS: Readonly<Record<string, ActionHandler>> = {
  ...WINTER_SLUICE_WATER_HANDLERS,
  "raise-timber-shoring": (state, actionId) => {
    const complete = state.millerLabor === "retained";
    const next = { ...copyWinterSluiceState(state), shoring: complete ? 2 as const : 1 as const };
    return finishAction(next, actionId, eventFor(
      state,
      actionId,
      complete ? "THE MILL CREWS TAKE THE WALL" : "TIMBER REACHES THE CRACK",
      complete ? "The miller's foreman braces the covered face." : "Town crews raise an emergency brace.",
      complete
        ? "The foreman names each buried course from memory. His crews set the beams, cross-wedge the cracked face, and leave no unsupported span below the old road."
        : "The miller's beams reach the wall without his foreman. Town crews brace the visible crack, but the covered courses remain beyond their practiced judgment.",
      complete
        ? "Shoring complete · ordinary engineering can hold the sluice through release"
        : "Emergency shoring raised · a breach is less destructive, but the sluice is not secure",
    ));
  },
  "close-buried-gate": simpleHandler(
    (state) => ({ ...state, stopGate: "closed", inspector: "at-rest" }),
    "THE OLD PASSAGE CLOSES",
    "Living hands turn the gate the dead remembered.",
    "The dead mason remembers where the covered stair turned. Living workers find the iron below and force the stop gate across the winter channel.",
    "Stop gate closed · inspector returned to rest · flood force reduced",
  ),
  "mark-burial-custody": simpleHandler(
    (state) => ({ ...state, burialCustody: 1 }),
    "THE GRAVES ARE NAMED",
    "The threatened dead are moved above the flood line.",
    "Names and locations are recorded before workers open the lowest graves. Each set of remains is wrapped and carried uphill; the empty ground remains in the water's path.",
    "Burial custody established · remains and inspection evidence retained if water enters",
  ),
  "recover-mason-record": simpleHandler(
    (state) => ({ ...state, masonRecord: "recovered" }),
    "THE MASON'S FIELD BOOK",
    "The reeve opens the chest kept beside his grave.",
    "Inside, the mason recorded the buried courses in charcoal and measured every change in the old wall. The book can now be tested against the standing stone.",
    "Written measure recovered · deeper sluice inspection available",
  ),
  "host-dead-inspector": simpleHandler(
    (state) => ({ ...state, inspector: "hosted", stopGate: "located" }),
    "ONE DEAD WITNESS ENTERS",
    "The mason remembers the covered stair.",
    "He speaks through your mouth until the route is drawn, then falls quiet at the gate. He knows nothing of this thaw, and his narrow welcome cannot admit Rill-of-Reeds.",
    "Spirit spent · buried route known · stop-gate operation enabled",
  ),
  "open-miller-exchange": (state, actionId) => ({
    state: { ...copyWinterSluiceState(state), millerExchange: "open" },
    event: eventFor(
      state,
      actionId,
      "AT THE LOCKED YARD",
      "The miller keeps his keys in hand.",
      "He comes to the gate but does not open it. The crews wait behind you; the old sluice stands below.",
    ),
  }),
  "buy-mill-stores": simpleHandler(
    (state) => ({
      ...state,
      timberAccess: "released",
      millerExchange: "closed",
      timberSettlement: "purchase",
      millerLabor: "retained",
      readyObols: state.readyObols - 6,
    }),
    "A PRICE WITHOUT FRIENDSHIP",
    "The yard gate opens on paid terms.",
    "The miller weighs each obol twice. ‘You want my winter in your wall. Then pay for it.’ He turns the key and sends his foreman with the first cart. The crew will stand behind the work they raise.",
    "6 obols spent · timber, carts, foreman, and mill crews retained · no public claim entered",
  ),
  "invoke-flood-right": simpleHandler(
    (state) => ({
      ...state,
      timberAccess: "released",
      millerExchange: "closed",
      timberSettlement: "flood-right",
      millerLabor: "withdrawn",
    }),
    "THE OLD RIGHT IS CALLED",
    "The gate opens under flood custom.",
    "The reeve lays the proved watercourse and the mason's failed measure on the gatepost. Then she recites the flood right. The miller gives up the keys, names every beam and cart for the later claim, and calls his own crews away.",
    "Timber and carts released without mill labor · town owes compensation after the thaw",
  ),
  "witness-miller-refusal": simpleHandler(
    (state) => ({
      ...state,
      millerAccount: "public",
      timberAccess: "released",
      millerExchange: "closed",
      timberSettlement: "witnessed-refusal",
      millerLabor: "withdrawn",
    }),
    "THE REFUSAL IS HEARD",
    "His own delay costs him the yard.",
    "The reeve reads the dead mason's repair marks against the crack you proved. The miller calls the record old; three householders supply the dates of the repairs. He drops the keys on the gatepost rather than place another refusal in the account.",
    "Concealed repairs evidenced · materials released without mill labor or payment · miller's standing damaged",
  ),
  "retain-miller-crews": (state, actionId) => {
    const price = millerLaborPrice(state);
    const afterPublicFault = state.timberSettlement === "witnessed-refusal";
    return finishAction({
      ...copyWinterSluiceState(state),
      millerLabor: "retained",
      readyObols: state.readyObols - price,
    }, actionId, eventFor(
      state,
      actionId,
      afterPublicFault ? "WAGES AFTER JUDGMENT" : "WAGES BESIDE THE CLAIM",
      "The foreman brings the practiced hands back to the wall.",
      afterPublicFault
        ? "The miller will not cross the gate himself. Five obols persuade his foreman to name the covered courses and the crew to risk its standing on work taken from their master."
        : "The flood right took the timber, not the crew's labor. Three obols settle that separate bargain. The foreman orders wedges and cross-braces loaded before the miller can add another condition.",
      `${price} obols spent · foreman and mill crews retained · complete shoring now available`,
    ));
  },
  "inspect-counter-relation": simpleHandler(
    (state) => ({ ...state, counterRelation: "understood" }),
    "THE WHITE BARS ARE READ",
    "Four holds keep the voice here.",
    "One bar is cut for the water, one grips the millstone's iron, one bears the miller's thumb-mark, and one draws blood from Sivra's ribs. Every fastening leads back to this mill.",
    "Four points of purchase known · millstone denial and independent release enabled",
  ),
  "move-millstone-anchor": simpleHandler(
    (state) => ({
      ...state,
      counterRelation: "misaligned",
      severance: "prevented",
    }),
    "SIVRA LOSES THE STONE",
    "The white frame searches an empty reach.",
    "The millstone crosses beyond the water Sivra studied. Six days of careful watching are made useless; Rill-of-Reeds remains bound.",
    "Sivra's act prevented · binding retained · white frame intact",
  ),
  "break-mortal-binding": (state, actionId) => resolveRelease(
    state,
    actionId,
    "independent-release",
    {
      eyebrow: "THE IRONS BREAK",
      title: "Rill goes free by mortal hands.",
      detail: "The miller's hold breaks before the white frame can pronounce upon it. The winter water meets the old stone without the voice in the frame passing judgment.",
    },
  ),
  "assume-two-day-delay": (state, actionId) => {
    const timberSecured = state.timberAccess === "released";
    const afterWork: WinterSluiceState = {
      ...state,
      shoring: timberSecured
        ? state.millerLabor === "retained" ? 2 : 1
        : state.shoring,
      evacuation: 2,
    };
    return resolveRelease(afterWork, actionId, "assumed-delay", {
      eyebrow: "TWO DAYS BORROWED",
      title: timberSecured
        ? "The captive remains, and the timber rises."
        : "The captive remains while the lower bank empties.",
      detail: timberSecured
        ? "‘Two days,’ Sivra says. ‘You answer for the water and every life beneath it.’ Rill bears two more days beneath the wheel while crews shore the old wall and clear the lower bank; then Sivra opens the irons."
        : "‘Two days,’ Sivra says. ‘You answer for the water and every life beneath it.’ Rill bears two more days beneath the wheel while the carts clear the lower bank. The mill yard stays locked; then Sivra opens the irons.",
    });
  },
  "let-severer-cut": (state, actionId) => resolveRelease(
    state,
    actionId,
    "claimant-cut",
    {
      eyebrow: "THE WHITE BARS SPEAK",
      title: "Iron springs from Rill's back.",
      detail: "The white frame burns against Sivra's ribs. Its second voice says, ‘No chain follows silence.’ The irons spring apart. Below, the sluice meets the old water.",
    },
  ),
  "leave-sluice": (state, actionId) => {
    if (state.severance === "announced") {
      return resolveRelease(state, actionId, "claimant-cut", {
        eyebrow: "THE ANNOUNCED DAY COMES",
        title: "The town continues without you.",
        detail: "At noon, Sivra opens the irons as promised. Whatever the town has built or moved must withstand the old water without you.",
      });
    }
    const consequences: WinterSluiceConsequences = {
      sluice: "held",
      flood: "contained",
      displacedHouseholds: 0,
      injuredPeople: 0,
      burialLoss: "none",
    };
    const next: WinterSluiceState = {
      ...state,
      phase: "resolved",
      outcome: "interdiction-blocked",
      consequences,
    };
    const event = eventFor(
      state,
      actionId,
      "THE ROAD TAKES YOU",
      "The wheel keeps turning after you leave.",
      "The named millstone remains beyond the water Sivra studied. Rill still turns beneath the wheel until someone chooses another act.",
      "Sivra's act still prevented · Rill-of-Reeds still bound · town retains its present preparation",
    );
    return finishAction(next, actionId, event);
  },
};

export const actOnWinterSluice = (
  state: WinterSluiceState,
  actionId: string,
): TacticalSceneTransition<WinterSluiceState> => {
  const action = winterSluiceActions(state).find(({ id }) => id === actionId);
  if (!action) return { state, error: `Unknown winter-sluice action: ${actionId}` };
  if (action.availability.state === "unavailable") {
    return { state, error: action.availability.reason };
  }
  const handler = HANDLERS[actionId];
  if (!handler) return { state, error: `No transition owns ${actionId}.` };
  return handler(state, actionId);
};
