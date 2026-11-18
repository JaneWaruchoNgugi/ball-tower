import { LETTERS, type Letter, randInt } from '../../lib/bingo';

/** A 45-ball wheel: 9 numbers per colour, so every segment is wide enough to read. */
export const SEGMENTS = 45;
export const PER_COLOUR = SEGMENTS / 5;
export const SEG_DEG = 360 / SEGMENTS;
/** A colour covers 9 of 45 numbers (1 in 5). */
export const COLOUR_PAYS = 4.85;
/** One exact number is 1 in 45. */
export const NUMBER_PAYS = 43;

/** Colour group of a wheel number: B 1–9, I 10–18, N 19–27, G 28–36, O 37–45. */
export const wheelLetter = (n: number): Letter => LETTERS[Math.min(4, Math.floor((n - 1) / PER_COLOUR))] ?? 'B';

export const WHEEL_RANGE: Record<Letter, readonly [number, number]> = { B: [1, 9], I: [10, 18], N: [19, 27], G: [28, 36], O: [37, 45] };

export const spinNumber = (): number => randInt(SEGMENTS) + 1;

export type WheelBet = { kind: 'colour'; pick: Letter } | { kind: 'number'; pick: number };

export function wheelWins(bet: WheelBet, n: number): boolean {
  return bet.kind === 'colour' ? wheelLetter(n) === bet.pick : n === bet.pick;
}

export const wheelPays = (bet: WheelBet): number => (bet.kind === 'colour' ? COLOUR_PAYS : NUMBER_PAYS);

/**
 * Wheel rotation (degrees, clockwise) that brings number `n` under the top pointer,
 * spinning at least `turns` full turns past the current rotation. `jitter` is -1..1.
 */
export function rotationFor(n: number, current: number, turns = 6, jitter = 0): number {
  const centre = (n - 0.5) * SEG_DEG + jitter * SEG_DEG * 0.35;
  const target = (((-centre - current) % 360) + 360) % 360;
  return current + turns * 360 + target;
}
