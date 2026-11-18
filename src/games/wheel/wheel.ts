import { type Letter, letterOf } from '../../lib/bingo';

export const SEGMENTS = 75;
export const SEG_DEG = 360 / SEGMENTS;
/** A colour covers 15 of 75 numbers (1 in 5). */
export const COLOUR_PAYS = 4.85;
/** One exact number is 1 in 75. */
export const NUMBER_PAYS = 72;

export type WheelBet = { kind: 'colour'; pick: Letter } | { kind: 'number'; pick: number };

export function wheelWins(bet: WheelBet, ball: number): boolean {
  return bet.kind === 'colour' ? letterOf(ball) === bet.pick : ball === bet.pick;
}

export const wheelPays = (bet: WheelBet): number => (bet.kind === 'colour' ? COLOUR_PAYS : NUMBER_PAYS);

/**
 * Wheel rotation (degrees, clockwise) that brings `ball` under the top pointer,
 * spinning at least `turns` full turns past the current rotation. `jitter` is -1..1.
 */
export function rotationFor(ball: number, current: number, turns = 6, jitter = 0): number {
  const centre = (ball - 0.5) * SEG_DEG + jitter * SEG_DEG * 0.35;
  const target = (((-centre - current) % 360) + 360) % 360;
  return current + turns * 360 + target;
}
