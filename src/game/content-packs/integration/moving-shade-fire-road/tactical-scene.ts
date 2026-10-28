import type {
  TacticalSceneAction,
  TacticalSceneProjection,
  TacticalSceneSubject,
} from "../../../tactical-scene";
import type { StoryApproachDefinition } from "../../../story-approaches";
import type { StoryApproachResolutionReadout } from "../../../story-approach-resolution";
import type { RunState, StoryChoice } from "../../../types";
import {
  storyChoiceDetailFor,
  storyChoiceIsComplete,
  storyChoiceLabelFor,
  storyChoicesFor,
} from "../../../content/story-selectors";
import { storyApproachSurfaceFor } from "../../story-approach-runtime";
import { FIRE_ROAD_SCENE } from "./scene";
import {
  FIRE_ROAD_HOUSEHOLDS_AT_RISK,
  FIRE_ROAD_GRAIN_LOADS_AT_RISK,
  fireRoadOperatingRoom,
  fireRoadStateFor,
  type FireRoadPreparationId,
} from "./state";

const capabilityFor = new Map<string, string>(
  [
    ["moving-shade:cut-firebreak", "survival"],
    ["moving-shade:smoke-station", "medicine"],
    ["moving-shade:open-wells", "persuasion"],
    ["moving-shade:secure-carts", "barter"],
    ["moving-shade:host-keeper", "host-dead-initiative"],
    ["moving-shade:send-servant", "command-dead-initiative"],
    ["moving-shade:render-lane", "render-death-altered-matter"],
    ["moving-shade:keep-bridge", "stabilize-body-continuity"],
    ["moving-shade:read-host", "perception"],
    ["moving-shade:witness-offer", "barter"],
  ] as const,
);

const choiceKinds: Readonly<Record<string, TacticalSceneAction["kind"]>> = {
  "ask-why-me": "negotiate",
  "ask-high-shade": "observe",
  "ask-grain-stakes": "observe",
  "hear-appeal": "move",
  "accept-ordinance": "negotiate",
  counteroffer: "negotiate",
  "ordinary-rescue": "command",
  "break-array": "fight",
  leave: "move",
};

const toAction = (
  approach: StoryApproachDefinition,
  subjectId: string,
  availability: { state: "available" } | { state: "unavailable"; reason: string },
  resolution?: StoryApproachResolutionReadout,
): TacticalSceneAction => ({
  id: approach.id,
  subjectId,
  label: approach.label,
  lead: approach.lead,
  kind: approach.timing === "observation" ? "observe" :
    approach.prominence === "practice" ? "ritual" : "prepare",
  availability,
  resolution: resolution
    ? { method: resolution.method, prospect: resolution.prospect }
    : undefined,
  knownConsequences: approach.tempo
    ? [{ kind: "time", label: approach.tempo.label, detail: approach.tempo.detail }]
    : undefined,
  activation: {
    kind: "story-approach",
    approachId: approach.id,
    capabilityId: capabilityFor.get(approach.id) ?? approach.capabilities[0]!,
  },
});

const toChoiceAction = (
  choice: StoryChoice,
  run: RunState,
): TacticalSceneAction => ({
  id: `story-choice:${choice.id}`,
  subjectId: "sera",
  label: storyChoiceLabelFor(choice, run),
  lead: storyChoiceDetailFor(choice, run),
  kind: choiceKinds[choice.id] ?? "prepare",
  availability: { state: "available" },
  stakes: choice.signal === "risk"
    ? "Outcome uncertain"
    : choice.signal === "tradeoff"
      ? "Tradeoff"
      : undefined,
  activation: { kind: "story-choice", choiceId: choice.id },
});

