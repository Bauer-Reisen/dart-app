import { describe, expect, it } from 'vitest';
import { bilanz, gegnerNamen, gegnerVerlauf, naechsterSpieltag, letzterSpieltag, phase, staerken, tageBis, trainingsAverage, type Spieltag } from './liga';
import type { Aufnahme, Dart } from './speicher';

const heute = new Date(2026, 10, 15, 21, 30); // So 15.11.2026 abends

const st = (id: string, datum: string, spiele: Spieltag['spiele'] = [], extra: Partial<Spieltag> = {}): Spieltag => ({
  id, datum, gegner: 'Team ' + id, heim: true, spiele, ...extra,
});

describe('Liga', () => {
  it('zählt Kalendertage, unabhängig von der Uhrzeit', () => {
    expect(tageBis('2026-11-15', heute)).toBe(0);
    expect(tageBis('2026-11-16', heute)).toBe(1);
    expect(tageBis('2026-11-28', heute)).toBe(13);
    expect(tageBis('2026-11-06', heute)).toBe(-9);
    expect(tageBis('2027-01-08', heute)).toBe(54);
  });

  it('findet nächsten und letzten Spieltag', () => {
    const l = [st('c', '2026-12-18'), st('a', '2026-11-06'), st('b', '2026-11-28'), st('h', '2026-11-15')];
    expect(naechsterSpieltag(l, heute)?.id).toBe('h');
    expect(letzterSpieltag(l, heute)?.id).toBe('a');
    expect(naechsterSpieltag(l.filter((s) => s.id !== 'h'), heute)?.id).toBe('b');
  });

  it('Phase der Vorbereitung', () => {
    expect(phase(0)).toBe('heute');
    expect(phase(1)).toBe('locker');
    expect(phase(2)).toBe('locker');
    expect(phase(5)).toBe('simulation');
    expect(phase(7)).toBe('simulation');
    expect(phase(13)).toBe('schwaechen');
  });

  it('Computer-Stärken aus den Gegner-Averages, sonst aus dem Training', () => {
    expect(staerken(st('x', '2026-11-28', [], { avgVon: 49, avgBis: 35 }), 60)).toEqual({ schwach: 35, mittel: 42, stark: 49, geschaetzt: false });
    expect(staerken(null, 47.4)).toEqual({ schwach: 39, mittel: 47, stark: 55, geschaetzt: true });
    expect(staerken(null, null).mittel).toBe(45);
  });

  it('Bilanz und Gegner-Verlauf', () => {
    const l = [
      st('a', '2026-10-02', [{ id: '1', art: 'einzel', gegner: 'Max Muster', legsIch: 1, legsGegner: 3, average: 44, notiz: 'wirft schnell' }]),
      st('b', '2026-11-06', [
        { id: '2', art: 'einzel', gegner: ' max  muster ', legsIch: 3, legsGegner: 2, average: 50 },
        { id: '3', art: 'doppel', gegner: 'A & B', legsIch: 3, legsGegner: 0 },
      ]),
    ];
    const b = bilanz(l);
    expect(b).toEqual({ einzelSiege: 1, einzel: 2, doppelSiege: 1, doppel: 1, average: 47 });
    const v = gegnerVerlauf(l, 'MAX MUSTER');
    expect(v.map((x) => x.s.id)).toEqual(['2', '1']);
    expect(gegnerVerlauf(l, 'Max Muster', '2').map((x) => x.s.id)).toEqual(['1']);
    expect(gegnerNamen(l)).toEqual(['A & B', 'max  muster']);
  });

  it('Training-Average ohne Computer-Würfe', () => {
    const t20: Dart = { hit: { seg: 20, ring: 'T' }, ziel: { seg: 20, ring: 'T' }, t: 0 };
    const s20: Dart = { ...t20, hit: { seg: 20, ring: 'SO' } };
    const a = (darts: Dart[], bot = false): Aufnahme => ({ darts, start: 1000, ende: 1000, modus: 'x01', restVorher: 501, doubleOut: true, bot });
    const liste = [...Array(10)].map(() => a([t20, s20, s20])).concat([a([t20, t20, t20], true)]);
    expect(trainingsAverage(liste, 0).avg).toBe(100);
    expect(trainingsAverage(liste.slice(0, 5), 0).avg).toBeNull(); // unter 30 Darts
  });
});
