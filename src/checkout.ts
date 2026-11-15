// Checkout-Wege: Mit welchen Darts kommt man von einem Rest auf 0?
// Statt einer abgeschriebenen Tabelle wird der Weg berechnet, mit Vorlieben,
// wie sie Spieler üblicherweise haben (Lieblingsdoppel D20/D16, Aufbau über T20).
import type { Ziel } from './board';

export interface Wurf {
  label: string;
  punkte: number;
  ziel: Ziel;
  double: boolean;
  /** Wie ungern man diesen Dart als Aufbau wirft (0 = gern). */
  aufbau: number;
}

const TRIPLE_AUFBAU: Record<number, number> = { 20: 1, 19: 2, 18: 3, 17: 3, 16: 4 };
const DOPPEL_ENDE: Record<number, number> = {
  20: 0, 16: 0.5, 8: 1, 10: 1, 12: 1.5, 18: 1.5, 4: 2, 6: 2, 14: 2, 2: 3, 25: 4, 1: 5,
};

function baue(): Wurf[] {
  const w: Wurf[] = [];
  for (let n = 1; n <= 20; n++) w.push({ label: 'S' + n, punkte: n, ziel: { seg: n, ring: 'S' }, double: false, aufbau: 0 });
  w.push({ label: '25', punkte: 25, ziel: { seg: 25, ring: 'B' }, double: false, aufbau: 6 });
  for (let n = 1; n <= 20; n++) w.push({ label: 'T' + n, punkte: 3 * n, ziel: { seg: n, ring: 'T' }, double: false, aufbau: TRIPLE_AUFBAU[n] ?? 5 });
  for (let n = 1; n <= 20; n++) w.push({ label: 'D' + n, punkte: 2 * n, ziel: { seg: n, ring: 'D' }, double: true, aufbau: 8 });
  w.push({ label: 'Bull', punkte: 50, ziel: { seg: 25, ring: 'B' }, double: true, aufbau: 7 });
  return w;
}

export const ALLE_WUERFE = baue();
const NACH_PUNKTEN = new Map<number, Wurf[]>();
for (const w of ALLE_WUERFE) {
  const l = NACH_PUNKTEN.get(w.punkte) ?? [];
  l.push(w);
  NACH_PUNKTEN.set(w.punkte, l);
}

function endeStrafe(w: Wurf, doubleOut: boolean): number {
  if (!doubleOut) return w.aufbau;
  const seg = w.label === 'Bull' ? 25 : w.ziel.seg;
  return DOPPEL_ENDE[seg] ?? 3;
}

/** Bester Checkout-Weg mit höchstens `darts` Darts, oder null, wenn es keinen gibt. */
export function checkout(rest: number, darts = 3, doubleOut = true): Wurf[] | null {
  if (rest < 1 || darts < 1) return null;
  if (doubleOut && rest < 2) return null;

  for (let n = 1; n <= darts; n++) {
    let best: Wurf[] | null = null;
    let bestScore = Infinity;
    const pruefe = (aufbau: Wurf[], summe: number, strafe: number) => {
      const r = rest - summe;
      for (const f of NACH_PUNKTEN.get(r) ?? []) {
        if (doubleOut && !f.double) continue;
        const score = strafe + endeStrafe(f, doubleOut) - (aufbau[0]?.punkte ?? f.punkte) * 0.001;
        if (score < bestScore) {
          bestScore = score;
          best = [...aufbau, f];
        }
      }
    };
    if (n === 1) pruefe([], 0, 0);
    if (n === 2) {
      for (const a of ALLE_WUERFE) {
        if (rest - a.punkte < (doubleOut ? 2 : 1)) continue;
        pruefe([a], a.punkte, a.aufbau);
      }
    }
    if (n === 3) {
      for (const a of ALLE_WUERFE) {
        if (rest - a.punkte < (doubleOut ? 4 : 2)) continue;
        for (const b of ALLE_WUERFE) {
          if (rest - a.punkte - b.punkte < (doubleOut ? 2 : 1)) continue;
          pruefe([a, b], a.punkte + b.punkte, a.aufbau + b.aufbau);
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/**
 * Vorschlag für den nächsten Dart: erster Dart des Checkout-Wegs,
 * sonst ein Aufbau-Dart, der einen guten Rest lässt, sonst T20.
 */
export function naechsterDart(rest: number, dartsUebrig: number, doubleOut = true): { wurf: Wurf; weg: Wurf[] | null } {
  const weg = checkout(rest, dartsUebrig, doubleOut);
  if (weg) return { wurf: weg[0], weg };

  const t20 = ALLE_WUERFE.find((w) => w.label === 'T20')!;
  if (rest > 100) return { wurf: t20, weg: null };

  // Aufbau: Rest so stellen, dass danach ein guter Checkout bleibt
  let best: Wurf = t20;
  let bestScore = Infinity;
  for (const w of ALLE_WUERFE) {
    if (w.double) continue;
    const r = rest - w.punkte;
    if (r < 2) continue;
    const eins = checkout(r, 1, doubleOut);
    const naechst = eins ?? (dartsUebrig > 1 ? checkout(r, dartsUebrig - 1, doubleOut) : checkout(r, 3, doubleOut));
    if (!naechst) continue;
    const score = w.aufbau + (eins ? endeStrafe(eins[0], doubleOut) : 4 + naechst.length);
    if (score < bestScore) {
      bestScore = score;
      best = w;
    }
  }
  return { wurf: best, weg: null };
}

export function wegText(weg: Wurf[]): string {
  return weg.map((w) => w.label).join(' · ');
}
