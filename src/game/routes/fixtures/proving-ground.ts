import type { RegionalRouteGraph } from "../types";

const PLAYABLE_PRACTICES = [
  "medium",
  "summoner",
  "thaumaturgist",
  "grave-warden",
] as const;

export const PROVING_GROUND_ROUTE_GRAPH: RegionalRouteGraph = {
  id: "north-vey-proving-ground",
  regionId: "north-vey",
  startNodeId: "weary-traveler",
  playablePracticeIds: PLAYABLE_PRACTICES,
  objectives: {
    "reach-saint-orra": {
      id: "reach-saint-orra",
      presentation: {
        label: "Reach Saint Orra's vault",
        summary: "Follow the disturbance north and find what opened the saint's account.",
      },
      required: true,
      completion: [{ kind: "milestone", id: "orra-confronted" }],
    },
    "answer-black-mile-wake": {
      id: "answer-black-mile-wake",
      presentation: {
        label: "Answer what follows",
        summary: "Survive the consequence that gathers on the road beyond the vault.",
      },
      required: true,
      completion: [{ kind: "milestone", id: "wake-answered" }],
    },
  },
  actions: {
    "listen-at-burial": {
      id: "listen-at-burial",
      mode: "interaction",
      presentation: {
        label: "Listen before leaving",
        summary: "Give the buried voices a little time before taking the road.",
      },
      consequenceIds: ["opening-listening"],
      grantsMilestoneIds: ["dead-heard-at-burial"],
    },
    "settle-ossuary-road": {
      id: "settle-ossuary-road",
      mode: "interaction",
      presentation: {
        label: "Settle the toll road",
        summary: "Meet what holds the burial markers and leave the road passable.",
      },
      consequenceIds: ["resolve-hollis-encounter"],
      grantsMilestoneIds: ["ossuary-road-settled"],
    },
    "cross-burial-cut": {
      id: "cross-burial-cut",
      mode: "interaction",
      presentation: {
        label: "Cross the burial cut",
        summary: "Take the lower way through the worked graves.",
      },
      consequenceIds: ["resolve-burial-cut"],
      grantsMilestoneIds: ["burial-cut-crossed"],
    },
    "search-tollhouse": {
      id: "search-tollhouse",
      mode: "interaction",
      presentation: {
        label: "Search the tollhouse",
        summary: "Read what remains before following the road north.",
      },
      consequenceIds: ["resolve-tollhouse"],
      grantsMilestoneIds: ["tollhouse-searched"],
    },
    "confront-saint-orra": {
      id: "confront-saint-orra",
      mode: "interaction",
      presentation: {
        label: "Enter the counting room",
        summary: "Cross the open threshold and face the keeper of the account.",
      },
      consequenceIds: ["resolve-saint-orra"],
      grantsMilestoneIds: ["orra-confronted"],
    },
    "render-vault-remains": {
      id: "render-vault-remains",
      mode: "interaction",
      presentation: {
        label: "Work over what remains",
        summary: "Take what the road and the law may later remember.",
      },
      consequenceIds: ["resolve-vault-rendering"],
      requires: [{ kind: "practice", oneOf: ["thaumaturgist"] }],
      grantsMilestoneIds: ["vault-remains-rendered"],
    },
    "resolve-road-interlude": {
      id: "resolve-road-interlude",
      mode: "interaction",
      presentation: {
        label: "Attend to the road",
        summary: "Deal with whoever or whatever has occupied the next mile.",
      },
      consequenceIds: ["resolve-selected-road-event"],
      grantsMilestoneIds: ["road-interlude-resolved"],
    },
    "answer-wake": {
      id: "answer-wake",
      mode: "interaction",
      presentation: {
        label: "Answer the wake",
        summary: "Stand against the force that has gathered behind your passage.",
      },
      consequenceIds: ["resolve-selected-wake"],
      grantsMilestoneIds: ["wake-answered"],
    },
  },
  nodes: {
    "weary-traveler": {
      id: "weary-traveler",
      regionId: "north-vey",
      kind: "story",
      revisitable: false,
      presentation: {
        label: "The worked burial",
        summary: "A road waits beyond the grave in which you woke.",
      },
      actionIds: ["listen-at-burial"],
      activatesObjectiveIds: ["reach-saint-orra", "answer-black-mile-wake"],
    },
    "ossuary-road": {
      id: "ossuary-road",
      regionId: "north-vey",
      kind: "combat",
      revisitable: false,
      presentation: {
        label: "Ossuary road",
        summary: "Burial markers narrow the road toward the tollhouse.",
      },
      actionIds: ["settle-ossuary-road"],
    },
    "burial-cut": {
      id: "burial-cut",
      regionId: "north-vey",
      kind: "hazard",
      revisitable: false,
      presentation: {
        label: "The burial cut",
        summary: "A lower track passes through older, worked ground.",
      },
      actionIds: ["cross-burial-cut"],
    },
    "hollow-tollhouse": {
      id: "hollow-tollhouse",
      regionId: "north-vey",
      kind: "story",
      revisitable: false,
      presentation: {
        label: "The hollow tollhouse",
        summary: "Both roads return to a roofless station and its surviving ledger.",
      },
      actionIds: ["search-tollhouse"],
    },
    "saint-orra-vault": {
      id: "saint-orra-vault",
      regionId: "north-vey",
      kind: "combat",
      revisitable: false,
      presentation: {
        label: "Saint Orra's vault",
        summary: "The open stair descends to a counting room that has outlived its use.",
      },
      actionIds: ["confront-saint-orra"],
    },
    "vault-aftermath": {
      id: "vault-aftermath",
      regionId: "north-vey",
      kind: "story",
      revisitable: false,
      presentation: {
        label: "The opened vault",
        summary: "The account is closed. Its remains and consequences are not.",
      },
      actionIds: ["render-vault-remains"],
    },
    "black-mile-road": {
      id: "black-mile-road",
      regionId: "north-vey",
      kind: "story",
      revisitable: false,
      presentation: {
        label: "The road beyond",
        summary: "Ordinary need and old disturbances share the same northward mile.",
      },
      actionIds: ["resolve-road-interlude"],
      arrivalPoolIds: ["black-mile-road-events"],
    },
    "black-mile-wake": {
      id: "black-mile-wake",
      regionId: "north-vey",
      kind: "combat",
      revisitable: false,
      terminal: true,
      presentation: {
        label: "The wake",
        summary: "Something has used the road behind you and now bars the way ahead.",
      },
      actionIds: ["answer-wake"],
      arrivalPoolIds: ["black-mile-wake-variants"],
    },
  },
  edges: [
    {
      id: "burial-to-ossuary-road",
      from: "weary-traveler",
      to: "ossuary-road",
      presentation: {
        label: "Take the ossuary road",
        summary: "Follow the burial markers toward the tollhouse.",
      },
      blockedSummary: "The road is not yet open.",
      travelCost: 1,
      visibility: "known",
      consequenceIds: [],
    },
    {
      id: "burial-to-cut",
      from: "weary-traveler",
      to: "burial-cut",
      presentation: {
        label: "Take the lower cut",
        summary: "Leave the markers for the older track.",
      },
      blockedSummary: "The cut is not yet passable.",
      travelCost: 1,
      visibility: "known",
      consequenceIds: [],
    },
    {
      id: "ossuary-road-to-tollhouse",
      from: "ossuary-road",
      to: "hollow-tollhouse",
      presentation: {
        label: "Continue to the tollhouse",
        summary: "Leave the settled markers behind.",
      },
      blockedSummary: "The road still holds you here.",
      travelCost: 1,
      visibility: "known",
      requires: [{ kind: "milestone", id: "ossuary-road-settled" }],
      consequenceIds: [],
    },
    {
      id: "burial-cut-to-tollhouse",
      from: "burial-cut",
      to: "hollow-tollhouse",
      presentation: {
        label: "Climb toward the tollhouse",
        summary: "Return to the road above the worked ground.",
      },
      blockedSummary: "The lower track still requires an answer.",
      travelCost: 1,
      visibility: "known",
      requires: [{ kind: "milestone", id: "burial-cut-crossed" }],
      consequenceIds: [],
    },
    {
      id: "tollhouse-to-vault",
      from: "hollow-tollhouse",
      to: "saint-orra-vault",
      presentation: {
        label: "Follow the ledger north",
        summary: "Take the name and its debt to the open vault.",
      },
      blockedSummary: "The tollhouse has not yielded the way forward.",
      travelCost: 1,
      visibility: "known",
      requires: [{ kind: "milestone", id: "tollhouse-searched" }],
      consequenceIds: [],
    },
    {
      id: "vault-to-aftermath",
      from: "saint-orra-vault",
      to: "vault-aftermath",
      presentation: {
        label: "Leave the counting room",
        summary: "Return to the stair with what the vault surrendered.",
      },
      blockedSummary: "The account remains open.",
      travelCost: 0,
      visibility: "known",
      requires: [{ kind: "objective-complete", id: "reach-saint-orra" }],
      consequenceIds: [],
    },
    {
      id: "aftermath-to-road",
      from: "vault-aftermath",
      to: "black-mile-road",
      presentation: {
        label: "Return to the road",
        summary: "Carry the vault's consequence into the next mile.",
      },
      blockedSummary: "There is unfinished work at the vault.",
      travelCost: 1,
      visibility: "known",
      consequenceIds: [],
    },
    {
      id: "road-to-wake",
      from: "black-mile-road",
      to: "black-mile-wake",
      presentation: {
        label: "Continue north",
        summary: "Leave the latest business of the road behind.",
      },
      blockedSummary: "The road's present business is unfinished.",
      travelCost: 1,
      visibility: "known",
      requires: [{ kind: "milestone", id: "road-interlude-resolved" }],
      consequenceIds: [],
    },
  ],
  pools: {
    "black-mile-road-events": {
      id: "black-mile-road-events",
      entries: [
        {
          id: "ash-cart-caravan",
          contentId: "ash-cart-caravan",
          disposition: "neutral",
          weight: 1,
        },
        {
          id: "roadside-surgeon",
          contentId: "roadside-surgeon",
          disposition: "friendly",
          weight: 1,
        },
        {
          id: "ditch-burial",
          contentId: "ditch-burial",
          disposition: "neutral",
          weight: 1,
        },
        {
          id: "disputed-bundle",
          contentId: "disputed-bundle",
          disposition: "hazardous",
          weight: 1,
        },
      ],
    },
    "black-mile-wake-variants": {
      id: "black-mile-wake-variants",
      entries: [
        {
          id: "bell-widow",
          contentId: "bell-widow",
          disposition: "hostile",
          weight: 1,
        },
        {
          id: "redactors",
          contentId: "redactors",
          disposition: "hostile",
          weight: 1,
        },
        {
          id: "pallbearers",
          contentId: "pallbearers",
          disposition: "hostile",
          weight: 1,
        },
        {
          id: "reliquary-poachers",
          contentId: "reliquary-poachers",
          disposition: "hostile",
          weight: 1,
        },
        {
          id: "county-reeves",
          contentId: "county-reeves",
          disposition: "hostile",
          weight: 1,
        },
      ],
    },
  },
};
