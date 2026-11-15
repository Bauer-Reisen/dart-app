// Genaue Stelle der Darts: Wo liegt der mittlere Treffpunkt im Vergleich zur Mitte des Ziels, und wie weit streuen die Darts?
// Grundlage ist die getippte Stelle (umgerechnet auf eine echte Scheibe in mm) – also nur ungefähr so genau wie das Antippen.
import { sameZiel, type Ziel } from './board';
import { zielPunkt } from './gegner';
import type { Dart } from './speicher';

export const MIN_PUNKTE = 10;

export interface Treffpunkt {
  n: number;
  /** Mittlerer Treffpunkt relativ zur Zielmitte in mm (x rechts, y unten – so wie man auf die Scheibe schaut). */
  dx: number;
  dy: number;
  /** Halbe Darts liegen innerhalb dieses Abstands vom mittleren Treffpunkt (mm). */
  streuung: number;
  punkte: [number, number][]; // relativ zur Zielmitte
}

export function treffpunkt(darts: Dart[], z: Ziel): Treffpunkt | null {
  if (z.ring === 'S') return null; // beim Single ist die Mitte nicht eindeutig (innen oder außen)
  const [mx, my] = zielPunkt(z);
  const punkte = darts
    .filter((d) => d.p && !d.frei && sameZiel(d.ziel, z))
    .map((d) => [d.p![0] - mx, d.p![1] - my] as [number, number]);
  if (punkte.length < MIN_PUNKTE) return punkte.length ? { n: punkte.length, dx: 0, dy: 0, streuung: 0, punkte } : null;
  const dx = punkte.reduce((s, p) => s + p[0], 0) / punkte.length;
  const dy = punkte.reduce((s, p) => s + p[1], 0) / punkte.length;
  const abst = punkte.map((p) => Math.hypot(p[0] - dx, p[1] - dy)).sort((a, b) => a - b);
  return { n: punkte.length, dx, dy, streuung: abst[Math.floor(abst.length / 2)], punkte };
}

/** Kurzer Satz, z. B. „Im Schnitt 8 mm zu tief und 3 mm links." */
export function treffpunktText(t: Treffpunkt): string {
  if (t.n < MIN_PUNKTE) return `Noch zu wenig getippte Darts (${t.n} von ${MIN_PUNKTE}).`;
  const teile: string[] = [];
  if (Math.abs(t.dy) >= 3) teile.push(`${Math.round(Math.abs(t.dy))} mm ${t.dy > 0 ? 'zu tief' : 'zu hoch'}`);
  if (Math.abs(t.dx) >= 3) teile.push(`${Math.round(Math.abs(t.dx))} mm ${t.dx > 0 ? 'rechts' : 'links'}`);
  const lage = teile.length ? `Dein mittlerer Treffpunkt liegt ${teile.join(' und ')} von der Zielmitte.` : 'Dein mittlerer Treffpunkt liegt fast genau auf der Zielmitte – gut.';
  return `${lage} Die Hälfte deiner Darts landet innerhalb von ${Math.round(t.streuung)} mm um diesen Punkt.`;
}
