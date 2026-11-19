// Fortschritt während einer Fokus-Strecke: nicht nur „drin oder nicht“, sondern auch wo die Darts landen.
// Grundlage ist die getippte Stelle (mm auf einer echten Scheibe) – Abstand zur Zielmitte, knapp/weit, Richtung, Streuung.
import { zielPunkt } from './gegner';
import { klasse } from './klassen';
import type { Aufnahme, Dart } from './speicher';
import type { Richtung } from './tipps';

const gezielt = (d: Dart) => !d.frei && d.hit.ring !== 'BOUNCE';
const KNAPP = new Set(['innen', 'aussen', 'nachbarUhr', 'nachbarGegen']);
export const MIN_STELLEN = 6; // so viele getippte Stellen je Block, bevor mm-Werte zählen

export interface Block {
  n: number;        // gezielte Darts
  t: number;        // Treffer
  knapp: number;    // knapp daneben (Nachbarfeld oder direkt drüber/drunter)
  stellen: number;  // Darts mit getippter Stelle (ohne Single-Ziele)
  abstand: number | null; // Median-Abstand zur Zielmitte (mm)
  dx: number | null; dy: number | null; // mittlerer Treffpunkt (x rechts, y unten)
  streu: number | null;   // halbe Darts innerhalb dieses Abstands um den Treffpunkt
}

