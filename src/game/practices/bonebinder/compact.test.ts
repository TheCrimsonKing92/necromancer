import { describe, expect, it } from "vitest";

import {
  SERVANT_SERVICE_PURPOSES,
  assessServantCompactOrder,
  createServantCompact,
} from "./compact";

describe("Letter of Service compact", () => {
  it("gives every purpose multiple matching commands and an authored route use", () => {
    for (const purpose of Object.values(SERVANT_SERVICE_PURPOSES)) {
      expect(purpose.matchingCommandIds.length).toBeGreaterThanOrEqual(2);
      expect(purpose.matchingServiceTags.length).toBeGreaterThan(0);
      expect(purpose.routeUse.length).toBeGreaterThan(20);
    }
  });

  it("distinguishes compliant service from a permitted exceptional order", () => {
    const compact = createServantCompact("keep-custody");

    expect(
      assessServantCompactOrder(compact, { commandId: "interpose" }),
    ).toMatchObject({
      outcome: "compliant",
      mayIssue: true,
      spiritAdjustment: 0,
      matchedPurpose: true,
    });
    expect(
      assessServantCompactOrder(compact, { commandId: "labor" }),
    ).toMatchObject({
      outcome: "exceptional",
      mayIssue: true,
      spiritAdjustment: 1,
      matchedPurpose: false,
    });
  });

  it("lets authored route service satisfy the compact without masquerading as a command", () => {
    const assessment = assessServantCompactOrder(
      createServantCompact("road-labor"),
      {
        commandId: "await",
        serviceTags: ["labor"],
      },
    );

    expect(assessment).toMatchObject({
      outcome: "compliant",
      spiritAdjustment: 0,
      matchedPurpose: true,
    });
  });

  it("refuses a contradiction until the player explicitly breaks the compact", () => {
    const compact = createServantCompact("hold-watch");
    const refused = assessServantCompactOrder(compact, {
      commandId: "withdraw",
      serviceTags: ["abandon-charge"],
    });

    expect(refused).toMatchObject({
      outcome: "refused",
      mayIssue: false,
      requiresExplicitBreach: true,
      compact,
    });

    const breached = assessServantCompactOrder(compact, {
      commandId: "withdraw",
      serviceTags: ["abandon-charge"],
      decision: "break-compact",
      reference: "battle:orra:round-3",
    });
    expect(breached).toMatchObject({
      outcome: "breached",
      mayIssue: true,
      spiritAdjustment: 1,
      requiresExplicitBreach: false,
      compact: {
        status: "breached",
        breachReference: "battle:orra:round-3",
      },
    });
  });

  it("does not preserve the compact's discount after it is broken", () => {
    const compact = {
      ...createServantCompact("road-labor"),
      status: "breached" as const,
      breachReference: "scene:broken-road",
    };

    expect(
      assessServantCompactOrder(compact, { commandId: "labor" }),
    ).toMatchObject({
      outcome: "unbound",
      mayIssue: true,
      spiritAdjustment: 0,
      matchedPurpose: false,
    });
  });
});
