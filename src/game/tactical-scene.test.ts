import { describe, expect, it } from "vitest";
import {
  validateTacticalSceneProjection,
  type TacticalSceneProjection,
} from "./tactical-scene";

const scene = (): TacticalSceneProjection => ({
  id: "fixture:scene",
  eyebrow: "Development proof",
  title: "A represented place",
  summary: "Its facts have positions without turning pixels into rules.",
  phase: "arrival",
  background: { key: "fixture", alt: "A test place." },
  subjects: [{
    id: "gate",
    label: "Gate",
    kind: "site",
    tone: "neutral",
    status: "Closed",
    description: "The road ends here.",
    placement: { x: 50, y: 50, depth: 1 },
    glyph: "◇",
    actionIds: ["open"],
  }],
  actions: [{
    id: "open",
    subjectId: "gate",
    label: "Open the gate",
    lead: "Put the road through.",
    kind: "move",
    availability: { state: "available" },
    activation: { kind: "prototype-transition" },
  }],
  connections: [],
  measures: [],
  events: [],
  resolved: false,
});

describe("tactical scene contract", () => {
  it("accepts semantic placement without treating coordinates as rules", () => {
    expect(validateTacticalSceneProjection(scene())).toEqual([]);
  });

  it("accepts a generic subject-attention key and rejects an empty one", () => {
    const valid = scene();
    const subject = valid.subjects[0]!;
    expect(validateTacticalSceneProjection({
      ...valid,
      subjects: [{
        ...subject,
        attention: { kind: "new-courses", key: "gate:opened-course" },
      }],
    })).toEqual([]);

    expect(validateTacticalSceneProjection({
      ...valid,
      subjects: [{
        ...subject,
        attention: { kind: "new-courses", key: " " },
      }],
    })).toContain("fixture:scene:gate has an invalid attention key.");
  });

  it("rejects dangling actions, connections, and invalid placement", () => {
    const invalid = scene();
    const subject = invalid.subjects[0]!;
    expect(validateTacticalSceneProjection({
      ...invalid,
      subjects: [{
        ...subject,
        placement: { ...subject.placement, x: 101 },
        actionIds: ["missing"],
      }],
      connections: [{
        id: "road",
        from: "gate",
        to: "nowhere",
        label: "Road",
        state: "blocked",
      }],
    })).toEqual(expect.arrayContaining([
      "fixture:scene:gate has an invalid placement.",
      "fixture:scene:gate references missing action missing.",
      "fixture:scene:road has a dangling connection.",
    ]));
  });

  it("validates structured course costs and player-facing consequences", () => {
    const valid = scene();
    expect(validateTacticalSceneProjection({
      ...valid,
      actions: [{
        ...valid.actions[0]!,
        resolution: { method: "Barter 1 · Familiar", prospect: "Favorable" },
        costs: [{
          kind: "resource",
          resourceId: "obols",
          resourceLabel: "obols",
          amount: 6,
          available: 8,
        }],
        knownConsequences: [{
          kind: "obligation",
          label: "A claim after the thaw",
        }],
      }],
    })).toEqual([]);

    expect(validateTacticalSceneProjection({
      ...valid,
      actions: [{
        ...valid.actions[0]!,
        resolution: { method: " ", prospect: "Assured" },
        costs: [{
          kind: "resource",
          resourceId: "obols",
          resourceLabel: "obols",
          amount: 0,
        }],
        knownConsequences: [{ kind: "world-state", label: " " }],
      }],
    })).toEqual(expect.arrayContaining([
      "fixture:scene:open requires a resolution method.",
      "fixture:scene:open has an invalid resource cost.",
      "fixture:scene:open has an invalid known consequence.",
    ]));
  });
});
