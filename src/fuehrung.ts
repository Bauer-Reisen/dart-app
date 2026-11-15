// Geführtes Training: Aus den bisherigen Würfen eines Spielers einen Vorschlag machen
// (welches Ziel, worauf achten) und eine Runde danach auswerten (vorher – jetzt).
import { sameZiel, zielLabel, type Ziel } from './board';
import { klasse } from './klassen';
import type { Aufnahme, Dart } from './speicher';
import { richtung, wurfbild, wurfbildTipps, type Richtung } from './tipps';

export const RUNDE = 10; // Aufnahmen pro geführter Runde
const MIN_ZIEL = 30;     // so viele Darts auf ein Ziel, bevor es bewertet wird

export interface Fuehrung {
  ziel: Ziel;
  /** Fehlwurf-Richtung, an der gearbeitet wird (falls es ein Muster gibt). */
  richtung?: Richtung;
  fokus: string;
  seit: number;    // Start der Runde (ms)
  spieler: string;
}

export interface Vorschlag {
  ziel: Ziel;
  titel: string;
  grund: string;
  fokus: string;
  richtung?: Richtung;
}

const gezielt = (darts: Dart[]) => darts.filter((d) => !d.frei && d.hit.ring !== 'BOUNCE');

export function quote(darts: Dart[], z: Ziel): { treffer: number; n: number } {
  let n = 0; let t = 0;
  for (const d of gezielt(darts)) {
    if (!sameZiel(d.ziel, z)) continue;
    n++; if (klasse(z, d.hit) === 'treffer') t++;
  }
  return { treffer: t, n };
}

/** Anteil der Fehlwürfe auf dieses Ziel, die in Richtung r gehen (bezogen auf die Achse, also oben/unten bzw. links/rechts). */
export function richtungsAnteil(darts: Dart[], z: Ziel, r: Richtung): { anteil: number | null; n: number } {
  const gegen: Record<Richtung, Richtung> = { oben: 'unten', unten: 'oben', links: 'rechts', rechts: 'links' };
  let a = 0; let b = 0;
  for (const d of gezielt(darts)) {
    if (!sameZiel(d.ziel, z)) continue;
    const x = richtung(z, d.hit);
    if (x === r) a++; else if (x === gegen[r]) b++;
  }
  return { anteil: a + b ? a / (a + b) : null, n: a + b };
}

/** Vorschlag für die nächste Trainingsrunde – aus allen Darts des Spielers. */
export function trainingsVorschlag(darts: Dart[]): Vorschlag {
  const ds = gezielt(darts);
  const zaehl = new Map<string, { z: Ziel; n: number }>();
  for (const d of ds) {
    const k = zielLabel(d.ziel);
    const e = zaehl.get(k) ?? { z: d.ziel, n: 0 };
    e.n++; zaehl.set(k, e);
  }
  const ziele = [...zaehl.values()].filter((e) => e.n >= MIN_ZIEL);

  if (!ziele.length) {
    const z = [...zaehl.values()].sort((a, b) => b.n - a.n)[0]?.z ?? { seg: 20, ring: 'T' };
    const n = zaehl.get(zielLabel(z))?.n ?? 0;
    return {
      ziel: z,
      titel: `Kennenlernen: ${RUNDE} Aufnahmen auf ${zielLabel(z)}`,
      grund: `Damit die App dein Wurfbild erkennt, braucht sie rund ${MIN_ZIEL} Darts auf ein Ziel (bisher ${n}).`,
      fokus: 'Ganz normal werfen, jeden Dart ehrlich eintippen.',
    };
  }

  // 1. Ein klares Muster (z. B. meist zu tief) hat Vorrang – dort bringt eine Anpassung am meisten.
  let bester: { z: Ziel; t: ReturnType<typeof wurfbildTipps>[number] } | null = null;
  for (const e of ziele) {
    const t = wurfbildTipps(wurfbild(ds, e.z))[0];
    if (t && (!bester || (t.staerke === 'deutlich' ? 1 : 0) + t.anteil > (bester.t.staerke === 'deutlich' ? 1 : 0) + bester.t.anteil)) {
      bester = { z: e.z, t };
    }
  }
  if (bester) {
    const pz = Math.round(bester.t.anteil * 100);
    const richtungText = { oben: 'zu hoch', unten: 'zu tief', links: 'nach links', rechts: 'nach rechts' }[bester.t.richtung];
    return {
      ziel: bester.z,
      richtung: bester.t.richtung,
      titel: `${RUNDE} Aufnahmen auf ${zielLabel(bester.z)}: weniger ${richtungText}`,
      grund: `Auf ${zielLabel(bester.z)} gehen ${pz} % deiner Fehlwürfe ${richtungText}. ${bester.t.ursache}`,
      fokus: bester.t.probier[0],
    };
  }

  // 2. Sonst das Ziel mit der niedrigsten Trefferquote – Doppel zuerst, die entscheiden Legs.
  const mitQuote = ziele.map((e) => {
    const q = quote(ds, e.z);
    return { z: e.z, q: q.treffer / q.n };
  });
  const doppel = mitQuote.filter((e) => e.z.ring === 'D');
  const auswahl = (doppel.length ? doppel : mitQuote).sort((a, b) => a.q - b.q)[0];
  return {
    ziel: auswahl.z,
    titel: `${RUNDE} Aufnahmen auf ${zielLabel(auswahl.z)}`,
    grund: `Deine Fehlwürfe verteilen sich gleichmäßig – gut. Auf ${zielLabel(auswahl.z)} triffst du mit ${Math.round(auswahl.q * 100)} % am seltensten${doppel.length ? ' von deinen Doppeln' : ''}.`,
    fokus: 'Jeder Wurf mit gleichem Ablauf: Stand, Blick aufs Ziel, ausatmen, werfen, durchschwingen.',
  };
}

