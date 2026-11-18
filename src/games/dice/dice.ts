import { randInt } from '../../lib/bingo';

export const MIN_TOTAL = 3; // 1 + 2
export const MAX_TOTAL = 149; // 74 + 75
const RTP = 0.97;
const PAIRS = (75 * 74) / 2;

/** How many unordered pairs of different balls 1–75 add up to each total. */
const WAYS: number[] = (() => {
  const w = new Array<number>(MAX_TOTAL + 1).fill(0);
  for (let a = 1; a <= 75; a++) for (let b = a + 1; b <= 75; b++) w[a + b]! += 1;
  return w;
})();

export type Side = 'over' | 'under';

/** Chance (0–1) that the two balls add up to more than (over) or less than (under) the target. */
export function diceChance(side: Side, target: number): number {
  let n = 0;
  for (let t = MIN_TOTAL; t <= MAX_TOTAL; t++) if (side === 'over' ? t > target : t < target) n += WAYS[t]!;
  return n / PAIRS;
}

export const diceMult = (chance: number): number => (chance <= 0 ? 0 : Math.floor((RTP / chance) * 100) / 100);

/** Draw two different balls. */
export function drawPair(): [number, number] {
  const a = randInt(75) + 1;
  let b = randInt(74) + 1;
  if (b >= a) b++;
  return [a, b];
}

/** The target (within limits) whose chance is closest to `p` for this side. */
export function targetFor(side: Side, p: number, min = 20, max = 132): number {
  let best = min;
  for (let t = min; t <= max; t++) if (Math.abs(diceChance(side, t) - p) < Math.abs(diceChance(side, best) - p)) best = t;
  return best;
}
