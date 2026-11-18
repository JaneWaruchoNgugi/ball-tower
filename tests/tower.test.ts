import { describe, expect, it } from 'vitest';
import { ROW_TYPES, newRow, safeChance, towerMult } from '../src/games/tower/tower';

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