export interface Auswertung {
  jetzt: { treffer: number; n: number };
  vorher: { treffer: number; n: number };
  richtungJetzt: number | null;
  richtungVorher: number | null;
  satz: string;
}

/** Runde auswerten: Darts seit Start der Runde gegen alle Darts davor. */
export function auswerten(aufnahmen: Aufnahme[], f: Fuehrung): Auswertung {
  const meine = aufnahmen.filter((a) => !a.bot && (a.spieler ?? 'Ich') === f.spieler);
  const davor = meine.filter((a) => a.start < f.seit).flatMap((a) => a.darts);
  const runde = meine.filter((a) => a.start >= f.seit).flatMap((a) => a.darts);
  const jetzt = quote(runde, f.ziel);
  const vorher = quote(davor, f.ziel);
  const rj = f.richtung ? richtungsAnteil(runde, f.ziel, f.richtung) : null;
  const rv = f.richtung ? richtungsAnteil(davor, f.ziel, f.richtung) : null;
  const pj = jetzt.n ? jetzt.treffer / jetzt.n : 0;
  const pv = vorher.n ? vorher.treffer / vorher.n : null;

  let satz: string;
  if (rj?.anteil != null && rv?.anteil != null && rj.n >= 5) {
    const d = Math.round((rv.anteil - rj.anteil) * 100);
    satz = d >= 10 ? `Das Muster wird schwächer: ${d} Prozentpunkte weniger Fehlwürfe ${f.richtung === 'oben' ? 'nach oben' : f.richtung === 'unten' ? 'nach unten' : 'nach ' + f.richtung} als bisher. Weiter so!`
      : d <= -10 ? 'Das Muster ist diesmal sogar stärker. Nicht schlimm – eine Änderung braucht Zeit. Achte noch bewusster auf den Fokus-Punkt.'
      : 'Das Muster ist ungefähr gleich geblieben. Bleib beim Fokus-Punkt, oft dauert es ein paar Runden.';
  } else if (pv !== null) {
    const d = Math.round((pj - pv) * 100);
    satz = d >= 5 ? `Besser als bisher (+${d} Prozentpunkte). Weiter so!` : d <= -5 ? 'Diesmal etwas schwächer als sonst – das schwankt. Morgen nochmal.' : 'Ungefähr wie bisher.';
  } else {
    satz = 'Erste Runde auf dieses Ziel – ab jetzt kann die App vergleichen.';
  }
  return { jetzt, vorher, richtungJetzt: rj?.anteil ?? null, richtungVorher: rv?.anteil ?? null, satz };
}

// ---------------- Merken (geführte Runde läuft weiter, auch nach dem Verlassen) ----------------
const KEY = 'dart-fuehrung';
export function fuehrungLaden(): Fuehrung | null {
  try {
    const f = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Fuehrung | null;
    return f && Date.now() - f.seit < 12 * 3600 * 1000 ? f : null;
  } catch { return null; }
}
export function fuehrungSpeichern(f: Fuehrung | null) {
  try { if (f) localStorage.setItem(KEY, JSON.stringify(f)); else localStorage.removeItem(KEY); } catch { /* egal */ }
}
