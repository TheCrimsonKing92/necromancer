import type {
  DevelopmentActionIntent,
  DevelopmentActionPrototype,
  DevelopmentActionTarget,
  DevelopmentActionTransition,
} from "../../development-action-proof";

export type BreachYardCellId =
  | "west-gate"
  | "timber-stack"
  | "upper-walk"
  | "broken-arch"
  | "shoring-line"
  | "culvert"
  | "mason-post"
  | "east-road";

export type EnemyId = "coalition-cutter" | "coalition-bow";
type ServantOrder = "follow" | "harry" | "guard";
type ServantTargetId = "player" | "halwen" | "mason" | "shoring-line" | EnemyId;

interface EnemyState {
  readonly id: EnemyId;
  readonly name: string;
  readonly position: BreachYardCellId;
  readonly health: number;
  readonly maxHealth: number;
  readonly objective: "break-shoring" | "kill-mason";
}

export interface BreachYardState {
  readonly round: number;
  readonly seed: number;
  readonly playerPosition: BreachYardCellId;
  readonly playerHealth: number;
  readonly playerMaxHealth: number;
  readonly playerWard: number;
  readonly playerSpirit: number;
  readonly leftArmCondition: number;
  readonly wounds: readonly string[];
  readonly bindings: number;
  readonly tallow: number;
  readonly surveyTokens: number;
  readonly surveyedEnemies: readonly EnemyId[];
  readonly servantPosition: BreachYardCellId;
  readonly servantHealth: number;
  readonly servantOrder: ServantOrder;
  readonly servantTargetId: ServantTargetId;
  readonly shadePosition: BreachYardCellId | null;
  readonly shadeRounds: number;
  readonly fallenScout: "available" | "raised" | "rendered";
  readonly halwenPosition: BreachYardCellId;
  readonly halwenHealth: number;
  readonly halwenStanding: number;
  readonly masonPosition: BreachYardCellId;
  readonly masonHealth: number;
  readonly masonAlive: boolean;
  readonly shoring: number;
  readonly enemies: readonly EnemyState[];
  readonly eventLog: readonly string[];
  readonly resolved: "secured" | "withdrawn" | "failed" | null;
}

export interface BreachYardCellProjection {
  readonly id: BreachYardCellId;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly terrain: "open" | "cover" | "elevated" | "hazard" | "objective";
  readonly adjacent: boolean;
  readonly occupants: readonly {
    readonly id: string;
    readonly visualId?: string;
    readonly label: string;
    readonly tone: string;
    readonly currentHealth?: number;
    readonly maxHealth?: number;
    readonly poseId?: string;
    readonly intent?: string;
    readonly subjectDetail?: string;
  }[];
}

export interface BreachYardActionProjection {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly cost?: string;
  readonly available: boolean;
  readonly reason?: string;
  readonly targets?: readonly DevelopmentActionTarget[];
  readonly presentation: {
    readonly scope: "persistent" | "contextual";
    readonly subjectId?: string;
    readonly capability: string;
    readonly prospect: "Assured" | "Favorable" | "Uncertain";
    readonly time: "Free direction" | "One exchange" | "Ends the proof";
    readonly knownRisk?: string;
  };
}

export interface BreachYardProjection {
  readonly title: string;
  readonly summary: string;
  readonly round: number;
  readonly resolved: BreachYardState["resolved"];
  readonly player: {
    readonly health: string;
    readonly ward: number;
    readonly spirit: number;
    readonly wound: string;
    readonly resources: string;
  };
  readonly stakes: readonly string[];
  readonly cells: readonly BreachYardCellProjection[];
  readonly actions: readonly BreachYardActionProjection[];
  readonly enemyIntents: readonly string[];
  readonly eventLog: readonly string[];
}

