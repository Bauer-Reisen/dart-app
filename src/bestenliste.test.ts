import { describe, expect, it } from 'vitest';
import type { Hit } from './board';
import { bestenlisten } from './bestenliste';
import type { Aufnahme } from './speicher';

const T = (seg: number): Hit => ({ seg, ring: 'T' });
const S = (seg: number): Hit => ({ seg, ring: 'SO' });
let t = 1_700_000_000_000;
const x01 = (leg: string, spieler: string, rest: number, hits: Hit[], extra: Partial<Aufnahme> = {}): Aufnahme => ({
  darts: hits.map((hit) => ({ hit, ziel: { seg: 20, ring: 'T' }, t: t++, frei: true })), start: t, ende: t,
  modus: 'x01', legId: leg, spieler, restVorher: rest, doubleOut: true, ...extra,
});
const liste = (all: Aufnahme[], id: string) => bestenlisten(all).find((l) => l.id === id)!;

describe('Bestenliste', () => {
  it('501 Average je Leg, getrennt von 301, Computer zählt nicht', () => {
    const a = [
      x01('a', 'Anna', 501, [T(20), T(20), T(20)]), x01('a', 'Anna', 321, [S(20), S(20), S(20)]), x01('a', 'Anna', 261, [S(20), S(20), S(20)]),
      x01('b', 'Ben', 501, [S(20), S(20), S(20)]), x01('b', 'Ben', 441, [S(20), S(20), S(20)]), x01('b', 'Ben', 381, [S(20), S(20), S(20)]),
      x01('b', 'Computer', 501, [T(20), T(20), T(20)], { bot: true }), x01('b', 'Computer', 321, [T(20), T(20), T(20)], { bot: true }), x01('b', 'Computer', 141, [T(20), T(20), T(20)], { bot: true }),
      x01('c', 'Anna', 301, [T(20), T(20), T(20)]), x01('c', 'Anna', 121, [S(1), S(1), S(1)]), x01('c', 'Anna', 118, [S(1), S(1), S(1)]),
    ];
    const l = liste(a, '501-avg');
    expect(l.eintraege.map((e) => [e.name, e.text])).toEqual([['Anna', '100.0'], ['Ben', '60.0']]);
    expect(liste(a, '301-avg').eintraege[0].name).toBe('Anna');
  });

  it('Cricket: wenigste Darts im gewonnenen Leg zuerst', () => {
    const c = (leg: string, sp: string, n: number, check: boolean): Aufnahme => ({
      darts: Array.from({ length: n }, () => ({ hit: T(20), ziel: { seg: 20, ring: 'T' }, t: t++, frei: true })), start: t, ende: t, modus: 'cricket', legId: leg, spieler: sp, check,
    });
    const l = liste([c('x', 'Anna', 3, true), c('y', 'Ben', 2, true), c('z', 'Carl', 1, false)], 'cricket-darts');
    expect(l.eintraege.map((e) => e.name)).toEqual(['Ben', 'Anna']);
  });

  it('höchstens 10 Einträge', () => {
    const a = Array.from({ length: 15 }, (_, i) => [0, 1, 2].map((k) => x01('L' + i, 'Anna', 501 - k * 60, [S(20), S(20), S(20)]))).flat();
    expect(liste(a, '501-avg').eintraege).toHaveLength(10);
  });
});
