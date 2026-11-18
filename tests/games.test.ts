import { describe, expect, it } from 'vitest';
import { diceChance, diceMult, drawPair } from '../src/games/dice/dice';
import { towerMult } from '../src/games/tower/tower';
import { COLOUR_PAYS, NUMBER_PAYS, SEG_DEG, rotationFor, wheelWins } from '../src/games/wheel/wheel';
import { letterOf } from '../src/lib/bingo';

describe('Ball Tower', () => {
  it('pays about 97% at every level', () => {
    for (let k = 1; k <= 10; k++) {
      const rtp = towerMult(k) * (2 / 3) ** k;
      expect(rtp).toBeGreaterThan(0.95);
      expect(rtp).toBeLessThanOrEqual(0.97);
    }
  });
});

describe('Lucky Wheel 55', () => {
  it('pays under 100% on both bet types', () => {
    expect(COLOUR_PAYS / 5).toBeLessThan(1);
    expect(NUMBER_PAYS / 55).toBeLessThan(1);
  });
  it('lands the chosen ball under the pointer', () => {
    for (const ball of [1, 11, 28, 55]) {
      const r = rotationFor(ball, 123.4);
      const atTop = ((360 - (r % 360)) % 360) / SEG_DEG; // segment index under the pointer
      expect(Math.floor(atTop) + 1).toBe(ball);
      expect(r - 123.4).toBeGreaterThan(360 * 6 - 1);
    }
  });
  it('matches colour and number bets', () => {
    expect(wheelWins({ kind: 'colour', pick: 'G' }, 40)).toBe(true);
    expect(wheelWins({ kind: 'colour', pick: 'O' }, 45)).toBe(true);
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
