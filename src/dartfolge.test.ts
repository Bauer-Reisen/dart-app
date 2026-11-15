import { describe, expect, it } from 'vitest';
import type { Hit, Ziel } from './board';
import { dartfolge, quoteText } from './dartfolge';
import type { Aufnahme } from './speicher';

const T20: Ziel = { seg: 20, ring: 'T' };
const TREFFER: Hit = { seg: 20, ring: 'T' };
const DANEBEN: Hit = { seg: 1, ring: 'SI' };

function aufnahme(...hits: Hit[]): Aufnahme {
  return { darts: hits.map((hit, i) => ({ hit, ziel: T20, t: i })), start: 0, ende: 2, modus: 'training' } as Aufnahme;
}

describe('Dartfolge', () => {
  it('zählt je Position und nach Treffer/Fehlwurf', () => {
    const f = dartfolge([aufnahme(TREFFER, TREFFER, DANEBEN), aufnahme(DANEBEN, TREFFER, TREFFER)], T20);
    expect(f.position.map((p) => [p.treffer, p.n])).toEqual([[1, 2], [2, 2], [1, 2]]);
    expect([f.nachTreffer.treffer, f.nachTreffer.n]).toEqual([2, 3]);
    expect([f.nachFehlwurf.treffer, f.nachFehlwurf.n]).toEqual([1, 1]);
  });

  it('zeigt erst ab 10 Darts eine Quote', () => {
    expect(quoteText({ treffer: 3, n: 9 })).toBe('–');
    expect(quoteText({ treffer: 5, n: 10 })).toBe('50 %');
  });
});
