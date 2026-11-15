// Regeln für Halve-It: Jede Runde ein festes Ziel. Kein Treffer in der Runde → Punktestand halbieren.
import { points, type Hit, type Ziel } from './board';

export type Runde =
  | { typ: 'zahl'; seg: number }
  | { typ: 'doppel' }
  | { typ: 'triple' }
  | { typ: 'bull' };

/** Rundenfolge (eine verbreitete Variante): 15, 16, Doppel, 17, 18, Triple, 19, 20, Bull. */
export const RUNDEN: Runde[] = [
  { typ: 'zahl', seg: 15 },
  { typ: 'zahl', seg: 16 },
  { typ: 'doppel' },
  { typ: 'zahl', seg: 17 },
  { typ: 'zahl', seg: 18 },
  { typ: 'triple' },
  { typ: 'zahl', seg: 19 },
  { typ: 'zahl', seg: 20 },
  { typ: 'bull' },
];

export function rundenName(r: Runde): string {
  switch (r.typ) {
    case 'zahl': return String(r.seg);
    case 'doppel': return 'Doppel';
    case 'triple': return 'Triple';
    case 'bull': return 'Bull';
  }
}

export function rundenKurz(r: Runde): string {
  return r.typ === 'doppel' ? 'D' : r.typ === 'triple' ? 'T' : r.typ === 'bull' ? 'B' : String(r.seg);
}

/** Zählt dieser Dart in dieser Runde? */
export function zaehlt(r: Runde, h: Hit): boolean {
  switch (r.typ) {
    case 'zahl': return h.seg === r.seg && ['SI', 'SO', 'D', 'T'].includes(h.ring);
    case 'doppel': return h.ring === 'D' || h.ring === 'DB';
    case 'triple': return h.ring === 'T';
    case 'bull': return h.ring === 'SB' || h.ring === 'DB';
  }
}

export function rundenPunkte(r: Runde, hits: Hit[]): number {
  return hits.filter((h) => zaehlt(r, h)).reduce((s, h) => s + points(h), 0);
}

/** Vorgeschlagenes Ziel und Ausweich-Ziele der Runde. */
export function rundenZiele(r: Runde): Ziel[] {
  switch (r.typ) {
    case 'zahl': return [{ seg: r.seg, ring: 'T' }, { seg: r.seg, ring: 'S' }, { seg: r.seg, ring: 'D' }];
    case 'doppel': return [{ seg: 20, ring: 'D' }, { seg: 16, ring: 'D' }, { seg: 8, ring: 'D' }];
    case 'triple': return [{ seg: 20, ring: 'T' }, { seg: 19, ring: 'T' }, { seg: 18, ring: 'T' }];
    case 'bull': return [{ seg: 25, ring: 'B' }];
  }
}

/** Bei "beliebiges Doppel/Triple" ist das Ziel nur dann bekannt, wenn man es selbst gewählt hat. */
export function zielFrei(r: Runde): boolean {
  return r.typ === 'doppel' || r.typ === 'triple';
}

export interface HalveStand {
  punkte: number[];
  verlauf: number[][]; // pro Spieler: Punkte je Runde (0 = halbiert)
  halbiert: number[];
  amZug: number;
  runde: number;       // Rundennummer (0-basiert) des Spielers am Zug
  fertig: boolean;
  gewinner: number[];  // bei Gleichstand mehrere
}

export function halveStand(spielerZahl: number, starter: number, aufnahmen: { hits: Hit[] }[]): HalveStand {
  const punkte = Array(spielerZahl).fill(0);
  const verlauf = Array.from({ length: spielerZahl }, () => [] as number[]);
  const halbiert = Array(spielerZahl).fill(0);
  const max = RUNDEN.length * spielerZahl;
  aufnahmen.slice(0, max).forEach((a, k) => {
    const s = (starter + k) % spielerZahl;
    const r = RUNDEN[Math.floor(k / spielerZahl)];
    const p = rundenPunkte(r, a.hits);
    if (p > 0) punkte[s] += p;
    else {
      punkte[s] = Math.floor(punkte[s] / 2);
      halbiert[s]++;
    }
    verlauf[s].push(p);
  });
  const k = Math.min(aufnahmen.length, max);
  const fertig = k >= max;
  const best = Math.max(...punkte);
  return {
    punkte, verlauf, halbiert,
    amZug: (starter + k) % spielerZahl,
    runde: Math.min(Math.floor(k / spielerZahl), RUNDEN.length - 1),
    fertig,
    gewinner: fertig ? punkte.map((p, i) => (p === best ? i : -1)).filter((i) => i >= 0) : [],
  };
}
