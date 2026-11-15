// Computer-Gegner für 501: wirft auf einer Scheibe in echter Größe (mm),
// mit zufälliger Streuung um den Zielpunkt. Die Streuung wird aus dem
// gewünschten Average berechnet (Tabelle unten, per Simulation ermittelt).
import { ORDER, segAngle, polar, type Hit, type Ziel } from './board';
import { naechsterDart } from './checkout';
import { auswerten } from './x01';

/** Echte Maße einer Steeldart-Scheibe (Radius in mm). */
const ECHT = { DB: 6.35, SB: 15.9, SI: 99, T: 107, SO: 162, D: 170 };

export function echterTreffer(x: number, y: number): Hit {
  const r = Math.hypot(x, y);
  if (r < ECHT.DB) return { seg: 25, ring: 'DB' };
  if (r < ECHT.SB) return { seg: 25, ring: 'SB' };
  const a = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  const seg = ORDER[Math.floor(((a + 9) % 360) / 18)];
  if (r < ECHT.SI) return { seg, ring: 'SI' };
  if (r < ECHT.T) return { seg, ring: 'T' };
  if (r < ECHT.SO) return { seg, ring: 'SO' };
  if (r < ECHT.D) return { seg, ring: 'D' };
  return { seg, ring: 'MISS' };
}

/** Zielpunkt (Mitte des Feldes). */
export function zielPunkt(z: Ziel): [number, number] {
  if (z.ring === 'B') return [0, 0];
  const r = z.ring === 'T' ? 103 : z.ring === 'D' ? 166 : 134; // Single: großes äußeres Feld
  return polar(r, segAngle(z.seg));
}

export type Zufall = () => number;

function normal(rnd: Zufall): number {
  const u = 1 - rnd();
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function wurf(z: Ziel, sigma: number, rnd: Zufall = Math.random): Hit {
  const [x, y] = zielPunkt(z);
  return echterTreffer(x + normal(rnd) * sigma, y + normal(rnd) * sigma);
}

/** Eine Aufnahme (bis zu 3 Darts) aus dem Rest heraus, wie ein Spieler mit dieser Streuung. */
export function computerAufnahme(rest: number, doubleOut: boolean, sigma: number, rnd: Zufall = Math.random): { hit: Hit; ziel: Ziel }[] {
  const darts: { hit: Hit; ziel: Ziel }[] = [];
  for (let i = 0; i < 3; i++) {
    const a = auswerten(rest, darts.map((d) => d.hit), doubleOut);
    if (a.endetNach !== null) break;
    const ziel = naechsterDart(a.restNachher, 3 - i, doubleOut).wurf.ziel;
    darts.push({ ziel, hit: wurf(ziel, sigma, rnd) });
  }
  return darts;
}

/**
 * Streuung (mm) → Average über ganze 501-Legs mit Doppel-Aus.
 * Per Simulation ermittelt (je 4000 Legs); gegner.test.ts prüft Stichproben.
 */
export const TABELLE: [number, number][] = [
  [6, 102.4], [7, 94.9], [8, 87.7], [9, 81.3], [10, 75.8], [11, 70.6], [12, 65.8], [13, 61.4], [14, 57.9], [15, 54.1],
  [16, 51.1], [17, 48.6], [18, 46.0], [19, 43.6], [20, 41.4], [22, 37.7], [24, 35.0], [26, 32.3], [29, 29.7], [33, 26.1],
];

/** Streuung für einen gewünschten Average (lineare Zwischenwerte). */
export function sigmaFuer(avg: number): number {
  const t = TABELLE;
  if (avg >= t[0][1]) return t[0][0];
  if (avg <= t[t.length - 1][1]) return t[t.length - 1][0];
  for (let i = 0; i < t.length - 1; i++) {
    const [s0, a0] = t[i];
    const [s1, a1] = t[i + 1];
    if (avg <= a0 && avg >= a1) return s0 + ((a0 - avg) / (a0 - a1)) * (s1 - s0);
  }
  return 25;
}

/** Simuliert ein ganzes Leg allein, liefert Darts und Punkte (für Tests/Kalibrierung). */
export function simuliereLeg(sigma: number, rnd: Zufall = Math.random, start = 501): { darts: number; punkte: number } {
  let rest = start;
  let darts = 0;
  let punkte = 0;
  for (let k = 0; k < 200 && rest > 0; k++) {
    const auf = computerAufnahme(rest, true, sigma, rnd);
    const a = auswerten(rest, auf.map((d) => d.hit), true);
    darts += auf.length;
    punkte += a.punkte;
    rest = a.restNachher;
  }
  return { darts, punkte };
}