export const fireRoadTacticalScene = (run: RunState): TacticalSceneProjection => {
  const fireRoad = fireRoadStateFor(run);
  const surface = storyApproachSurfaceFor("moving-shade:fire-road", run);
  const approachSubject: Record<string, string> = {
    "moving-shade:cut-firebreak": "fire",
    "moving-shade:smoke-station": "households",
    "moving-shade:open-wells": "wells",
    "moving-shade:secure-carts": "wagons",
    "moving-shade:host-keeper": "bell-keeper",
    "moving-shade:send-servant": "servant",
    "moving-shade:render-lane": "road",
    "moving-shade:keep-bridge": "bridge",
    "moving-shade:read-host": "host",
    "moving-shade:witness-offer": "sera",
  };
  const approachActions = surface?.catalog.approaches.flatMap((approach) => {
    const view = surface.context.availability[approach.id];
    if (view?.state === "inapplicable" || view?.state === "opportunity-closed") return [];
    const availability = !view || view.state === "available"
      ? { state: "available" as const }
      : { state: "unavailable" as const, reason: view.reason ?? "This course is not presently available." };
    return [toAction(
      approach,
      approachSubject[approach.id]!,
      availability,
      surface.resolutions.get(approach.id),
    )];
  }) ?? [];
  const choiceActions = fireRoad.phase === "resolved"
    ? []
    : storyChoicesFor(FIRE_ROAD_SCENE, run)
      .filter((choice) =>
        (!choice.tradition || choice.tradition === run.player.tradition) &&
        !storyChoiceIsComplete(FIRE_ROAD_SCENE.id, choice, run))
      .map((choice) => toChoiceAction(choice, run));
  const actions = [...choiceActions, ...approachActions];
  const actionIds = (subjectId: string) =>
    actions.filter((action) => action.subjectId === subjectId).map(({ id }) => id);
  const completed = new Set(fireRoad.preparations);
  const resultOf = (id: FireRoadPreparationId) =>
    fireRoad.preparationResults[id];
  const secured = (id: FireRoadPreparationId) =>
    resultOf(id) === "success" || resultOf(id) === "certain";
  const failed = (id: FireRoadPreparationId) =>
    resultOf(id) === "failure";
  const subjectCandidates: TacticalSceneSubject[] = [
    { id: "sera", label: "Sera Vale", kind: "actor", tone: "ally", status: fireRoad.phase === "arrival" ? "Waiting at the western verge" : "Directing the evacuation", description: "The road reeve refuses to swear subjecthood for households that did not empower her to surrender it.", placement: { x: 23, y: 65, depth: 2 }, glyph: "◆", actionIds: actionIds("sera") },
    { id: "wells", label: "Household wells", kind: "resource", tone: secured("open-wells") ? "secured" : "strained", status: secured("open-wells") ? "Open to the bucket lines" : failed("open-wells") ? "Two wells forced; the claim remains disputed" : "Locked by the grain factor", description: secured("open-wells") ? "Water moves toward the eastern roofs and road troughs." : failed("open-wells") ? "Two bucket lines are working, but the grain factor kept his keys and yielded no public authority." : "The grain factor keeps the keys while Sera's public cistern stands cracked.", placement: { x: 23, y: 39, depth: 1 }, glyph: "◉", actionIds: actionIds("wells"), visualState: secured("open-wells") ? "secured" : failed("open-wells") ? "partial" : "contested" },
    { id: "households", label: "Smoke-struck households", kind: "actor", tone: secured("smoke-station") ? "secured" : "strained", status: secured("smoke-station") ? "A smoke station sorts the living" : failed("smoke-station") ? "The smoke station is overfilled" : "Gathering without clean air", description: failed("smoke-station") ? "A narrow triage order survives, but the station cannot sort everyone arriving from the smoke." : "Eighteen households still depend on the eastern road.", placement: { x: 40, y: 55, depth: 2 }, glyph: "♟", actionIds: actionIds("households"), visualState: secured("smoke-station") ? "secured" : failed("smoke-station") ? "partial" : "exposed" },
    { id: "wagons", label: "Grain and household wagons", kind: "resource", tone: secured("secure-carts") ? "secured" : "strained", status: secured("secure-carts") ? "Draft teams committed" : failed("secure-carts") ? "Two hired teams arrived" : `${FIRE_ROAD_GRAIN_LOADS_AT_RISK} grain loads await the road`, description: failed("secure-carts") ? "Two carts can carry people who cannot walk; the rest of the promised teams never reached the road." : "Grain carried east supplies four settlements through winter.", placement: { x: 52, y: 51, depth: 2 }, glyph: "▰", actionIds: actionIds("wagons"), visualState: secured("secure-carts") ? "secured" : failed("secure-carts") ? "partial" : "waiting" },
    { id: "bridge", label: "Timber bridge", kind: "site", tone: completed.has("kept-bridge") ? "occult" : "strained", status: completed.has("kept-bridge") ? "One continuity mark holds every pegged joint" : "Taking the evacuation's weight", description: "Every surviving road east passes over its joined timbers.", placement: { x: 54, y: 78, depth: 1 }, glyph: "═", actionIds: actionIds("bridge") },
    { id: "road", label: "Eastern road", kind: "site", tone: completed.has("rendered-lane") ? "occult" : "neutral", status: completed.has("rendered-lane") ? "One lane holds cold" : "The only prepared crossing", description: "Households, grain, soldiers, and the offered shade all contend for the same road.", placement: { x: 65, y: 48, depth: 1 }, glyph: "◇", actionIds: actionIds("road") },
    { id: "fire", label: "Resin-scrub fire", kind: "hazard", tone: "danger", status: secured("firebreak") ? "Checked at a black line" : failed("firebreak") ? "Crossing a broken firebreak in three places" : "Advancing on the warehouse row", description: `The ${fireRoad.hazard.replaceAll("-", " ")} shapes its present course.`, placement: { x: 82, y: 60, depth: 3 }, glyph: "▲", actionIds: actionIds("fire"), visualState: secured("firebreak") ? "checked" : failed("firebreak") ? "partial" : "advancing" },
    { id: "host", label: "The air-speaker and foreign host", kind: "force", tone: "danger", status: secured("host-need") ? "Dry water carts and too few remounts" : failed("host-need") ? "Supply train screened from a second count" : "Waiting beyond the smoke", description: secured("host-need") ? "Its shortage of water and remounts makes passage and provision valuable enough to support a lesser term." : failed("host-need") ? "The officers moved every wagon and remount before their need could be proved." : "Three black poles turn bronze vanes toward the road. The God's voice speaks between them while its officers wait beneath the offered shade.", placement: { x: 81, y: 22, depth: 3 }, glyph: "♜", actionIds: actionIds("host"), visualState: secured("host-need") ? "read" : failed("host-need") ? "screened" : "waiting" },
    { id: "servant", label: run.practiceStates?.bonebinder?.servant?.identity.useName ?? "Prepared servant", kind: "actor", tone: "occult", status: completed.has("servant-labor") ? "Working inside the smoke" : "Awaiting a bounded direction", description: "Dead labor can enter air that living lungs cannot bear.", placement: { x: 69, y: 63, depth: 2 }, glyph: "†", actionIds: actionIds("servant") },
    { id: "bell-keeper", label: "The dead bell keeper", kind: "actor", tone: "occult", status: completed.has("dead-keeper") ? "Its last alarm reached the eastern lanes" : "An unfinished warning remains", description: "The keeper died before the last household heard the bell.", placement: { x: 34, y: 27, depth: 2 }, glyph: "☉", actionIds: actionIds("bell-keeper") },
  ];
  const subjects = subjectCandidates.filter(
    (subject) => subject.actionIds.length > 0 ||
      !["servant", "bell-keeper"].includes(subject.id),
  );
  return {
    id: "moving-shade:fire-road:isometric",
    eyebrow: "Isometric tactical proof · noncanonical",
    title: "Fire takes the eastern road",
    summary: fireRoad.phase === "arrival"
      ? "Sera has brought the town's immediate questions to you. Speak with her here; the road itself opens once you go with her."
      : "Sera still carries the town's final choice. The marked people, places, and dangers offer other work before she must make it.",
    phase: fireRoad.phase,
    background: { key: "fire-road", imageUrl: "/assets/scenes/fire-road-isometric.webp", alt: "An isometric view of the Fire Road settlement, its wells and warehouse row, the timber bridge, black scrub, and the foreign encampment beyond." },
    subjects,
    actions,
    connections: [
      { id: "town-road", from: "households", to: "road", label: secured("firebreak") ? "Fire checked before the evacuation route" : failed("firebreak") ? "Beaters hold three breaches along the route" : "Evacuation route", state: secured("firebreak") ? "secured" : failed("firebreak") ? "open" : "threatened" },
      { id: "road-bridge", from: "road", to: "bridge", label: "Eastern crossing", state: completed.has("kept-bridge") ? "secured" : "open" },
      { id: "host-road", from: "host", to: "road", label: "Offered protection", state: fireRoad.counterofferAccepted ? "secured" : "threatened" },
    ],
    measures: [
      { id: "room", label: "Time before decision", value: `${fireRoadOperatingRoom(fireRoad)} substantial ${fireRoadOperatingRoom(fireRoad) === 1 ? "act" : "acts"}`, tone: fireRoadOperatingRoom(fireRoad) > 1 ? "neutral" : "danger" },
      { id: "households", label: "Households", value: fireRoad.rescuedHouseholds === null ? `${FIRE_ROAD_HOUSEHOLDS_AT_RISK} exposed` : `${fireRoad.rescuedHouseholds} crossed`, tone: fireRoad.rescuedHouseholds === null ? "strained" : "secured" },
      {
        id: "terms",
        label: "Seasonal shelter",
        value: fireRoad.counterofferAccepted
          ? "One season without a subject oath"
          : fireRoad.counterofferAttempted
            ? "Lesser term refused; subject ordinance remains"
            : "Offered only under the subject ordinance",
        tone: fireRoad.counterofferAccepted ? "secured" : "occult",
      },
    ],
    events: [],
    resolved: fireRoad.phase === "resolved",
  };
};
