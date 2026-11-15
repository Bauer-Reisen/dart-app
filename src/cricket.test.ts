import { describe, expect, test } from 'vitest';
import type { Hit } from './board';
import { cricketStand, cricketVorschlag, mpr, nutzDerAufnahme, striche } from './cricket';

const H = (s: string): Hit => {
  if (s === 'Bull') return { seg: 25, ring: 'DB' };
  if (s === '25') return { seg: 25, ring: 'SB' };
  if (s === '0') return { seg: 20, ring: 'MISS' };
  const ring = s[0] === 'T' ? 'T' : s[0] === 'D' ? 'D' : 'SI';
  return { seg: Number(s.slice(1)), ring };
};
const A = (s: string) => ({ hits: s.split(' ').map(H) });

describe('Striche', () => {
  test.each([
    ['T20', 0, 3], ['D19', 1, 2], ['S15', 5, 1], ['25', 6, 1], ['Bull', 6, 2],
  ])('%s → Zahl Nr. %i, %i Striche', (s, idx, n) => {
    expect(striche(H(s))).toEqual({ idx, n });
  });
  test('Zahlen unter 15 und Fehlwürfe zählen nicht', () => {
    expect(striche(H('T14'))).toBeNull();
    expect(striche(H('0'))).toBeNull();
  });
});

describe('Cricket mit zwei Spielern', () => {
  test('Schließen und Punkten', () => {
    // A: T20 T20 → 20 zu, 60 Punkte (B hat die 20 noch offen)
    const s = cricketStand(2, 0, [A('T20 T20 0')]);
    expect(s.marks[0][0]).toBe(3);
    expect(s.punkte).toEqual([60, 0]);
    expect(s.nutz[0]).toBe(6);
    expect(s.amZug).toBe(1);
  });

  test('keine Punkte mehr, wenn der Gegner die Zahl auch zu hat', () => {
    const s = cricketStand(2, 0, [A('T20 0 0'), A('T20 0 0'), A('T20 0 0')]);
    expect(s.punkte).toEqual([0, 0]);
    expect(s.nutz[0]).toBe(3); // dritte Aufnahme brachte nichts
  });

  test('gewinnt erst, wenn alles zu ist und Punkte nicht hinten', () => {
    const alle = [
      A('T20 T19 T18'), A('T15 T15 0'), // B schließt 15 und macht 45 Punkte (A hat 15 noch offen)
      A('T17 T16 T15'), A('0 0 0'),
      A('Bull 25 0'),                     // A hat alles zu, aber 0 < 45 Punkte
    ];
    let s = cricketStand(2, 0, alle);
    expect(s.marks[0].every((x) => x === 3)).toBe(true);
    expect(s.gewinner).toBeNull();
    // B wirft daneben, A punktet auf der 19 (B hat 19 offen): 3×19=57 … noch 2 Aufnahmen
    s = cricketStand(2, 0, [...alle, A('0 0 0'), A('T19 T19 0')]);
    // nach dem ersten T19 steht es 57:45 → gewonnen, der zweite Dart zählt nicht mehr
    expect(s.punkte[0]).toBe(57);
    expect(s.gewinner).toBe(0);
  });

  test('Spiel endet mitten in der Aufnahme', () => {
    const s = cricketStand(1, 0, [A('T20 T19 T18'), A('T17 T16 T15'), A('Bull 25 T20')]);
    expect(s.gewinner).toBe(0);
    expect(s.darts[0]).toBe(8); // der 9. Dart zählt nicht mehr
  });
});

describe('Variante „Punkte vergeben"', () => {
  test('Punkte gehen an alle, die die Zahl noch offen haben', () => {
    // 3 Spieler: A schließt 20 und trifft nochmal T20 → B und C bekommen je 60
    const s = cricketStand(3, 0, [A('T20 T20 0')], 'vergeben');
    expect(s.punkte).toEqual([0, 60, 60]);
  });
  test('wer die Zahl schon zu hat, bekommt nichts', () => {
    const s = cricketStand(3, 0, [A('T20 0 0'), A('T20 0 0'), A('0 0 0'), A('T20 0 0')], 'vergeben');
    expect(s.punkte).toEqual([0, 0, 60]);
  });
  test('gewonnen: alles zu und die wenigsten Punkte', () => {
    const alle = [
      A('T15 T15 0'), A('T20 T19 T18'), // A gibt B 45 Punkte
      A('T20 T19 T18'), A('T17 T16 T15'),
      A('T17 T16 0'), A('Bull 25 0'),  // B hat alles zu, aber 45 > 0 → noch nicht gewonnen
    ];
    let s = cricketStand(2, 0, alle, 'vergeben');
    expect(s.punkte).toEqual([0, 45]);
    expect(s.gewinner).toBeNull();
    // A schließt Bull → alles zu, 0 Punkte ≤ 45 → A gewinnt
    s = cricketStand(2, 0, [...alle, A('Bull 25 0')], 'vergeben');
    expect(s.gewinner).toBe(0);
  });
  test('bei „Punkte bekommen" wäre dasselbe Spiel anders', () => {
    const s = cricketStand(3, 0, [A('T20 T20 0')], 'bekommen');
    expect(s.punkte).toEqual([60, 0, 0]);
  });
});

describe('Allein spielen', () => {
  test('keine Punkte, nur schließen', () => {
    const s = cricketStand(1, 0, [A('T20 T20 T20')]);
    expect(s.punkte[0]).toBe(0);
    expect(s.nutz[0]).toBe(3);
  });
});

describe('Vorschlag und Kennzahl', () => {
  test('höchste offene Zahl zuerst', () => {
    const s = cricketStand(2, 0, [A('T20 D19 0')]);
    expect(cricketVorschlag(s, 0).slice(0, 2)).toEqual([19, 18]);
  });
  test('alles zu → dort punkten, wo der Gegner offen ist', () => {
    const s = cricketStand(2, 0, [A('T20 T19 T18'), A('T20 T19 T18'), A('T17 T16 T15'), A('T17 T16 T15'), A('Bull 25 0'), A('0 0 0')]);
    expect(cricketVorschlag(s, 0)).toEqual([25]);
  });
  test('Striche pro Runde: 9 Striche in 6 Darts = 4,5', () => {
    expect(mpr(9, 6)).toBe(4.5);
  });
  test('nützliche Striche einer Aufnahme', () => {
    expect(nutzDerAufnahme(2, 0, [A('T20 0 0')], H2('T20 D19 S5'))).toBe(5);
  });
});

function H2(s: string) { return s.split(' ').map(H); }
