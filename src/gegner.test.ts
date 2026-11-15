import { describe, expect, it } from 'vitest';
import { computerAufnahme, echterTreffer, sigmaFuer, simuliereLeg, zielPunkt } from './gegner';

// Fester Zufall, damit der Test immer gleich ausgeht
function zufall(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('Computer-Gegner', () => {
  it('Zielpunkte liegen im richtigen Feld', () => {
    expect(echterTreffer(...zielPunkt({ seg: 20, ring: 'T' }))).toEqual({ seg: 20, ring: 'T' });
    expect(echterTreffer(...zielPunkt({ seg: 16, ring: 'D' }))).toEqual({ seg: 16, ring: 'D' });
    expect(echterTreffer(...zielPunkt({ seg: 11, ring: 'S' }))).toEqual({ seg: 11, ring: 'SO' });
    expect(echterTreffer(...zielPunkt({ seg: 25, ring: 'B' }))).toEqual({ seg: 25, ring: 'DB' });
    expect(echterTreffer(0, -200).ring).toBe('MISS');
  });

  it('Streuung passt zum gewünschten Average', () => {
    for (const ziel of [35, 50, 65]) {
      const rnd = zufall(ziel);
      let d = 0, p = 0;
      for (let i = 0; i < 800; i++) {
        const r = simuliereLeg(sigmaFuer(ziel), rnd);
        d += r.darts;
        p += r.punkte;
      }
      expect(Math.abs((p / d) * 3 - ziel)).toBeLessThan(3);
    }
  });

  it('Aufnahme endet beim Ausmachen oder Überwerfen', () => {
    const rnd = zufall(7);
    for (let i = 0; i < 200; i++) {
      const a = computerAufnahme(32, true, 15, rnd);
      expect(a.length).toBeGreaterThan(0);
      expect(a.length).toBeLessThanOrEqual(3);
      expect(a[0].ziel).toEqual({ seg: 16, ring: 'D' });
    }
  });

  it('stärker = kleinere Streuung', () => {
    expect(sigmaFuer(70)).toBeLessThan(sigmaFuer(40));
    expect(sigmaFuer(200)).toBe(6);
    expect(sigmaFuer(5)).toBe(33);
  });
});
