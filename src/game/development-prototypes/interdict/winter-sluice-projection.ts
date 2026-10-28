import type {
  TacticalSceneConnection,
  TacticalSceneMeasure,
  TacticalSceneProjection,
  TacticalSceneSubject,
} from "../../tactical-scene";
import { winterSluiceActions } from "./winter-sluice-actions";
import {
  INTERDICT_WINTER_SLUICE_ID,
  type WinterSluiceState,
} from "./winter-sluice-state";

interface SubjectBase {
  readonly id: string;
  readonly label: string;
  readonly kind: TacticalSceneSubject["kind"];
  readonly placement: TacticalSceneSubject["placement"];
  readonly glyph: string;
}

const SUBJECTS = [
  {
    id: "river-presence",
    label: "Rill-of-Reeds",
    kind: "force",
    placement: { x: 28, y: 18, depth: 2 },
    glyph: "≈",
  },
  {
    id: "mill-anchor",
    label: "Mill and wheel",
    kind: "site",
    placement: { x: 16, y: 43, depth: 3 },
    glyph: "⚙",
  },
  {
    id: "old-sluice",
    label: "Cracked winter sluice",
    kind: "hazard",
    placement: { x: 46, y: 43, depth: 2 },
    glyph: "▥",
  },
  {
    id: "lower-bank",
    label: "Lower-bank households",
    kind: "site",
    placement: { x: 64, y: 75, depth: 1 },
    glyph: "⌂",
  },
  {
    id: "burial-ground",
    label: "Burial rise",
    kind: "site",
    placement: { x: 88, y: 45, depth: 1 },
    glyph: "†",
  },
  {
    id: "miller",
    label: "The miller and his yard",
    kind: "actor",
    placement: { x: 22, y: 69, depth: 2 },
    glyph: "M",
  },
  {
    id: "field-severer",
    label: "Sivra An",
    kind: "actor",
    placement: { x: 68, y: 17, depth: 3 },
    glyph: "S",
  },
  {
    id: "aspect-instrument",
    label: "The white frame",
    kind: "resource",
    placement: { x: 73, y: 24, depth: 3 },
    glyph: "◇",
  },
] as const satisfies readonly SubjectBase[];

const sluiceHeld = (state: WinterSluiceState): boolean =>
  state.shoring === 2 || state.stopGate === "closed" ||
  state.consequences?.sluice === "held";

