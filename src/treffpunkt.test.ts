import { describe, expect, it } from 'vitest';
import { ECHT_MM, RADIUS, echtePosition } from './board';
import type { Dart } from './speicher';
import { treffpunkt, treffpunktText } from './treffpunkt';

describe('Getippte Stelle → echte Scheibe', () => {
  it('Ringgrenzen passen', () => {
    expect(echtePosition(0, -RADIUS.T)).toEqual([0, -ECHT_MM.T]);
    expect(echtePosition(0, -RADIUS.D)).toEqual([0, -ECHT_MM.D]);
    expect(Math.abs(echtePosition(RADIUS.DB, 0)[0] - ECHT_MM.DB)).toBeLessThanOrEqual(0.06); // auf 0,1 mm gerundet
  });
  it('Mitte des Triple-Rings liegt in der Mitte des echten Triples', () => {
    const [, y] = echtePosition(0, -(RADIUS.SI + RADIUS.T) / 2);
    expect(y).toBeCloseTo(-(ECHT_MM.SI + ECHT_MM.T) / 2, 0);
  });
});

describe('Mittlerer Treffpunkt', () => {
  const T20 = { seg: 20, ring: 'T' as const };
  // Zielmitte T20 liegt bei (0, -103); alle Darts 8 mm tiefer, abwechselnd 2 mm links/rechts
  const darts: Dart[] = Array.from({ length: 12 }, (_, i) => ({
    hit: { seg: 20, ring: 'T' }, ziel: T20, t: i, p: [i % 2 ? 2 : -2, -103 + 8],
  }));

  it('erkennt „zu tief"', () => {
    const t = treffpunkt(darts, T20)!;
    expect(t.dy).toBeCloseTo(8, 0);
    expect(Math.abs(t.dx)).toBeLessThan(0.5);
    expect(treffpunktText(t)).toMatch(/8 mm zu tief/);
  });

  it('Single: keine Aussage, ohne Stelle: nichts', () => {
    expect(treffpunkt(darts.map((d) => ({ ...d, ziel: { seg: 20, ring: 'S' } })), { seg: 20, ring: 'S' })).toBeNull();
    expect(treffpunkt(darts.map(({ p: _p, ...d }) => d), T20)).toBeNull();
  });
});
