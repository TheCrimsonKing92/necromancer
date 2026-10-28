import { describe, expect, it } from "vitest";
import {
  createEconomyState,
  normalizeEconomyState,
} from "./economy-state";
import {
  marketPurchaseCount,
  marketServiceCount,
  recordMarketPurchase,
  recordMarketService,
} from "./economy/market-activity";
import { ITEMS } from "./items";

const isItemId = (id: string): id is keyof typeof ITEMS =>
  Object.hasOwn(ITEMS, id);

describe("persisted economy state", () => {
  it("records market activity without story flags", () => {
    const economy = createEconomyState();

    recordMarketPurchase(
      economy,
      "north-vey-reliquary",
      "vigil-cordial",
    );
    recordMarketService(
      economy,
      "north-vey-reliquary",
      "graveglass-ward",
    );

    expect(
      marketPurchaseCount(
        economy,
        "north-vey-reliquary",
        "vigil-cordial",
      ),
    ).toBe(1);
    expect(
      marketServiceCount(
        economy,
        "north-vey-reliquary",
        "graveglass-ward",
      ),
    ).toBe(1);
  });

  it("drops unknown, fractional, unsafe, and non-positive saved counts", () => {
    const economy = normalizeEconomyState(
      {
        markets: {
          "north-vey-reliquary": {
            purchases: {
              "vigil-cordial": 1,
              "carrier-harness": 0.5,
              "grave-copper": Number.MAX_SAFE_INTEGER + 1,
              "not-an-item": 2,
            },
            services: {
              "graveglass-ward": 0,
              "not-a-service": 3,
            },
          },
          "not-a-market": {
            purchases: { "vigil-cordial": 9 },
            services: {},
          },
        },
      },
      isItemId,
    );

    expect(economy).toEqual({
      markets: {
        "north-vey-reliquary": {
          purchases: { "vigil-cordial": 1 },
          services: {},
        },
      },
    });
  });
});
