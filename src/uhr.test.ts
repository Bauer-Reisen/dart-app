import { describe, expect, it } from 'vitest';
import type { Hit, Ziel } from './board';
import type { Dart } from './speicher';
import { uhrAuswertung, uhrText } from './uhr';

const T20: Ziel = { seg: 20, ring: 'T' };
const T19: Ziel = { seg: 19, ring: 'T' };
const d = (t: number, ziel: Ziel, hit: Hit): Dart => ({ t, ziel, hit });

describe('Trainings-Timer', () => {
  it('zählt nur Darts in der Zeit, Treffer je Ziel', () => {
    const darts = [
      d(50, T20, { seg: 20, ring: 'T' }),   // vor dem Start
      d(100, T20, { seg: 20, ring: 'T' }),
      d(110, T20, { seg: 20, ring: 'SO' }),
      d(120, T19, { seg: 19, ring: 'T' }),
      d(130, T20, { seg: 0, ring: 'BOUNCE' }),
      d(500, T20, { seg: 20, ring: 'T' }),  // nach dem Ende
    ];
    const a = uhrAuswertung(darts, 100, 400);
    expect(a.darts).toBe(4);
    expect(a.ziele).toEqual([{ ziel: 'T20', treffer: 1, n: 2 }, { ziel: 'T19', treffer: 1, n: 1 }]);
  });

  it('Zeit als Minuten:Sekunden', () => {
    expect(uhrText(452000)).toBe('7:32');
    expect(uhrText(600000)).toBe('10:00');
    expect(uhrText(400)).toBe('0:01');
    expect(uhrText(-5)).toBe('0:00');
  });
});
