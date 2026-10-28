import { describe, expect, it } from "vitest";
import {
  chooseStoryChoice,
  createCharacter,
  openInventory,
  useInventoryItem,
} from "./engine";
import {
  barterForItem,
  buyItem,
  buyReliquaryService,
  sellItem,
} from "./economy/reliquary-transitions";
import {
  ITEMS,
  canCarry,
  canCarryAfterExchange,
  carryCapacity,
  itemCount,
} from "./items";
import { reliquarySaleAvailability } from "./reliquary-market";

const reliquaryInventory = () => {
  const state = createCharacter("Mara Vale", "medium", 42).state;
  state.storyId = "saint-orra-aftermath";
  state.run!.battlesWon = 2;
  return openInventory(state).state;
};

describe("bounded exchanges", () => {
  it("limits broker demand to mortuary lots", () => {
    expect(reliquarySaleAvailability("hooked-knife").accepted).toBe(true);
    expect(reliquarySaleAvailability("linen-binding")).toMatchObject({
      accepted: false,
    });

    const state = reliquaryInventory();
    expect(sellItem(state, "linen-binding").error).toContain(
      "common road goods",
    );
  });

  it("persists limited stock and services in the economy ledger", () => {
    let state = reliquaryInventory();
    state.run!.player.obols = 20;

    state = buyItem(state, "vigil-cordial").state;
    expect(
      state.run!.economy.markets["north-vey-reliquary"]?.purchases[
        "vigil-cordial"
      ],
    ).toBe(1);
    expect(buyItem(state, "vigil-cordial").error).toContain(
      "no second measure",
    );
    expect(
      state.run!.flags.some((flag) =>
        flag.startsWith("reliquary-purchase:"),
      ),
    ).toBe(false);

    state = buyReliquaryService(state, "graveglass-ward").state;
    expect(state.run!.player.ward).toBe(4);
    expect(
      state.run!.economy.markets["north-vey-reliquary"]?.services[
        "graveglass-ward"
      ],
    ).toBe(1);
    expect(
      buyReliquaryService(state, "graveglass-ward").error,
    ).toContain("cannot be worked twice");
  });

  it("offers a material barter, carrying sidegrade, and Spirit consumable", () => {
    let state = reliquaryInventory();
    const baseCapacity = carryCapacity(state.run!.player);
    state.run!.player.obols = 2;
    state.run!.player.inventory["grave-copper"] = 1;

    state = barterForItem(state, "carrier-harness").state;
    expect(itemCount(state.run!.player.inventory, "grave-copper")).toBe(0);
    expect(itemCount(state.run!.player.inventory, "carrier-harness")).toBe(1);
    state.run!.player.equipment.torso = "carrier-harness";
    expect(carryCapacity(state.run!.player)).toBe(
      baseCapacity + ITEMS["carrier-harness"].bonuses!.carryCapacity!,
    );

    state.run!.player.inventory["vigil-cordial"] = 1;
    state.run!.player.spirit = 0;
    state = useInventoryItem(state, "vigil-cordial").state;
    expect(state.run!.player.spirit).toBe(3);
    expect(itemCount(state.run!.player.inventory, "vigil-cordial")).toBe(0);
  });

  it("counts the offered goods as leaving the pack when checking barter room", () => {
    let state = reliquaryInventory();
    const player = state.run!.player;
    player.obols = 2;
    player.inventory["grave-copper"] = 1;
    while (canCarry(player, "carrier-harness")) {
      player.inventory["ossuary-ichor"] =
        (player.inventory["ossuary-ichor"] ?? 0) + 1;
    }

    expect(canCarry(player, "carrier-harness")).toBe(false);
    expect(
      canCarryAfterExchange(
        player,
        "carrier-harness",
        "grave-copper",
      ),
    ).toBe(true);

    const result = barterForItem(state, "carrier-harness");
    expect(result.error).toBeUndefined();
    state = result.state;
    expect(itemCount(state.run!.player.inventory, "grave-copper")).toBe(0);
    expect(itemCount(state.run!.player.inventory, "carrier-harness")).toBe(1);
  });

  it("lets Iven buy a carried rendering material outside the broker market", () => {
    const state = createCharacter("Mara Vale", "thaumaturgist", 42).state;
    state.storyId = "road-interlude";
    state.run!.roadEvent = "hedge-surgeon";
    state.run!.player.inventory["grave-salt"] = 1;

    const result = chooseStoryChoice(
      state,
      "sell-grave-salt-to-iven",
    );

    expect(result.error).toBeUndefined();
    expect(result.state.run!.player.obols).toBe(3);
    expect(
      itemCount(result.state.run!.player.inventory, "grave-salt"),
    ).toBe(0);
    expect(result.state.run!.economy).toEqual({ markets: {} });
  });
});
