// Regeln für Cricket (15–20 und Bull, mit Punkten).
import type { Hit, Ziel } from './board';

export const NUMMERN = [20, 19, 18, 17, 16, 15, 25];

/** Wie viele Striche bringt ein Dart, und auf welcher Cricket-Zahl? */
export function striche(h: Hit): { idx: number; n: number } | null {
  const idx = NUMMERN.indexOf(h.seg);
  if (idx < 0) return null;
  switch (h.ring) {
    case 'T': return { idx, n: 3 };
    case 'D':
    case 'DB': return { idx, n: 2 };
    case 'SI':
    case 'SO':
    case 'SB': return { idx, n: 1 };
    default: return null;
  }
}

export interface CricketStand {
  marks: number[][];  // pro Spieler 7 Werte (0–3)
  punkte: number[];
  amZug: number;
  gewinner: number | null;
  darts: number[];
  nutz: number[];     // Striche, die etwas gebracht haben (für "Striche pro Runde")
}

/**
 * Variante:
 * - 'bekommen': Wer eine Zahl zu hat, bekommt selbst Punkte (solange ein Gegner offen hat). Meiste Punkte gewinnt.
 * - 'vergeben': Die Punkte werden den Gegnern aufgeschrieben, die die Zahl noch offen haben. Wenigste Punkte gewinnt.
 */
export type CricketVariante = 'bekommen' | 'vergeben';

function anwenden(st: CricketStand, s: number, idx: number, n: number, variante: CricketVariante): number {
  const vorher = st.marks[s][idx];
  const schliessen = Math.min(n, Math.max(0, 3 - vorher));
  const rest = n - schliessen;
  st.marks[s][idx] = Math.min(3, vorher + n);
  const offen = st.marks.map((m, j) => j !== s && m[idx] < 3);
  let nutzbar = schliessen;
  if (rest > 0 && offen.some(Boolean)) {
    const pkt = rest * NUMMERN[idx];
    if (variante === 'vergeben') offen.forEach((o, j) => { if (o) st.punkte[j] += pkt; });
    else st.punkte[s] += pkt;
    nutzbar += rest;
  }
  st.nutz[s] += nutzbar;
  return nutzbar;
}

function gewonnen(st: CricketStand, s: number, variante: CricketVariante): boolean {
  if (!st.marks[s].every((x) => x >= 3)) return false;
  return st.punkte.every((p, j) => j === s || (variante === 'vergeben' ? st.punkte[s] <= p : st.punkte[s] >= p));
}

/** Spielstand aus allen Aufnahmen (abwechselnd, beginnend mit `starter`). */
export function cricketStand(
  spielerZahl: number,
  starter: number,
  aufnahmen: { hits: Hit[] }[],
  variante: CricketVariante = 'bekommen',
): CricketStand {
  const st: CricketStand = {
    marks: Array.from({ length: spielerZahl }, () => Array(7).fill(0)),
    punkte: Array(spielerZahl).fill(0),
    amZug: 0,
    gewinner: null,
    darts: Array(spielerZahl).fill(0),
    nutz: Array(spielerZahl).fill(0),
  };
  aufnahmen.forEach((a, k) => {
    const s = (starter + k) % spielerZahl;
    for (const h of a.hits) {
      if (st.gewinner !== null) return;
      st.darts[s]++;
      const x = striche(h);
      if (x) anwenden(st, s, x.idx, x.n, variante);
      if (gewonnen(st, s, variante)) st.gewinner = s;
    }
  });
  st.amZug = (starter + aufnahmen.length) % spielerZahl;
  return st;
}

/** Nützliche Striche einer einzelnen Aufnahme (für die Statistik). */
export function nutzDerAufnahme(
  spielerZahl: number, starter: number, vorher: { hits: Hit[] }[], hits: Hit[], variante: CricketVariante = 'bekommen',
): number {
  const s = (starter + vorher.length) % spielerZahl;
  const a = cricketStand(spielerZahl, starter, vorher, variante).nutz[s];
  const b = cricketStand(spielerZahl, starter, [...vorher, { hits }], variante).nutz[s];
  return b - a;
}

export function zielVon(seg: number): Ziel {
  return seg === 25 ? { seg: 25, ring: 'B' } : { seg, ring: 'T' };
}

/** Vorschlag: höchste eigene offene Zahl; ist alles zu, dort punkten, wo Gegner noch offen sind. */
export function cricketVorschlag(st: CricketStand, s: number): number[] {
  const eigeneOffen = NUMMERN.filter((_, i) => st.marks[s][i] < 3);
  if (eigeneOffen.length) return eigeneOffen;
  const punkten = NUMMERN.filter((_, i) => st.marks.some((m, j) => j !== s && m[i] < 3));
  return punkten.length ? punkten : [20];
}

/** Striche pro Runde (3 Darts). */
export function mpr(nutz: number, darts: number): number | null {
  return darts > 0 ? (nutz / darts) * 3 : null;
}

export function zeichen(n: number): string {
  return n <= 0 ? '' : n === 1 ? '/' : n === 2 ? '✕' : 'ⓧ';
}