const subjectPresentation = (
  state: WinterSluiceState,
  subjectId: string,
): Pick<TacticalSceneSubject, "tone" | "status" | "description" | "visualState" | "attention"> => {
  if (subjectId === "river-presence") {
    const released = state.binding === "released";
    return {
      tone: released ? "secured" : "occult",
      status: released ? "Free; the old water has returned" : "Chained beneath the wheel",
      description: released
        ? "Rill-of-Reeds has left the wheel. She owes the town no further winter."
        : "Iron takes Rill-of-Reeds beneath the wheel once each turn. Her labor bends the winter water past the lower bank.",
      visualState: released ? "released" : "bound",
    };
  }
  if (subjectId === "mill-anchor") {
    const moved = state.counterRelation === "misaligned";
    return {
      tone: state.binding === "released" ? "neutral" : moved ? "secured" : "occult",
      status: state.binding === "released"
        ? "The miller's hold is broken"
        : moved
          ? "Named stone carried beyond Sivra's reach"
          : state.counterRelation === "understood"
            ? "White frame holds through one millstone"
            : "Wheel turning; one stone wet above the race",
      description: state.counterRelation === "untested"
        ? "One of the four millstones stays wet above the waterline. Pale light gathers where its iron pin meets the axle."
        : moved
          ? "The named millstone no longer stands within the water Sivra watched for six days. The binding itself persists."
          : "The white frame takes one of its four holds from this stone.",
      visualState: state.binding === "released" ? "broken" : moved ? "moved" : "aligned",
    };
  }
  if (subjectId === "old-sluice") {
    const condition = state.consequences?.sluice;
    const status = condition === "failed"
      ? "Broken by the returning water"
      : condition === "held"
        ? "Still standing after the irons opened"
        : state.stopGate === "closed"
          ? "Stop gate closed"
          : state.shoring === 2
            ? "Timber shoring complete"
            : state.shoring === 1
              ? "Emergency brace at the visible crack"
            : state.crack === "proved"
              ? "Deep crack proved"
              : state.masonRecord === "recovered"
                ? "Mason's measure ready for comparison"
                : "Visible wear; buried courses unmeasured";
    return {
      tone: condition === "failed" ? "danger" : sluiceHeld(state) ? "secured" : "strained",
      status,
      description: state.crack === "proved"
        ? state.stopGate === "unknown"
          ? "The concealed crack runs below Sivra's estimate. The mason's notes end where the covered works begin."
          : "The concealed crack runs below Sivra's estimate. A timber brace can hold its face; the buried stop gate can keep the worst water from it."
        : state.masonRecord === "recovered"
          ? "The mason's marked elevations can now be tested against the standing wall."
          : "Old stone separates the winter channel from the settled lower bank. Its buried courses cannot be judged from the visible face alone.",
      visualState: condition === "failed"
        ? "failed" : state.stopGate === "closed" ? "gate-closed" : state.shoring === 2
          ? "shored" : state.shoring === 1 ? "partly-shored" : state.crack === "proved" ? "crack-proved" : "crack-hidden",
    };
  }
  if (subjectId === "lower-bank") {
    const displaced = state.consequences?.displacedHouseholds ?? 0;
    return {
      tone: displaced > 0 ? "danger" : state.evacuation === 2 ? "secured" : "strained",
      status: displaced > 0
        ? `${displaced} households displaced`
        : state.evacuation === 2 ? "Evacuation prepared" : "Forty households remain in the flood path",
      description: state.evacuation === 2
        ? "Carts, custody, and household refusals have been settled. Four holdouts retain their own choice if the wall fails."
        : "Homes, workshops, and the tannery lie below the old stone. There are carts enough for people, if not for everything they own.",
      visualState: displaced > 0 ? "flooded" : state.evacuation === 2 ? "evacuated" : "occupied",
    };
  }
  if (subjectId === "burial-ground") {
    const lost = state.consequences?.burialLoss;
    return {
      tone: lost === "remains-lost" ? "danger" : state.burialCustody === 1 ? "secured" : "neutral",
      status: lost === "remains-lost"
        ? "Flooded; named remains lost"
        : lost === "ground-flooded"
          ? "Flooded; marked remains retained"
          : state.burialCustody === 1
            ? "Lowest-row remains moved above the flood line"
            : state.masonRecord === "recovered"
              ? "Mason's field book recovered; graves remain below the flood line"
              : "Mason's field book and graves lie here",
      description: state.inspector === "hosted"
        ? "The dead inspector is admitted under a term ending at the buried gate. The rest of the dead remain at rest."
        : state.masonRecord === "recovered"
          ? "The mason's field book has left the tool chest beside his grave. The lowest row of graves remains in the water's path if the sluice fails."
          : "The mason's field book remains in the tool chest beside his grave. Its lowest row of graves lies in the water's path if the sluice fails.",
      visualState: lost === "remains-lost"
        ? "lost" : lost === "ground-flooded" ? "marked-flood" : state.burialCustody === 1
          ? "marked" : state.inspector === "hosted" ? "hosted" : "unmarked",
    };
  }
  if (subjectId === "miller") {
    const settlement = state.timberSettlement;
    return {
      tone: state.millerAccount === "public" ? "strained" : "neutral",
      status: state.millerAccount === "public"
        ? "Concealment evidenced in public"
        : state.timberAccess === "released"
          ? settlement === "purchase"
            ? "Timber and carts bought for six obols"
            : settlement === "flood-right"
              ? "Yard opened under flood custom"
              : "Timber and carts surrendered to the crews"
          : state.millerExchange === "open" ? "Waiting at the locked yard" : "Timber and carts withheld",
      description: state.millerAccount === "public"
        ? state.millerLabor === "retained"
          ? "The old record and proved crack put deferred repair in public. Separate wages have brought the foreman and mill crews back to the wall."
          : "The old record and proved crack put deferred repair in public. The town has the yard, but the foreman and mill crews have withdrawn."
        : settlement === "purchase"
          ? "Six obols bought the beams, carts, and the mill crews' practiced labor. The miller yielded no claim and admitted no fault."
          : settlement === "flood-right"
            ? state.millerLabor === "retained"
              ? "The town took the yard under flood custom and then paid separate wages for the foreman and crews. Compensation for the materials remains due after the thaw."
              : "The town has taken the yard for the flood. Every beam and cart is entered against compensation after the thaw; the mill crews have withdrawn."
            : state.millerExchange === "open"
              ? "The miller stands inside the gate with its key in his fist. The crews can hear whatever terms are made here."
              : "The miller knows what the wheel costs Rill. He also knows how long the sluice has been cracked. Timber and carts that could protect the bank remain behind his locks.",
      visualState: state.millerAccount === "public"
        ? "account-public"
        : state.timberAccess === "released"
          ? "stores-released"
          : "withholding",
      ...(state.phase === "preparation" && state.crack === "proved" &&
          state.timberAccess === "withheld"
        ? { attention: { kind: "new-courses" as const, key: "miller:proved-wall" } }
        : {}),
    };
  }
  if (subjectId === "field-severer") {
    return {
      tone: state.severance === "completed" ? "occult" : state.severance === "prevented" ? "strained" : "danger",
      status: state.severance === "completed"
        ? "The irons opened by her hand"
        : state.severance === "prevented" ? "Six days of preparation no longer suffice" : state.severance === "superseded"
          ? "The captive freed without her" : "At the wheel until noon; white frame exposed",
      description: "Sivra An has spent six days watching wheel, water, and miller. She will hear evidence about the sluice, but not a plea that leaves Rill in irons.",
      visualState: state.severance,
    };
  }
  const read = state.counterRelation !== "untested";
  return {
    tone: state.instrument === "spent" ? "neutral" : "occult",
    status: state.instrument === "spent"
      ? "Dark after the irons opened"
      : read ? "Its four points of purchase are known" : "White metal speaking in a second voice",
    description: read
      ? "The frame holds to this water, this millstone, the miller's hand, and Sivra's living body. Move one beyond its reach and the promised judgment cannot fall here."
      : "White bars lie against Sivra's ribs. Their crossings shine when the voice behind her speaks, then leave small scorched squares in her coat.",
    visualState: state.instrument === "spent" ? "spent" : read ? "read" : "intact",
  };
};

