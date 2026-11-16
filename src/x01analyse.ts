// Auswertungen aus 501/301, die ohne Wissen über das Ziel auskommen:
// erste 9 Darts, schwache Aufnahmen, Checkout nach Restbereich, starke und schwache Doppel.
import { zielLabel } from './board';
import { checkout } from './checkout';
import type { Aufnahme } from './speicher';
import { auswerten } from './x01';

export interface Bereich { name: string; chancen: number; treffer: number }
export interface DoppelZeile { name: string; vers: number; treff: number }

export interface X01Analyse {
  /** Average der ersten 9 Darts je Leg (3 Aufnahmen), null bei zu wenig Legs. */
  erste9: number | null;
  legs9: number;
  /** Aufnahmen unter 40 Punkten, solange noch mehr als 100 übrig waren (Punkte-Phase). */
  schwach: number;
  punkteAufnahmen: number;
  checkout: Bereich[];
  doppel: DoppelZeile[];
  hinweise: string[];
}

export const MIN_LEGS9 = 3;
export const MIN_PUNKTE_AUFN = 20;
export const MIN_CHANCEN = 5;
export const MIN_DOPPEL = 6;

const pz = (t: number, n: number) => Math.round((t / n) * 100);

export function x01Analyse(liste: Aufnahme[]): X01Analyse {
  const auf = liste.filter((a) => a.modus === 'x01' && !a.bot).sort((a, b) => a.start - b.start);

  // Erste 9 Darts: die ersten 3 Aufnahmen je Leg (nur Legs, in denen man 3 Aufnahmen hatte)
  const jeLeg = new Map<string, Aufnahme[]>();
  for (const a of auf) {
    const k = `${a.legId ?? ''}|${a.spieler ?? ''}`;
    const l = jeLeg.get(k) ?? []; l.push(a); jeLeg.set(k, l);
  }
  let p9 = 0; let d9 = 0; let legs9 = 0;
  for (const l of jeLeg.values()) {
    if (l.length < 3) continue;
    legs9++;
    for (const a of l.slice(0, 3)) {
      p9 += auswerten(a.restVorher ?? 501, a.darts.map((d) => d.hit), a.doubleOut ?? true).punkte;
      d9 += a.darts.length;
    }
  }

  // Schwache Aufnahmen in der Punkte-Phase
  let schwach = 0; let punkteAufnahmen = 0;
  // Checkout nach Restbereich: Aufnahmen, in denen man mit 3 Darts ausmachen konnte
  const bereiche: Bereich[] = [
    { name: '2–40', chancen: 0, treffer: 0 },
    { name: '41–100', chancen: 0, treffer: 0 },
    { name: '101–170', chancen: 0, treffer: 0 },
  ];
  for (const a of auf) {
    const rest = a.restVorher ?? 0;
    const dOut = a.doubleOut ?? true;
    if (rest > 100) {
      const e = auswerten(rest, a.darts.map((d) => d.hit), dOut);
      if (!e.bust) { punkteAufnahmen++; if (e.punkte < 40) schwach++; }
    }
    if (rest <= 170 && checkout(rest, 3, dOut)) {
      const b = bereiche[rest <= 40 ? 0 : rest <= 100 ? 1 : 2];
      b.chancen++; if (a.check) b.treffer++;
    }
  }

  // Doppel: nur Darts, bei denen das Doppel zum Ausmachen das Ziel war
  const dz = new Map<string, DoppelZeile>();
  for (const a of auf) {
    for (const d of a.darts) {
      if (d.frei || d.ziel.ring !== 'D' || d.hit.ring === 'BOUNCE') continue;
      const name = zielLabel(d.ziel);
      const z = dz.get(name) ?? { name, vers: 0, treff: 0 };
      z.vers++;
      const getroffen = d.ziel.seg === 25 ? d.hit.ring === 'DB' : d.hit.ring === 'D' && d.hit.seg === d.ziel.seg;
      if (getroffen) z.treff++;
      dz.set(name, z);
    }
  }
  const doppel = [...dz.values()].sort((a, b) => b.vers - a.vers);

  // Hinweise
  const hinweise: string[] = [];
  const genug = doppel.filter((z) => z.vers >= MIN_DOPPEL);
  if (genug.length >= 2) {
    const quote = (z: DoppelZeile) => z.treff / z.vers;
    const sortiert = [...genug].sort((a, b) => quote(b) - quote(a));
    const best = sortiert[0]; const schlecht = sortiert[sortiert.length - 1];
    if (quote(best) - quote(schlecht) >= 0.15) {
      hinweise.push(`Im Spiel triffst du ${best.name} am besten (${pz(best.treff, best.vers)} %), ${schlecht.name} am schlechtesten (${pz(schlecht.treff, schlecht.vers)} %). Versuche, dir öfter ${best.name} zu stellen – und übe ${schlecht.name} im Doppeltraining.`);
    }
  }
  if (punkteAufnahmen >= MIN_PUNKTE_AUFN) {
    const anteil = schwach / punkteAufnahmen;
    if (anteil >= 0.25) hinweise.push(`${pz(schwach, punkteAufnahmen)} % deiner Aufnahmen beim Punkten bringen weniger als 40. Gleichmäßigkeit bringt hier mehr als Höchstwerte: lieber sicher 60 als ab und zu 100.`);
  }
  const [k, m] = bereiche;
  if (k.chancen >= MIN_CHANCEN && m.chancen >= MIN_CHANCEN && k.treffer / k.chancen >= 0.3 && m.treffer / m.chancen < 0.1) {
    hinweise.push('Unter 40 machst du gut aus, von 41 bis 100 selten. Übe das Stellen: mit dem ersten Dart auf ein Lieblingsdoppel kommen (z. B. 56 → 16, dann D20).');
  }

  return {
    erste9: legs9 >= MIN_LEGS9 && d9 ? (p9 / d9) * 3 : null, legs9,
    schwach, punkteAufnahmen, checkout: bereiche, doppel, hinweise,
  };
}
