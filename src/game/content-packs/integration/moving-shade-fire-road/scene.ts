import type { StoryChoice, StoryScene } from "../../../types";
import {
  FIRE_ROAD_GRAIN_LOADS_AT_RISK,
  FIRE_ROAD_FAILED_NEGOTIATION_GRAIN_COST,
  FIRE_ROAD_HOUSEHOLDS_AT_RISK,
  fireRoadHouseholdsUnaccountedFor,
  fireRoadSavedGrainLoads,
  fireRoadStateFor,
  fireRoadWinterOutlook,
  FIRE_ROAD_SCENE_ID,
  type FireRoadState,
} from "./state";
import {
  fireRoadCounterofferFooting,
  fireRoadCounterofferProspect,
  fireRoadNegotiatingLeverage,
} from "./negotiation";

const terminal = (
  id: string,
  effect: StoryChoice["effect"],
  label: string,
  detail: StoryChoice["detail"],
  outcome: StoryChoice["outcome"],
  signal?: StoryChoice["signal"],
): StoryChoice => ({
  id,
  effect,
  label,
  detail,
  signal,
  mode: "interaction",
  optional: false,
  outcome,
});

const winterConsequence = (state: FireRoadState): string => {
  const outlook = fireRoadWinterOutlook(state);
  if (outlook === "supplied") return "Winter supplied: the four settlements retain their usual allotments.";
  if (outlook === "rationed") return "Winter rationing: the grain can be shared east, but every settlement will run short before spring.";
  if (outlook === "shortage") return "Winter shortage: this town can reach midwinter; the eastern settlements must find another supply.";
  return "Dire winter shortage: what remains will not feed this town to midwinter.";
};

const resolvedResult = (run: Parameters<StoryScene["paragraphs"]>[0]): string => {
  const state = fireRoadStateFor(run);
  return `${state.rescuedHouseholds ?? 0} of ${FIRE_ROAD_HOUSEHOLDS_AT_RISK} households evacuated; ${fireRoadSavedGrainLoads(state)} of ${FIRE_ROAD_GRAIN_LOADS_AT_RISK} grain loads saved. ${winterConsequence(state)}`;
};

const airSpeakerBearing = (state: FireRoadState): string => {
  if (state.counterofferAttempted && state.counterofferAccepted === false) {
    return "The air-speaker's bronze vanes remain fixed on you. ‘Shade belongs to subjects. A season ends. Possession does not.’ The original ordinance remains open.";
  }
  const leverage = fireRoadNegotiatingLeverage(state);
  if (leverage >= 2) {
    return "When the town's authority and the host's need are named together, every bronze vane turns. ‘You have made refusal costly. Speak the lesser term plainly.’";
  }
  if (leverage === 1) {
    return "One bronze vane inclines toward the road. ‘You have found a price,’ the air-speaker says. ‘You have not yet made it preferable to possession.’";
  }
  return "‘Enter the households under my ordinance,’ the air-speaker says. ‘I keep what is entered. I do not spend shelter upon the uncounted.’";
};

const result = (
  title: string,
  body: string,
): NonNullable<StoryChoice["outcome"]> => ({
  eyebrow: "THE FIRE ROAD ANSWERS",
  title,
  body,
  result: resolvedResult,
});

