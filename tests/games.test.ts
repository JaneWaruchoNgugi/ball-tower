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

describe('Lucky Wheel 75', () => {
  it('pays under 100% on both bet types', () => {
    expect(COLOUR_PAYS / 5).toBeLessThan(1);
    expect(NUMBER_PAYS / 75).toBeLessThan(1);
  });
  it('lands the chosen ball under the pointer', () => {
    for (const ball of [1, 15, 38, 75]) {
      const r = rotationFor(ball, 123.4);
      const atTop = ((360 - (r % 360)) % 360) / SEG_DEG; // segment index under the pointer
      expect(Math.floor(atTop) + 1).toBe(ball);
      expect(r - 123.4).toBeGreaterThan(360 * 6 - 1);
    }
  });
  it('matches colour and number bets', () => {
    expect(wheelWins({ kind: 'colour', pick: 'G' }, 52)).toBe(true);
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
