import { describe, expect, it } from 'vitest';
import type { Hit, Ziel } from './board';
import { auswerten, trainingsVorschlag } from './fuehrung';
import type { Aufnahme, Dart } from './speicher';
import { umbenennen } from './spieler';

const T20: Ziel = { seg: 20, ring: 'T' };
const D16: Ziel = { seg: 16, ring: 'D' };
const darts = (z: Ziel, hits: Hit[]): Dart[] => hits.map((hit, i) => ({ hit, ziel: z, t: i }));
const viele = <T,>(n: number, x: T) => Array.from({ length: n }, () => x);

describe('Trainingsvorschlag', () => {
  it('ohne genug Würfe: kennenlernen', () => {
    const v = trainingsVorschlag(darts(T20, viele(5, { seg: 20, ring: 'T' } as Hit)));
    expect(v.titel).toMatch(/Kennenlernen/);
  });

  it('klares Muster: Ziel mit Muster und Fokus', () => {
    // T20: Fehlwürfe fast alle zu tief (innen = Single innen unter dem Triple bei der 20)
    const d = [
      ...darts(T20, [...viele(30, { seg: 20, ring: 'SI' } as Hit), ...viele(10, { seg: 20, ring: 'T' } as Hit)]),
      ...darts(D16, viele(40, { seg: 16, ring: 'D' } as Hit)),
    ];
    const v = trainingsVorschlag(d);
    expect(v.ziel).toEqual(T20);
    expect(v.richtung).toBe('unten');
  });

  it('ohne Muster: schwächstes Doppel', () => {
    const d = [
      ...darts(T20, viele(40, { seg: 20, ring: 'T' } as Hit)),
      ...darts(D16, [...viele(30, { seg: 16, ring: 'D' } as Hit), ...viele(10, { seg: 0, ring: 'BOUNCE' } as Hit)]),
      ...darts({ seg: 20, ring: 'D' }, [...viele(10, { seg: 20, ring: 'D' } as Hit), ...viele(20, { seg: 20, ring: 'MISS' } as Hit), ...viele(20, { seg: 20, ring: 'SO' } as Hit)]),
    ];
    const v = trainingsVorschlag(d);
    expect(v.ziel.ring).toBe('D');
  });
});

describe('Runde auswerten', () => {
  it('vergleicht Runde mit vorher', () => {
    const auf = (start: number, hits: Hit[]): Aufnahme => ({ darts: darts(T20, hits), start, ende: start, modus: 'training', spieler: 'Anna' });
    const a = [auf(1, viele(3, { seg: 20, ring: 'SI' } as Hit)), auf(100, viele(3, { seg: 20, ring: 'T' } as Hit))];
    const e = auswerten(a, { ziel: T20, fokus: '', seit: 50, spieler: 'Anna' });
    expect(e.jetzt).toEqual({ treffer: 3, n: 3 });
    expect(e.vorher).toEqual({ treffer: 0, n: 3 });
  });
});

describe('Spieler umbenennen', () => {
  it('„Ich" (auch ohne Namen gespeichert) bekommt den neuen Namen, Computer bleibt', () => {
    const a: Aufnahme[] = [
      { darts: [], start: 0, ende: 0 },
      { darts: [], start: 1, ende: 1, spieler: 'Ich' },
      { darts: [], start: 2, ende: 2, spieler: 'Ich', bot: true },
      { darts: [], start: 3, ende: 3, spieler: 'Ben' },
    ];
    const r = umbenennen('Ich', 'Anna', a, { liste: ['Ich', 'Ben'], aktiv: 'Ich' });
    expect(r.aufnahmen.map((x) => x.spieler)).toEqual(['Anna', 'Anna', 'Ich', 'Ben']);
    expect(r.stand).toEqual({ liste: ['Anna', 'Ben'], aktiv: 'Anna' });
  });
});