const terminalChoices = (): StoryChoice[] => [
  terminal("accept-ordinance", "moving-shade:accept-ordinance", "Accept the ordinance", "The God will shelter the evacuation. The town enters subject status and owes quarters, passage, and assessed provisions.", result("The high shade takes its due.", "‘Name the doors,’ the air-speaker says. Cool air settles over the eastern road. Foreign officers enter behind the wagons and begin counting."), "tradeoff"),
  terminal("counteroffer", "moving-shade:counteroffer", "Ask shelter without subjection", (run) => {
    const state = fireRoadStateFor(run);
    const footing = fireRoadCounterofferFooting(state);
    const prospect = fireRoadCounterofferProspect(run.player, state);
    const leverage = fireRoadNegotiatingLeverage(state);
    const basis = leverage === 0
      ? "No leverage yet makes the lesser term preferable to refusal."
      : leverage === 1
        ? "One fact now makes a bounded passage worth hearing."
        : "The town can offer something the host needs without depending wholly on its shade.";
    return `Offer one season of passage and provisions without a subject oath. ${basis} ${footing[0]!.toUpperCase()}${footing.slice(1)} footing · ${prospect} prospect under present conditions.`;
  }, {
    eyebrow: "THE AIR-SPEAKER ANSWERS",
    title: (run) => fireRoadStateFor(run).counterofferAccepted
      ? "Shelter, but not possession."
      : "The lesser term finds no shelter.",
    body: (run) => fireRoadStateFor(run).counterofferAccepted
      ? "‘One season,’ the air-speaker says. ‘No names entered. At first frost, shade and soldiers pass on.’ Its host may cross and provision here, but no household enters the subject rolls."
      : "The air-speaker leaves the lesser term unanswered. Below the bronze vanes, Sera calls twice for the waiting carts to move. A grain wagon catches fire before the reply comes: ‘A road may be borrowed. Shelter is possessed.’ The high body does not move, and the original ordinance remains open.",
    result: (run) => fireRoadStateFor(run).counterofferAccepted
      ? resolvedResult(run)
      : `${FIRE_ROAD_FAILED_NEGOTIATION_GRAIN_COST === 1 ? "One grain wagon is lost" : `${FIRE_ROAD_FAILED_NEGOTIATION_GRAIN_COST} grain wagons are lost`} to the delay. The town's remaining choices endure.`,
  }, "risk"),
  terminal(
    "ordinary-rescue",
    "moving-shade:ordinary-rescue",
    "Commit every hand to the road",
    "Leave the speaking array intact and give every available hand to the evacuation. The fire, smoke, and work already done determine what crosses.",
    result(
      "The road holds what hands can carry.",
      "‘Then keep what your hands can carry,’ the air-speaker says. No foreign shade covers the town. People cross by the lanes, carts, wells, and hard choices already made. Above them, the speaking array remains whole.",
    ),
  ),
  terminal(
    "break-array",
    "moving-shade:break-array",
    "Break the speaking array",
    "Divert hands from the evacuation to deny the God a voice here. Fewer people and wagons may cross before the fire closes.",
    result(
      "The voice leaves the noon sky.",
      "‘You mistake silence for release—’ the air-speaker begins. People leave the rescue lines to carry iron and salt uphill. The array breaks before it can finish; the high body remains above the smoke, but it can no longer make terms here.",
    ),
    "tradeoff",
  ),
  terminal("leave", "moving-shade:leave", "Leave before terms are sworn", "The town will decide without you, relying on the preparations already made.", result("The choice passes from your hands.", "You leave the burning district to its own officers, householders, and the foreign voice above them.")),
];

const inquiry = (
  id: string,
  effect: StoryChoice["effect"],
  label: string,
  detail: string,
  title: string,
  body: NonNullable<StoryChoice["outcome"]>["body"],
  answer: string,
): StoryChoice => ({
  id,
  effect,
  label,
  detail,
  mode: "interaction",
  optional: true,
  outcome: {
    eyebrow: "SERA VALE ANSWERS",
    title,
    body,
    result: () => answer,
  },
});

const arrivalChoices = (): StoryChoice[] => [
  inquiry(
    "ask-why-me",
    "moving-shade:ask-why-me",
    "Ask what she expects of your trade",
    "The town has officers and working hands. It sought a necromancer for narrower work.",
    "‘Find where its terms can be made to fail.’",
    "The air-speaker gave every officer the same ordinance. When you reached the verge, its vanes turned west and the high shade followed.",
    "Sera wants no counsel on carts or bucket lines. She wants an outsider versed in dangerous powers to learn whether the God can be bargained with, resisted, or denied its purchase before frightened households swear themselves to it.",
  ),
  inquiry(
    "ask-high-shade",
    "moving-shade:ask-high-shade",
    "Ask what waits above the road",
    "Learn what the town has seen of the foreign presence and its soldiers.",
    "‘A sovereign body, or near enough.’",
    (run) => {
      const hazard = fireRoadStateFor(run).hazard;
      const firstSight = hazard === "east-wind"
        ? "The high shape was first sighted after lightning had fired the scrub."
        : hazard === "kiln-fall"
          ? "The high shape was first sighted after the kiln roof fell and the alarm began."
          : "The high shape was first sighted after sparks had crossed between the grain roofs.";
      return `${firstSight} Beneath it wait soldiers who cast no shade of their own. They have crossed no boundary and harmed no one; their speaker has only repeated the offered ordinance.`;
    },
    "Sera does not know how it learned of the fire quickly enough to arrive with soldiers and exact terms already prepared. She can tell that it means to profit from it.",
  ),
  inquiry(
    "ask-grain-stakes",
    "moving-shade:ask-grain-stakes",
    "Ask what the grain means",
    "The wagons belong to more people than those presently under the smoke.",
    "‘Four settlements eat from that row.’",
    "This town stores the eastern tithe before winter distribution. A few wagons lost will mean rationing. Most of them lost will leave the three smaller settlements buying, borrowing, or taking grain before midwinter.",
    "Saving people is the work of this hour. Saving grain determines what the survivors face in winter.",
  ),
  {
    id: "hear-appeal",
    effect: "moving-shade:hear-appeal",
    label: "Go with Sera Vale",
    detail: "Let the road reeve show you what is trapped between the fire and the eastern road.",
    mode: "transition",
    optional: false,
  },
  terminal(
    "leave",
    "moving-shade:leave",
    "Decline and keep west",
    "Leave the town's officers to face the fire and the voice above it.",
    result(
      "The choice passes from your hands.",
      "You leave the burning district to its own officers, householders, and the foreign voice above them.",
    ),
  ),
];