const connectionsFor = (state: WinterSluiceState): TacticalSceneConnection[] => {
  const released = state.binding === "released";
  return [
    {
      id: "binding",
      from: "mill-anchor",
      to: "river-presence",
      label: released ? "Wheel-irons broken" : "Rill chained to the wheel",
      state: released ? "open" : "threatened",
    },
    {
      id: "winter-force",
      from: "river-presence",
      to: "old-sluice",
      label: released
        ? sluiceHeld(state) ? "Old water stopped at the sluice" : "Old water broke the sluice"
        : "Winter water forced past the lower bank",
      state: released ? sluiceHeld(state) ? "secured" : "threatened" : "blocked",
    },
    {
      id: "lower-flood-path",
      from: "old-sluice",
      to: "lower-bank",
      label: state.evacuation === 2 ? "Lower bank cleared before the water" : "Water reaches the lower bank first",
      state: sluiceHeld(state) ? "secured" : "threatened",
    },
    {
      id: "burial-flood-path",
      from: "old-sluice",
      to: "burial-ground",
      label: state.burialCustody === 1
        ? "Lowest-row remains moved above the flood line"
        : "Water reaches the burial rise after",
      state: sluiceHeld(state) || state.burialCustody === 1 ? "secured" : "threatened",
    },
    {
      id: "stores-custody",
      from: "miller",
      to: "old-sluice",
      label: state.timberAccess === "released"
        ? state.millerLabor === "retained"
          ? "Timber and practiced mill crews committed"
          : "Timber released; mill crews absent"
        : "Repair material withheld",
      state: state.timberAccess === "released" ? "secured" : "blocked",
    },
    {
      id: "exposed-aspect",
      from: "field-severer",
      to: "aspect-instrument",
      label: state.instrument === "spent" ? "White frame dark" : "White frame burns against Sivra",
      state: state.instrument === "spent" ? "secured" : "open",
    },
    {
      id: "tailored-access",
      from: "aspect-instrument",
      to: "mill-anchor",
      label: state.severance === "prevented"
        ? "White frame cannot find the named stone"
        : state.severance === "completed"
          ? "White frame spent on the wheel-irons"
          : state.severance === "superseded"
            ? "Rill freed before the white frame could speak"
            : state.counterRelation === "understood"
              ? "White frame reaches the wheel through this stone"
              : "White frame fixed to the mill",
      state: state.severance === "prevented" || state.severance === "superseded"
        ? "blocked" : state.severance === "completed" ? "secured" : "open",
    },
  ];
};

