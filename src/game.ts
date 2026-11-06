/**
 * Orbital Research rules, kept free of the DOM so they are easy to read.
 *
 * Research data is the currency: launching a probe collects it and upgrades
 * are bought by spending it. Equipment improves launches; studied celestial
 * bodies produce data on their own.
 */

export type UpgradeEffect =
  | "launchAdd"
  | "launchMul"
  | "researchAdd"
  | "researchMul";

export type UpgradeCategory = "equipment" | "celestial";

export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: UpgradeCategory;
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
  /** Whole units of research data, the only value the player spends. */
  count: number;
  /** Fractional passive data not yet worth a whole unit. */
  pending: number;
  /** Purchased level per upgrade id. Missing means level 0. */
  levels: Record<string, number>;
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: "booster",
    name: "Signal Booster",
    description: "+1 data per launch",
    category: "equipment",
    baseCost: 10,
    growth: 1.45,
    effect: "launchAdd",
    amount: 1,
  },
  {
    id: "thruster",
    name: "Ion Thruster",
    description: "Doubles launch yield",
    category: "equipment",
    baseCost: 150,
    growth: 5,
    effect: "launchMul",
    amount: 2,
    maxLevel: 4,
  },
  {
    id: "telescope",
    name: "Orbital Telescope",
    description: "+5 data per second",
    category: "equipment",
    baseCost: 250,
    growth: 1.55,
    effect: "researchAdd",
    amount: 5,
  },
  {
    id: "luna",
    name: "Luna",
    description: "+1 data per second",
    category: "celestial",
    baseCost: 20,
    growth: 1.5,
    effect: "researchAdd",
    amount: 1,
  },
  {
    id: "mars",
    name: "Mars",
    description: "+10 data per second",
    category: "celestial",
    baseCost: 400,
    growth: 1.6,
    effect: "researchAdd",
    amount: 10,
  },
  {
    id: "sol",
    name: "Sol",
    description: "Doubles passive research",
    category: "celestial",
    baseCost: 600,
    growth: 5,
    effect: "researchMul",
    amount: 2,
    maxLevel: 4,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    description: "+100 data per second",
    category: "celestial",
    baseCost: 5000,
    growth: 1.7,
    effect: "researchAdd",
    amount: 100,
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

export function launchPower(state: GameState): number {
  let power = 1;
  let multiplier = 1;
  for (const def of UPGRADES) {
    const level = levelOf(state, def.id);
    if (level === 0) continue;
    if (def.effect === "launchAdd") power += def.amount * level;
    if (def.effect === "launchMul") multiplier *= def.amount ** level;
  }
  return power * multiplier;
}

export function researchPerSecond(state: GameState): number {
  let rate = 0;
  let multiplier = 1;
  for (const def of UPGRADES) {
    const level = levelOf(state, def.id);
    if (level === 0) continue;
    if (def.effect === "researchAdd") rate += def.amount * level;
    if (def.effect === "researchMul") multiplier *= def.amount ** level;
  }
  return rate * multiplier;
}

/** Spends data on one level of an upgrade. Returns false if it can't. */
export function buy(state: GameState, def: UpgradeDef): boolean {
  const level = levelOf(state, def.id);
  if (isMaxed(def, level)) return false;

  const cost = costOf(def, level);
  if (state.count < cost) return false;

  state.count -= cost;
  state.levels[def.id] = level + 1;
  return true;
}

/** Launches a probe. Returns the amount of data gained. */
export function launch(state: GameState): number {
  const gain = launchPower(state);
  state.count += gain;
  return gain;
}

/** Adds passive research for a slice of time, in whole units only. */
export function tick(state: GameState, seconds: number): void {
  state.pending += researchPerSecond(state) * seconds;
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
