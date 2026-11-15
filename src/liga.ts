// Liga: Spieltage, Ergebnisse, Vorbereitung. Alles nur auf diesem Gerät.
import { ICH, neueId, type Aufnahme } from './speicher';
import { auswerten } from './x01';

export interface LigaSpiel {
  id: string;
  art: 'einzel' | 'doppel';
  gegner: string;      // Name des Gegners (bei Doppel: beide)
  legsIch: number;
  legsGegner: number;
  average?: number;    // eigener Average laut Spielbericht
  notiz?: string;
}

export interface Spieltag {
  id: string;
  datum: string;       // JJJJ-MM-TT
  zeit?: string;       // HH:MM
  gegner: string;      // gegnerische Mannschaft
  heim: boolean;
  avgVon?: number;     // Averages der gegnerischen Spieler (von–bis)
  avgBis?: number;
  spiele: LigaSpiel[];
  notiz?: string;
  ergebnis?: string;   // Mannschaftsergebnis aus Sicht der eigenen Mannschaft (nuLiga)
  average?: number;    // eigener Average des Abends laut Spielbericht (nuLiga)
}

export interface Simulation {
  id: string;
  zeit: number;        // ms
  gegnerAvg: number;
  legsIch: number;
  legsComputer: number;
  average: number | null;
}

export interface LigaDaten {
  legsZiel: number;    // Legs zum Sieg eines Spiels (z. B. 3 = "Best of 5")
  link?: string;       // Seite der eigenen Liga (z. B. nuLiga)
  spieltage: Spieltag[];
  simulationen: Simulation[];
  nuliga?: NuLigaVerbindung;
}

/** Verbindung zu nuLiga: wer man ist und in welcher Liga. */
export interface NuLigaVerbindung {
  region: string;
  staffel: string;
  staffelName: string;
  team: string;
  teamName: string;
  person: string;
  name: string;
  stand?: number; // letzte Aktualisierung (ms)
}

// Liga-Daten je Spieler (mehrere Ligaspieler auf einem Gerät). Speicher: dart-liga-spieler = { Name: LigaDaten }.
// Alte Daten (vor 0.7, ein gemeinsamer Stand unter dart-liga) gehören dem ersten Spieler der Liste – das war „Ich“.
const KEY_ALT = 'dart-liga';
const KEY = 'dart-liga-spieler';
export const LEER: LigaDaten = { legsZiel: 3, spieltage: [], simulationen: [] };

function pruefen(d: Partial<LigaDaten> | null | undefined): LigaDaten {
  if (!d) return LEER;
  return {
    legsZiel: d.legsZiel ?? 3,
    link: d.link,
    spieltage: Array.isArray(d.spieltage) ? d.spieltage : [],
    simulationen: Array.isArray(d.simulationen) ? d.simulationen : [],
    nuliga: d.nuliga,
  };
}

function ersterSpieler(): string {
  try {
    const s = JSON.parse(localStorage.getItem('dart-spieler') ?? 'null');
    if (s && Array.isArray(s.liste) && s.liste[0]) return s.liste[0];
  } catch { /* egal */ }
  return ICH;
}

/** Alle Liga-Stände (für Sichern/Laden und Umbenennen). */
export function ligaAlle(): Record<string, LigaDaten> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Record<string, LigaDaten>;
    const alt = localStorage.getItem(KEY_ALT);
    if (alt) {
      const m = { [ersterSpieler()]: pruefen(JSON.parse(alt)) };
      localStorage.setItem(KEY, JSON.stringify(m));
      localStorage.removeItem(KEY_ALT);
      return m;
    }
  } catch { /* egal */ }
  return {};
}

export function ligaAlleSetzen(m: Record<string, LigaDaten>): void {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* egal */ }
}

export function ligaLaden(spieler = ICH): LigaDaten {
  return pruefen(ligaAlle()[spieler]);
}

export function ligaSpeichern(d: LigaDaten, spieler = ICH): void {
  ligaAlleSetzen({ ...ligaAlle(), [spieler]: d });
}

/** Beim Umbenennen eines Spielers mitnehmen (hat der neue Name schon Liga-Daten, bleiben diese). */
export function ligaUmbenennen(alt: string, neu: string): void {
  const m = ligaAlle();
  if (!m[alt]) return;
  if (!m[neu] || (!m[neu].spieltage.length && !m[neu].nuliga)) m[neu] = m[alt];
  delete m[alt];
  ligaAlleSetzen(m);
}

/** Ergebnis eines Übungs-Matches gegen den Computer festhalten. */
export function simulationMerken(s: Omit<Simulation, 'id'>, spieler = ICH): void {
  const d = ligaLaden(spieler);
  ligaSpeichern({ ...d, simulationen: [...d.simulationen, { ...s, id: neueId() }] }, spieler);
}

// ---------------- Datum ----------------