const median = (x: number[]) => { const s = [...x].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export function block(aufnahmen: Aufnahme[]): Block {
  const darts = aufnahmen.flatMap((a) => a.darts).filter(gezielt);
  let t = 0; let knapp = 0;
  const p: [number, number][] = [];
  for (const d of darts) {
    const k = klasse(d.ziel, d.hit);
    if (k === 'treffer') t++; else if (KNAPP.has(k)) knapp++;
    if (d.p && d.ziel.ring !== 'S') { const [mx, my] = zielPunkt(d.ziel); p.push([d.p[0] - mx, d.p[1] - my]); }
  }
  const b: Block = { n: darts.length, t, knapp, stellen: p.length, abstand: null, dx: null, dy: null, streu: null };
  if (p.length >= MIN_STELLEN) {
    b.abstand = median(p.map(([x, y]) => Math.hypot(x, y)));
    b.dx = p.reduce((s, q) => s + q[0], 0) / p.length;
    b.dy = p.reduce((s, q) => s + q[1], 0) / p.length;
    b.streu = median(p.map(([x, y]) => Math.hypot(x - b.dx!, y - b.dy!)));
  }
  return b;
}

/** Versatz in Richtung r (positiv = in diese Richtung daneben). */
function versatz(b: Block, r: Richtung): number | null {
  if (b.dx === null || b.dy === null) return null;
  return r === 'unten' ? b.dy : r === 'oben' ? -b.dy : r === 'rechts' ? b.dx : -b.dx;
}
const WORT: Record<Richtung, string> = { oben: 'zu hoch', unten: 'zu tief', links: 'links', rechts: 'rechts' };
const mm = (x: number) => `${Math.round(Math.abs(x))} mm`;
const anteil = (b: Block) => (b.n ? b.t / b.n : 0);
const nah = (b: Block) => (b.n ? (b.t + b.knapp) / b.n : 0);

/** Was hat sich verbessert? Bester Befund zuerst. */
function besser(mit: Block, ohne: Block, r?: Richtung): string[] {
  const aus: string[] = [];
  if (r) {
    const v0 = versatz(ohne, r); const v1 = versatz(mit, r);
    if (v0 !== null && v1 !== null && v0 >= 3 && v0 - v1 >= 3) {
      aus.push(v1 <= 1.5
        ? `Dein Treffpunkt lag vorher ${mm(v0)} ${WORT[r]}, jetzt fast mittig – die Richtung stimmt.`
        : `Dein Treffpunkt lag vorher ${mm(v0)} ${WORT[r]}, jetzt nur noch ${mm(v1)} – die Richtung stimmt.`);
    }
  }
  if (mit.abstand !== null && ohne.abstand !== null && ohne.abstand - mit.abstand >= 2 && mit.abstand <= 0.85 * ohne.abstand) {
    aus.push(`Im Schnitt ${mm(mit.abstand)} vom Ziel statt ${mm(ohne.abstand)} – du kommst näher.`);
  }
  const knappAnteil = (b: Block) => (b.n ? b.knapp / b.n : 0);
  if (nah(mit) - nah(ohne) >= 0.15 && knappAnteil(mit) - knappAnteil(ohne) >= 0.1) {
    aus.push(`${mit.t + mit.knapp} von ${mit.n} drin oder knapp dran, vorher ${ohne.t + ohne.knapp} von ${ohne.n}.`);
  }
  if (mit.streu !== null && ohne.streu !== null && ohne.streu - mit.streu >= 3 && mit.streu <= 0.8 * ohne.streu) {
    aus.push(`Enger zusammen: die Hälfte innerhalb von ${mm(mit.streu)} statt ${mm(ohne.streu)}.`);
  }
  return aus;
}

/** Bilanz nach einer Fokus-Strecke. geholfen = es gibt ein klares gutes Zeichen. */
export function bilanz(mit: Block, ohne: Block, r?: Richtung): { text: string; geholfen: boolean } {
  const tr = `Mit Fokus ${mit.t} von ${mit.n} getroffen`;
  if (ohne.n < 6) {
    const extra = mit.abstand !== null ? `, im Schnitt ${mm(mit.abstand)} vom Ziel` : mit.knapp ? `, ${mit.knapp} knapp daneben` : '';
    return { text: `${tr}${extra}.`, geholfen: false };
  }
  const d = anteil(mit) - anteil(ohne);
  const vorher = `vorher ${ohne.t} von ${ohne.n}`;
  const gut = besser(mit, ohne, r);
  const schlechter = besser(ohne, mit, r).length > 0;
  if (d >= 0.07) {
    return { text: [`Mit dem Fokus besser: ${mit.t} von ${mit.n} getroffen, ${vorher}.`, gut[0], 'Behalte das bei!'].filter(Boolean).join(' '), geholfen: true };
  }
  if (gut.length && d > -0.07) {
    const tz = d > 0.02 ? `${tr}, ${vorher}.` : `Noch nicht mehr Treffer (${mit.t} von ${mit.n}, ${vorher}), aber:`;
    return { text: `${tz} ${gut[0]} Ein gutes Zeichen – dranbleiben!`, geholfen: true };
  }
  if (d <= -0.07 || schlechter) {
    return { text: `${tr}, ${vorher}. Eine Umstellung kostet am Anfang oft etwas – beim nächsten Mal probieren wir einen anderen Ansatz.`, geholfen: false };
  }
  return { text: `${tr}, ${vorher} – ungefähr gleich. Beim nächsten Mal probieren wir einen anderen Ansatz.`, geholfen: false };
}

/** Kurzer Zwischenstand für die Fokus-Leiste, z. B. „Abstand 8 mm · vorher 13 mm“. */
export function zwischenstand(mit: Block, ohne: Block, r?: Richtung): string | null {
  if (!mit.n) return null;
  if (r && (r === 'oben' || r === 'unten') && mit.dy !== null && ohne.dy !== null) {
    const t = (v: number) => (Math.abs(v) < 1.5 ? 'mittig' : `${mm(v)} ${v > 0 ? 'zu tief' : 'zu hoch'}`);
    return `Treffpunkt ${t(mit.dy)} · vorher ${t(ohne.dy)}`;
  }
  if (r && (r === 'links' || r === 'rechts') && mit.dx !== null && ohne.dx !== null) {
    const t = (v: number) => (Math.abs(v) < 1.5 ? 'mittig' : `${mm(v)} ${v > 0 ? 'rechts' : 'links'}`);
    return `Treffpunkt ${t(mit.dx)} · vorher ${t(ohne.dx)}`;
  }
  if (mit.abstand !== null && ohne.abstand !== null) return `Abstand ${mm(mit.abstand)} · vorher ${mm(ohne.abstand)}`;
  if (mit.abstand !== null) return `Im Schnitt ${mm(mit.abstand)} vom Ziel`;
  return ohne.n ? `Drin oder knapp: ${mit.t + mit.knapp} von ${mit.n} · vorher ${ohne.t + ohne.knapp} von ${ohne.n}`
    : `Drin oder knapp: ${mit.t + mit.knapp} von ${mit.n}`;
}