const CELLS: Readonly<Record<BreachYardCellId, Omit<BreachYardCellProjection, "adjacent" | "occupants"> & { readonly neighbors: readonly BreachYardCellId[] }>> = {
  "west-gate": { id: "west-gate", label: "West gate", x: 11, y: 58, terrain: "open", neighbors: ["timber-stack", "broken-arch"] },
  "timber-stack": { id: "timber-stack", label: "Timber stacks", x: 23, y: 76, terrain: "cover", neighbors: ["west-gate", "broken-arch", "culvert"] },
  "upper-walk": { id: "upper-walk", label: "Upper walk", x: 43, y: 18, terrain: "elevated", neighbors: ["broken-arch", "mason-post"] },
  "broken-arch": { id: "broken-arch", label: "Broken arch", x: 39, y: 51, terrain: "hazard", neighbors: ["west-gate", "timber-stack", "upper-walk", "shoring-line"] },
  "shoring-line": { id: "shoring-line", label: "Shoring line", x: 58, y: 51, terrain: "objective", neighbors: ["broken-arch", "culvert", "mason-post"] },
  culvert: { id: "culvert", label: "Dry culvert", x: 48, y: 78, terrain: "cover", neighbors: ["timber-stack", "shoring-line", "east-road"] },
  "mason-post": { id: "mason-post", label: "Mason's post", x: 76, y: 41, terrain: "objective", neighbors: ["upper-walk", "shoring-line", "east-road"] },
  "east-road": { id: "east-road", label: "Eastern road", x: 86, y: 70, terrain: "open", neighbors: ["culvert", "mason-post"] },
};

const initialState = (): BreachYardState => ({
  round: 1,
  seed: 0x51e9,
  playerPosition: "west-gate",
  playerHealth: 26,
  playerMaxHealth: 26,
  playerWard: 2,
  playerSpirit: 5,
  leftArmCondition: 9,
  wounds: [],
  bindings: 1,
  tallow: 0,
  surveyTokens: 0,
  surveyedEnemies: [],
  servantPosition: "timber-stack",
  servantHealth: 16,
  servantOrder: "follow",
  servantTargetId: "player",
  shadePosition: null,
  shadeRounds: 0,
  fallenScout: "available",
  halwenPosition: "shoring-line",
  halwenHealth: 18,
  halwenStanding: 0,
  masonPosition: "mason-post",
  masonHealth: 6,
  masonAlive: true,
  shoring: 3,
  enemies: [
    { id: "coalition-cutter", name: "Coalition cutter", position: "east-road", health: 12, maxHealth: 12, objective: "break-shoring" },
    { id: "coalition-bow", name: "Coalition bow", position: "upper-walk", health: 9, maxHealth: 9, objective: "kill-mason" },
  ],
  eventLog: [
    "Halwen points out the two cutters entering the yard. ‘Keep Toman alive. Keep one shore standing. Then choose whose road this becomes.’",
  ],
  resolved: null,
});

const adjacent = (from: BreachYardCellId, to: BreachYardCellId): boolean =>
  CELLS[from].neighbors.includes(to);
const withinReach = (from: BreachYardCellId, to: BreachYardCellId): boolean =>
  from === to || adjacent(from, to);

const nextSeed = (seed: number): number => (Math.imul(seed, 1664525) + 1013904223) >>> 0;
const roll = (seed: number): number => nextSeed(seed) % 100;
const append = (state: BreachYardState, ...lines: string[]): BreachYardState => ({
  ...state,
  eventLog: [...state.eventLog, ...lines].slice(-7),
});

const enemyAt = (state: BreachYardState, cell: BreachYardCellId): EnemyState | undefined =>
  state.enemies.find((enemy) => enemy.health > 0 && enemy.position === cell);

const pathStep = (from: BreachYardCellId, to: BreachYardCellId): BreachYardCellId => {
  if (adjacent(from, to)) return to;
  const routes: Record<BreachYardCellId, Partial<Record<BreachYardCellId, BreachYardCellId>>> = {
    "west-gate": { "shoring-line": "broken-arch", "mason-post": "broken-arch", "east-road": "timber-stack", "upper-walk": "broken-arch", culvert: "timber-stack" },
    "timber-stack": { "shoring-line": "culvert", "mason-post": "culvert", "east-road": "culvert", "upper-walk": "broken-arch" },
    "upper-walk": { "shoring-line": "broken-arch", "east-road": "mason-post", culvert: "broken-arch", "west-gate": "broken-arch", "timber-stack": "broken-arch" },
    "broken-arch": { "mason-post": "shoring-line", "east-road": "shoring-line", culvert: "shoring-line" },
    "shoring-line": { "upper-walk": "broken-arch", "west-gate": "broken-arch", "timber-stack": "culvert", "east-road": "culvert" },
    culvert: { "upper-walk": "shoring-line", "west-gate": "timber-stack", "broken-arch": "shoring-line", "mason-post": "east-road" },
    "mason-post": { "west-gate": "shoring-line", "timber-stack": "shoring-line", culvert: "east-road", "broken-arch": "shoring-line" },
    "east-road": { "west-gate": "culvert", "timber-stack": "culvert", "upper-walk": "mason-post", "broken-arch": "culvert", "shoring-line": "culvert" },
  };
  return routes[from][to] ?? CELLS[from].neighbors[0] ?? from;
};

