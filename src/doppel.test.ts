import { describe, expect, it } from 'vitest';
import type { Hit } from './board';
import { doppelFrage, doppelWerte } from './doppel';
import type { Aufnahme } from './speicher';

const S = (seg: number): Hit => ({ seg, ring: 'SO' });
const D = (seg: number): Hit => ({ seg, ring: 'D' });
const auf = (rest: number, hits: Hit[], extra: Partial<Aufnahme> = {}): Aufnahme => ({
  darts: hits.map((hit, i) => ({ hit, ziel: { seg: 20, ring: 'T' }, t: i })), start: 1, ende: 3, modus: 'x01', restVorher: rest, doubleOut: true, ...extra,
});

describe('Darts aufs Doppel', () => {
  it('76: 20, 16 → 40, dann 18 daneben: ein Dart möglich, geschätzt 1', () => {
    expect(doppelFrage(76, [S(20), S(16), S(18)], true)).toEqual({ max: 1, min: 0, schaetzung: 1 });
  });
  it('50 kann auch Vorbereitung sein', () => {
    expect(doppelFrage(50, [S(10), S(20), S(1)], true)).toEqual({ max: 3, min: 0, schaetzung: 2 });
  });
  it('kein Doppel möglich → keine Frage', () => {
    expect(doppelFrage(120, [S(20), S(20), S(20)], true)).toBeNull();
    expect(doppelFrage(40, [S(20)], false)).toBeNull();
  });
  it('ausgemacht: mindestens 1', () => {
    expect(doppelFrage(32, [S(16), D(8)], true)).toEqual({ max: 2, min: 1, schaetzung: 2 });
  });
  it('Angabe des Spielers zählt vor der Schätzung', () => {
    expect(doppelWerte(auf(40, [S(20), S(10), S(5)]))).toEqual({ vers: 3, treff: 0 });
    expect(doppelWerte(auf(40, [S(20), S(10), S(5)], { doppelDarts: 1 }))).toEqual({ vers: 1, treff: 0 });
    expect(doppelWerte(auf(32, [S(16), D(8)], { check: true, doppelDarts: 1 }))).toEqual({ vers: 1, treff: 1 });
  });
});
