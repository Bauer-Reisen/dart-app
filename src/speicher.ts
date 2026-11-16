// Speichert alles nur auf diesem Gerät. (Prototyp: localStorage; später IndexedDB.)
import { points, type Hit, type Ziel } from './board';

export interface Dart {
  hit: Hit;
  ziel: Ziel;
  t: number; // Zeitpunkt des Tipps (ms)
  /** Getippte Stelle auf einer echten Scheibe in mm (Mitte = 0/0, x rechts, y unten); fehlt bei Abpraller, „3× gleich“ und alten Daten. */
  p?: [number, number];
  frei?: boolean; // Halve-It "beliebiges Doppel/Triple": Ziel nicht bekannt → nicht ins Trefferbild
}

export interface Aufnahme {
  darts: Dart[];
  start: number; // erster Tipp
  ende: number;  // letzter Tipp
  modus?: 'training' | SpielArt; // fehlt bei alten Daten = training
  wert?: number;              // Cricket: nützliche Striche · Halve-It: Punkte der Runde
  runde?: number;             // Halve-It, Bob's 27, Doppeltraining: Rundennummer
  option?: string;            // Variante (Around the Clock, Doppeltraining)
  spieler?: string;           // fehlt = "Ich"
  legId?: string;
  restVorher?: number;
  doubleOut?: boolean;
  bust?: boolean;
  check?: boolean;
  doppelDarts?: number; // 501: vom Spieler angegeben – so viele Darts dieser Aufnahme gingen aufs Doppel
  bot?: boolean; // Wurf des Computer-Gegners: zählt nicht in die Statistik
  gruppe?: boolean; // in der Gruppe geworfen (für übernommene Würfe, deren Mitspieler fehlen)
}

export const ICH = 'Ich';

/** Alle Darts eines Spielers (für Trefferbild und Tipps). */
export function aufnahmenVon(aufnahmen: Aufnahme[], spieler: string): Aufnahme[] {
  return aufnahmen.filter((a) => !a.bot && (a.spieler ?? ICH) === spieler);
}

export function dartsVon(aufnahmen: Aufnahme[], spieler: string): Dart[] {
  return aufnahmen.filter((a) => (a.spieler ?? ICH) === spieler).flatMap((a) => a.darts);
}

interface Datei {
  schemaVersion: 1;
  aufnahmen: Aufnahme[];
  liga?: unknown; // Liga-Daten (Spieltage, Ergebnisse)
}

const KEY = 'dart-training-v1';

/**
 * Nur Darts mit bekanntem Ziel zählen für Trefferquoten, Trefferbild und Tipps.
 * Cricket: nie – man weiß nicht, ob jemand zumacht oder dem Gegner Punkte gibt.
 * 501/301: nur der Dart aufs Doppel zum Ausmachen (beim Punkten weiß man nicht, ob T20 oder T19).
 * Neue Würfe werden schon beim Eintippen so markiert; das hier bereinigt ältere Daten (vor 0.8.0) und geladene Dateien.
 */
export function zielBereinigen(a: Aufnahme): Aufnahme {
  if (a.modus === 'cricket') {
    return a.darts.every((d) => d.frei) ? a : { ...a, darts: a.darts.map((d) => ({ ...d, frei: true })) };
  }
  if (a.modus === 'x01') {
    let r = a.restVorher ?? 0;
    let neu = false;
    const darts = a.darts.map((d) => {
      const ziel = d.ziel.seg === 25 ? 50 : d.ziel.ring === 'D' ? d.ziel.seg * 2 : -1;
      const bekannt = (a.doubleOut ?? true) && ziel === r;
      r -= points(d.hit);
      if (bekannt || d.frei) return d;
      neu = true;
      return { ...d, frei: true };
    });
    return neu ? { ...a, darts } : a;
  }
  return a;
}

export function laden(): Aufnahme[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const d = JSON.parse(raw) as Datei;
    return Array.isArray(d.aufnahmen) ? d.aufnahmen.map(zielBereinigen) : [];
  } catch {
    return [];
  }
}

export function speichern(aufnahmen: Aufnahme[]): void {
  try {
    const d: Datei = { schemaVersion: 1, aufnahmen };
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* Speicher voll oder gesperrt: Daten bleiben bis zum Neuladen erhalten */
  }
}

export function alsDateiSichern(aufnahmen: Aufnahme[], liga?: unknown): void {
  const d: Datei = { schemaVersion: 1, aufnahmen, liga };
  const blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dart-training-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function ausDateiLaden(file: File): Promise<{ aufnahmen: Aufnahme[]; liga?: unknown }> {
  const d = JSON.parse(await file.text()) as Datei;
  if (d.schemaVersion !== 1 || !Array.isArray(d.aufnahmen)) throw new Error('Unbekannte Datei');
  return { aufnahmen: d.aufnahmen.map(zielBereinigen), liga: d.liga };
}

// ---------- laufende Spiele (je Spielart eins, damit es nach Neuladen weitergeht) ----------

export type SpielArt = 'x01' | 'cricket' | 'halveit' | 'atc' | 'bobs' | 'doppel';

export interface X01Leg {
  id: string;
  starter: number;
  gewinner: number | null;
  reste?: number[]; // Doppeltraining "Finish": Rest je Runde
}

export interface Match {
  id: string;
  art?: SpielArt; // fehlt = x01
  spieler: string[];
  start: number;      // nur 501/301
  doubleOut: boolean; // nur 501/301
  variante?: 'bekommen' | 'vergeben'; // nur Cricket, fehlt = bekommen
  option?: string; // Around the Clock: jedes/doppel/triple · Doppeltraining: finish/D16/…
  legs: X01Leg[];
  computer?: { platz: number; avg: number }; // 501 gegen den Computer
  legsZiel?: number; // Match endet, wenn jemand so viele Legs hat (fehlt = offen)
}
export type X01Match = Match;

const keyMatch = (art: SpielArt) => `dart-${art}-laufend`;

export function matchLaden(art: SpielArt): Match | null {
  try {
    const raw = localStorage.getItem(keyMatch(art));
    return raw ? (JSON.parse(raw) as Match) : null;
  } catch {
    return null;
  }
}

export function matchSpeichern(art: SpielArt, m: Match | null): void {
  try {
    if (m) localStorage.setItem(keyMatch(art), JSON.stringify(m));
    else localStorage.removeItem(keyMatch(art));
  } catch { /* egal */ }
}

export function neueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
