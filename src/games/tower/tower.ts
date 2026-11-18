import { randBall, randInt } from '../../lib/bingo';

/**
 * Ball Tower maths.
 * Every row is one of four types. A row with `balls` sealed balls and `blockers` blockers is
 * survived with chance (balls - blockers) / balls, so its fair step is the inverse of that.
 * The payout after clearing rows is RTP × (product of the fair steps), so the house keeps the
 * same 4% edge whether you cash out after 1 row or 20, and the player always gets 96%.
 */
export const RTP = 0.96;
/** The climb banks itself at this multiplier, or after MAX_ROWS rows. */
export const MAX_MULT = 1000;
export const MAX_ROWS = 30;

export interface RowType {
  id: 'easy' | 'normal' | 'hard' | 'extreme';
  label: string;
  balls: number;
  blockers: number;
  /** How often this type is dealt, out of 100. */
  weight: number;
}

export const ROW_TYPES: readonly RowType[] = [
  { id: 'easy', label: 'Easy', balls: 4, blockers: 1, weight: 30 },
  { id: 'normal', label: 'Normal', balls: 3, blockers: 1, weight: 40 },
  { id: 'hard', label: 'Hard', balls: 2, blockers: 1, weight: 22 },
  { id: 'extreme', label: 'Extreme', balls: 3, blockers: 2, weight: 8 },
];

export const safeChance = (t: RowType): number => (t.balls - t.blockers) / t.balls;
export const fairStep = (t: RowType): number => 1 / safeChance(t);

export interface Row {
  type: RowType;
  /** Which columns hold a blocker. */
  blockers: number[];
  /** Number painted on each ball. */
  numbers: number[];
}

function pickType(): RowType {
  let r = randInt(100);
  for (const t of ROW_TYPES) {
    if (r < t.weight) return t;
    r -= t.weight;
  }
  return ROW_TYPES[1]!;
}

export function newRow(): Row {
  const type = pickType();
  const cols = Array.from({ length: type.balls }, (_, i) => i);
  const blockers: number[] = [];
  for (let k = 0; k < type.blockers; k++) blockers.push(cols.splice(randInt(cols.length), 1)[0]!);
  return { type, blockers, numbers: Array.from({ length: type.balls }, randBall) };
}

/** Payout multiplier after clearing the first `cleared` rows (1× before any). */
export function towerMult(rows: readonly Row[], cleared: number): number {
  if (cleared <= 0) return 1;
  let fair = 1;
  for (let i = 0; i < cleared; i++) fair *= fairStep(rows[i]!.type);
  return Math.floor(RTP * fair * 100) / 100;
}
