import { describe, expect, test } from 'vitest';
import type { Hit } from './board';
import { RUNDEN, halveStand, rundenPunkte } from './halveit';

const H = (s: string): Hit => {
  if (s === 'Bull') return { seg: 25, ring: 'DB' };
  if (s === '25') return { seg: 25, ring: 'SB' };
  if (s === '0') return { seg: 20, ring: 'MISS' };
  const ring = s[0] === 'T' ? 'T' : s[0] === 'D' ? 'D' : 'SI';
  return { seg: Number(s.slice(1)), ring };
};
const HS = (s: string) => s.split(' ').map(H);
const A = (s: string) => ({ hits: HS(s) });

describe('Punkte je Runde', () => {
  test.each([
    [0, 'T15 S15 S1', 60],   // Runde 15: nur die 15 zählt
    [0, 'S20 S20 S20', 0],
    [2, 'D20 D3 S20', 46],   // Doppel: jedes Doppel zählt
    [2, 'Bull 0 0', 50],     // Bull zählt als Doppel
    [5, 'T20 T1 S20', 63],   // Triple: jedes Triple zählt
    [8, '25 Bull S20', 75],  // Bull: 25 und 50
  ])('Runde %i, Darts %s → %i', (r, darts, p) => {
    expect(rundenPunkte(RUNDEN[r], HS(darts))).toBe(p);
  });
});

describe('Spielverlauf', () => {
  test('halbieren bei 0 Treffern, abgerundet', () => {
    const s = halveStand(1, 0, [A('T15 S15 S15'), A('0 0 0'), A('D1 0 0')]);
    // 75 → halbiert 37 → +2 = 39
    expect(s.punkte).toEqual([39]);
    expect(s.halbiert).toEqual([1]);
    expect(s.verlauf[0]).toEqual([75, 0, 2]);
    expect(s.runde).toBe(3);
  });

  test('zwei Spieler wechseln sich je Runde ab', () => {
    const s = halveStand(2, 0, [A('S15 0 0'), A('0 0 0'), A('S16 0 0')]);
    expect(s.punkte).toEqual([31, 0]);
    expect(s.amZug).toBe(1);
    expect(s.runde).toBe(1);
  });

  test('Ende nach 9 Runden, Gewinner mit den meisten Punkten', () => {
    const a = Array.from({ length: 18 }, (_, k) => (k % 2 === 0 ? A('T20 T20 T20') : A('0 0 0')));
    const s = halveStand(2, 0, a);
    expect(s.fertig).toBe(true);
    expect(s.gewinner).toEqual([0]);
    expect(s.punkte[1]).toBe(0);
  });

  test('Gleichstand → beide gewinnen', () => {
    const a = Array.from({ length: 18 }, () => A('0 0 0'));
    expect(halveStand(2, 0, a).gewinner).toEqual([0, 1]);
  });
});
