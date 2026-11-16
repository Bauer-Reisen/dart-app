import { describe, expect, it } from 'vitest';
import type { Hit, Ziel } from './board';
import type { Aufnahme } from './speicher';
import { x01Analyse } from './x01analyse';

const T = (seg: number): Hit => ({ seg, ring: 'T' });
const S = (seg: number): Hit => ({ seg, ring: 'SO' });
const D = (seg: number): Hit => ({ seg, ring: 'D' });
const T20: Ziel = { seg: 20, ring: 'T' };
let t = 0;
const auf = (leg: string, rest: number, hits: Hit[], extra: Partial<Aufnahme> = {}, ziele?: Ziel[]): Aufnahme => ({
  darts: hits.map((hit, i) => ({ hit, ziel: ziele?.[i] ?? T20, t: t++, ...(ziele?.[i] ? {} : { frei: true }) })),
  start: t, ende: t, modus: 'x01', legId: leg, restVorher: rest, doubleOut: true, ...extra,
});

describe('501-Auswertung ohne Ziel', () => {
  it('erste 9 Darts je Leg', () => {
    const l = ['a', 'b', 'c'].flatMap((leg) => [auf(leg, 501, [T(20), S(20), S(20)]), auf(leg, 401, [S(20), S(20), S(20)]), auf(leg, 341, [S(20), S(20), S(20)]), auf(leg, 281, [S(1), S(1), S(1)])]);
    expect(x01Analyse(l).erste9).toBeCloseTo(220 / 3);
  });

  it('Checkout nach Restbereich', () => {
    const l = [auf('x', 32, [D(16)], { check: true }), auf('y', 32, [S(16), S(8), S(4)]), auf('z', 81, [T(19), D(12)], { check: true }), auf('w', 169, [T(20), T(20), T(20)])];
    const c = x01Analyse(l).checkout;
    expect(c[0]).toMatchObject({ chancen: 2, treffer: 1 });
    expect(c[1]).toMatchObject({ chancen: 1, treffer: 1 });
    expect(c[2].chancen).toBe(0); // 169 geht nicht mit 3 Darts
  });

  it('starke und schwache Doppel', () => {
    const D16: Ziel = { seg: 16, ring: 'D' }; const D10: Ziel = { seg: 10, ring: 'D' };
    const l = [
      ...Array.from({ length: 6 }, (_, i) => auf('d' + i, 32, [i < 4 ? D(16) : S(16)], {}, [D16])),
      ...Array.from({ length: 6 }, (_, i) => auf('e' + i, 20, [i < 1 ? D(10) : S(10)], {}, [D10])),
    ];
    const a = x01Analyse(l);
    expect(a.doppel.find((z) => z.name === 'D16')).toMatchObject({ vers: 6, treff: 4 });
    expect(a.hinweise[0]).toContain('D16 am besten');
  });
});
