export const WORST_CASE_WITNESS_COUNT = 80;

const BODY_PART_IDS = Object.freeze([
  "head",
  "torso",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
]);
const STATUS_IDS = Object.freeze([
  "bleeding",
  "burning",
  "exposed",
  "forewarned",
]);
const ITEM_IDS = Object.freeze([
  "ritual-knife",
  "bone-wand",
  "iron-sickle",
  "mortuary-mallet",
  "warding-awl",
  "gravecloth-coat",
  "binder-wraps",
  "apothecary-apron",
  "burial-hood",
  "hooked-knife",
  "road-leathers",
  "ash-hide-boots",
  "grave-iron-mask",
  "saint-bone-charm",
  "debtor-tally",
  "ossuary-ichor",
  "black-tonic",
  "linen-binding",
  "hound-tooth",
  "grave-salt",
  "mortuary-tallow",
]);
const WORLD_FACT_IDS = Object.freeze([
  "hollis-vane-dead",
  "hollis-vane-rendered",
  "saint-orra-unbound",
  "shared-mourning-fire",
  "aided-county-burial",
  "gave-use-name-to-burial-crews",
  "dealt-with-iven",
  "roadside-bundle-examined",
  "bundle-trace-points-to-broker",
  "bundle-left-under-burial-custody",
  "bundle-released-to-broker",
  "ditch-hand-body-recognized",
]);
const WORLD_FACTION_IDS = Object.freeze([
  "county-reeves",
  "burial-crews",
  "reliquary-brokers",
  "north-road-households",
]);
const WORLD_RELATION_IDS = Object.freeze([
  ...WORLD_FACTION_IDS,
  "iven-saye",
  "eda-pell",
  "oren-vask",
]);

const clone = (value) => structuredClone(value);

const requireV4Envelope = (envelope) => {
  if (
    envelope?.schemaVersion !== 4 ||
    envelope?.state?.schemaVersion !== 4 ||
    !envelope.state.run?.player ||
    !envelope.state.run?.world
  ) {
    throw new TypeError(
      "Worst-case fixtures require an existing resumable v4 save envelope.",
    );
  }
};

const worstCaseWounds = (part) =>
  ["minor", "serious", "grievous"].map((severity, index) => ({
    id: `worst:${part}:${severity}`,
    part,
    severity,
    label: `${severity} ${part} injury under prolonged field care`,
    bleed: index,
    care: index === 0 ? "binding" : "rest",
    treated: index === 0,
    source: "black-mile-wake",
    combatPenaltyReduction: index === 0 ? 1 : 0,
    combatPenaltyReductionTurns: index === 0 ? 1 : 0,
    recoveryBurden: index + 1,
  }));

const saturateBody = (body) =>
  Object.fromEntries(
    BODY_PART_IDS.map((part) => [
      part,
      {
        ...clone(body[part]),
        condition: Math.max(1, body[part].maxCondition - 1),
        wounds: worstCaseWounds(part),
      },
    ]),
  );

const saturatedStatuses = () =>
  STATUS_IDS.map((id, index) => ({
    id,
    turns: 9 - index,
    potency: 3,
    ...(id === "burning" ? { preventsHealthRecovery: true } : {}),
  }));

const combatantFrom = (player, definition) => ({
  id: definition.id,
  name: definition.name,
  kind: definition.kind,
  title: definition.title,
  anatomy: definition.anatomy,
  materiality: definition.materiality,
  materialityLabel: definition.materialityLabel,
  hp: 36,
  maxHp: 36,
  attack: 7,
  defense: 5,
  ward: 12,
  statuses: saturatedStatuses(),
  body: saturateBody(player.body),
  naturalArmor: { head: 2, torso: 3, leftArm: 1, rightArm: 1 },
  naturalArmorLabel: definition.materiality === "incorporeal"
    ? undefined
    : "Layered mortuary protection",
  vitalParts: definition.materiality === "incorporeal"
    ? []
    : ["head", "torso"],
  bodyDamageModifiers: definition.materiality === "incorporeal"
    ? { physical: 0.5, occult: 1.25 }
    : { physical: 1, occult: 1 },
  ...(definition.lifetime ? { lifetime: definition.lifetime } : {}),
});

