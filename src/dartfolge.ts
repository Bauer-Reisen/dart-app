// Wie sicher ist der 1., 2. und 3. Dart einer Aufnahme – und hilft ein Treffer beim nächsten?
import { sameZiel, type Ziel } from './board';
import { klasse } from './klassen';
import type { Aufnahme } from './speicher';

export interface Quote { treffer: number; n: number }
export interface Dartfolge {
  /** Trefferquote nach Position in der Aufnahme (Index 0 = 1. Dart). */
  position: [Quote, Quote, Quote];
  /** Nächster Dart aufs selbe Ziel, wenn der vorige getroffen bzw. nicht getroffen hat. */
  nachTreffer: Quote;
  nachFehlwurf: Quote;
}

/** Ab so vielen Darts in einer Gruppe wird eine Quote gezeigt. */
export const MIN_N = 10;

const leer = (): Quote => ({ treffer: 0, n: 0 });

export function dartfolge(aufnahmen: Aufnahme[], ziel: Ziel): Dartfolge {
  const f: Dartfolge = { position: [leer(), leer(), leer()], nachTreffer: leer(), nachFehlwurf: leer() };
  for (const a of aufnahmen) {
    let vorher: boolean | null = null; // Ergebnis des vorigen Darts aufs selbe Ziel
    a.darts.forEach((d, i) => {
      if (d.frei || !sameZiel(d.ziel, ziel) || d.hit.ring === 'BOUNCE' || i > 2) { vorher = null; return; }
      const t = klasse(d.ziel, d.hit) === 'treffer';
      const p = f.position[i];
      p.n++; if (t) p.treffer++;
      if (vorher !== null) {
        const q = vorher ? f.nachTreffer : f.nachFehlwurf;
        q.n++; if (t) q.treffer++;
      }
      vorher = t;
    });
  }
  return f;
}

export function quoteText(q: Quote): string {
  return q.n >= MIN_N ? `${Math.round((q.treffer / q.n) * 100)} %` : '–';
}
