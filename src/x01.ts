// Regeln für 501 / 301.
import { points, type Hit } from './board';

export interface X01Regeln {
  start: number;      // 501 oder 301
  doubleOut: boolean; // letzter Dart muss ein Doppel (oder Bull) sein
}

export interface Auswertung {
  restNachher: number;
  bust: boolean;  // überworfen: Rest bleibt wie vor der Aufnahme
  check: boolean; // Leg gewonnen
  /** Nach wie vielen Darts die Aufnahme endet (bei Bust/Check früher als 3). */
  endetNach: number | null;
  punkte: number; // gewertete Punkte (bei Bust 0)
}

export function istDoppel(h: Hit): boolean {
  return h.ring === 'D' || h.ring === 'DB';
}

export function auswerten(rest: number, hits: Hit[], doubleOut: boolean): Auswertung {
  let r = rest;
  for (let i = 0; i < hits.length; i++) {
    const nr = r - points(hits[i]);
    const bust = nr < 0 || (doubleOut && nr === 1) || (nr === 0 && doubleOut && !istDoppel(hits[i]));
    if (bust) return { restNachher: rest, bust: true, check: false, endetNach: i + 1, punkte: 0 };
    if (nr === 0) return { restNachher: 0, bust: false, check: true, endetNach: i + 1, punkte: rest };
    r = nr;
  }
  return { restNachher: r, bust: false, check: false, endetNach: hits.length >= 3 ? 3 : null, punkte: rest - r };
}

/** Ist die Aufnahme zu Ende (3 Darts, überworfen oder ausgemacht)? */
export function aufnahmeFertig(rest: number, hits: Hit[], doubleOut: boolean): boolean {
  return auswerten(rest, hits, doubleOut).endetNach !== null;
}

export interface LegAufnahme {
  hits: Hit[];
}

export interface LegStand {
  rest: number[];
  amZug: number;
  gewinner: number | null;
  darts: number[];
  punkte: number[];
}

/** Spielstand eines Legs aus der Liste der Aufnahmen (abwechselnd, beginnend mit `starter`). */
export function legStand(spielerZahl: number, starter: number, regeln: X01Regeln, aufnahmen: LegAufnahme[]): LegStand {
  const rest = Array(spielerZahl).fill(regeln.start);
  const darts = Array(spielerZahl).fill(0);
  const punkte = Array(spielerZahl).fill(0);
  let gewinner: number | null = null;
  aufnahmen.forEach((a, k) => {
    if (gewinner !== null) return;
    const s = (starter + k) % spielerZahl;
    const e = auswerten(rest[s], a.hits, regeln.doubleOut);
    rest[s] = e.restNachher;
    darts[s] += a.hits.length;
    punkte[s] += e.punkte;
    if (e.check) gewinner = s;
  });
  return { rest, amZug: (starter + aufnahmen.length) % spielerZahl, gewinner, darts, punkte };
}

/** 3-Dart-Durchschnitt. */
export function average(punkte: number, darts: number): number | null {
  return darts > 0 ? (punkte / darts) * 3 : null;
}