const ENEMY_FIXTURES = Object.freeze([
  {
    id: "wake-pallbearer",
    name: "Pallbearer",
    kind: "enemy",
    title: "Bearer of the unfinished bier",
    anatomy: "humanoid",
    materiality: "corporeal",
  },
  {
    id: "wake-mourner-left",
    name: "Left-hand Mourner",
    kind: "enemy",
    title: "A grief given reach",
    anatomy: "manifestation",
    materiality: "incorporeal",
    materialityLabel: "The mourner's borrowed outline",
  },
  {
    id: "wake-mourner-right",
    name: "Right-hand Mourner",
    kind: "enemy",
    title: "A grief given reach",
    anatomy: "manifestation",
    materiality: "incorporeal",
    materialityLabel: "The mourner's borrowed outline",
  },
]);

const ALLY_FIXTURES = Object.freeze([
  {
    id: "ash-shade",
    name: "Ash-hound shade",
    kind: "ally",
    title: "A hound's last obedience",
    anatomy: "quadruped",
    materiality: "incorporeal",
    materialityLabel: "The shade's smoke-thin form",
    lifetime: { kind: "temporary", remainingTurns: 9 },
  },
  {
    id: "bound-shade",
    name: "Bound shade",
    kind: "ally",
    title: "A dead initiative held open",
    anatomy: "manifestation",
    materiality: "incorporeal",
    materialityLabel: "The shade's borrowed outline",
    lifetime: { kind: "temporary", remainingTurns: 9 },
  },
  {
    id: "servant:ditch-hand",
    name: "Ditch-Hand",
    kind: "ally",
    title: "A prepared body under service",
    anatomy: "humanoid",
    materiality: "corporeal",
    lifetime: { kind: "persistent", servantId: "servant:ditch-hand" },
  },
]);

const LONG_WITNESS_TEXT = [
  "The pallbearer's hooked stave crosses the ward before it reaches the left arm, while the two mourners answer from opposite sides of the bier.",
  "Layered grave-cloth turns part of the committed force; the remainder tears through old bindings and leaves the limb open beneath the rain.",
  "A bound shade closes on the opening, Ditch-Hand holds the line without speech, and the ash-hound's last obedience circles behind the procession.",
  "Burning clings to one wound, bleeding opens from another, the exposed posture remains legible to every enemy, and forewarning has not yet spent itself.",
  "The Witness preserves damage, mitigation, body condition, wound, status, duration, resource movement, summoned service, and the defeat transition in their resolved order.",
  "Nothing in the account predicts the next blow; it records only what the combatants could see and what the body has already paid.",
].join(" ");

const witnessLog = () =>
  Array.from({ length: WORST_CASE_WITNESS_COUNT }, (_, index) => ({
    id: index + 1,
    round: Math.floor(index / 8) + 1,
    tone: ["player", "enemy", "system", "reward"][index % 4],
    text: `${LONG_WITNESS_TEXT} Account ${String(index + 1).padStart(2, "0")} closes without abbreviating the injury or its cost.`,
  }));

const saturatePlayer = (player) => ({
  ...clone(player),
  hp: player.maxHp,
  ward: 12,
  statuses: saturatedStatuses(),
  body: saturateBody(player.body),
  level: 10,
  xp: 585,
  obols: 9_999,
  spirit: player.maxSpirit,
  inventory: Object.fromEntries(ITEM_IDS.map((id) => [id, 99])),
  scars: BODY_PART_IDS.flatMap((part) =>
    [0, 1, 2].map((index) => ({
      id: `worst:scar:${part}:${index}`,
      part,
      label: `Old ${part} scar ${index + 1}`,
      source: "earlier testament work",
      conditionPenalty: index + 1,
    })),
  ),
  attributes: Object.fromEntries(
    Object.keys(player.attributes).map((id) => [id, 5]),
  ),
  skills: Object.fromEntries(
    Object.keys(player.skills).map((id) => [id, 5]),
  ),
});

