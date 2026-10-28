import { describe, expect, it } from "vitest";
import { validateTacticalSceneProjection } from "../../tactical-scene";
import { winterSluiceActions } from "./winter-sluice-actions";
import { INTERDICT_WINTER_SLUICE_PROTOTYPE } from "./winter-sluice";
import type { WinterSluiceState } from "./winter-sluice-state";

const act = (state: WinterSluiceState, actionId: string): WinterSluiceState => {
  const result = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(state, actionId);
  expect(result.error).toBeUndefined();
  return result.state;
};

const action = (state: WinterSluiceState, actionId: string) => {
  const found = winterSluiceActions(state).find(({ id }) => id === actionId);
  expect(found).toBeDefined();
  return found!;
};

describe("Interdict winter-sluice tactical proof", () => {
  it("projects a valid fixed scene with physical and severance relations", () => {
    const state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state);

    expect(validateTacticalSceneProjection(projection)).toEqual([]);
    expect(projection.subjects.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "river-presence",
      "old-sluice",
      "lower-bank",
      "burial-ground",
      "field-severer",
      "aspect-instrument",
    ]));
    expect(projection.connections).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "binding", state: "threatened" }),
      expect.objectContaining({ id: "tailored-access", state: "open" }),
      expect.objectContaining({ id: "lower-flood-path", state: "threatened" }),
    ]));
    expect(projection.summary).toContain("Rill-of-Reeds turns in the miller's irons");
    expect(projection.summary).toContain("Sivra An means to open them");
    expect(projection.summary).toContain("winter water choose its old road");
    expect(projection.actions.every(({ activation }) =>
      activation.kind === "prototype-transition")).toBe(true);
  });

  it("makes environmental enablement and unavailable reasons explicit", () => {
    const state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();

    expect(action(state, "recover-mason-record")).toMatchObject({
      availability: { state: "available" },
      resolution: { method: "Ordinary investigation", prospect: "Assured" },
    });
    expect(winterSluiceActions(state).map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(["inspect-old-stone", "host-dead-inspector"]),
    );
    const prematureInspection = INTERDICT_WINTER_SLUICE_PROTOTYPE.act(
      state,
      "inspect-old-stone",
    );
    expect(prematureInspection.state).toBe(state);
    expect(prematureInspection.error).toContain("Unknown winter-sluice action");
    expect(action(state, "raise-timber-shoring").availability).toEqual({
      state: "unavailable",
      reason: "The mill's timber and carts are still withheld.",
    });
    expect(action(state, "move-millstone-anchor").availability).toEqual({
      state: "unavailable",
      reason: "You do not yet know where the white frame takes hold.",
    });
    expect(action(state, "let-severer-cut").availability.state).toBe("available");
    expect(action(state, "evacuate-lower-bank").availability.state).toBe("available");
  });

  it("separates written evidence from the Medium's dead testimony", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();

    state = act(state, "recover-mason-record");
    expect(state).toMatchObject({ masonRecord: "recovered", crack: "unknown", stopGate: "unknown" });
    expect(winterSluiceActions(state).map(({ id }) => id)).toContain("inspect-old-stone");
    expect(winterSluiceActions(state).map(({ id }) => id)).not.toContain("host-dead-inspector");

    state = act(state, "inspect-old-stone");
    expect(state).toMatchObject({ crack: "proved", stopGate: "unknown", inspector: "unfound" });
    expect(winterSluiceActions(state).map(({ id }) => id)).toContain("host-dead-inspector");
    expect(winterSluiceActions(state).map(({ id }) => id)).not.toContain("close-buried-gate");

    state = act(state, "host-dead-inspector");
    expect(state).toMatchObject({ inspector: "hosted", stopGate: "located" });
    expect(winterSluiceActions(state).map(({ id }) => id)).toContain("close-buried-gate");
  });

  it("supports a fully mundane preparation route before release", () => {
    const initial = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    let state = act(initial, "read-winter-water");
    state = act(state, "recover-mason-record");
    state = act(state, "inspect-old-stone");
    state = act(state, "open-miller-exchange");
    state = act(state, "buy-mill-stores");
    state = act(state, "raise-timber-shoring");
    state = act(state, "evacuate-lower-bank");
    state = act(state, "establish-treatment");
    state = act(state, "mark-burial-custody");
    state = act(state, "let-severer-cut");

    expect(initial).toMatchObject({
      masonRecord: "unfound",
      crack: "unknown",
      timberAccess: "withheld",
      phase: "preparation",
    });
    expect(state).toMatchObject({
      phase: "resolved",
      binding: "released",
      severance: "completed",
      instrument: "spent",
      shoring: 2,
      evacuation: 2,
      treatment: 1,
      burialCustody: 1,
      consequences: {
        sluice: "held",
        flood: "contained",
        displacedHouseholds: 0,
        injuredPeople: 0,
        burialLoss: "none",
      },
    });
    expect(state.completedActionIds).not.toContain("host-dead-inspector");
  });

  it("removes a completed course instead of retaining disabled clutter", () => {
    const initial = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    const changed = act(initial, "read-winter-water");

    expect(winterSluiceActions(changed).map(({ id }) => id)).not.toContain("read-winter-water");
    expect(INTERDICT_WINTER_SLUICE_PROTOTYPE.project(changed).subjects
      .find(({ id }) => id === "river-presence")?.actionIds).not.toContain("read-winter-water");
  });

  it("tracks the old wall and generically calls attention back to the mill yard", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    expect(INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state).measures).toContainEqual(
      expect.objectContaining({
        id: "old-wall",
        value: "Needs proof that the old wall cannot be trusted",
      }),
    );

    state = act(state, "read-winter-water");
    expect(state.events.at(-1)?.result).toContain("evacuation routes and treatment stations");
    state = act(state, "recover-mason-record");
    state = act(state, "inspect-old-stone");

    const projection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state);
    expect(projection.measures).toContainEqual(expect.objectContaining({
      id: "old-wall",
      value: "Deep failure proved",
    }));
    const miller = projection.subjects.find(({ id }) => id === "miller");
    expect(miller?.actionIds).toContain(
      "open-miller-exchange",
    );
    expect(miller?.attention).toEqual({
      kind: "new-courses",
      key: "miller:proved-wall",
    });
    expect(state.events.at(-1)?.result).toContain("turns back toward the mill yard");
  });

  it("separates mill-yard custody, skilled labor, and the quality of the brace", () => {
    const initial = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();

    expect(action(initial, "open-miller-exchange").availability.state).toBe("available");
    expect(winterSluiceActions(initial).map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(["buy-mill-stores", "invoke-flood-right", "witness-miller-refusal"]),
    );

    const opened = act(initial, "open-miller-exchange");
    expect(opened).toMatchObject({
      millerExchange: "open",
      timberAccess: "withheld",
      readyObols: 8,
    });
    expect(opened.completedActionIds).toEqual([]);
    expect(opened.events).toEqual([]);
    expect(winterSluiceActions(opened).map(({ id }) => id)).not.toContain(
      "witness-miller-refusal",
    );
    expect(winterSluiceActions(opened).map(({ id }) => id)).not.toContain(
      "invoke-flood-right",
    );
    expect(action(opened, "buy-mill-stores")).toMatchObject({
      resolution: { method: "Fixed exchange", prospect: "Assured" },
      costs: [{
        kind: "resource",
        resourceId: "obols",
        resourceLabel: "obols",
        amount: 6,
        available: 8,
      }],
    });
    const bought = act(opened, "buy-mill-stores");
    expect(bought).toMatchObject({
      millerExchange: "closed",
      timberAccess: "released",
      timberSettlement: "purchase",
      millerLabor: "retained",
      readyObols: 2,
    });
    expect(bought.events.at(-1)).toMatchObject({
      title: "The yard gate opens on paid terms.",
      result: expect.stringContaining("6 obols spent"),
    });

    let floodRight = act(INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(), "recover-mason-record");
    floodRight = act(floodRight, "inspect-old-stone");
    expect(floodRight.waterRead).toBe(false);
    floodRight = act(floodRight, "open-miller-exchange");
    expect(action(floodRight, "invoke-flood-right")).toMatchObject({
      resolution: { method: "Reeve's flood claim", prospect: "Assured" },
      knownConsequences: expect.arrayContaining([{
        kind: "obligation",
        label: "Town owes compensation after the thaw",
        detail: expect.any(String),
      }]),
    });
    floodRight = act(floodRight, "invoke-flood-right");
    expect(floodRight).toMatchObject({
      timberSettlement: "flood-right",
      millerLabor: "withdrawn",
      readyObols: 8,
      millerAccount: "private",
    });
    expect(action(floodRight, "retain-miller-crews")).toMatchObject({
      resolution: { method: "Wage agreement", prospect: "Assured" },
      costs: [expect.objectContaining({ amount: 3, available: 8 })],
    });
    floodRight = act(floodRight, "retain-miller-crews");
    expect(floodRight).toMatchObject({ millerLabor: "retained", readyObols: 5 });

    let witnessed = act(INTERDICT_WINTER_SLUICE_PROTOTYPE.createState(), "recover-mason-record");
    witnessed = act(witnessed, "inspect-old-stone");
    witnessed = act(witnessed, "open-miller-exchange");
    expect(action(witnessed, "witness-miller-refusal")).toMatchObject({
      resolution: { method: "Public evidence", prospect: "Assured" },
    });
    witnessed = act(witnessed, "witness-miller-refusal");
    expect(witnessed).toMatchObject({
      timberSettlement: "witnessed-refusal",
      millerLabor: "withdrawn",
      readyObols: 8,
      millerAccount: "public",
    });
    expect(action(witnessed, "retain-miller-crews").costs).toEqual([
      expect.objectContaining({ amount: 5, available: 8 }),
    ]);
    witnessed = act(witnessed, "retain-miller-crews");
    expect(witnessed).toMatchObject({ millerLabor: "retained", readyObols: 3 });
  });

  it("gives the Medium one bounded witness rather than supernatural omniscience", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = act(state, "recover-mason-record");
    state = act(state, "inspect-old-stone");
    expect(state.stopGate).toBe("unknown");
    state = act(state, "host-dead-inspector");

    expect(state.inspector).toBe("hosted");
    expect(state.stopGate).toBe("located");
    expect(state.events.at(-1)?.detail).toContain("He knows nothing of this thaw");
    expect(state.events.at(-1)?.detail).toContain("cannot admit Rill-of-Reeds");
    expect(action(state, "close-buried-gate").availability.state).toBe("available");

    state = act(state, "close-buried-gate");
    expect(state).toMatchObject({ stopGate: "closed", inspector: "at-rest" });
  });

  it("blocks only the prepared interdiction when its identified anchor moves", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    const initialAnchor = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state)
      .subjects.find(({ id }) => id === "mill-anchor")!;
    state = act(state, "inspect-counter-relation");
    state = act(state, "move-millstone-anchor");

    expect(state).toMatchObject({
      phase: "preparation",
      binding: "coercive",
      severance: "prevented",
      counterRelation: "misaligned",
      instrument: "intact",
    });
    expect(action(state, "let-severer-cut").availability).toEqual({
      state: "unavailable",
      reason: "This prepared severance no longer has every required participant aligned.",
    });
    const deniedProjection = INTERDICT_WINTER_SLUICE_PROTOTYPE.project(state);
    expect(deniedProjection.subjects.find(({ id }) => id === "mill-anchor")?.placement)
      .not.toEqual(initialAnchor.placement);
    expect(deniedProjection.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tailored-access", state: "blocked" }),
        expect.objectContaining({ id: "binding", state: "threatened" }),
      ]),
    );

    state = act(state, "leave-sluice");
    expect(state).toMatchObject({
      phase: "resolved",
      outcome: "interdiction-blocked",
      binding: "coercive",
      consequences: { sluice: "held", displacedHouseholds: 0 },
    });
  });

  it("allows an independent release without granting a safe generic reconnect", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = act(state, "inspect-counter-relation");
    state = act(state, "break-mortal-binding");

    expect(state).toMatchObject({
      phase: "resolved",
      outcome: "independent-release",
      binding: "released",
      severance: "superseded",
      instrument: "intact",
      consequences: {
        sluice: "failed",
        displacedHouseholds: 40,
        burialLoss: "remains-lost",
      },
    });
    expect(state.events.at(-1)?.result).toContain("Rill-of-Reeds released");
    expect(state.events.at(-1)?.result).toContain("40 households displaced");
  });

  it("turns a negotiated delay into bounded work without conjuring withheld timber", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = act(state, "recover-mason-record");
    state = act(state, "inspect-old-stone");
    state = act(state, "evacuate-lower-bank");

    expect(action(state, "assume-two-day-delay").availability.state).toBe("available");
    state = act(state, "assume-two-day-delay");

    expect(state).toMatchObject({
      phase: "resolved",
      outcome: "assumed-delay",
      binding: "released",
      timberAccess: "withheld",
      shoring: 0,
      evacuation: 2,
      consequences: { sluice: "failed", displacedHouseholds: 8 },
    });
    expect(state.completedActionIds.filter((id) =>
      id === "assume-two-day-delay")).toHaveLength(1);
    expect(state.events.at(-1)?.detail).toContain("two more days beneath the wheel");
    expect(state.events.at(-1)?.detail).toContain("mill yard stays locked");
  });

  it("uses retained mill labor to complete shoring during a negotiated delay", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = act(state, "read-winter-water");
    state = act(state, "recover-mason-record");
    state = act(state, "inspect-old-stone");
    state = act(state, "open-miller-exchange");
    state = act(state, "invoke-flood-right");
    state = act(state, "retain-miller-crews");
    state = act(state, "assume-two-day-delay");

    expect(state).toMatchObject({
      phase: "resolved",
      outcome: "assumed-delay",
      timberAccess: "released",
      shoring: 2,
      evacuation: 2,
      consequences: { sluice: "held", displacedHouseholds: 0 },
    });
  });

  it("limits seized timber without skilled mill labor to an emergency brace", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = act(state, "read-winter-water");
    state = act(state, "recover-mason-record");
    state = act(state, "inspect-old-stone");
    state = act(state, "open-miller-exchange");
    state = act(state, "invoke-flood-right");
    state = act(state, "assume-two-day-delay");

    expect(state).toMatchObject({
      shoring: 1,
      millerLabor: "withdrawn",
      consequences: { sluice: "failed", displacedHouseholds: 2 },
    });
  });

  it("uses the traced thaw to place evacuation and treatment more precisely", () => {
    const prepare = (readWater: boolean) => {
      let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
      if (readWater) state = act(state, "read-winter-water");
      state = act(state, "evacuate-lower-bank");
      state = act(state, "establish-treatment");
      return act(state, "let-severer-cut");
    };

    expect(prepare(false).consequences).toMatchObject({
      displacedHouseholds: 8,
      injuredPeople: 3,
    });
    expect(prepare(true).consequences).toMatchObject({
      displacedHouseholds: 4,
      injuredPeople: 1,
    });
  });

  it("resolves departure from actual state rather than an arbitrary punishment", () => {
    let state = INTERDICT_WINTER_SLUICE_PROTOTYPE.createState();
    state = act(state, "open-miller-exchange");
    state = act(state, "buy-mill-stores");
    state = act(state, "raise-timber-shoring");
    state = act(state, "leave-sluice");

    expect(state).toMatchObject({
      phase: "resolved",
      binding: "released",
      consequences: {
        sluice: "held",
        displacedHouseholds: 0,
      },
    });
    expect(state.events.at(-1)?.detail).toContain("Whatever the town has built or moved");
  });
});
