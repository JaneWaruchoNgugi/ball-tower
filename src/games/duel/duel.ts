import { LETTERS, randInt } from '../../lib/bingo';

/** Each side bet's payout. You/House are 50/50; Blowout is 1 in 21. */
export const DUEL_PAYS = { you: 1.94, house: 1.94, blowout: 20 } as const;
export type DuelBet = keyof typeof DUEL_PAYS;

export interface Deal {
  /** Your line: one number from each of B, I, N, G, O. */
  you: number[];
  house: number[];
  /** The full draw order (all 75 balls, shuffled). */
  order: number[];
}

/** Two lines that share no number, one ball per column, plus a shuffled draw. */
export function deal(): Deal {
  const you: number[] = [];
  const house: number[] = [];
  LETTERS.forEach((_, col) => {
    const a = randInt(15);
    let b = randInt(14);
    if (b >= a) b++;
    you.push(col * 15 + a + 1);
    house.push(col * 15 + b + 1);
  });
  const order = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { you, house, order };
}

export interface DuelResult {
  winner: 'you' | 'house';
  /** How many balls were drawn. */
  drawn: number;
  /** Numbers the loser had marked when the winner finished. */
  loserMarked: number;
}

export function playOut(d: Deal): DuelResult {
  const ys = new Set(d.you);
  const hs = new Set(d.house);
  let y = 0;
  let h = 0;
  for (let i = 0; i < d.order.length; i++) {
    const n = d.order[i]!;
    if (ys.has(n)) y++;
    if (hs.has(n)) h++;
    if (y === 5) return { winner: 'you', drawn: i + 1, loserMarked: h };
    if (h === 5) return { winner: 'house', drawn: i + 1, loserMarked: y };
  }
  throw new Error('unreachable');
}

export function duelWins(bet: DuelBet, r: DuelResult): boolean {
  if (bet === 'blowout') return r.loserMarked <= 1;
  return bet === r.winner;
}
