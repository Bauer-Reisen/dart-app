// Mehrere Spieler auf einem Gerät (z. B. Tablet im Vereinsheim).
// Jede Aufnahme trägt den Namen des Spielers (fehlt er: „Ich" – so war es vor Version 0.5).
import { ICH, type Aufnahme, type Match } from './speicher';

export const COMPUTER_NAME = 'Computer';
const KEY = 'dart-spieler';

export interface SpielerStand { liste: string[]; aktiv: string }

export function spielerLaden(): SpielerStand {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as SpielerStand | null;
    if (s && Array.isArray(s.liste) && s.liste.length && typeof s.aktiv === 'string') return s;
  } catch { /* egal */ }
  return { liste: [ICH], aktiv: ICH };
}

export function spielerSpeichern(s: SpielerStand): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* egal */ }
}

export const werVon = (a: Aufnahme) => a.spieler ?? ICH;

/** Alle bekannten Spieler: eigene Liste plus alle Namen aus den Würfen (ohne Computer), Liste zuerst. */
export function alleSpieler(s: SpielerStand, aufnahmen: Aufnahme[]): string[] {
  const aus = aufnahmen.filter((a) => !a.bot).map(werVon);
  return [...new Set([...s.liste, ...aus])].filter((n) => n && n !== COMPUTER_NAME);
}

/** nuLiga schreibt „Nachname, Vorname“ – in der App lieber „Vorname Nachname“. */
export function anzeigeName(n: string): string {
  const m = n.match(/^\s*([^,]+),\s*(.+)$/);
  return (m ? `${m[2]} ${m[1]}` : n).trim().replace(/\s+/g, ' ');
}

export function nameOk(n: string): string | null {
  const t = n.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (t.toLowerCase() === COMPUTER_NAME.toLowerCase()) return null;
  return t.slice(0, 24);
}

/** Spieler umbenennen: alle Würfe, die Spielerliste und laufende Spiele gehen mit. Gibt es den neuen Namen schon, werden beide zusammengeführt. */
export function umbenennen(
  alt: string, neu: string, aufnahmen: Aufnahme[], s: SpielerStand,
): { aufnahmen: Aufnahme[]; stand: SpielerStand } {
  const auf = aufnahmen.map((a) => (werVon(a) === alt && !a.bot ? { ...a, spieler: neu } : a));
  const liste = [...new Set(s.liste.map((n) => (n === alt ? neu : n)))];
  return { aufnahmen: auf, stand: { liste, aktiv: s.aktiv === alt ? neu : s.aktiv } };
}

export function matchUmbenennen(m: Match | null, alt: string, neu: string): Match | null {
  if (!m || !m.spieler.includes(alt)) return m;
  return { ...m, spieler: m.spieler.map((n, i) => (n === alt && i !== m.computer?.platz ? neu : n)) };
}
