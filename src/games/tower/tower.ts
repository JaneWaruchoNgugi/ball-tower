import { randBall, randInt } from '../../lib/bingo';

export const ROWS = 10;
export const COLS = 3;
/** 2 of 3 balls in each row are safe, so each step survives 2/3 of the time. */
const STEP = 1.5;
const RTP = 0.97;

/** Payout multiplier after clearing `level` rows (level 0 = nothing yet). */
export const towerMult = (level: number): number => (level <= 0 ? 1 : Math.floor(RTP * STEP ** level * 100) / 100);

export interface TowerLayout {
  /** Column of the blocker ball in each row, bottom row first. */
  blockers: number[];
  /** Number shown on each ball, row by row. */
  numbers: number[][];
}

export function newTower(): TowerLayout {
  return {
    blockers: Array.from({ length: ROWS }, () => randInt(COLS)),
    numbers: Array.from({ length: ROWS }, () => Array.from({ length: COLS }, randBall)),
  };
}
