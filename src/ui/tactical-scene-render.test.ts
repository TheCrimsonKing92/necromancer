import { describe, expect, it } from "vitest";
import type { TacticalSceneProjection } from "../game/tactical-scene";
import { renderTacticalScene } from "./tactical-scene-render";

const projection: TacticalSceneProjection = {
  id: "fixture:scene",
  eyebrow: "Development proof",
  title: "The place answers",
  summary: "Facts occupy the board.",
  phase: "arrival",
  background: { key: "fixture", alt: "A place with a gate." },
  subjects: [{ id: "gate", label: "Gate", kind: "site", tone: "strained", status: "Closed", description: "The road ends here.", placement: { x: 50, y: 50, depth: 1 }, glyph: "◇", actionIds: ["open"] }],
  actions: [{ id: "open", subjectId: "gate", label: "Open the gate", lead: "Put the road through.", kind: "move", availability: { state: "available" }, activation: { kind: "prototype-transition" } }],
  connections: [],
  measures: [{ id: "time", label: "Time", value: "Narrow", tone: "danger" }],
  events: [],
  resolved: false,
};

describe("tactical scene renderer", () => {
  it("renders one semantic interaction in both stage and readable form", () => {
    const markup = renderTacticalScene(projection, { selectedSubjectId: "gate" });
    expect(markup).toContain('data-tactical-subject-id="gate"');
    expect(markup).toContain('data-tactical-action-id="open"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Read the represented scene");
    expect(markup).toContain("Gate:</strong> Closed");
  });

  it("marks a subject with new choices without naming the newly exposed course", () => {
    const marked: TacticalSceneProjection = {
      ...projection,
      subjects: [{
        ...projection.subjects[0]!,
        attention: { kind: "new-courses", key: "gate:new-course" },
      }],
    };
    const markup = renderTacticalScene(marked);

    expect(markup).toContain('data-tactical-attention="new-courses"');
    expect(markup).toContain('class="tactical-subject-attention"');
    expect(markup).toContain("New choices are available here.");
    expect(markup).not.toContain("gate:new-course");

    const inspected = renderTacticalScene(marked, {
      seenAttentionKeys: new Set(["gate:new-course"]),
    });
    expect(inspected).not.toContain('data-tactical-attention="new-courses"');
    expect(inspected).not.toContain("New choices are available here.");
  });

  it("presents course title before method, prospect, cost, and known consequence", () => {
    const detailed: TacticalSceneProjection = {
      ...projection,
      actions: [{
        ...projection.actions[0]!,
        resolution: { method: "Survival 2 · Practiced", prospect: "Favorable" },
        costs: [{
          kind: "resource",
          resourceId: "obols",
          resourceLabel: "obols",
          amount: 2,
          available: 7,
        }],
        knownConsequences: [{
          kind: "obligation",
          label: "The gatekeeper records the debt",
        }],
      }],
    };
    const markup = renderTacticalScene(detailed);
    const title = markup.indexOf("Open the gate");
    const method = markup.indexOf("Survival 2 · Practiced");
    const prospect = markup.indexOf("Favorable");
    const cost = markup.indexOf("2 obols");
    const consequence = markup.indexOf("The gatekeeper records the debt");

    expect(title).toBeLessThan(method);
    expect(method).toBeLessThan(prospect);
    expect(prospect).toBeLessThan(cost);
    expect(cost).toBeLessThan(consequence);
    expect(markup).not.toContain(">move<");
  });

  it("renders authored story activations without inventing a second transition", () => {
    const storyProjection: TacticalSceneProjection = {
      ...projection,
      actions: [{
        ...projection.actions[0]!,
        activation: {
          kind: "story-approach",
          approachId: "fixture:open",
          capabilityId: "survival",
        },
      }],
    };

    const markup = renderTacticalScene(storyProjection);
    expect(markup).toContain('data-action="open-featured-story-approach"');
    expect(markup).toContain('data-approach-id="fixture:open"');
    expect(markup).toContain('data-approach-facet-id="survival"');
  });

  it("renders authored story choices as the primary inspector decision", () => {
    const storyProjection: TacticalSceneProjection = {
      ...projection,
      actions: [{
        ...projection.actions[0]!,
        activation: { kind: "story-choice", choiceId: "answer" },
      }],
    };

    const markup = renderTacticalScene(storyProjection);
    expect(markup).toContain("The present decision");
    expect(markup).toContain('data-action="choose-story"');
    expect(markup).toContain('data-choice-id="answer"');
  });

  it("keeps an authored story response inside the tactical inspector", () => {
    const markup = renderTacticalScene(projection, {
      selectedSubjectId: "gate",
      outcomeMarkup: '<section class="story-outcome"><h2 data-result-title>The gate answers</h2></section>',
    });

    const outcome = markup.indexOf('data-tactical-outcome-slot');
    const inspector = markup.indexOf('class="tactical-inspector"');
    expect(outcome).toBeGreaterThan(inspector);
    expect(markup).toContain("The gate answers");
  });
});
