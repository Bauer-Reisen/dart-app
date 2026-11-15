import { describe, expect, test } from 'vitest';
import type { Hit, Ziel } from './board';
import { richtung, wurfbild, wurfbildTipps } from './tipps';

const T20: Ziel = { seg: 20, ring: 'T' };
const T19: Ziel = { seg: 19, ring: 'T' };
const BULL: Ziel = { seg: 25, ring: 'B' };
const h = (seg: number, ring: Hit['ring']): Hit => ({ seg, ring });

describe('Richtung der Fehlwürfe (wie man auf die Scheibe schaut)', () => {
  test('T20: Single innen = zu tief, Single außen = zu hoch', () => {
    expect(richtung(T20, h(20, 'SI'))).toBe('unten');
    expect(richtung(T20, h(20, 'SO'))).toBe('oben');
  });
  test('T20: die 5 ist links, die 1 rechts', () => {
    expect(richtung(T20, h(5, 'T'))).toBe('links');
    expect(richtung(T20, h(1, 'SI'))).toBe('rechts');
  });
  test('T19 (unten): innen = zu hoch, die 7 ist links, die 3 rechts', () => {
    expect(richtung(T19, h(19, 'SI'))).toBe('oben');
    expect(richtung(T19, h(7, 'T'))).toBe('links');
    expect(richtung(T19, h(3, 'T'))).toBe('rechts');
  });
  test('T6 (rechts): innen = zu weit links', () => {
    expect(richtung({ seg: 6, ring: 'T' }, h(6, 'SI'))).toBe('links');
  });
  test('Bull: Richtung aus der getroffenen Zahl', () => {
    expect(richtung(BULL, h(3, 'SI'))).toBe('unten');
    expect(richtung(BULL, h(11, 'SO'))).toBe('links');
    expect(richtung(BULL, h(25, 'SB'))).toBeNull();
  });
  test('Treffer und Abpraller zählen nicht', () => {
    expect(richtung(T20, h(20, 'T'))).toBeNull();
    expect(richtung(T20, h(0, 'BOUNCE'))).toBeNull();
  });
});

describe('Hinweise aus dem Wurfbild', () => {
  const darts = (anzahl: number, hit: Hit, ziel = T20) => Array.from({ length: anzahl }, () => ({ hit, ziel }));

  test('unter 20 Fehlwürfen kein Hinweis', () => {
    expect(wurfbildTipps(wurfbild(darts(19, h(20, 'SI')), T20))).toEqual([]);
  });
  test('Tendenz zu tief', () => {
    const w = wurfbild([...darts(16, h(20, 'SI')), ...darts(4, h(20, 'SO'))], T20);
    const t = wurfbildTipps(w);
    expect(t).toHaveLength(1);
    expect(t[0].richtung).toBe('unten');
    expect(t[0].staerke).toBe('Tendenz');
  });
  test('kein klares Muster', () => {
    const w = wurfbild([...darts(12, h(20, 'SI')), ...darts(10, h(20, 'SO'))], T20);
    expect(wurfbildTipps(w)).toEqual([]);
  });
  test('Darts auf andere Ziele und „frei" zählen nicht', () => {
    const w = wurfbild([...darts(30, h(19, 'SI'), T19), { hit: h(20, 'SI'), ziel: T20, frei: true }], T20);
    expect(w.fehl).toBe(0);
  });
});
