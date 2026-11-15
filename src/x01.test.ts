import { describe, expect, test } from 'vitest';
import type { Hit } from './board';
import { checkout, naechsterDart, wegText } from './checkout';
import { auswerten, average, legStand } from './x01';

const H = (s: string): Hit => {
  if (s === 'Bull') return { seg: 25, ring: 'DB' };
  if (s === '25') return { seg: 25, ring: 'SB' };
  if (s === '0') return { seg: 20, ring: 'MISS' };
  const ring = s[0] === 'T' ? 'T' : s[0] === 'D' ? 'D' : 'SI';
  return { seg: Number(s.slice(1)), ring };
};
const HS = (s: string) => s.split(' ').map(H);

describe('501: Aufnahme auswerten (Double-out)', () => {
  test.each([
    // Rest | Darts            | Rest danach | überworfen | ausgemacht | endet nach
    [501, 'T20 T20 T20', 321, false, false, 3],
    [501, 'S20 S1', 480, false, false, null],
    [40, 'D20', 0, false, true, 1],
    [50, 'Bull', 0, false, true, 1],
    [32, 'S16 D8', 0, false, true, 2],
    [40, 'S20 S20', 40, true, false, 2],   // Finish ohne Doppel
    [32, 'T20', 32, true, false, 1],       // unter 0
    [3, 'S2', 3, true, false, 1],          // Rest 1 geht nicht
    [100, 'T20 S20 D10', 0, false, true, 3],
    [60, 'S20 S20 S10', 10, false, false, 3],
  ])('Rest %i, Darts %s → Rest %i, Bust %s, Check %s', (rest, darts, nach, bust, check, endet) => {
    const e = auswerten(rest, HS(darts), true);
    expect(e.restNachher).toBe(nach);
    expect(e.bust).toBe(bust);
    expect(e.check).toBe(check);
    expect(e.endetNach).toBe(endet);
  });

  test('ohne Double-out darf man mit Single ausmachen', () => {
    expect(auswerten(20, HS('S20'), false).check).toBe(true);
    expect(auswerten(21, HS('S20'), false).restNachher).toBe(1);
  });

  test('überworfen zählt 0 Punkte', () => {
    expect(auswerten(32, HS('T20'), true).punkte).toBe(0);
  });
});

describe('Spielstand mit zwei Spielern', () => {
  const regeln = { start: 101, doubleOut: true };
  test('abwechselnd, Gewinner wird erkannt', () => {
    const s = legStand(2, 0, regeln, [
      { hits: HS('T20 S1 S0') },   // A: 101-61 = 40
      { hits: HS('S20 S20 S20') }, // B: 41
      { hits: HS('D20') },         // A: aus
    ]);
    expect(s.rest).toEqual([0, 41]);
    expect(s.gewinner).toBe(0);
    expect(s.darts).toEqual([4, 3]);
  });
  test('Starter 1 beginnt', () => {
    const s = legStand(2, 1, regeln, [{ hits: HS('S1 S1 S1') }]);
    expect(s.rest).toEqual([101, 98]);
    expect(s.amZug).toBe(0);
  });
  test('Average: 180 Punkte mit 6 Darts = 90', () => {
    expect(average(180, 6)).toBe(90);
    expect(average(0, 0)).toBeNull();
  });
});

describe('Checkout-Wege', () => {
  test.each([
    [170, 'T20 · T20 · Bull'],
    [167, 'T20 · T19 · Bull'],
    [160, 'T20 · T20 · D20'],
    [100, 'T20 · D20'],
    [80, 'T20 · D10'],
    [60, 'S20 · D20'],
    [41, 'S1 · D20'],
    [40, 'D20'],
    [32, 'D16'],
    [50, 'Bull'],
    [3, 'S1 · D1'],
    [2, 'D1'],
  ])('%i → %s', (rest, weg) => {
    expect(wegText(checkout(rest)!)).toBe(weg);
  });

  test('kein Checkout bei 169, 168, 166, 165, 163, 162, 159 und über 170', () => {
    for (const r of [169, 168, 166, 165, 163, 162, 159, 171, 1]) expect(checkout(r)).toBeNull();
  });

  test('jeder Weg von 2 bis 170 geht genau auf und endet auf Doppel', () => {
    let anzahl = 0;
    for (let r = 2; r <= 170; r++) {
      const w = checkout(r);
      if (!w) continue;
      anzahl++;
      expect(w.reduce((s, x) => s + x.punkte, 0)).toBe(r);
      expect(w[w.length - 1].double).toBe(true);
      expect(w.length).toBeLessThanOrEqual(3);
    }
    expect(anzahl).toBe(169 - 7);
  });

  test('mit nur 1 Dart übrig: 60 geht nicht, Vorschlag stellt einen Rest', () => {
    expect(checkout(60, 1)).toBeNull();
    const v = naechsterDart(60, 1);
    expect(v.weg).toBeNull();
    expect(60 - v.wurf.punkte).toBe(40); // S20 lässt D20
  });

  test('weit weg vom Finish: T20', () => {
    expect(naechsterDart(501, 3).wurf.label).toBe('T20');
  });
});
