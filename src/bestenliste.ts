// Bestenlisten (Top 10) über alle Spieler auf diesem Gerät: wer hatte wann den besten Wert?
// Würfe des Computer-Gegners zählen nicht.
import { RUNDEN } from './halveit';
import { doppelWerte } from './doppel';
import { ICH, type Aufnahme } from './speicher';
import { auswerten } from './x01';

export interface Eintrag { name: string; wert: number; text: string; zeit: number; info?: string }
export interface Liste { id: string; spiel: string; titel: string; erklaerung: string; eintraege: Eintrag[] }

export const TOP = 10;
export const MIN_DARTS_LEG = 9;      // Average je Leg erst ab so vielen Darts
export const MIN_DOPPEL_TAG = 10;    // Doppelquote je Tag erst ab so vielen Darts aufs Doppel

const name = (a: Aufnahme) => a.spieler ?? ICH;
const tag = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

function gruppieren(liste: Aufnahme[], schluessel: (a: Aufnahme) => string): Aufnahme[][] {
  const m = new Map<string, Aufnahme[]>();
  for (const a of liste) { const k = schluessel(a); const l = m.get(k) ?? []; l.push(a); m.set(k, l); }
  return [...m.values()].map((l) => l.sort((a, b) => a.start - b.start));
}

function top(e: Eintrag[], hoch: boolean): Eintrag[] {
  return e.sort((a, b) => (hoch ? b.wert - a.wert : a.wert - b.wert) || a.zeit - b.zeit).slice(0, TOP);
}

/** Startwert eines Legs (501 oder 301) – der höchste Rest vor einer Aufnahme. */
function legStart(alle: Aufnahme[], legId: string | undefined): number {
  return Math.max(...alle.filter((a) => a.legId === legId).map((a) => a.restVorher ?? 0));
}

function x01Listen(alle: Aufnahme[], start: number): Liste[] {
  const legs = new Map<string | undefined, number>();
  const auf = alle.filter((a) => {
    if (a.modus !== 'x01' || a.bot) return false;
    if (!legs.has(a.legId)) legs.set(a.legId, legStart(alle.filter((x) => x.modus === 'x01'), a.legId));
    return legs.get(a.legId) === start;
  });

  const avg: Eintrag[] = [];
  for (const l of gruppieren(auf, (a) => `${a.legId}|${name(a)}`)) {
    const darts = l.reduce((s, a) => s + a.darts.length, 0);
    if (darts < MIN_DARTS_LEG) continue;
    const punkte = l.reduce((s, a) => s + auswerten(a.restVorher ?? start, a.darts.map((d) => d.hit), a.doubleOut ?? true).punkte, 0);
    const wert = (punkte / darts) * 3;
    const gewonnen = l.some((a) => a.check);
    avg.push({ name: name(l[0]), wert, text: wert.toFixed(1), zeit: l[0].start, info: `${darts} Darts${gewonnen ? ' · gewonnen' : ''}` });
  }

  const dq: Eintrag[] = [];
  for (const l of gruppieren(auf, (a) => `${tag(a.start)}|${name(a)}`)) {
    let vers = 0; let treff = 0;
    for (const a of l) { const w = doppelWerte(a); vers += w.vers; treff += w.treff; }
    if (vers < MIN_DOPPEL_TAG) continue;
    const wert = treff / vers;
    dq.push({ name: name(l[0]), wert, text: `${Math.round(wert * 100)} %`, zeit: l[0].start, info: `${treff} von ${vers}` });
  }

  return [
    { id: `${start}-avg`, spiel: String(start), titel: 'Bester Average', erklaerung: `Je Leg, ab ${MIN_DARTS_LEG} Darts.`, eintraege: top(avg, true) },
    { id: `${start}-dq`, spiel: String(start), titel: 'Beste Doppelquote', erklaerung: `Je Spieltag, ab ${MIN_DOPPEL_TAG} Darts aufs Doppel.`, eintraege: top(dq, true) },
  ];
}

function cricketListe(alle: Aufnahme[]): Liste {
  const auf = alle.filter((a) => a.modus === 'cricket' && !a.bot);
  const e: Eintrag[] = [];
  for (const l of gruppieren(auf, (a) => `${a.legId}|${name(a)}`)) {
    if (!l.some((a) => a.check)) continue; // nur gewonnene Legs
    const darts = l.reduce((s, a) => s + a.darts.length, 0);
    e.push({ name: name(l[0]), wert: darts, text: `${darts} Darts`, zeit: l[0].start });
  }
  return { id: 'cricket-darts', spiel: 'Cricket', titel: 'Wenigste Darts', erklaerung: 'Je gewonnenem Leg.', eintraege: top(e, false) };
}

function halveListe(alle: Aufnahme[]): Liste {
  const auf = alle.filter((a) => a.modus === 'halveit' && !a.bot);
  const e: Eintrag[] = [];
  for (const l of gruppieren(auf, (a) => `${a.legId}|${name(a)}`)) {
    if (l.length < RUNDEN.length) continue; // nur fertige Spiele
    let p = 0;
    for (const a of l.slice(0, RUNDEN.length)) { const w = a.wert ?? 0; p = w > 0 ? p + w : Math.floor(p / 2); }
    e.push({ name: name(l[0]), wert: p, text: `${p} Punkte`, zeit: l[0].start, info: l.some((a) => a.check) ? 'gewonnen' : undefined });
  }
  return { id: 'halveit-punkte', spiel: 'Halve-It', titel: 'Höchste Punktzahl', erklaerung: 'Je fertigem Spiel.', eintraege: top(e, true) };
}

export function bestenlisten(aufnahmen: Aufnahme[]): Liste[] {
  return [...x01Listen(aufnahmen, 501), ...x01Listen(aufnahmen, 301), cricketListe(aufnahmen), halveListe(aufnahmen)];
}