export function heuteText(jetzt = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${jetzt.getFullYear()}-${p(jetzt.getMonth() + 1)}-${p(jetzt.getDate())}`;
}

/** Kalendertage von heute bis zum Datum (0 = heute, negativ = vorbei). */
export function tageBis(datum: string, jetzt = new Date()): number {
  const [j, m, t] = datum.split('-').map(Number);
  const ziel = Date.UTC(j, m - 1, t);
  const heute = Date.UTC(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  return Math.round((ziel - heute) / 86400000);
}

const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export function datumText(datum: string): string {
  const [j, m, t] = datum.split('-').map(Number);
  const wt = TAGE[new Date(j, m - 1, t).getDay()];
  return `${wt} ${String(t).padStart(2, '0')}.${String(m).padStart(2, '0')}.${String(j).slice(2)}`;
}

export function sortiert(liste: Spieltag[]): Spieltag[] {
  return [...liste].sort((a, b) => (a.datum + (a.zeit ?? '')).localeCompare(b.datum + (b.zeit ?? '')));
}

export function naechsterSpieltag(liste: Spieltag[], jetzt = new Date()): Spieltag | null {
  return sortiert(liste).find((s) => tageBis(s.datum, jetzt) >= 0) ?? null;
}

export function letzterSpieltag(liste: Spieltag[], jetzt = new Date()): Spieltag | null {
  const vorbei = sortiert(liste).filter((s) => tageBis(s.datum, jetzt) < 0);
  return vorbei[vorbei.length - 1] ?? null;
}

// ---------------- Vorbereitung ----------------

export type Phase = 'heute' | 'locker' | 'simulation' | 'schwaechen';

export function phase(tage: number): Phase {
  if (tage <= 0) return 'heute';
  if (tage <= 2) return 'locker';
  if (tage <= 7) return 'simulation';
  return 'schwaechen';
}

export interface Staerken { schwach: number; mittel: number; stark: number; geschaetzt: boolean }

/** Drei Stärken für den Computer aus der Spannbreite der Gegner-Averages. */
export function staerken(s: Spieltag | null, eigenerAvg: number | null): Staerken {
  if (s?.avgVon && s?.avgBis) {
    const lo = Math.min(s.avgVon, s.avgBis);
    const hi = Math.max(s.avgVon, s.avgBis);
    return { schwach: Math.round(lo), mittel: Math.round((lo + hi) / 2), stark: Math.round(hi), geschaetzt: false };
  }
  const m = Math.round(eigenerAvg ?? 45);
  return { schwach: Math.max(20, m - 8), mittel: m, stark: m + 8, geschaetzt: true };
}

// ---------------- Auswertung ----------------

export const gewonnen = (s: LigaSpiel) => s.legsIch > s.legsGegner;

export function spieltagAverage(s: Spieltag): number | null {
  if (s.average) return s.average;
  const av = s.spiele.filter((x) => x.art === 'einzel' && x.average).map((x) => x.average!);
  return av.length ? av.reduce((a, b) => a + b, 0) / av.length : null;
}

export function bilanz(liste: Spieltag[]) {
  const spiele = liste.flatMap((s) => s.spiele);
  const einzel = spiele.filter((s) => s.art === 'einzel');
  const doppel = spiele.filter((s) => s.art === 'doppel');
  const avs = liste.map(spieltagAverage).filter((x): x is number => x !== null); // je Abend
  return {
    einzelSiege: einzel.filter(gewonnen).length,
    einzel: einzel.length,
    doppelSiege: doppel.filter(gewonnen).length,
    doppel: doppel.length,
    average: avs.length ? avs.reduce((a, b) => a + b, 0) / avs.length : null,
  };
}

const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');

/** Frühere Spiele gegen diesen Gegner (neueste zuerst). */
export function gegnerVerlauf(liste: Spieltag[], name: string, ohneSpiel?: string) {
  if (!norm(name)) return [];
  return sortiert(liste)
    .flatMap((st) => st.spiele.filter((s) => s.id !== ohneSpiel && norm(s.gegner) === norm(name)).map((s) => ({ st, s })))
    .reverse();
}

export function gegnerNamen(liste: Spieltag[]): string[] {
  const m = new Map<string, string>();
  for (const st of liste) for (const s of st.spiele) if (s.gegner.trim()) m.set(norm(s.gegner), s.gegner.trim());
  return [...m.values()].sort((a, b) => a.localeCompare(b));
}

/** Eigener 501-Average im Training (ohne Computer-Würfe) seit einem Zeitpunkt. */
export function trainingsAverage(aufnahmen: Aufnahme[], seit: number, ich = ICH): { avg: number | null; darts: number } {
  let punkte = 0;
  let darts = 0;
  for (const a of aufnahmen) {
    if (a.modus !== 'x01' || a.bot || (a.spieler ?? ICH) !== ich || a.start < seit) continue;
    const e = auswerten(a.restVorher ?? 501, a.darts.map((d) => d.hit), a.doubleOut ?? true);
    punkte += e.punkte;
    darts += a.darts.length;
  }
  return { avg: darts >= 30 ? (punkte / darts) * 3 : null, darts };
}

/** Doppelquote (Darts aufs Doppel, die das Doppel trafen) seit einem Zeitpunkt. */
export function doppelQuote(aufnahmen: Aufnahme[], seit: number, ich = ICH): { quote: number | null; n: number } {
  let n = 0;
  let t = 0;
  for (const a of aufnahmen) {
    if (a.bot || (a.spieler ?? ICH) !== ich || a.start < seit) continue;
    for (const d of a.darts) {
      if (d.frei || d.ziel.ring !== 'D') continue;
      n++;
      if ((d.hit.ring === 'D' || d.hit.ring === 'DB') && d.hit.seg === d.ziel.seg) t++;
    }
  }
  return { quote: n >= 20 ? t / n : null, n };
}