const measuresFor = (state: WinterSluiceState): TacticalSceneMeasure[] => [
  {
    id: "water",
    label: "Winter water",
    value: state.waterRead ? "Upstream thaw · lower bank first" : "Thaw untraced",
    tone: state.waterRead ? "neutral" : "strained",
  },
  {
    id: "ordinary-work",
    label: "Ordinary work",
    value: `${state.shoring === 2 ? "Shoring complete" : state.shoring === 1 ? "Emergency brace only" : "No shoring"} · ${state.evacuation === 2 ? "bank prepared" : "40 households exposed"}`,
    tone: sluiceHeld(state) && state.evacuation === 2 ? "secured" : "strained",
  },
  {
    id: "severance",
    label: "Sivra's vow",
    value: state.severance === "announced"
      ? "Ready at noon"
      : state.severance === "prevented"
        ? "Broken; irons remain"
        : state.severance === "completed"
          ? "Fulfilled; white frame dark"
          : "Overtaken; Rill freed by other hands",
    tone: state.severance === "announced" ? "danger" : state.severance === "prevented" ? "secured" : "occult",
  },
  {
    id: "practice",
    label: "Practice opportunity",
    value: state.inspector === "hosted"
      ? "Medium · one dead guest admitted" : state.inspector === "at-rest"
        ? "Medium · guest returned to rest" : "Medium · one dead witness",
    tone: state.inspector === "hosted" ? "occult" : "player",
  },
  ...(state.phase === "preparation" && state.timberAccess === "withheld" ? [{
    id: "old-wall",
    label: "Old wall",
    value: state.crack === "proved"
      ? "Deep failure proved"
      : state.masonRecord === "recovered"
        ? "Mason's measure recovered · test the old wall"
        : "Needs proof that the old wall cannot be trusted",
    tone: state.crack === "proved" ? "secured" as const : "neutral" as const,
  }] : []),
  ...(state.millerExchange === "open" ? [{
    id: "ready-coin",
    label: "Ready coin",
    value: `${state.readyObols} obols`,
    tone: "neutral" as const,
  }] : []),
];

const summaryFor = (state: WinterSluiceState): string => {
  if (state.phase === "resolved") {
    const consequence = state.consequences;
    return state.binding === "released"
      ? `Rill-of-Reeds is free. The sluice ${consequence?.sluice ?? "met the thaw"}; ${consequence?.displacedHouseholds ?? 0} households were displaced.`
      : "Sivra's promised act has been denied. Rill-of-Reeds still turns beneath the wheel.";
  }
  return "Rill-of-Reeds turns in the miller's irons. At noon, Sivra An means to open them and let the winter water choose its old road.";
};

export const projectWinterSluice = (
  state: WinterSluiceState,
): TacticalSceneProjection => {
  const actions = winterSluiceActions(state);
  const subjects = SUBJECTS.map((subject) => ({
    ...subject,
    placement: subject.id === "mill-anchor" &&
      state.counterRelation === "misaligned"
      ? { x: 9, y: 58, depth: 2 as const }
      : subject.placement,
    ...subjectPresentation(state, subject.id),
    actionIds: actions
      .filter(({ subjectId }) => subjectId === subject.id)
      .map(({ id }) => id),
  }));
  const resolvedAlt = state.phase === "resolved"
    ? state.binding === "released"
      ? `Rill-of-Reeds is free; the winter sluice ${state.consequences?.sluice ?? "has resolved"}.`
      : "Rill-of-Reeds still turns beneath the wheel; Sivra's promised act has been denied."
    : "";
  return {
    id: INTERDICT_WINTER_SLUICE_ID,
    eyebrow: "INTERDICT PROOF · NONCANONICAL",
    title: state.phase === "resolved" ? "The winter water takes its course." : "The winter sluice",
    summary: summaryFor(state),
    phase: state.phase,
    background: {
      key: `winter-sluice:${state.phase}:${state.binding}:${state.consequences?.sluice ?? "unresolved"}`,
      imageUrl: "/assets/scenes/winter-sluice-isometric.webp",
      alt: state.phase === "resolved"
        ? resolvedAlt
        : "A fixed isometric view of a river mill, cracked sluice, occupied lower bank, burial rise, Rill-of-Reeds beneath the wheel, and Sivra An wearing a white frame against her ribs.",
    },
    subjects,
    actions,
    connections: connectionsFor(state),
    measures: measuresFor(state),
    events: state.events,
    resolved: state.phase === "resolved",
  };
};