export const FIRE_ROAD_SCENE: StoryScene = {
  id: FIRE_ROAD_SCENE_ID,
  eyebrow: "MOVING SHADE PROOF · NONCANONICAL",
  title: (run) => {
    const phase = fireRoadStateFor(run).phase;
    return phase === "resolved"
      ? "Smoke keeps the chosen terms."
      : phase === "arrival"
        ? "The road reeve comes through the smoke."
        : "Noon waits above the fire road.";
  },
  paragraphs: (run) => {
    const state = fireRoadStateFor(run);
    if (state.phase === "resolved") {
      const relation = state.outcome === "subjected"
        ? "Foreign soldiers count the doors that will quarter them."
        : state.outcome === "bounded-passage"
          ? "The road was sheltered, but no house was counted as a subject house."
          : state.outcome === "array-broken"
            ? "The God's local voice is gone. What crossed did so with fewer hands under the smoke."
            : state.outcome === "ordinary-rescue"
              ? "The town remains unsubjugated. The speaking array remains above the eastern road."
              : "What crossed did so under smoke and living hands.";
      return [
        `${state.rescuedHouseholds} of ${FIRE_ROAD_HOUSEHOLDS_AT_RISK} households reached the road. ${fireRoadHouseholdsUnaccountedFor(state)} remain cut off behind the fire.`,
        `${fireRoadSavedGrainLoads(state)} of ${FIRE_ROAD_GRAIN_LOADS_AT_RISK} grain wagons crossed; ${state.lostGrainLoads} burned in the warehouse row. ${winterConsequence(state)}`,
        relation,
        "This is an isolated campaign proof. Its facts do not enter the ordinary testament.",
      ];
    }
    if (state.phase === "arrival") {
      return [
        "Sera Vale meets you at the western verge with soot worked into the lines of her face. Behind her, bucket crews wet the western roofs while teamsters drag empty carts toward the eastern quarter. An under-reeve holds both lines in her absence.",
        "‘Eighteen households are still inside. Twelve grain wagons wait behind them. The fire crews were levied north, and the grain factor has chained the wells. Those are problems with hands enough. The thing above the eastern milestone is not.’",
        "A shape broad enough to darken the eastern road waits above the smoke. Its speaker offers shelter only if Sera enters every household beneath its ordinance. ‘It yielded nothing to our officers,’ she says. Her gaze drops to your grave tools. ‘Then you crossed the verge, and every black vane turned toward you. Come hear it. Your trade may find the weakness mine cannot.’",
      ];
    }
    const preparationCount = state.preparations.length;
    return [
      state.hazard === "east-wind" ? "Late-summer lightning has put fire into the resin scrub. An east wind lays it toward the town." : state.hazard === "kiln-fall" ? "A kiln roof has fallen into the dry cut. Fire moves below the road where no watch can see its whole edge." : "Sparks cross between the grain roofs. Each closed warehouse makes the next harder to reach.",
      `${FIRE_ROAD_HOUSEHOLDS_AT_RISK} households lie between the fire and the eastern road. Beyond them, ${FIRE_ROAD_GRAIN_LOADS_AT_RISK} wagons hold the winter grain of this town and three settlements farther east. The public cistern is cracked, and the grain factor has kept the household wells under lock.`,
      "The bell keeper died on the western stair before the last lanes heard the alarm. Sera's people laid him beneath a sailcloth where the runners still pass.",
      "At the eastern milestone, three black poles carry narrow vanes of smoked bronze. They turn without wind. The voice between them says I when it speaks of the God, and the high body's shade draws taut across the road with every word.",
      airSpeakerBearing(state),
      preparationCount > 0
        ? `${preparationCount === 1 ? "One preparation now helps" : `${preparationCount} preparations now help`} Sera's rescue beyond the bucket lines, carts, and hands already committed.`
        : "Nothing beyond the standing rescue lines has yet been prepared.",
    ];
  },
  choices: (run) => {
    const state = fireRoadStateFor(run);
    if (state.phase === "arrival") return arrivalChoices();
    const choices = terminalChoices();
    if (state.phase === "resolved") {
      const chosenId = state.outcome === "subjected" ? "accept-ordinance"
        : state.outcome === "bounded-passage" ? "counteroffer"
          : state.outcome === "ordinary-rescue" ? "ordinary-rescue"
            : state.outcome === "array-broken" ? "break-array"
              : "leave";
      return choices.filter(({ id }) => id === chosenId);
    }
    return choices;
  },
};
