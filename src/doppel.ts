// Darts aufs Doppel bei 501/301: Die App schätzt aus dem Rest, der Spieler kann es nach der Aufnahme genau angeben.
import { points, type Hit } from './board';
import type { Aufnahme } from './speicher';

const finishMoeglich = (r: number) => r === 50 || (r >= 2 && r <= 40 && r % 2 === 0);

export interface DoppelFrage {
  /** So viele Darts kommen höchstens in Frage (Rest vor dem Dart 50 oder weniger). */
  max: number;
  /** Mindestens (beim Ausmachen 1). */
  min: number;
  /** Schätzung: Darts mit Rest auf einem Doppel (gerade bis 40 oder 50). */
  schaetzung: number;
}

/** Frage nötig? null, wenn in dieser Aufnahme kein Doppel möglich war. */
export function doppelFrage(rest: number, hits: Hit[], doubleOut: boolean): DoppelFrage | null {
  if (!doubleOut) return null;
  let r = rest; let max = 0; let schaetzung = 0; let check = false;
  for (const h of hits) {
    if (r <= 50 && r >= 2) max++;
    // Bei 50 stellen viele erst mit der 10 auf die 40 – als Doppel-Dart nur schätzen, wenn er im Bull landet
    if (r === 50 ? h.ring === 'DB' || h.ring === 'SB' : finishMoeglich(r)) schaetzung++;
    const nr = r - points(h);
    if (nr === 0) { check = true; break; }
    if (nr <= 1) break; // überworfen
    r = nr;
  }
  if (!max) return null;
  const min = check ? 1 : 0;
  return { max, min, schaetzung: Math.max(min, Math.min(max, schaetzung)) };
}

/** Darts aufs Doppel und Treffer einer Aufnahme – Angabe des Spielers, sonst Schätzung. */
export function doppelWerte(a: Aufnahme): { vers: number; treff: number } {
  if (!(a.doubleOut ?? true)) return { vers: 0, treff: 0 };
  const f = doppelFrage(a.restVorher ?? 0, a.darts.map((d) => d.hit), true);
  if (!f) return { vers: 0, treff: 0 };
  const treff = a.check ? 1 : 0;
  return { vers: Math.max(treff, a.doppelDarts ?? f.schaetzung), treff };
}
