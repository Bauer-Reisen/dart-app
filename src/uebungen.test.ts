import { describe, expect, test } from 'vitest';
import type { Hit } from './board';
import { atcStand, atcTrifft, bobStand, doppelStand } from './uebungen';

const H = (s: string): Hit => {
  if (s === 'Bull') return { seg: 25, ring: 'DB' };
  if (s === '25') return { seg: 25, ring: 'SB' };
  if (s === '0') return { seg: 20, ring: 'MISS' };
  const ring = s[0] === 'T' ? 'T' : s[0] === 'D' ? 'D' : 'SI';
  return { seg: Number(s.slice(1)), ring };
};
const A = (s: string) => ({ hits: s.split(' ').map(H) });

describe('Around the Clock', () => {
  test('Varianten: was zählt', () => {
    expect(atcTrifft('jedes', 1, H('T1'))).toBe(true);
    expect(atcTrifft('doppel', 1, H('S1'))).toBe(false);
    expect(atcTrifft('triple', 1, H('T1'))).toBe(true);
    expect(atcTrifft('jedes', 25, H('25'))).toBe(true);
    expect(atcTrifft('doppel', 25, H('25'))).toBe(false);
  });
  test('weiter zur nächsten Zahl, Fehlwürfe zählen als Darts', () => {
    const s = atcStand(1, 0, [A('S1 S3 S2'), A('S3 0 0')], 'jedes');
    expect(s.pos[0]).toBe(3);
    expect(s.darts[0]).toBe(6);
    expect(s.treffer[0]).toBe(3);
  });
  test('fertig mitten in der Aufnahme', () => {
    const auf = Array.from({ length: 7 }, (_, i) => A(`S${3 * i + 1} S${3 * i + 2} S${3 * i + 3}`).hits.filter((h) => h.seg <= 20));
    const liste = auf.map((hits) => ({ hits }));
    liste.push(A('Bull 0 0'));
    const s = atcStand(1, 0, liste, 'jedes');
    expect(s.gewinner).toBe(0);
    expect(s.darts[0]).toBe(21);
  });
  test('zwei Spieler abwechselnd', () => {
    const s = atcStand(2, 0, [A('S1 0 0'), A('S1 S2 S3')], 'jedes');
    expect(s.pos).toEqual([1, 3]);
    expect(s.amZug).toBe(0);
  });
});

describe("Bob's 27", () => {
  test('Treffer bringen das Doppelte, kein Treffer zieht ab', () => {
    // 27 → D1 zweimal: +4 = 31 → D2 nichts: −4 = 27 → D3 einmal: +6 = 33
    const s = bobStand(1, 0, [A('D1 D1 0'), A('0 0 0'), A('D3 S3 0')]);
    expect(s.punkte).toEqual([33]);
    expect(s.verlauf[0]).toEqual([2, 0, 1]);
    expect(s.runde).toBe(3);
  });
  test('auf 0 oder darunter → aus', () => {
    // 27 −2 −4 −6 −8 = 7, −10 → −3
    const nichts = Array.from({ length: 5 }, () => A('0 0 0'));
    const s = bobStand(1, 0, nichts);
    expect(s.punkte[0]).toBe(-3);
    expect(s.aus[0]).toBe(true);
    expect(s.fertig).toBe(true);
  });
  test('ausgeschiedene Spieler werden übersprungen', () => {
    const a: { hits: Hit[] }[] = [];
    // A trifft immer 1×, B nie → B ist nach Runde 5 aus
    for (let r = 0; r < 5; r++) {
      a.push(A(`D${r + 1} 0 0`), A('0 0 0'));
    }
    let s = bobStand(2, 0, a);
    expect(s.aus).toEqual([false, true]);
    expect(s.amZug).toBe(0);
    a.push(A('D6 0 0'));
    s = bobStand(2, 0, a);
    expect(s.amZug).toBe(0); // B ist aus, A ist wieder dran
    expect(s.runde).toBe(6);
  });
  test('ganz durch: 21 Runden', () => {
    const a = Array.from({ length: 21 }, (_, r) => A(r === 20 ? 'Bull 0 0' : `D${r + 1} 0 0`));
    const s = bobStand(1, 0, a);
    expect(s.fertig).toBe(true);
    expect(s.punkte[0]).toBe(27 + 2 * 210 + 50);
  });
});

describe('Doppeltraining', () => {
  test('Finish: ausgemacht zählt, Darts bis zum Ende', () => {
    const s = doppelStand(1, 0, [A('S16 D8'), A('D10 0 0'), A('S1 0 0')], 'finish', [32, 40, 2]);
    expect(s.erfolge[0]).toBe(1);
    expect(s.verlauf[0]).toEqual([1, 0, 0]);
    expect(s.darts[0]).toBe(2 + 3 + 1); // S1 bei Rest 2 = überworfen nach 1 Dart
  });
  test('festes Doppel: jeder Treffer zählt', () => {
    const s = doppelStand(1, 0, [A('D16 S16 D16'), A('D8 0 0')], 'D16', []);
    expect(s.erfolge[0]).toBe(2);
    expect(s.darts[0]).toBe(6);
  });
  test('Ende nach 10 Runden', () => {
    const a = Array.from({ length: 20 }, (_, k) => (k % 2 ? A('0 0 0') : A('Bull 0 0')));
    const s = doppelStand(2, 0, a, 'Bull', []);
    expect(s.fertig).toBe(true);
    expect(s.gewinner).toEqual([0]);
  });
});