const cellDistance = (from: BreachYardCellId, to: BreachYardCellId): number => {
  if (from === to) return 0;
  const visited = new Set<BreachYardCellId>([from]);
  let frontier: BreachYardCellId[] = [from];
  for (let distance = 1; frontier.length; distance += 1) {
    const next: BreachYardCellId[] = [];
    for (const cell of frontier) {
      for (const neighbor of CELLS[cell].neighbors) {
        if (neighbor === to) return distance;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return Number.MAX_SAFE_INTEGER;
};

const masonPhase = (state: BreachYardState): BreachYardState => {
  if (!state.masonAlive) return state;
  const hunters = state.enemies.filter(({ health, objective, position }) =>
    health > 0 && objective === "kill-mason" && withinReach(position, state.masonPosition));
  if (!hunters.length) return state;
  const friends = [
    state.playerPosition,
    ...(state.halwenHealth > 0 ? [state.halwenPosition] : []),
    ...(state.servantHealth > 0 ? [state.servantPosition] : []),
  ];
  const occupied = new Set(state.enemies.filter(({ health }) => health > 0).map(({ position }) => position));
  const destination = CELLS[state.masonPosition].neighbors
    .filter((candidate) => !occupied.has(candidate))
    .map((candidate) => {
      const nearestFriend = Math.min(...friends.map((position) => cellDistance(candidate, position)));
      const nearestHunter = Math.min(...hunters.map(({ position }) => cellDistance(candidate, position)));
      const joinsProtection = friends.includes(candidate) ? 25 : 0;
      const cover = CELLS[candidate].terrain === "cover" ? 5 : 0;
      return { candidate, score: (nearestHunter * 12) - (nearestFriend * 7) + joinsProtection + cover };
    })
    .sort((left, right) => right.score - left.score)[0]?.candidate;
  if (!destination) return state;
  const shelter = destination === state.halwenPosition
    ? "Halwen's line"
    : destination === state.playerPosition
      ? "your side"
      : destination === state.servantPosition
        ? "Ditch-Hand's reach"
        : CELLS[destination].label.toLowerCase();
  return append({ ...state, masonPosition: destination }, `Toman leaves the bow's line and runs toward ${shelter}.`);
};

const servantTargetCell = (state: BreachYardState): BreachYardCellId => {
  if (state.servantTargetId === "player") return state.playerPosition;
  if (state.servantTargetId === "halwen") return state.halwenPosition;
  if (state.servantTargetId === "mason") return state.masonPosition;
  if (state.servantTargetId === "shoring-line") return "shoring-line";
  return state.enemies.find(({ id }) => id === state.servantTargetId)?.position
    ?? state.playerPosition;
};

const servantDirectionSummary = (state: BreachYardState): string => {
  if (state.servantOrder === "follow") return "It follows your movement from exchange to exchange.";
  if (state.servantOrder === "guard") {
    const guarded = state.servantTargetId === "halwen"
      ? "Halwen's line"
      : state.servantTargetId === "mason"
        ? "Toman's retreat"
        : "the remaining shores";
    return `It is moving to guard ${guarded}.`;
  }
  const quarry = state.enemies.find(({ id }) => id === state.servantTargetId)?.name.toLowerCase() ?? "the nearest cutter";
  return `It is closing on ${quarry}.`;
};

const takeHit = (state: BreachYardState, damage: number, source: string): BreachYardState => {
  const absorbed = Math.min(state.playerWard, damage);
  const suffered = damage - absorbed;
  const condition = Math.max(0, state.leftArmCondition - suffered);
  const wound = suffered >= 4 && !state.wounds.includes("split left forearm")
    ? "split left forearm"
    : undefined;
  return append({
    ...state,
    playerWard: state.playerWard - absorbed,
    playerHealth: Math.max(0, state.playerHealth - suffered),
    leftArmCondition: condition,
    wounds: wound ? [...state.wounds, wound] : state.wounds,
  }, absorbed === damage
    ? `${source}; ${absorbed} Ward turns the blow before it reaches you.`
    : `${source}; ${absorbed > 0 ? `${absorbed} Ward breaks and ` : ""}${suffered} damage reaches your left arm${wound ? ", opening the forearm" : ""}.`);
};

const pursueEnemyObjective = (
  state: BreachYardState,
  enemy: EnemyState,
  target: BreachYardCellId,
): { readonly state: BreachYardState; readonly enemy: EnemyState } => {
  if (enemy.position !== target) {
    return {
      enemy: { ...enemy, position: pathStep(enemy.position, target) },
      state: append(state, `${enemy.name} moves toward ${CELLS[target].label.toLowerCase()}.`),
    };
  }
  if (enemy.objective === "break-shoring") {
    const shoring = Math.max(0, state.shoring - 1);
    return { enemy, state: append({ ...state, shoring }, `${enemy.name} severs a shore. ${shoring} remain.`) };
  }
  if (!state.masonAlive) return { state, enemy };
  const masonHealth = Math.max(0, state.masonHealth - 3);
  return {
    enemy,
    state: append({ ...state, masonHealth, masonAlive: masonHealth > 0 }, masonHealth > 0
      ? `${enemy.name}'s arrow catches Toman for 3 damage. He stays on his feet.`
      : `${enemy.name}'s second arrow takes Toman beneath the collar.`),
  };
};

const resolveRound = (input: BreachYardState): BreachYardState => {
  let state = input;
  let seed = state.seed;
  const enemies: EnemyState[] = [];
  for (const original of state.enemies) {
    let enemy = original;
    if (enemy.health <= 0) { enemies.push(enemy); continue; }
    const target = enemy.objective === "break-shoring" ? "shoring-line" : state.masonPosition;
    const playerIntercepts = withinReach(enemy.position, state.playerPosition);
    const servantIntercepts = state.servantOrder === "guard" && withinReach(enemy.position, state.servantPosition);
    const shadeIntercepts = state.shadePosition !== null && withinReach(enemy.position, state.shadePosition);
    if (playerIntercepts) {
      const interceptionRoll = roll(seed);
      seed = nextSeed(seed);
      if (interceptionRoll < 55) {
        state = takeHit(state, enemy.id === "coalition-cutter" ? 5 : 3, `${enemy.name} turns from the objective and strikes`);
      } else {
        ({ state, enemy } = pursueEnemyObjective(state, enemy, target));
      }
    } else if (servantIntercepts) {
      state = append({ ...state, servantHealth: Math.max(0, state.servantHealth - 4) }, `${enemy.name} hacks at Ditch-Hand instead of the work.`);
    } else if (shadeIntercepts) {
      state = append(state, `${enemy.name} spends the exchange driving the borrowed shade back.`);
    } else {
      ({ state, enemy } = pursueEnemyObjective(state, enemy, target));
    }
    enemies.push(enemy);
  }
  state = { ...state, enemies, seed };

  const liveEnemy = state.enemies.find((enemy) => enemy.health > 0 && withinReach(state.halwenPosition, enemy.position));
  if (liveEnemy) {
    const damage = 4;
    state = append({
      ...state,
      enemies: state.enemies.map((enemy) => enemy.id === liveEnemy.id ? { ...enemy, health: Math.max(0, enemy.health - damage) } : enemy),
    }, `Halwen holds the breach beside you, driving ${damage} damage into ${liveEnemy.name.toLowerCase()}.`);
  } else if (state.halwenPosition !== state.playerPosition) {
    state = { ...state, halwenPosition: pathStep(state.halwenPosition, state.playerPosition) };
  }

  state = masonPhase(state);

  if (state.servantOrder === "follow" && state.servantPosition !== state.playerPosition) {
    state = { ...state, servantPosition: pathStep(state.servantPosition, state.playerPosition) };
  } else if (state.servantOrder === "harry") {
    const target = state.enemies.find((enemy) => enemy.id === state.servantTargetId && enemy.health > 0)
      ?? state.enemies.find((enemy) => enemy.health > 0);
    if (target && withinReach(state.servantPosition, target.position)) {
      state = append({
        ...state,
        enemies: state.enemies.map((enemy) => enemy.id === target.id ? { ...enemy, health: Math.max(0, enemy.health - 3) } : enemy),
      }, `Ditch-Hand catches ${target.name.toLowerCase()} for 3 damage.`);
    } else if (target) state = { ...state, servantPosition: pathStep(state.servantPosition, target.position) };
  } else if (state.servantOrder === "guard") {
    const target = servantTargetCell(state);
    if (state.servantPosition !== target) {
      state = { ...state, servantPosition: pathStep(state.servantPosition, target) };
    }
  }

  if (state.shadePosition) {
    const target = state.enemies.find((enemy) => enemy.health > 0 && withinReach(state.shadePosition!, enemy.position));
    if (target) {
      state = append({
        ...state,
        enemies: state.enemies.map((enemy) => enemy.id === target.id ? { ...enemy, health: Math.max(0, enemy.health - 2) } : enemy),
      }, `The raised scout remembers enough violence to deal 2 damage to ${target.name.toLowerCase()}.`);
    }
    state = { ...state, shadeRounds: state.shadeRounds - 1 };
    if (state.shadeRounds <= 0) state = append({ ...state, shadePosition: null }, "The borrowed scout comes apart in the rain.");
  }

  const defeated = state.enemies.filter((enemy) => enemy.health <= 0);
  if (defeated.length === state.enemies.length) {
    return append({ ...state, resolved: "secured", halwenStanding: state.masonAlive ? 2 : 1 }, state.masonAlive
      ? "Halwen lowers his blade. Toman lives, and the remaining shores hold."
      : "The cutters are dead. Halwen looks once toward Toman before ordering the yard secured.");
  }
  if (state.playerHealth <= 0 || state.shoring <= 0 || !state.masonAlive) {
    return append({ ...state, resolved: "failed", halwenStanding: state.playerHealth <= 0 ? 0 : -1 }, state.shoring <= 0
      ? "The last shore parts. Stone and winter water take the yard."
      : "The rescue line breaks around its dead mason.");
  }
  return { ...state, round: state.round + 1 };
};

const strike = (state: BreachYardState, targetId?: string): DevelopmentActionTransition<BreachYardState> => {
  const target = state.enemies.find((enemy) => enemy.id === targetId && enemy.health > 0 && withinReach(state.playerPosition, enemy.position));
  if (!target) return { state, error: "No enemy is within reach." };
  const damage = 6;
  const next = append({
    ...state,
    enemies: state.enemies.map((enemy) => enemy.id === target.id ? { ...enemy, health: Math.max(0, enemy.health - damage) } : enemy),
  }, `Your hooked knife opens ${target.name.toLowerCase()} for ${damage} damage.`);
  return { state: resolveRound(next) };
};

const act = (state: BreachYardState, actionId: string, targetId?: string): DevelopmentActionTransition<BreachYardState> => {
  if (actionId === "strike") return strike(state, targetId);
  if (actionId === "raise-scout") {
    if (state.playerPosition !== "timber-stack" || state.fallenScout !== "available" || state.playerSpirit < 2) return { state, error: "The scout cannot be raised here." };
    return { state: resolveRound(append({ ...state, fallenScout: "raised", playerSpirit: state.playerSpirit - 2, shadePosition: "timber-stack", shadeRounds: 4 }, "You call the scout into the shape left in his cooling limbs. Four exchanges remain.")) };
  }
  if (actionId === "render-scout") {
    if (state.playerPosition !== "timber-stack" || state.fallenScout !== "available") return { state, error: "Nothing here can be rendered." };
    return { state: resolveRound(append({ ...state, fallenScout: "rendered", tallow: state.tallow + 1 }, "Salt and the narrow knife yield one measure of mortuary tallow.")) };
  }
  if (actionId === "bind-wound") {
    if (state.wounds.length === 0 || state.bindings < 1) return { state, error: "No bindable wound is ready." };
    return { state: resolveRound(append({ ...state, bindings: state.bindings - 1, wounds: [], playerHealth: Math.min(state.playerMaxHealth, state.playerHealth + 3) }, "You close the split flesh well enough to keep the arm in service.")) };
  }
  if (actionId === "repair-shore") {
    if (state.playerPosition !== "shoring-line" || state.tallow < 1) return { state, error: "Mortuary tallow and access to the shore are required." };
    return { state: resolveRound(append({ ...state, tallow: state.tallow - 1, shoring: Math.min(3, state.shoring + 1) }, "Mortuary tallow takes the timber's shaking joints. One shore holds again.")) };
  }
  if (actionId === "direct-servant") {
    if (!targetId) return { state, error: "Choose where Ditch-Hand should put its weight." };
    const target = targetId as ServantTargetId;
    const livingEnemy = state.enemies.some(({ id, health }) => id === target && health > 0);
    const order: ServantOrder | undefined = target === "player"
      ? "follow"
      : target === "halwen" || target === "mason" || target === "shoring-line"
        ? "guard"
        : livingEnemy
          ? "harry"
          : undefined;
    if (!order) return { state, error: "That assignment is no longer present in the yard." };
    const label = target === "player"
      ? "your side"
      : target === "halwen"
        ? "Halwen's line"
        : target === "mason"
          ? "Toman"
          : target === "shoring-line"
            ? "the remaining shores"
            : state.enemies.find(({ id }) => id === target)?.name.toLowerCase() ?? "the cutter";
    return { state: append({ ...state, servantOrder: order, servantTargetId: target }, `Ditch-Hand turns toward ${label} and will ${order} until redirected.`) };
  }
  if (actionId === "order-follow" || actionId === "order-harry" || actionId === "order-guard") {
    const order = actionId.slice(6) as ServantOrder;
    return { state: append({ ...state, servantOrder: order, servantTargetId: order === "follow" ? "player" : state.servantTargetId }, `Ditch-Hand will ${order} until told otherwise.`) };
  }
  if (actionId === "take-survey" || actionId.startsWith("take-survey:")) {
    const requestedId = actionId.includes(":") ? actionId.split(":")[1] as EnemyId : undefined;
    const dead = state.enemies.find((enemy) => (!requestedId || enemy.id === requestedId)
      && enemy.health <= 0
      && enemy.position === state.playerPosition
      && !state.surveyedEnemies.includes(enemy.id));
    if (!dead) return { state, error: "No fallen cutter lies here." };
    return { state: resolveRound(append({
      ...state,
      surveyTokens: state.surveyTokens + 1,
      surveyedEnemies: [...state.surveyedEnemies, dead.id],
    }, "A waxed survey strip comes free of the dead cutter's coat.")) };
  }
  if (actionId === "withdraw") {
    if (state.playerPosition !== "west-gate") return { state, error: "The western gate is the only clear withdrawal." };
    return { state: append({ ...state, resolved: "withdrawn", halwenStanding: -1 }, "You leave Halwen and Toman to the yard. The cutters keep moving.") };
  }
  return { state, error: "That action is not available." };
};

const actionProjection = (state: BreachYardState): BreachYardActionProjection[] => {
  const adjacentEnemies = state.enemies.filter((enemy) => enemy.health > 0 && withinReach(state.playerPosition, enemy.position));
  const unsurveyedDeadHere = state.enemies.filter((enemy) => enemy.health <= 0
    && enemy.position === state.playerPosition
    && !state.surveyedEnemies.includes(enemy.id));
  const presentation = (
    scope: "persistent" | "contextual",
    capability: string,
    prospect: "Assured" | "Favorable" | "Uncertain",
    time: "Free direction" | "One exchange" | "Ends the proof",
    subjectId?: string,
    knownRisk?: string,
  ): BreachYardActionProjection["presentation"] => ({ scope, subjectId, capability, prospect, time, knownRisk });
  return [
    {
      id: "strike",
      label: "Strike",
      detail: "Commit the hooked knife against an enemy in an adjacent position.",
      available: adjacentEnemies.length > 0,
      reason: "No enemy is within reach.",
      presentation: presentation("persistent", "Hooked knife · Dexterity", "Favorable", "One exchange", undefined, "The cutters answer after the blow."),
      targets: adjacentEnemies.map((enemy) => ({
        id: enemy.id,
        label: enemy.name,
        detail: `6 physical damage · ${enemy.health} of ${enemy.maxHealth} Health`,
        currentHealth: enemy.health,
        maxHealth: enemy.maxHealth,
      })),
    },
    {
      id: "direct-servant",
      label: "Direct Ditch-Hand",
      detail: "Choose a person, threat, or work for the servant to follow, harry, or guard.",
      available: state.servantHealth > 0,
      reason: "Ditch-Hand can no longer answer direction.",
      presentation: presentation("persistent", "Bonebinder direction", "Assured", "Free direction"),
      targets: [
        { id: "player", label: "Your side", detail: "Follow your movement from exchange to exchange." },
        ...(state.halwenHealth > 0 ? [{ id: "halwen", label: "Halwen Sar", detail: "Reach Halwen and draw attacks from his line." }] : []),
        ...(state.masonAlive ? [{ id: "mason", label: "Toman Rusk", detail: "Reach Toman and draw attacks from his retreat." }] : []),
        { id: "shoring-line", label: "The remaining shores", detail: "Take position where cutters must pass to reach the work." },
        ...state.enemies.filter(({ health }) => health > 0).map((enemy) => ({ id: enemy.id, label: enemy.name, detail: "Close on this cutter and attack when able.", currentHealth: enemy.health, maxHealth: enemy.maxHealth })),
      ],
    },
    {
      id: "raise-scout",
      label: "Raise the fallen scout",
      detail: "Return him for four exchanges as a short-lived ally.",
      cost: "2 Spirit",
      available: state.playerPosition === "timber-stack" && state.fallenScout === "available" && state.playerSpirit >= 2,
      reason: "Reach the timber stacks with 2 Spirit while the body remains.",
      presentation: presentation("contextual", "Bonebinding · Willpower", "Assured", "One exchange", "corpse", "The cutters act while the scout rises."),
    },
    {
      id: "render-scout",
      label: "Render the fallen scout",
      detail: "Process the body into one measure of mortuary tallow.",
      available: state.playerPosition === "timber-stack" && state.fallenScout === "available",
      reason: "Reach the unspent body at the timber stacks.",
      presentation: presentation("contextual", "Renderer craft", "Assured", "One exchange", "corpse", "The cutters act while you work."),
    },
    {
      id: "repair-shore",
      label: "Bind a severed shore",
      detail: "Spend rendered tallow to restore one shoring line.",
      cost: "1 mortuary tallow",
      available: state.playerPosition === "shoring-line" && state.tallow > 0 && state.shoring < 3,
      reason: "Stand at damaged shoring with mortuary tallow.",
      presentation: presentation("contextual", "Mortuary repair", "Assured", "One exchange", "site:shoring-line", "The cutters act while you shore the work."),
    },
    {
      id: "bind-wound",
      label: "Dress the open arm",
      detail: "Consume clean linen, close the wound, and recover 3 Health.",
      cost: "1 clean binding",
      available: state.wounds.length > 0 && state.bindings > 0,
      reason: "No open wound and binding are both ready.",
      presentation: presentation("persistent", "Medicine", "Assured", "One exchange", "player", "The cutters act while you bind the arm."),
    },
    ...unsurveyedDeadHere.map((enemy): BreachYardActionProjection => ({
      id: `take-survey:${enemy.id}`,
      label: "Take the cutter's survey",
      detail: "Recover portable evidence from the fallen cutter at your feet.",
      available: true,
      presentation: presentation("contextual", "Search · Perception", "Assured", "One exchange", `fallen:${enemy.id}`, "The surviving cutters act while you search."),
    })),
    {
      id: "withdraw",
      label: "Leave through the west gate",
      detail: "Abandon the rescue line before it closes.",
      available: state.playerPosition === "west-gate",
      reason: "Return to the west gate.",
      presentation: presentation("contextual", "Movement", "Assured", "Ends the proof", "site:west-gate"),
    },
  ];
};

const project = (state: BreachYardState): BreachYardProjection => ({
  title: "The yard beneath the break",
  summary: "Coalition cutters have entered under the failing conduit. Move, intercept, or leave; every committed act gives them an exchange of their own.",
  round: state.round,
  resolved: state.resolved,
  player: {
    health: `${state.playerHealth} / ${state.playerMaxHealth}`,
    ward: state.playerWard,
    spirit: state.playerSpirit,
    wound: state.wounds.length ? state.wounds.join(", ") : "No open wound",
    resources: `${state.bindings} binding · ${state.tallow} tallow · ${state.surveyTokens} survey`,
  },
  stakes: [
    `${state.shoring} of 3 shores hold`,
    state.masonAlive ? `Toman ${state.masonHealth} / 6 Health at ${CELLS[state.masonPosition].label.toLowerCase()}` : "Toman is dead",
    `Halwen ${state.halwenHealth} Health · ${state.halwenStanding > 0 ? "trust earned" : state.halwenStanding < 0 ? "abandoned" : "watching your method"}`,
  ],
  cells: Object.values(CELLS).map(({ neighbors: _neighbors, ...cell }) => ({
    ...cell,
    adjacent: adjacent(state.playerPosition, cell.id),
    occupants: [
      ...(state.playerPosition === cell.id ? [{ id: "player", label: "You", tone: "player", subjectDetail: `${state.playerHealth} of ${state.playerMaxHealth} Health. ${state.wounds.length ? state.wounds.join(", ") : "No open wound"}.` }] : []),
      ...(state.servantPosition === cell.id && state.servantHealth > 0 ? [{ id: "servant", label: "Ditch-Hand", tone: "ally", currentHealth: state.servantHealth, maxHealth: 16, subjectDetail: servantDirectionSummary(state) }] : []),
      ...(state.shadePosition === cell.id ? [{ id: "shade", label: `Raised scout · ${state.shadeRounds}`, tone: "occult", subjectDetail: `${state.shadeRounds} exchanges remain before the borrowed shape fails.` }] : []),
      ...(state.halwenPosition === cell.id && state.halwenHealth > 0 ? [{ id: "halwen", label: "Halwen Sar", tone: "ally", currentHealth: state.halwenHealth, maxHealth: 18, subjectDetail: "He holds the yard with you and moves toward your line when no cutter is within reach." }] : []),
      ...(cell.id === state.masonPosition && state.masonAlive ? [{ id: "mason", label: "Toman Rusk", tone: "neutral", currentHealth: state.masonHealth, maxHealth: 6, subjectDetail: "The mason is trying to reach a living defender before the bow finds another shot." }] : []),
      ...(cell.id === "timber-stack" && state.fallenScout === "available" ? [{ id: "corpse", label: "Fallen scout", tone: "occult", subjectDetail: "A fresh coalition body lies among the timber stacks, still fit for immediate mortuary work." }] : []),
      ...state.enemies.filter((enemy) => enemy.position === cell.id).map((enemy) => enemy.health > 0
        ? {
            id: enemy.id,
            label: enemy.name,
            tone: "danger",
            currentHealth: enemy.health,
            maxHealth: enemy.maxHealth,
            intent: enemy.objective === "break-shoring" ? "closing on the shoring" : "hunting Toman from the height",
            subjectDetail: enemy.objective === "break-shoring"
              ? "The cutter is forcing a path toward the timber holding the conduit."
              : "The bow has chosen Toman and keeps seeking another clear shot.",
          }
        : {
            id: `fallen:${enemy.id}`,
            visualId: "corpse",
            label: `Fallen ${enemy.name.toLowerCase()}`,
            tone: "neutral",
            subjectDetail: state.surveyedEnemies.includes(enemy.id)
              ? "Its waxed survey has already been taken."
              : "A waxed survey strip remains inside the cutter's coat.",
          }),
    ],
  })),
  actions: state.resolved ? [] : actionProjection(state),
  enemyIntents: state.enemies.filter((enemy) => enemy.health > 0).map((enemy) => enemy.objective === "break-shoring"
    ? `${enemy.name}: closing on the shoring; its cleaver can sever one line.`
    : `${enemy.name}: pursuing Toman at ${CELLS[state.masonPosition].label.toLowerCase()}; elevation favors the bow.`),
  eventLog: state.eventLog,
});

const step = (state: BreachYardState, intent: DevelopmentActionIntent): DevelopmentActionTransition<BreachYardState> => {
  if (state.resolved) return { state, error: "The breach-yard proof has ended." };
  if (intent.kind === "act") return act(state, intent.actionId, intent.targetId);
  const destination = intent.destinationId as BreachYardCellId;
  if (!(destination in CELLS) || !adjacent(state.playerPosition, destination)) return { state, error: "That position cannot be reached in one exchange." };
  if (enemyAt(state, destination)) return { state, error: "An enemy holds that position." };
  return { state: resolveRound(append({ ...state, playerPosition: destination }, `You cross to ${CELLS[destination].label.toLowerCase()}.`)) };
};

export const SIEGE_SOVEREIGN_BREACH_YARD: DevelopmentActionPrototype<BreachYardState, BreachYardProjection> = {
  id: "siege-sovereign:breach-yard",
  createState: initialState,
  project,
  step,
};
