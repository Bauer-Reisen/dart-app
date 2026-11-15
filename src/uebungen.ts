// Regeln für Around the Clock, Bob's 27 und Doppeltraining.
import type { Hit, Ziel } from './board';
import { auswerten } from './x01';

type Liste = { hits: Hit[] }[];

// ===================== Around the Clock =====================

export type AtcVariante = 'jedes' | 'doppel' | 'triple';
/** 1 bis 20, dann Bull. */
export const ATC_FOLGE = [...Array.from({ length: 20 }, (_, i) => i + 1), 25];
export const ATC_NAME: Record<AtcVariante, string> = { jedes: 'jedes Feld', doppel: 'nur Doppel', triple: 'nur Triple' };

export function atcTrifft(v: AtcVariante, nummer: number, h: Hit): boolean {
  if (nummer === 25) return v === 'doppel' ? h.ring === 'DB' : h.ring === 'SB' || h.ring === 'DB';
  if (h.seg !== nummer) return false;
  if (v === 'doppel') return h.ring === 'D';
  if (v === 'triple') return h.ring === 'T';
  return ['SI', 'SO', 'D', 'T'].includes(h.ring);
}

export function atcZiel(v: AtcVariante, nummer: number): Ziel {
  if (nummer === 25) return { seg: 25, ring: 'B' };
  return { seg: nummer, ring: v === 'doppel' ? 'D' : v === 'triple' ? 'T' : 'S' };
}

export interface AtcStand {
  pos: number[];      // Index in ATC_FOLGE (21 = fertig)
  darts: number[];
  treffer: number[];
  amZug: number;
  gewinner: number | null;
}

export function atcStand(n: number, starter: number, aufnahmen: Liste, v: AtcVariante): AtcStand {
  const pos = Array(n).fill(0), darts = Array(n).fill(0), treffer = Array(n).fill(0);
  let gewinner: number | null = null;
  aufnahmen.forEach((a, k) => {
    if (gewinner !== null) return;
    const s = (starter + k) % n;
    for (const h of a.hits) {
      darts[s]++;
      if (atcTrifft(v, ATC_FOLGE[pos[s]], h)) {
        pos[s]++;
        treffer[s]++;
        if (pos[s] >= ATC_FOLGE.length) { gewinner = s; break; }
      }
    }
  });
  return { pos, darts, treffer, amZug: (starter + aufnahmen.length) % n, gewinner };
}

// ===================== Bob's 27 =====================

export const BOB_FOLGE = ATC_FOLGE; // D1 … D20, Bull
export const BOB_START = 27;
export const bobWert = (nummer: number) => (nummer === 25 ? 50 : nummer * 2);
export const bobTrifft = (nummer: number, h: Hit) => (nummer === 25 ? h.ring === 'DB' : h.seg === nummer && h.ring === 'D');
export const bobZiel = (nummer: number): Ziel => (nummer === 25 ? { seg: 25, ring: 'B' } : { seg: nummer, ring: 'D' });

export interface BobStand {
  punkte: number[];
  verlauf: number[][]; // Treffer je Runde
  aus: boolean[];      // auf 0 oder darunter gefallen
  amZug: number;
  runde: number;       // Runde des Spielers am Zug
  fertig: boolean;
  gewinner: number[];
}

/** Reihum, wer ausgeschieden ist, wird übersprungen. */
export function bobStand(n: number, starter: number, aufnahmen: Liste): BobStand {
  const punkte = Array(n).fill(BOB_START);
  const verlauf = Array.from({ length: n }, () => [] as number[]);
  const aus = Array(n).fill(false);
  let k = 0;
  let next: { s: number; r: number } | null = null;
  runden: for (let r = 0; r < BOB_FOLGE.length; r++) {
    for (let j = 0; j < n; j++) {
      const s = (starter + j) % n;
      if (aus[s]) continue;
      if (k >= aufnahmen.length) { next = { s, r }; break runden; }
      const t = aufnahmen[k++].hits.filter((h) => bobTrifft(BOB_FOLGE[r], h)).length;
      const w = bobWert(BOB_FOLGE[r]);
      punkte[s] += t ? t * w : -w;
      verlauf[s].push(t);
      if (punkte[s] <= 0) aus[s] = true;
    }
  }
  const fertig = next === null;
  let gewinner: number[] = [];
  if (fertig) {
    // weiter gekommen schlägt mehr Punkte
    const wert = (i: number) => verlauf[i].length * 100000 + punkte[i];
    const best = Math.max(...punkte.map((_, i) => wert(i)));
    gewinner = punkte.map((_, i) => i).filter((i) => wert(i) === best);
  }
  return { punkte, verlauf, aus, amZug: next?.s ?? starter, runde: next?.r ?? BOB_FOLGE.length - 1, fertig, gewinner };
}

// ===================== Doppeltraining =====================

/** 'finish' = Rest 2–40 ausmachen; sonst ein festes Doppel, z. B. 'D16' oder 'Bull'. */
export type DoppelOption = string;
export const DOPPEL_RUNDEN = 10;

export function doppelZiel(o: DoppelOption): Ziel {
  return o === 'Bull' ? { seg: 25, ring: 'B' } : { seg: Number(o.slice(1)), ring: 'D' };
}
export function doppelTrifft(o: DoppelOption, h: Hit): boolean {
  return o === 'Bull' ? h.ring === 'DB' : h.ring === 'D' && h.seg === Number(o.slice(1));
}

/** Zufällige gerade Reste 2–40 (jeder Rest mit einem Dart ausmachbar). */
export function zufallsReste(anzahl = DOPPEL_RUNDEN): number[] {
  return Array.from({ length: anzahl }, () => 2 * (1 + Math.floor(Math.random() * 20)));
}

export interface DoppelStand {
  erfolge: number[];  // Finish: ausgemacht · festes Doppel: Treffer
  darts: number[];
  verlauf: number[][];
  amZug: number;
  runde: number;
  fertig: boolean;
  gewinner: number[];
}

export function doppelStand(n: number, starter: number, aufnahmen: Liste, o: DoppelOption, reste: number[]): DoppelStand {
  const erfolge = Array(n).fill(0), darts = Array(n).fill(0);
  const verlauf = Array.from({ length: n }, () => [] as number[]);
  const max = DOPPEL_RUNDEN * n;
  aufnahmen.slice(0, max).forEach((a, k) => {
    const s = (starter + k) % n;
    const r = Math.floor(k / n);
    let e: number;
    if (o === 'finish') {
      const aw = auswerten(reste[r] ?? 40, a.hits, true);
      e = aw.check ? 1 : 0;
      darts[s] += aw.endetNach ?? a.hits.length;
    } else {
      e = a.hits.filter((h) => doppelTrifft(o, h)).length;
      darts[s] += a.hits.length;
    }
    erfolge[s] += e;
    verlauf[s].push(e);
  });
  const k = Math.min(aufnahmen.length, max);
  const fertig = k >= max;
  const best = Math.max(...erfolge);
  return {
    erfolge, darts, verlauf,
    amZug: (starter + k) % n,
    runde: Math.min(Math.floor(k / n), DOPPEL_RUNDEN - 1),
    fertig,
    gewinner: fertig ? erfolge.map((_, i) => i).filter((i) => erfolge[i] === best) : [],
  };
}
