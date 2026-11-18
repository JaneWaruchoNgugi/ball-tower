import type { Letter } from '../../lib/bingo';
import { letterOf } from '../../lib/bingo';

const RTP = 0.97;
/** The run banks itself after this many hits. */
export const MAX_HITS = 15;

/** Chance one ball lands in your colours: each colour is 15 of 75 balls. */
export const hitChance = (colours: number): number => colours / 5;

/** Multiplier after `hits` balls in a row landed in your colours. */
export function streakMult(colours: number, hits: number): number {
  if (hits <= 0) return 1;
  return Math.floor(RTP * (1 / hitChance(colours)) ** hits * 100) / 100;
}

export const isHit = (ball: number, colours: readonly Letter[]): boolean => colours.includes(letterOf(ball));
