import { describe, expect, it } from 'vitest';
import type { Hit, Ziel } from './board';
import { zielBereinigen, type Aufnahme } from './speicher';

const T20: Ziel = { seg: 20, ring: 'T' };
const D20: Ziel = { seg: 20, ring: 'D' };
const S = (seg: number): Hit => ({ seg, ring: 'SO' });

describe('Nur Darts mit bekanntem Ziel zählen', () => {
  it('Cricket zählt nie fürs Zielen', () => {
    const a: Aufnahme = { darts: [{ hit: S(20), ziel: T20, t: 1 }], start: 1, ende: 1, modus: 'cricket' };
    expect(zielBereinigen(a).darts.every((d) => d.frei)).toBe(true);
  });

  it('501: Punkte-Darts nicht, Dart aufs Doppel zum Ausmachen schon', () => {
    const a: Aufnahme = {
      darts: [{ hit: S(20), ziel: T20, t: 1 }, { hit: S(20), ziel: D20, t: 2 }, { hit: S(10), ziel: { seg: 10, ring: 'D' }, t: 3 }],
      start: 1, ende: 3, modus: 'x01', restVorher: 60, doubleOut: true,
    };
    expect(zielBereinigen(a).darts.map((d) => !!d.frei)).toEqual([true, false, false]);
  });

  it('Training bleibt unverändert', () => {
    const a: Aufnahme = { darts: [{ hit: S(20), ziel: T20, t: 1 }], start: 1, ende: 1, modus: 'training' };
    expect(zielBereinigen(a)).toBe(a);
  });
});
