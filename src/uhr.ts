// Trainings-Timer: Auswertung der Darts in der gestoppten Zeit.
import { zielLabel } from './board';
import { klasse } from './klassen';
import type { Dart } from './speicher';

export const UHR_MINUTEN = [5, 10, 15];

export interface UhrZeile { ziel: string; treffer: number; n: number }

/** Darts zwischen seit und bis: Anzahl und Treffer je Ziel (meistes Ziel zuerst). */
export function uhrAuswertung(darts: Dart[], seit: number, bis: number): { darts: number; ziele: UhrZeile[] } {
  const drin = darts.filter((d) => d.t >= seit && d.t <= bis);
  const m = new Map<string, UhrZeile>();
  for (const d of drin) {
    if (d.frei || d.hit.ring === 'BOUNCE') continue;
    const name = zielLabel(d.ziel);
    const z = m.get(name) ?? { ziel: name, treffer: 0, n: 0 };
    z.n++;
    if (klasse(d.ziel, d.hit) === 'treffer') z.treffer++;
    m.set(name, z);
  }
  return { darts: drin.length, ziele: [...m.values()].sort((a, b) => b.n - a.n) };
}

/** 452000 ms → "7:32" */
export function uhrText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
