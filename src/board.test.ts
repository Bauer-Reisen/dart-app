import { describe, expect, test } from 'vitest';
import { hitAt, points, polar, segAngle, type Hit, type Ziel } from './board';
import { aussage, klasse } from './klassen';

// Punkt in der Mitte eines Rings bei einer Zahl
const at = (seg: number, r: number): Hit => {
  const [x, y] = polar(r, segAngle(seg));
  return hitAt(x, y);
};

describe('Scheibe: Tipp → Feld', () => {
  test.each([
    [20, 100, 'T', 60],
    [20, 150, 'D', 40],
    [3, 100, 'T', 9],
    [16, 150, 'D', 32],
    [6, 50, 'SI', 6],
    [11, 125, 'SO', 11],
  ])('Zahl %i, Radius %i → Ring %s, %i Punkte', (seg, r, ring, pkt) => {
    const h = at(seg, r);
    expect(h.seg).toBe(seg);
    expect(h.ring).toBe(ring);
    expect(points(h)).toBe(pkt);
  });

  test('Bull und 25', () => {
    expect(points(hitAt(0, 0))).toBe(50);
    expect(points(hitAt(20, 0))).toBe(25);
  });

  test('außerhalb = daneben bei der Zahl, 0 Punkte', () => {
    const h = at(5, 300);
    expect(h).toEqual({ seg: 5, ring: 'MISS' });
    expect(points(h)).toBe(0);
  });

  test('Grenze zwischen 20 und 1 liegt bei 9°', () => {
    expect(hitAt(...polar(100, 8.9)).seg).toBe(20);
    expect(hitAt(...polar(100, 9.1)).seg).toBe(1);
    expect(hitAt(...polar(100, 351.1)).seg).toBe(20);
    expect(hitAt(...polar(100, 350.9)).seg).toBe(5);
  });
});

describe('Fehlerklassen', () => {
  const T20: Ziel = { seg: 20, ring: 'T' };
  const D16: Ziel = { seg: 16, ring: 'D' };
  test.each<[Ziel, Hit, string]>([
    [T20, { seg: 20, ring: 'T' }, 'treffer'],
    [T20, { seg: 20, ring: 'SI' }, 'innen'],
    [T20, { seg: 20, ring: 'SO' }, 'aussen'],
    [T20, { seg: 20, ring: 'D' }, 'aussen'],
    [T20, { seg: 1, ring: 'T' }, 'nachbarUhr'],
    [T20, { seg: 5, ring: 'SI' }, 'nachbarGegen'],
    [T20, { seg: 25, ring: 'SB' }, 'innen'],
    [T20, { seg: 3, ring: 'SI' }, 'weit'],
    [D16, { seg: 16, ring: 'SO' }, 'innen'],
    [D16, { seg: 16, ring: 'MISS' }, 'aussen'],
    [D16, { seg: 8, ring: 'D' }, 'nachbarUhr'],
    [D16, { seg: 7, ring: 'MISS' }, 'nachbarGegen'],
    [D16, { seg: 0, ring: 'BOUNCE' }, 'abpraller'],
    [{ seg: 25, ring: 'B' }, { seg: 25, ring: 'DB' }, 'treffer'],
    [{ seg: 19, ring: 'S' }, { seg: 19, ring: 'T' }, 'treffer'],
  ])('Ziel %o, Treffer %o → %s', (z, h, k) => {
    expect(klasse(z, h)).toBe(k);
  });
});

describe('Aussage über Fehlwürfe', () => {
  test('unter 20: keine Aussage', () => {
    expect(aussage(15, 3, 'innen', 'außen')).toMatch(/zu wenig/);
  });
  test('Beispiel aus VORSCHLAG.md: 45 außen, 15 innen → deutlich 75 %', () => {
    expect(aussage(15, 45, 'innen', 'außen')).toBe('deutlich: 75 % außen');
  });
  test('30 Fehlwürfe, 60 % → kein klares Muster', () => {
    expect(aussage(18, 12, 'innen', 'außen')).toBe('kein klares Muster');
  });
  test('falscher Wert schlägt Alarm (Kontrolle, dass der Test echt prüft)', () => {
    expect(aussage(15, 45, 'innen', 'außen')).not.toBe('deutlich: 80 % außen');
  });
});