const largeWorld = (world) => {
  const evidence = Array.from({ length: 96 }, (_, index) => ({
    id: `worst:evidence:${index}`,
    factId: WORLD_FACT_IDS[index % WORLD_FACT_IDS.length],
    kind: ["witness", "body", "object", "record", "occult-trace"][index % 5],
    custodianId: WORLD_RELATION_IDS[index % WORLD_RELATION_IDS.length],
    strength: (index % 3) + 1,
    provenanceId: `worst:provenance:${index % 48}`,
  }));
  return {
    ...clone(world),
    pressures: { escapedNames: 99, countyNotice: 99 },
    standing: Object.fromEntries(
      WORLD_RELATION_IDS.map((id, index) => [id, index - 3]),
    ),
    facts: [...WORLD_FACT_IDS],
    playerKnowledge: [...WORLD_FACT_IDS],
    knowledge: Object.fromEntries(
      WORLD_FACTION_IDS.map((id) => [id, [...WORLD_FACT_IDS]]),
    ),
    evidence,
    beliefs: Array.from({ length: 96 }, (_, index) => ({
      id: `worst:belief:${index}`,
      holderId: WORLD_RELATION_IDS[index % WORLD_RELATION_IDS.length],
      factId: WORLD_FACT_IDS[index % WORLD_FACT_IDS.length],
      certainty: ["rumor", "credible", "accepted"][index % 3],
      basisEvidenceIds: [evidence[index].id],
    })),
    provenance: Array.from({ length: 48 }, (_, index) => ({
      id: `worst:provenance:${index}`,
      subjectId: `worst:subject:${index}`,
      subjectKind: ["person", "body", "item", "place", "record"][index % 5],
      originFactId: WORLD_FACT_IDS[index % WORLD_FACT_IDS.length],
      claimantIds: [WORLD_RELATION_IDS[index % WORLD_RELATION_IDS.length]],
      custody: Array.from({ length: 4 }, (__, custodyIndex) => ({
        custodianId:
          WORLD_RELATION_IDS[(index + custodyIndex) % WORLD_RELATION_IDS.length],
        basis: ["claim", "law", "permission", "possession"][custodyIndex],
        status: ["current", "transferred", "lost", "transferred"][custodyIndex],
        originFactId: WORLD_FACT_IDS[(index + custodyIndex) % WORLD_FACT_IDS.length],
      })),
      tags: ["field-record", "contested", `sequence-${index}`],
    })),
    claims: Array.from({ length: 48 }, (_, index) => ({
      id: `worst:claim:${index}`,
      claimantId: WORLD_RELATION_IDS[index % WORLD_RELATION_IDS.length],
      subjectId: `worst:subject:${index}`,
      kind: ["ownership", "custody", "authority", "identity"][index % 4],
      status: ["asserted", "recognized", "disputed", "released"][index % 4],
      basisFactIds: [WORLD_FACT_IDS[index % WORLD_FACT_IDS.length]],
    })),
    relationships: Array.from({ length: 48 }, (_, index) => ({
      id: `worst:relationship:${index}`,
      fromId: WORLD_RELATION_IDS[index % WORLD_RELATION_IDS.length],
      toId: WORLD_RELATION_IDS[(index + 1) % WORLD_RELATION_IDS.length],
      kind: ["membership", "employment", "kinship", "custody", "obligation"][index % 5],
      status: ["active", "strained", "ended"][index % 3],
      originFactId: WORLD_FACT_IDS[index % WORLD_FACT_IDS.length],
    })),
    activePressures: Array.from({ length: 24 }, (_, index) => ({
      id: `worst:pressure:${index}`,
      scopeId: `north-road:${index % 4}`,
      intensity: index + 1,
      stakeholderIds: [
        WORLD_RELATION_IDS[index % WORLD_RELATION_IDS.length],
        WORLD_RELATION_IDS[(index + 1) % WORLD_RELATION_IDS.length],
      ],
      sourceFactIds: [WORLD_FACT_IDS[index % WORLD_FACT_IDS.length]],
      status: index % 3 === 0 ? "resolved" : "active",
    })),
  };
};

