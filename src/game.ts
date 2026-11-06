/**
 * Counter game rules, kept free of the DOM so they are easy to read and test.
 *
 * The counter is the game's currency: tapping the main button adds to it and
 * upgrades are bought by spending it.
 */

export type UpgradeEffect =
  | "clickAdd"
  | "clickMul"
  | "passiveAdd"
  | "passiveMul";

export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Cost of the first level. */
  readonly baseCost: number;
  /** Each level costs this much more than the last. */
  readonly growth: number;
  readonly effect: UpgradeEffect;
  /** Added per level, or the multiplier for multiplicative upgrades. */
  readonly amount: number;
  readonly maxLevel?: number;
}

export interface GameState {
  /** Whole units of currency, the only value the player spends. */
  count: number;
  /** Fractional passive income not yet worth a whole unit. */
  pending: number;
  /** Purchased level per upgrade id. Missing means level 0. */
  levels: Record<string, number>;
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: "finger",
    name: "Extra Finger",
    description: "+1 per tap",
    baseCost: 10,
    growth: 1.45,
    effect: "clickAdd",
    amount: 1,
  },
  {
    id: "coffee",
    name: "Coffee Mug",
    description: "+1 per second",
    baseCost: 20,
    growth: 1.5,
    effect: "passiveAdd",
    amount: 1,
  },
  {
    id: "glove",
    name: "Golden Glove",
    description: "Doubles tap power",
    baseCost: 150,
    growth: 5,
    effect: "clickMul",
    amount: 2,
    maxLevel: 4,
  },
  {
    id: "server",
    name: "Server Rack",
    description: "+10 per second",
    baseCost: 400,
    growth: 1.6,
    effect: "passiveAdd",
    amount: 10,
  },
  {
    id: "overclock",
    name: "Overclock",
    description: "Doubles passive income",
    baseCost: 600,
    growth: 5,
    effect: "passiveMul",
    amount: 2,
    maxLevel: 4,
  },
];

export function createState(): GameState {
  return { count: 0, pending: 0, levels: {} };
}

export function levelOf(state: GameState, id: string): number {
  return state.levels[id] ?? 0;
}

export function isMaxed(def: UpgradeDef, level: number): boolean {
  return def.maxLevel !== undefined && level >= def.maxLevel;
}

/** Cost of the next level, given how many levels are already owned. */
export function costOf(def: UpgradeDef, level: number): number {
  return Math.floor(def.baseCost * def.growth ** level);
}

export function clickPower(state: GameState): number {
  let power = 1;
  for (const def of UPGRADES) {
    const level = levelOf(state, def.id);
    if (level === 0) continue;
    if (def.effect === "clickAdd") power += def.amount * level;
    if (def.effect === "clickMul") power *= def.amount ** level;
  }
  return power;
}

export function passivePerSecond(state: GameState): number {
  let rate = 0;
  for (const def of UPGRADES) {
    const level = levelOf(state, def.id);
    if (level === 0) continue;
    if (def.effect === "passiveAdd") rate += def.amount * level;
    if (def.effect === "passiveMul") rate *= def.amount ** level;
  }
  return rate;
}

/** Spends currency on one level of an upgrade. Returns false if it can't. */
export function buy(state: GameState, def: UpgradeDef): boolean {
  const level = levelOf(state, def.id);
  if (isMaxed(def, level)) return false;

  const cost = costOf(def, level);
  if (state.count < cost) return false;

  state.count -= cost;
  state.levels[def.id] = level + 1;
  return true;
}

/** Taps the main button. Returns the amount gained. */
export function tap(state: GameState): number {
  const gain = clickPower(state);
  state.count += gain;
  return gain;
}

/** Adds passive income for a slice of time, in whole units only. */
export function tick(state: GameState, seconds: number): void {
  state.pending += passivePerSecond(state) * seconds;
  const whole = Math.floor(state.pending);
  if (whole > 0) {
    state.count += whole;
    state.pending -= whole;
  }
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Short, readable numbers: 1, 999, 1.2K, 3.4M. */
export function formatNumber(value: number): string {
  const whole = Math.floor(value);
  return whole < 1000 ? whole.toLocaleString("en-US") : compact.format(whole);
}
