import { describe, expect, it } from 'vitest';
import type { Hit, Ziel } from './board';
import { zuruf, type Zuruf } from './coach';
import { bilanz, block, zwischenstand } from './fortschritt';
import type { Aufnahme, Dart } from './speicher';

const T20: Ziel = { seg: 20, ring: 'T' };
let t = 0;
// T20-Mitte liegt bei (0, -103) mm; dy > 0 = tiefer
const dart = (dy: number, dx = 0, hit: Hit = { seg: 20, ring: dy > 6 ? 'SI' : 'T' }): Dart => ({ hit, ziel: T20, t: t++, p: [dx, -103 + dy] });
const auf = (dys: number[], dx = 0): Aufnahme => ({ darts: dys.map((d) => dart(d, dx)), start: t, ende: t, modus: 'training' });

describe('Fortschritt mit Trefferbild', () => {
  it('Richtung stimmt, auch ohne mehr Treffer', () => {
    const ohne = block(Array.from({ length: 5 }, () => auf([12, 13, 11])));
    const mit = block(Array.from({ length: 5 }, () => auf([8, 7, 9])));
    expect(mit.t).toBe(ohne.t);
    const b = bilanz(mit, ohne, 'unten');
    expect(b.geholfen).toBe(true);
    expect(b.text).toContain('die Richtung stimmt');
    expect(b.text).toContain('vorher 12 mm zu tief');
  });

  it('näher dran ohne Richtungs-Tipp', () => {
    const ohne = block(Array.from({ length: 5 }, (_, i) => auf([14, -14, 14], i % 2 ? 10 : -10)));
    const mit = block(Array.from({ length: 5 }, (_, i) => auf([7, -7, 7], i % 2 ? 4 : -4)));
    const b = bilanz(mit, ohne);
    expect(b.geholfen).toBe(true);
    expect(b.text).toMatch(/vom Ziel statt|Enger zusammen/);
  });

  it('nichts besser → anderer Ansatz', () => {
    const ohne = block(Array.from({ length: 5 }, () => auf([8, 8, 8])));
    const mit = block(Array.from({ length: 5 }, () => auf([12, 12, 12])));
    const b = bilanz(mit, ohne, 'unten');
    expect(b.geholfen).toBe(false);
    expect(b.text).toContain('anderen Ansatz');
  });

  it('Zwischenstand für die Fokus-Leiste', () => {
    const ohne = block(Array.from({ length: 3 }, () => auf([12, 12, 12])));
    const mit = block([auf([4, 3, 2]), auf([3, 3, 3])]);
    expect(zwischenstand(mit, ohne, 'unten')).toBe('Treffpunkt 3 mm zu tief · vorher 12 mm zu tief');
    expect(zwischenstand(mit, ohne)).toBe('Abstand 3 mm · vorher 12 mm');
  });
});

describe('Fokus-Tipps wechseln', () => {
  it('gleicher Tipp hilft nicht → nächster Ansatz, kein Text doppelt', () => {
    const sitzung: Aufnahme[] = []; const verlauf: Zuruf[] = [];
    for (let k = 0; k < 90; k++) {
      sitzung.push(auf([10, 11, 9], k % 2 ? 1 : -1)); // immer gleich tief – nichts wird besser
      const z = zuruf(sitzung, [], verlauf);
      if (z) verlauf.push(z);
    }
    const fokus = verlauf.filter((z) => z.art === 'fokus');
    expect(fokus.length).toBeGreaterThanOrEqual(4);
    const texte = fokus.map((z) => z.text);
    expect(new Set(texte).size).toBe(texte.length);
    const eigene = fokus.filter((z) => z.tipp);
    expect(eigene.length).toBeGreaterThanOrEqual(2);
    expect(eigene[1].variante).toBe(1);
    expect(verlauf.filter((z) => z.art === 'bilanz').every((b) => b.geholfen === false)).toBe(true);
  });
});