const baseFixtureState = (baseEnvelope) => {
  const envelope = clone(baseEnvelope);
  const run = envelope.state.run;
  run.player = saturatePlayer(run.player);
  run.world = largeWorld(run.world);
  run.seed = 0x6e656372;
  run.flags = [...new Set(run.flags)];
  run.wakeVariant = "bone-procession";
  run.roadEvent = "disputed-bundle";
  run.seenRoadEvents = [
    "mourning-caravan",
    "hedge-surgeon",
    "ditch-burial",
    "disputed-bundle",
  ];
  run.battlesWon = 2;
  envelope.savedAt = "2026-08-03T00:00:00.000Z";
  return envelope;
};

const dimensionManifest = Object.freeze({
  witness: { supported: true, entries: WORST_CASE_WITNESS_COUNT },
  inventory: { supported: true, distinctItems: ITEM_IDS.length, quantityEach: 99 },
  shop: {
    supported: true,
    basis: "saint-orra-aftermath with two battles won; stock remains authored",
  },
  journalWorld: {
    supported: true,
    facts: WORLD_FACT_IDS.length,
    beliefs: 96,
    evidence: 96,
    provenance: 48,
    claims: 48,
    relationships: 48,
    pressures: 24,
  },
  wounds: { supported: true, playerWounds: BODY_PART_IDS.length * 3 },
  statuses: { supported: true, uniqueStatusesPerCombatant: STATUS_IDS.length },
  combatants: { supported: true, enemies: 3, allies: 3 },
  skillTree: {
    supported: true,
    level: 10,
    basis: "all authored nodes render; claims remain governed by existing rules",
  },
  campaignRouteSoak: {
    supported: false,
    reason: "The current persisted v4 state has no integrated repeatable regional-route state.",
  },
  combatActionSoak: {
    supported: false,
    reason: "A 500-action battle cannot remain successful without inventing outcomes or bypassing authoritative transitions.",
  },
  journalPresentationBreadth: {
    supported: false,
    reason: "The Journal intentionally discloses only authored allowlisted records; extra valid world records exercise state load but may remain hidden.",
  },
});

export const createWorstCaseFixtureMatrix = (baseEnvelope) => {
  requireV4Envelope(baseEnvelope);
  const shared = baseFixtureState(baseEnvelope);
  const battle = clone(shared);
  battle.state.screen = "battle";
  battle.state.storyId = "black-mile-wake";
  battle.state.ending = null;
  battle.state.inventoryReturnScreen = null;
  battle.state.journalReturnScreen = null;
  battle.state.run.battle = {
    encounterId: "black-mile-wake",
    variantId: "bone-procession",
    round: 10,
    seed: 0x62617474,
    enemies: ENEMY_FIXTURES.map((definition) =>
      combatantFrom(battle.state.run.player, definition),
    ),
    allies: ALLY_FIXTURES.map((definition) =>
      combatantFrom(battle.state.run.player, definition),
    ),
    log: witnessLog(),
    outcome: null,
    nextWoundId: 10_000,
    advancementState: { usedExpressions: [] },
  };

  const inventory = clone(shared);
  inventory.state.screen = "inventory";
  inventory.state.storyId = "saint-orra-aftermath";
  inventory.state.ending = null;
  inventory.state.inventoryReturnScreen = "story";
  inventory.state.journalReturnScreen = null;
  inventory.state.run.battle = null;

  const journal = clone(shared);
  journal.state.screen = "journal";
  journal.state.storyId = "saint-orra-aftermath";
  journal.state.ending = null;
  journal.state.inventoryReturnScreen = null;
  journal.state.journalReturnScreen = "story";
  journal.state.run.battle = null;

  const stats = clone(shared);
  stats.state.screen = "story";
  stats.state.storyId = "saint-orra-aftermath";
  stats.state.ending = null;
  stats.state.inventoryReturnScreen = null;
  stats.state.journalReturnScreen = null;
  stats.state.run.battle = null;

  return [
    { id: "battle-witness", surface: "battle", envelope: battle, manifest: dimensionManifest },
    { id: "inventory-shop", surface: "inventory", envelope: inventory, manifest: dimensionManifest },
    { id: "journal-world", surface: "journal", envelope: journal, manifest: dimensionManifest },
    { id: "stats-tree", surface: "stats", envelope: stats, manifest: dimensionManifest },
  ];
};

