import { describe, expect, it } from 'vitest';
import type { Hit, Ziel } from './board';
import { doppelTipp, einheitTipps, folgeTipps, lage, lageTipps, zuruf } from './coach';
import { zielPunkt } from './gegner';
import type { Aufnahme, Dart } from './speicher';

const T20: Ziel = { seg: 20, ring: 'T' };
const D16: Ziel = { seg: 16, ring: 'D' };
const TREFFER: Hit = { seg: 20, ring: 'T' };
const daneben = (_k: number): Hit => ({ seg: 3, ring: 'SO' }); // weit weg: keine Richtung

// Darts um einen Punkt (dx, dy) relativ zur Zielmitte, Streuung sx/sy (gleichmäßiges Muster statt Zufall)
function wolke(z: Ziel, n: number, dx: number, dy: number, sx: number, sy: number): Dart[] {
  const [mx, my] = zielPunkt(z);
  const muster = [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]];
  return Array.from({ length: n }, (_, i) => {
    const [a, b] = muster[i % muster.length];
    return { hit: TREFFER, ziel: z, t: i, p: [mx + dx + a * sx, my + dy + b * sy] as [number, number] };
  });
}

const aufnahme = (ziel: Ziel, treffer: boolean[], start: number): Aufnahme => ({
  darts: treffer.map((t, i) => ({ hit: t ? { seg: ziel.seg, ring: ziel.ring } as Hit : daneben(start + i), ziel, t: start + i })),
  start, ende: start + 2, modus: 'training',
});

describe('Trainer: Lage', () => {
  it('eng, aber versetzt → Stand/Griff, nicht Technik umbauen', () => {
    const t = lageTipps(wolke(T20, 30, 0, 9, 4, 4), T20);
    expect(t[0].titel).toContain('Eng beieinander');
    expect(t[0].titel).toContain('9 mm zu tief');
    expect(t[0].richtung).toBe('unten');
  });

  it('mittig, aber weit gestreut → Gleichmäßigkeit', () => {
    const t = lageTipps(wolke(T20, 30, 0, 0, 22, 22), T20);
    expect(t[0].titel).toContain('weit gestreut');
  });

  it('mehr Streuung in der Höhe wird erkannt', () => {
    const t = lageTipps(wolke(T20, 30, 0, 0, 4, 12), T20);
    expect(t.some((x) => x.id.endsWith('form-hoehe'))).toBe(true);
  });

  it('mittig und eng = Lob', () => {
    const t = lageTipps(wolke(T20, 30, 0, 0, 3, 3), T20);
    expect(t[0].lob).toBe(true);
  });

  it('kleiner Versatz bei großer Streuung zählt nicht als versetzt', () => {
    expect(lage(wolke(T20, 15, 0, 5, 25, 25), T20)!.versetzt).toBe(false);
  });

  it('zu wenig Darts: nichts', () => {
    expect(lageTipps(wolke(T20, 10, 0, 9, 4, 4), T20)).toEqual([]);
  });
});

describe('Trainer: Doppel-Rat', () => {
  it('Höhen-Streuung → seitliche Doppel', () => {
    const t = doppelTipp([...wolke(T20, 20, 0, 0, 3, 10), ...wolke(D16, 20, 0, 0, 3, 10)]);
    expect(t!.id).toBe('doppel:seite');
  });
  it('Seiten-Streuung → oben/unten', () => {
    const t = doppelTipp([...wolke(T20, 20, 0, 0, 10, 3), ...wolke(D16, 20, 0, 0, 10, 3)]);
    expect(t!.id).toBe('doppel:obenunten');
  });
});

describe('Trainer: Dartfolge und Einheiten', () => {
  it('3. Dart deutlich schwächer', () => {
    const as = Array.from({ length: 40 }, (_, i) => aufnahme(T20, [i % 2 === 0, i % 2 === 0, i % 5 === 0], i * 1000));
    expect(folgeTipps(as).some((t) => t.id === 'folge:dritter')).toBe(true);
  });

  it('Ermüdung am Ende', () => {
    const as: Aufnahme[] = [];
    for (let e = 0; e < 3; e++) {
      const basis = e * 24 * 3600 * 1000;
      for (let i = 0; i < 25; i++) as.push(aufnahme(T20, i >= 20 ? [false, false, false] : [true, true, false], basis + i * 60000));
    }
    expect(einheitTipps(as).some((t) => t.id === 'einheit:ende')).toBe(true);
  });
});

describe('Trainer: Zurufe', () => {
  it('Serie in eine Richtung (zu tief)', () => {
    const tief: Hit = { seg: 20, ring: 'SI' }; // innerhalb des Triples = zu tief bei T20
    const s = Array.from({ length: 3 }, (_, i) => ({ ...aufnahme(T20, [false, false, false], i * 1000), darts: [0, 1, 2].map((j) => ({ hit: tief, ziel: T20, t: i * 1000 + j })) }));
    const z = zuruf(s, [], []);
    expect(z?.art).toBe('serie');
    expect(z?.text).toContain('zu tief');
  });

  it('wiederholt denselben Anlass nicht ständig', () => {
    const s = Array.from({ length: 8 }, (_, i) => aufnahme(T20, [false, false, false], i * 1000));
    const z = zuruf(s, [], [{ text: '', art: 'pause', bei: 3 }]);
    expect(z?.art).not.toBe('pause');
  });

  it('hält Abstand zwischen Zurufen', () => {
    const s = Array.from({ length: 5 }, (_, i) => aufnahme(T20, [false, false, false], i * 1000));
    expect(zuruf(s, [], [{ text: '', art: 'pause', bei: 3 }])).toBeNull();
  });

  it('Fokus nach 8 Aufnahmen, Bilanz 5 Aufnahmen später', () => {
    const s = Array.from({ length: 8 }, (_, i) => aufnahme(T20, [i % 2 === 0, false, false], i * 1000));
    const f = zuruf(s, [], []);
    expect(f?.art).toBe('fokus');
    const weiter = [...s, ...Array.from({ length: 5 }, (_, i) => aufnahme(T20, [true, true, false], 9000 + i * 1000))];
    const b = zuruf(weiter, [], [f!]);
    expect(b?.art).toBe('bilanz');
    expect(b?.text).toContain('besser');
  });
});
