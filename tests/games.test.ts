import { describe, expect, it } from 'vitest';
import { diceChance, diceMult, drawPair } from '../src/games/dice/dice';
import { ROW_TYPES, newRow, safeChance, towerMult } from '../src/games/tower/tower';
import { COLOUR_PAYS, NUMBER_PAYS, SEG_DEG, rotationFor, wheelWins } from '../src/games/wheel/wheel';
import { letterOf } from '../src/lib/bingo';

describe('Ball Tower', () => {
  it('keeps the same 4% house edge whenever you cash out', () => {
    for (let trial = 0; trial < 50; trial++) {
      const rows = Array.from({ length: 12 }, newRow);
      let survive = 1;
      for (let k = 1; k <= 12; k++) {
        survive *= safeChance(rows[k - 1]!.type);
        const rtp = towerMult(rows, k) * survive;
        expect(rtp).toBeLessThanOrEqual(0.96 + 1e-9);
        expect(rtp).toBeGreaterThan(0.94);
      }
    }
  });
  it('deals rows with the right number of blockers', () => {
    for (let i = 0; i < 300; i++) {
      const r = newRow();
      expect(new Set(r.blockers).size).toBe(r.type.blockers);
      expect(r.numbers).toHaveLength(r.type.balls);
      r.blockers.forEach((c) => expect(c).toBeLessThan(r.type.balls));
    }
  });
  it('row weights add up to 100', () => {
    expect(ROW_TYPES.reduce((a, t) => a + t.weight, 0)).toBe(100);
  });
});

describe('Lucky Wheel 45', () => {
  it('pays under 100% on both bet types', () => {
    expect(COLOUR_PAYS / 5).toBeLessThan(1);
    expect(NUMBER_PAYS / 45).toBeLessThan(1);
  });
  it('lands the chosen ball under the pointer', () => {
    for (const ball of [1, 9, 28, 45]) {
      const r = rotationFor(ball, 123.4);
      const atTop = ((360 - (r % 360)) % 360) / SEG_DEG; // segment index under the pointer
      expect(Math.floor(atTop) + 1).toBe(ball);
      expect(r - 123.4).toBeGreaterThan(360 * 6 - 1);
    }
  });
  it('matches colour and number bets', () => {
    expect(wheelWins({ kind: 'colour', pick: 'G' }, 30)).toBe(true);
    expect(wheelWins({ kind: 'colour', pick: 'O' }, 37)).toBe(true);
    expect(wheelWins({ kind: 'colour', pick: 'G' }, 37)).toBe(false);
    expect(wheelWins({ kind: 'number', pick: 52 }, 53)).toBe(false);
    expect(letterOf(75)).toBe('O');
  });
});

describe('Bingo Dice', () => {
  it('has chances that sum to 1 around a target', () => {
    const t = 76;
    const all = diceChance('over', t) + diceChance('under', t) + 0;
    expect(all).toBeLessThanOrEqual(1);
    expect(diceChance('over', 2)).toBe(1);
    expect(diceChance('under', 150)).toBe(1);
  });
  it('is symmetric about 76', () => {
    expect(diceChance('over', 100)).toBeCloseTo(diceChance('under', 52), 10);
  });
  it('pays 97% of fair odds', () => {
    const p = diceChance('over', 100);
    expect(diceMult(p) * p).toBeLessThanOrEqual(0.97);
    expect(diceMult(p) * p).toBeGreaterThan(0.96);
  });
  it('draws two different balls', () => {
    for (let i = 0; i < 500; i++) {
      const [a, b] = drawPair();
      expect(a).not.toBe(b);
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(75);
    }
  });
});

import { DUEL_PAYS, deal, duelWins, playOut } from '../src/games/duel/duel';
import { isHit, streakMult } from '../src/games/streak/streak';

describe('Hot Streak', () => {
  it('pays about 97% for every risk level and length', () => {
    for (let k = 1; k <= 4; k++)
      for (let n = 1; n <= 8; n++) {
        const rtp = streakMult(k, n) * (k / 5) ** n;
        expect(rtp).toBeLessThanOrEqual(0.97 + 1e-9);
        expect(rtp).toBeGreaterThan(0.955);
      }
  });
  it('matches balls to covered colours', () => {
    expect(isHit(52, ['G'])).toBe(true);
    expect(isHit(52, ['B', 'I'])).toBe(false);
  });
});

describe('Bingo Duel', () => {
  it('deals disjoint lines with one ball per column', () => {
    for (let i = 0; i < 200; i++) {
      const d = deal();
      d.you.forEach((n, c) => {
        expect(Math.ceil(n / 15) - 1).toBe(c);
        expect(d.house).not.toContain(n);
      });
      expect(new Set(d.order).size).toBe(75);
    }
  });
  it('pays under 100% on every bet', () => {
    expect(DUEL_PAYS.you * 0.5).toBeLessThan(1);
    expect(DUEL_PAYS.blowout * (12 / 252)).toBeLessThan(1);
  });
  it('settles a duel', () => {
    const r = playOut({ you: [1, 16, 31, 46, 61], house: [2, 17, 32, 47, 62], order: [1, 16, 2, 31, 46, 61, 17] });
    expect(r).toEqual({ winner: 'you', drawn: 6, loserMarked: 1 });
    expect(duelWins('blowout', r)).toBe(true);
    expect(duelWins('house', r)).toBe(false);
  });
});
